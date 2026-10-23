from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.response_utils import success_response
from app.core.config import get_settings
from app.core.errors import AppException, VerificationNotFoundError
from app.db import models
from app.db.database import get_db
from app.schemas.analytics import (
    ActivityItem,
    KnowledgeGapItem,
    KnowledgeGapList,
    MisconceptionItem,
    MisconceptionList,
    ProgressData,
    VerificationCreateRequest,
    VerificationData,
)
from app.schemas.common import ApiResponse
from app.services.learning_service import LearningService

router = APIRouter(prefix="/analytics", tags=["Analytics & Progress"])
settings = get_settings()


@router.get(
    "/knowledge-gaps",
    response_model=ApiResponse[KnowledgeGapList],
    summary="Knowledge Gap Map",
)
def get_knowledge_gaps(request: Request, db: Session = Depends(get_db)):
    """
    Retrieve topic-level mastery estimates and knowledge gaps.
    Topics are categorized as 'weak', 'developing', 'strong', or 'not_enough_data'.
    """
    records = LearningService.get_knowledge_gaps(db, settings.DEMO_STUDENT_ID)
    items = [
        KnowledgeGapItem(
            topic=r.topic,
            accuracy=r.accuracy,
            attempts_count=r.total_attempts,
            confidence=r.confidence,
            status=r.status,
            recommended_action=r.recommended_action,
        )
        for r in records
    ]
    return success_response(KnowledgeGapList(topics=items, total_topics=len(items)).model_dump(), request)


@router.get(
    "/misconceptions",
    response_model=ApiResponse[MisconceptionList],
    summary="Student Misconceptions",
)
def get_misconceptions(request: Request, db: Session = Depends(get_db)):
    """Retrieve diagnosed student misconceptions grounded in actual incorrect answers."""
    records = LearningService.get_misconceptions(db, settings.DEMO_STUDENT_ID)
    items = [
        MisconceptionItem(
            id=r.id,
            topic=r.topic,
            misconception_text=r.misconception_text,
            evidence_question=r.evidence_question,
            evidence_answer=r.evidence_answer,
            suggested_practice=r.suggested_practice,
            confidence=r.confidence,
            detected_at=r.detected_at,
        )
        for r in records
    ]
    return success_response(MisconceptionList(misconceptions=items, total_misconceptions=len(items)).model_dump(), request)


