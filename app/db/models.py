import uuid
from datetime import datetime, timezone
import json
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


def utc_now() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    """Generate a unique hex string ID."""
    return uuid.uuid4().hex


class StudentProfile(Base):
    """Demo student profile model."""
    __tablename__ = "student_profiles"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False, default="Demo Student")
    email = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    materials = relationship("StudyMaterial", back_populates="student", cascade="all, delete-orphan")
    quizzes = relationship("QuizSession", back_populates="student", cascade="all, delete-orphan")
    mastery_records = relationship("TopicMastery", back_populates="student", cascade="all, delete-orphan")
    misconceptions = relationship("Misconception", back_populates="student", cascade="all, delete-orphan")
    revision_tasks = relationship("RevisionTask", back_populates="student", cascade="all, delete-orphan")


class StudyMaterial(Base):
    """Uploaded PDF or pasted study material."""
    __tablename__ = "study_materials"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    material_type = Column(String(32), nullable=False)  # 'pdf' or 'text'
    page_count = Column(Integer, default=1, nullable=False)
    char_count = Column(Integer, default=0, nullable=False)
    processing_status = Column(String(32), default="completed", nullable=False)  # 'pending', 'completed', 'failed'
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    student = relationship("StudentProfile", back_populates="materials")
    chunks = relationship("MaterialChunk", back_populates="material", cascade="all, delete-orphan", order_by="MaterialChunk.chunk_position")
    quizzes = relationship("QuizSession", back_populates="material")


