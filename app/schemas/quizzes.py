from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class QuizCreateRequest(BaseModel):
    """Payload to generate a new quiz."""
    material_id: str = Field(..., description="ID of the study material to generate questions from")
    quiz_type: Optional[str] = Field("practice", description="Type of quiz: 'diagnostic', 'practice', or 'follow_up'")
    topic: Optional[str] = Field(None, description="Optional specific topic to focus on")
    question_count: Optional[int] = Field(5, ge=1, le=15, description="Number of questions to generate (1-15)")
    difficulty: Optional[str] = Field("medium", description="Difficulty level: 'easy', 'medium', or 'hard'")


class QuizQuestionPublic(BaseModel):
    """Public question representation that strictly conceals correct answers."""
    id: str
    question_number: int
    prompt: str
    question_type: str
    options: List[str]
    topic: Optional[str] = None


class QuizData(BaseModel):
    """Quiz session details presented to the student."""
    id: str
    material_id: Optional[str] = None
    quiz_type: str
    topic: Optional[str] = None
    difficulty: str
    question_count: int
    questions: List[QuizQuestionPublic]
    created_at: datetime


class AnswerSubmission(BaseModel):
    """Submitted answer for a specific question."""
    question_id: str = Field(..., description="ID of the question being answered")
    selected_option: str = Field(..., description="Option letter or text selected (e.g. 'A', 'B', 'Option 1')")


class QuizSubmitRequest(BaseModel):
    """List of submitted answers for a quiz."""
    answers: List[AnswerSubmission] = Field(..., min_length=1, description="List of submitted question answers")


class QuestionEvaluation(BaseModel):
    """Post-submission evaluation of an individual question."""
    question_id: str
    question_number: int
    prompt: str
    selected_option: str
    correct_option: str
    is_correct: bool
    explanation: str
    topic: Optional[str] = None


class TopicPerformance(BaseModel):
    """Topic-specific score breakdown within a quiz attempt."""
    topic: str
    total: int
    correct: int
    percentage: float


class UpdatedMasteryIndicator(BaseModel):
    """Real-time update on student mastery for a topic."""
    topic: str
    accuracy: float
    status: str
    confidence: str
    recommended_action: str


class QuizResultData(BaseModel):
    """Complete grading results and feedback for a submitted quiz attempt."""
    quiz_id: str
    attempt_id: str
    total_questions: int
    correct_count: int
    score_percentage: float
    questions: List[QuestionEvaluation]
    topic_performance: List[TopicPerformance]
    recommended_next_action: str
    updated_mastery: List[UpdatedMasteryIndicator]