@router.get(
    "/progress",
    response_model=ApiResponse[ProgressData],
    summary="Overall Learning Progress",
)
def get_progress(request: Request, db: Session = Depends(get_db)):
    """
    Retrieve overall learning progress, quiz scores, topic trends, and recent activity.
    """
    student_id = settings.DEMO_STUDENT_ID
    total_materials = db.query(models.StudyMaterial).filter_by(student_id=student_id).count()
    total_quizzes = db.query(models.QuizSession).filter_by(student_id=student_id).count()

    attempts = (
        db.query(models.QuizAttempt)
        .filter_by(student_id=student_id)
        .order_by(models.QuizAttempt.submitted_at.desc())
        .all()
    )
    total_attempts = len(attempts)
    avg_score = round(sum(a.score_percentage for a in attempts) / total_attempts, 1) if total_attempts > 0 else 0.0
    questions_answered = sum(a.total_questions for a in attempts)

    # Compile recent activity feed
    recent_activity: List[ActivityItem] = []
    for a in attempts[:5]:
        quiz = db.query(models.QuizSession).filter_by(id=a.quiz_id).first()
        topic_label = quiz.topic if quiz and quiz.topic else "General"
        recent_activity.append(
            ActivityItem(
                type="quiz_attempt",
                title=f"Completed {quiz.quiz_type if quiz else 'quiz'} on {topic_label}",
                timestamp=a.submitted_at,
                details={
                    "score_percentage": a.score_percentage,
                    "correct": a.correct_count,
                    "total": a.total_questions,
                    "quiz_id": a.quiz_id,
                },
            )
        )

    # Materials activity
    materials = (
        db.query(models.StudyMaterial)
        .filter_by(student_id=student_id)
        .order_by(models.StudyMaterial.created_at.desc())
        .limit(3)
        .all()
    )
    for m in materials:
        recent_activity.append(
            ActivityItem(
                type="material_upload",
                title=f"Added study material: {m.title}",
                timestamp=m.created_at,
                details={"material_type": m.material_type, "page_count": m.page_count},
            )
        )

    recent_activity.sort(key=lambda x: x.timestamp, reverse=True)

    # Topic trends
    mastery_records = LearningService.get_knowledge_gaps(db, student_id)
    topic_trends = [
        KnowledgeGapItem(
            topic=r.topic,
            accuracy=r.accuracy,
            attempts_count=r.total_attempts,
            confidence=r.confidence,
            status=r.status,
            recommended_action=r.recommended_action,
        )
        for r in mastery_records
    ]

    # Verifications
    verifications = (
        db.query(models.AssessmentVerification)
        .filter_by(student_id=student_id)
        .order_by(models.AssessmentVerification.created_at.desc())
        .all()
    )
    verif_data: List[VerificationData] = []
    for v in verifications:
        verif_data.append(
            VerificationData(
                id=v.id,
                topic=v.topic,
                material_id=v.material_id,
                diagnostic_quiz_id=v.diagnostic_quiz_id,
                follow_up_quiz_id=v.follow_up_quiz_id,
                initial_score=v.initial_score,
                follow_up_score=v.follow_up_score,
                score_difference=v.score_difference,
                status=v.status,
                assessment_ids={
                    "diagnostic_quiz_id": v.diagnostic_quiz_id,
                    "follow_up_quiz_id": v.follow_up_quiz_id,
                },
                message="Completed" if v.status == "completed" else "Awaiting follow-up quiz attempt",
            )
        )

    progress = ProgressData(
        total_materials=total_materials,
        total_quizzes=total_quizzes,
        total_attempts=total_attempts,
        average_score=avg_score,
        questions_answered=questions_answered,
        recent_activity=recent_activity[:10],
        topic_trends=topic_trends,
        verifications=verif_data,
    )
    return success_response(progress.model_dump(), request)