class MaterialChunk(Base):
    """Chunked segments of study material for precise grounding and retrieval."""
    __tablename__ = "material_chunks"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    material_id = Column(String(64), ForeignKey("study_materials.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=True)  # 1-indexed page for PDFs, None or section for text
    chunk_position = Column(Integer, nullable=False)  # Sequential order in the document
    section_reference = Column(String(128), nullable=True)  # e.g., "Page 3", "Section 1"
    content = Column(Text, nullable=False)
    char_length = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    material = relationship("StudyMaterial", back_populates="chunks")

    __table_args__ = (
        Index("ix_chunks_material_position", "material_id", "chunk_position"),
    )


class QuizSession(Base):
    """A generated quiz associated with a material and student."""
    __tablename__ = "quiz_sessions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    material_id = Column(String(64), ForeignKey("study_materials.id", ondelete="SET NULL"), nullable=True, index=True)
    quiz_type = Column(String(32), nullable=False, default="practice")  # 'diagnostic', 'practice', 'follow_up'
    topic = Column(String(128), nullable=True, index=True)
    difficulty = Column(String(32), default="medium", nullable=False)  # 'easy', 'medium', 'hard'
    question_count = Column(Integer, nullable=False, default=5)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    student = relationship("StudentProfile", back_populates="quizzes")
    material = relationship("StudyMaterial", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.question_number")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan", order_by="desc(QuizAttempt.submitted_at)")


class QuizQuestion(Base):
    """Individual question within a quiz."""
    __tablename__ = "quiz_questions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    quiz_id = Column(String(64), ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    prompt = Column(Text, nullable=False)
    question_type = Column(String(32), default="multiple_choice", nullable=False)
    options_json = Column(Text, nullable=False)  # JSON-encoded list of options: ["Option A", "Option B", ...]
    correct_option = Column(String(32), nullable=False)  # e.g. "A" or option index/text
    explanation = Column(Text, nullable=False)
    topic = Column(String(128), nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    quiz = relationship("QuizSession", back_populates="questions")

    @property
    def options(self) -> List[str]:
        """Decode options JSON into python list."""
        try:
            return json.loads(self.options_json)
        except Exception:
            return []

    @options.setter
    def options(self, val: List[str]) -> None:
        """Encode options list to JSON."""
        self.options_json = json.dumps(val)


class QuizAttempt(Base):
    """Record of a submitted quiz attempt."""
    __tablename__ = "quiz_attempts"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    quiz_id = Column(String(64), ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    total_questions = Column(Integer, nullable=False)
    correct_count = Column(Integer, nullable=False)
    score_percentage = Column(Float, nullable=False)
    submitted_at = Column(DateTime, default=utc_now, nullable=False)

    quiz = relationship("QuizSession", back_populates="attempts")
    answers = relationship("QuizAttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAttemptAnswer(Base):
    """Submitted answer detail for a question in a quiz attempt."""
    __tablename__ = "quiz_attempt_answers"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(64), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(64), ForeignKey("quiz_questions.id"), nullable=False, index=True)
    selected_option = Column(String(64), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("QuizQuestion")


class TopicMastery(Base):
    """Student mastery estimate per topic based on quiz performance."""
    __tablename__ = "topic_mastery"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    topic = Column(String(128), nullable=False, index=True)
    total_attempts = Column(Integer, default=0, nullable=False)
    correct_attempts = Column(Integer, default=0, nullable=False)
    accuracy = Column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    status = Column(String(32), default="not_enough_data", nullable=False)  # 'not_enough_data', 'weak', 'developing', 'strong'
    confidence = Column(String(32), default="low", nullable=False)  # 'low', 'medium', 'high'
    recommended_action = Column(String(256), nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    student = relationship("StudentProfile", back_populates="mastery_records")

    __table_args__ = (
        Index("ix_student_topic", "student_id", "topic", unique=True),
    )


class Misconception(Base):
    """Detected student misconception identified from incorrect answers."""
    __tablename__ = "misconceptions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    topic = Column(String(128), nullable=False, index=True)
    misconception_text = Column(Text, nullable=False)
    evidence_question = Column(Text, nullable=False)
    evidence_answer = Column(String(128), nullable=False)
    suggested_practice = Column(Text, nullable=False)
    confidence = Column(String(32), default="medium", nullable=False)  # 'low', 'medium', 'high'
    detected_at = Column(DateTime, default=utc_now, nullable=False)

    student = relationship("StudentProfile", back_populates="misconceptions")


class RevisionTask(Base):
    """Personalised revision task item in the adaptive study plan."""
    __tablename__ = "revision_tasks"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    topic = Column(String(128), nullable=False, index=True)
    priority = Column(String(32), default="medium", nullable=False)  # 'high', 'medium', 'low'
    reason = Column(Text, nullable=False)
    suggested_activity = Column(Text, nullable=False)
    status = Column(String(32), default="pending", nullable=False)  # 'pending', 'in_progress', 'completed'
    due_date = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    student = relationship("StudentProfile", back_populates="revision_tasks")


class AssessmentVerification(Base):
    """Comparison between initial diagnostic assessment and follow-up assessment."""
    __tablename__ = "assessment_verifications"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    material_id = Column(String(64), ForeignKey("study_materials.id", ondelete="SET NULL"), nullable=True)
    topic = Column(String(128), nullable=False, index=True)
    diagnostic_quiz_id = Column(String(64), ForeignKey("quiz_sessions.id", ondelete="SET NULL"), nullable=True)
    follow_up_quiz_id = Column(String(64), ForeignKey("quiz_sessions.id", ondelete="SET NULL"), nullable=True)
    initial_score = Column(Float, nullable=True)
    follow_up_score = Column(Float, nullable=True)
    score_difference = Column(Float, nullable=True)  # follow_up_score - initial_score
    status = Column(String(32), default="awaiting_follow_up", nullable=False)  # 'completed', 'awaiting_follow_up'
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class GeminiUsageRecord(Base):
    """Usage tracking for Gemini API calls."""
    __tablename__ = "gemini_usage_records"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    request_category = Column(String(64), nullable=False, index=True)  # 'tutor', 'quiz_gen', 'misconceptions', 'revision'
    model = Column(String(64), nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    candidate_tokens = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    is_estimated = Column(Boolean, default=False, nullable=False)
    status = Column(String(32), default="success", nullable=False)  # 'success', 'error'
    error_message = Column(Text, nullable=True)
