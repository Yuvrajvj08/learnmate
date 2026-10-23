from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class KnowledgeGapItem(BaseModel):
    """Topic mastery indicator with actionable recommendation."""
    topic: str
    accuracy: float
    attempts_count: int
    confidence: str
    status: str  # 'weak', 'developing', 'strong', 'not_enough_data'
    recommended_action: str


class KnowledgeGapList(BaseModel):
    """List of knowledge gaps."""
    topics: List[KnowledgeGapItem]
    total_topics: int


class MisconceptionItem(BaseModel):
    """Specific student misconception with concrete evidence."""
    id: str
    topic: str
    misconception_text: str
    evidence_question: str
    evidence_answer: str
    suggested_practice: str
    confidence: str
    detected_at: datetime


class MisconceptionList(BaseModel):
    """List of detected misconceptions."""
    misconceptions: List[MisconceptionItem]
    total_misconceptions: int


class VerificationCreateRequest(BaseModel):
    """Request to initiate a diagnostic vs follow-up assessment verification."""
    topic: str = Field(..., min_length=2, max_length=128, description="Topic to verify learning improvement for")
    material_id: Optional[str] = Field(None, description="Optional associated study material ID")


class VerificationData(BaseModel):
    """Initial vs follow-up assessment score comparison."""
    id: str
    topic: str
    material_id: Optional[str] = None
    diagnostic_quiz_id: Optional[str] = None
    follow_up_quiz_id: Optional[str] = None
    initial_score: Optional[float] = None
    follow_up_score: Optional[float] = None
    score_difference: Optional[float] = None  # Percentage points gained or lost
    status: str  # 'completed', 'awaiting_follow_up'
    assessment_ids: Dict[str, Optional[str]]
    message: str


class ActivityItem(BaseModel):
    """Summary of recent student activity."""
    type: str  # 'material_upload', 'quiz_attempt', 'task_completed'
    title: str
    timestamp: datetime
    details: Dict[str, Any] = Field(default_factory=dict)


class ProgressData(BaseModel):
    """Comprehensive learning progress statistics."""
    total_materials: int
    total_quizzes: int
    total_attempts: int
    average_score: float
    questions_answered: int
    recent_activity: List[ActivityItem]
    topic_trends: List[KnowledgeGapItem]
    verifications: List[VerificationData]