@router.post(
    "/verification",
    response_model=ApiResponse[VerificationData],
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Diagnostic vs Follow-Up Verification",
)
def create_verification(
    request: Request,
    payload: VerificationCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Create a verification tracking session comparing an initial diagnostic assessment
    with a subsequent follow-up assessment on the same topic.
    """
    student_id = settings.DEMO_STUDENT_ID

    # Look for existing diagnostic quiz on this topic with a submitted attempt
    diagnostic_quiz = (
        db.query(models.QuizSession)
        .filter_by(student_id=student_id, topic=payload.topic, quiz_type="diagnostic")
        .order_by(models.QuizSession.created_at.asc())
        .first()
    )

    initial_score = None
    diag_id = None
    if diagnostic_quiz:
        diag_id = diagnostic_quiz.id
        attempt = (
            db.query(models.QuizAttempt)
            .filter_by(quiz_id=diagnostic_quiz.id)
            .order_by(models.QuizAttempt.submitted_at.desc())
            .first()
        )
        if attempt:
            initial_score = attempt.score_percentage

    # Look for follow_up quiz on this topic
    follow_up_quiz = (
        db.query(models.QuizSession)
        .filter_by(student_id=student_id, topic=payload.topic, quiz_type="follow_up")
        .order_by(models.QuizSession.created_at.desc())
        .first()
    )

    follow_up_score = None
    follow_id = None
    if follow_up_quiz:
        follow_id = follow_up_quiz.id
        attempt = (
            db.query(models.QuizAttempt)
            .filter_by(quiz_id=follow_up_quiz.id)
            .order_by(models.QuizAttempt.submitted_at.desc())
            .first()
        )
        if attempt:
            follow_up_score = attempt.score_percentage

    score_diff = None
    status_val = "awaiting_follow_up"
    message = "Verification tracking initiated. Take the follow-up assessment to verify score improvements."

    if initial_score is not None and follow_up_score is not None:
        score_diff = round(follow_up_score - initial_score, 1)
        status_val = "completed"
        if score_diff > 0:
            message = f"Measurable improvement verified: +{score_diff}% score gain."
        elif score_diff == 0:
            message = "Performance remained stable across assessments."
        else:
            message = f"Score difference: {score_diff}%. Further targeted revision is recommended."

    verif = models.AssessmentVerification(
        student_id=student_id,
        material_id=payload.material_id,
        topic=payload.topic,
        diagnostic_quiz_id=diag_id,
        follow_up_quiz_id=follow_id,
        initial_score=initial_score,
        follow_up_score=follow_up_score,
        score_difference=score_diff,
        status=status_val,
    )
    db.add(verif)
    db.commit()
    db.refresh(verif)

    data = VerificationData(
        id=verif.id,
        topic=verif.topic,
        material_id=verif.material_id,
        diagnostic_quiz_id=verif.diagnostic_quiz_id,
        follow_up_quiz_id=verif.follow_up_quiz_id,
        initial_score=verif.initial_score,
        follow_up_score=verif.follow_up_score,
        score_difference=verif.score_difference,
        status=verif.status,
        assessment_ids={
            "diagnostic_quiz_id": verif.diagnostic_quiz_id,
            "follow_up_quiz_id": verif.follow_up_quiz_id,
        },
        message=message,
    )
    return success_response(data.model_dump(), request)


@router.get(
    "/verification/{verification_id}",
    response_model=ApiResponse[VerificationData],
    summary="Get Assessment Verification Results",
)
def get_verification(
    verification_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Retrieve comparative results between initial and follow-up assessments.
    Accurately computes score delta if both have been submitted.
    """
    verif = (
        db.query(models.AssessmentVerification)
        .filter_by(id=verification_id, student_id=settings.DEMO_STUDENT_ID)
        .first()
    )
    if not verif:
        raise VerificationNotFoundError(verification_id)

    # Check if follow-up score needs recalculation
    if verif.follow_up_quiz_id and verif.status == "awaiting_follow_up":
        f_attempt = (
            db.query(models.QuizAttempt)
            .filter_by(quiz_id=verif.follow_up_quiz_id)
            .order_by(models.QuizAttempt.submitted_at.desc())
            .first()
        )
        if f_attempt:
            verif.follow_up_score = f_attempt.score_percentage
            if verif.initial_score is not None:
                verif.score_difference = round(verif.follow_up_score - verif.initial_score, 1)
            verif.status = "completed"
            db.commit()
            db.refresh(verif)

    if verif.status == "completed" and verif.score_difference is not None:
        message = (
            f"Measurable improvement verified: {verif.score_difference:+} percentage points."
            if verif.score_difference >= 0
            else f"Follow-up score change: {verif.score_difference} points. Review suggested."
        )
    else:
        message = "Awaiting follow-up assessment submission to calculate measurable score delta."

    data = VerificationData(
        id=verif.id,
        topic=verif.topic,
        material_id=verif.material_id,
        diagnostic_quiz_id=verif.diagnostic_quiz_id,
        follow_up_quiz_id=verif.follow_up_quiz_id,
        initial_score=verif.initial_score,
        follow_up_score=verif.follow_up_score,
        score_difference=verif.score_difference,
        status=verif.status,
        assessment_ids={
            "diagnostic_quiz_id": verif.diagnostic_quiz_id,
            "follow_up_quiz_id": verif.follow_up_quiz_id,
        },
        message=message,
    )
    return success_response(data.model_dump(), request)
