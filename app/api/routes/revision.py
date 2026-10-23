from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.response_utils import success_response
from app.core.config import get_settings
from app.db.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.revision import (
    RevisionPlanData,
    RevisionTaskItem,
    RevisionTaskUpdate,
)
from app.services.revision_service import RevisionService

router = APIRouter(prefix="/revision-plan", tags=["Adaptive Revision Planner"])
settings = get_settings()


@router.get(
    "",
    response_model=ApiResponse[RevisionPlanData],
    summary="Get Current Revision Plan",
)
def get_revision_plan(request: Request, db: Session = Depends(get_db)):
    """Retrieve persisted revision tasks prioritized by urgency and topic mastery."""
    tasks = RevisionService.get_tasks(db, settings.DEMO_STUDENT_ID)
    items = [
        RevisionTaskItem(
            id=t.id,
            title=t.title,
            topic=t.topic,
            priority=t.priority,
            reason=t.reason,
            suggested_activity=t.suggested_activity,
            status=t.status,
            due_date=t.due_date,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in tasks
    ]

    pending = sum(1 for t in items if t.status in ["pending", "in_progress"])
    completed = sum(1 for t in items if t.status == "completed")

    data = RevisionPlanData(
        tasks=items,
        total_tasks=len(items),
        pending_tasks=pending,
        completed_tasks=completed,
    )
    return success_response(data.model_dump(), request)


@router.post(
    "/generate",
    response_model=ApiResponse[RevisionPlanData],
    summary="Generate or Update Adaptive Revision Tasks",
)
def generate_revision_plan(request: Request, db: Session = Depends(get_db)):
    """
    Generate or update recommendations using topic mastery, recent quiz performance,
    outstanding tasks, and previous attempts. Returns a transparent starter plan if no history exists.
    """
    tasks = RevisionService.generate_plan(db, settings.DEMO_STUDENT_ID)
    items = [
        RevisionTaskItem(
            id=t.id,
            title=t.title,
            topic=t.topic,
            priority=t.priority,
            reason=t.reason,
            suggested_activity=t.suggested_activity,
            status=t.status,
            due_date=t.due_date,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in tasks
    ]

    pending = sum(1 for t in items if t.status in ["pending", "in_progress"])
    completed = sum(1 for t in items if t.status == "completed")

    data = RevisionPlanData(
        tasks=items,
        total_tasks=len(items),
        pending_tasks=pending,
        completed_tasks=completed,
    )
    return success_response(data.model_dump(), request)


@router.patch(
    "/{task_id}",
    response_model=ApiResponse[RevisionTaskItem],
    summary="Update Revision Task Status",
)
def update_task_status(
    task_id: str,
    payload: RevisionTaskUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Update task status to 'pending', 'in_progress', or 'completed'."""
    task = RevisionService.update_task_status(
        db=db,
        student_id=settings.DEMO_STUDENT_ID,
        task_id=task_id,
        status=payload.status,
    )

    data = RevisionTaskItem(
        id=task.id,
        title=task.title,
        topic=task.topic,
        priority=task.priority,
        reason=task.reason,
        suggested_activity=task.suggested_activity,
        status=task.status,
        due_date=task.due_date,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )
    return success_response(data.model_dump(), request)
