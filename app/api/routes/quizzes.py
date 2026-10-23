from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.response_utils import success_response
from app.core.config import get_settings
from app.core.errors import QuizNotFoundError
from app.db import models
from app.db.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.quizzes import (
    QuizCreateRequest,
    QuizData,
    QuizQuestionPublic,
    QuizResultData,
    QuizSubmitRequest,
)
from app.services.quiz_service import QuizService

router = APIRouter(prefix="/quizzes", tags=["Quizzes & Practice"])
settings = get_settings()


@router.post(
    "",
    response_model=ApiResponse[QuizData],
    status_code=status.HTTP_201_CREATED,
    summary="Generate Quiz from Study Material",
)
def create_quiz(
    request: Request,
    payload: QuizCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a diagnostic, practice, or follow-up multiple-choice quiz grounded in study material.
    Answer keys are strictly withheld until submission.
    """
    quiz = QuizService.generate_quiz(
        db=db,
        student_id=settings.DEMO_STUDENT_ID,
        material_id=payload.material_id,
        quiz_type=payload.quiz_type or "practice",
        topic=payload.topic,
        question_count=payload.question_count or 5,
        difficulty=payload.difficulty or "medium",
    )

    questions_public = [
        QuizQuestionPublic(
            id=q.id,
            question_number=q.question_number,
            prompt=q.prompt,
            question_type=q.question_type,
            options=q.options,
            topic=q.topic,
        )
        for q in quiz.questions
    ]

    quiz_data = QuizData(
        id=quiz.id,
        material_id=quiz.material_id,
        quiz_type=quiz.quiz_type,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        question_count=len(questions_public),
        questions=questions_public,
        created_at=quiz.created_at,
    )
    return success_response(quiz_data.model_dump(), request)


@router.get(
    "/{quiz_id}",
    response_model=ApiResponse[QuizData],
    summary="Get Quiz Questions",
)
def get_quiz(
    quiz_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Retrieve quiz questions with grading keys safely hidden."""
    quiz = db.query(models.QuizSession).filter_by(id=quiz_id).first()
    if not quiz:
        raise QuizNotFoundError(quiz_id)

    questions_public = [
        QuizQuestionPublic(
            id=q.id,
            question_number=q.question_number,
            prompt=q.prompt,
            question_type=q.question_type,
            options=q.options,
            topic=q.topic,
        )
        for q in quiz.questions
    ]

    quiz_data = QuizData(
        id=quiz.id,
        material_id=quiz.material_id,
        quiz_type=quiz.quiz_type,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        question_count=len(questions_public),
        questions=questions_public,
        created_at=quiz.created_at,
    )
    return success_response(quiz_data.model_dump(), request)


@router.post(
    "/{quiz_id}/submit",
    response_model=ApiResponse[QuizResultData],
    summary="Submit Quiz Answers for Server-Side Grading",
)
def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Submit answers for objective server-side evaluation.
    Calculates score, reveals explanations, updates topic mastery, and records misconceptions.
    """
    raw_answers = [{"question_id": a.question_id, "selected_option": a.selected_option} for a in payload.answers]
    result = QuizService.evaluate_quiz_submission(
        db=db,
        student_id=settings.DEMO_STUDENT_ID,
        quiz_id=quiz_id,
        submitted_answers=raw_answers,
    )
    return success_response(result.model_dump(), request)
