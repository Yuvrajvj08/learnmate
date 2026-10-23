from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class RevisionTaskItem(BaseModel):
    """Individual revision task."""
    id: str
    title: str
    topic: str
    priority: str  # 'high', 'medium', 'low'
    reason: str
    suggested_activity: str
    status: str  # 'pending', 'in_progress', 'completed'
    due_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RevisionPlanData(BaseModel):
    """Personalised revision plan collection."""
    tasks: List[RevisionTaskItem]
    total_tasks: int
    pending_tasks: int
    completed_tasks: int


class RevisionTaskUpdate(BaseModel):
    """Payload to update revision task status."""
    status: str = Field(..., pattern="^(pending|in_progress|completed)$", description="New task status: 'pending', 'in_progress', or 'completed'")
