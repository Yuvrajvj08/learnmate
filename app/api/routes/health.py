from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.response_utils import success_response
from app.core.config import get_settings
from app.db import models
from app.db.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.system import ConfigStatusData, HealthData

router = APIRouter(tags=["Health & System"])
settings = get_settings()


@router.get("/health", response_model=ApiResponse[HealthData], summary="System Health and Readiness")
def check_health(request: Request, db: Session = Depends(get_db)):
    """Return application status and verify database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    payload = HealthData(
        status="ok" if db_status == "connected" else "degraded",
        database=db_status,
        timestamp=datetime.now(timezone.utc),
    )
    return success_response(payload.model_dump(), request)


@router.get("/config/status", response_model=ApiResponse[ConfigStatusData], summary="System Configuration Status")
def get_config_status(request: Request, db: Session = Depends(get_db)):
    """Return safe readiness indicators without exposing secret keys."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    payload = ConfigStatusData(
        gemini_configured=settings.is_gemini_configured,
        model=settings.GEMINI_MODEL,
        database_status=db_status,
        max_pdf_pages=settings.MAX_PDF_PAGES,
        max_upload_mb=settings.MAX_UPLOAD_MB,
        environment=settings.ENVIRONMENT,
    )
    return success_response(payload.model_dump(), request)


@router.post("/demo/reset", summary="Development Demo Reset")
def reset_demo_data(request: Request, db: Session = Depends(get_db)):
    """
    Reset demo student data (materials, quizzes, mastery, misconceptions, revision tasks).
    Protected to prevent accidental execution in production.
    """
    if not settings.ALLOW_DEMO_RESET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo reset is disabled in this environment.",
        )

    student_id = settings.DEMO_STUDENT_ID

    # Delete records in cascading order
    db.query(models.QuizAttemptAnswer).filter(
        models.QuizAttemptAnswer.attempt_id.in_(
            db.query(models.QuizAttempt.id).filter_by(student_id=student_id)
        )
    ).delete(synchronize_session=False)

    db.query(models.QuizAttempt).filter_by(student_id=student_id).delete(synchronize_session=False)
    db.query(models.QuizQuestion).filter(
        models.QuizQuestion.quiz_id.in_(
            db.query(models.QuizSession.id).filter_by(student_id=student_id)
        )
    ).delete(synchronize_session=False)

    db.query(models.QuizSession).filter_by(student_id=student_id).delete(synchronize_session=False)
    db.query(models.AssessmentVerification).filter_by(student_id=student_id).delete(synchronize_session=False)
    db.query(models.RevisionTask).filter_by(student_id=student_id).delete(synchronize_session=False)
    db.query(models.Misconception).filter_by(student_id=student_id).delete(synchronize_session=False)
    db.query(models.TopicMastery).filter_by(student_id=student_id).delete(synchronize_session=False)

    db.query(models.MaterialChunk).filter(
        models.MaterialChunk.material_id.in_(
            db.query(models.StudyMaterial.id).filter_by(student_id=student_id)
        )
    ).delete(synchronize_session=False)

    db.query(models.StudyMaterial).filter_by(student_id=student_id).delete(synchronize_session=False)

    # Ensure demo student profile exists
    demo = db.query(models.StudentProfile).filter_by(id=student_id).first()
    if not demo:
        demo = models.StudentProfile(id=student_id, name="Demo Student", email="demo@learnmate.local")
        db.add(demo)

    db.commit()

    return success_response(
        {
            "status": "reset_completed",
            "student_id": student_id,
            "message": "Demo student data has been reset to a clean state.",
        },
        request,
    )
