from typing import List, Optional
from pydantic import BaseModel, Field


class TutorAskRequest(BaseModel):
    """Student query payload for the AI Tutor."""
    material_id: str = Field(..., description="ID of the study material to ground the answer in")
    question: str = Field(..., min_length=2, max_length=1000, description="Question asked by the student")
    learning_level: Optional[str] = Field("intermediate", description="Target explanation level: 'beginner', 'intermediate', or 'advanced'")


class SourceReference(BaseModel):
    """Citation reference back to the student's study material."""
    page_number: Optional[int] = Field(None, description="Page number for PDF documents")
    section_reference: Optional[str] = Field(None, description="Section or paragraph reference for notes")
    excerpt: str = Field(..., description="Supporting excerpt directly from the source")


class TutorData(BaseModel):
    """Structured response from the grounded AI Tutor."""
    answer: str = Field(..., description="Grounded explanation or explicit abstention message")
    sources: List[SourceReference] = Field(default_factory=list, description="Verified source citations")
    grounded: bool = Field(..., description="True if answer is directly derived from supplied material")
    insufficient_evidence: bool = Field(..., description="True if supplied material lacked sufficient information")
    follow_up_questions: List[str] = Field(default_factory=list, description="Relevant questions to deepen understanding")
