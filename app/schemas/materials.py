from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class MaterialCreateText(BaseModel):
    """Payload to submit pasted study notes."""
    title: str = Field(..., min_length=1, max_length=256, description="Title of the study material")
    content: str = Field(..., min_length=10, description="Pasted study text or notes")


class MaterialUpdate(BaseModel):
    """Payload to update study material metadata (such as renaming title)."""
    title: str = Field(..., min_length=1, max_length=256, description="Updated title of the study material")


class MaterialChunkItem(BaseModel):
    """Chunk representation with source references."""
    id: str
    page_number: Optional[int] = None
    section_reference: Optional[str] = None
    chunk_position: int
    content: str
    char_length: int


class MaterialData(BaseModel):
    """Study material summary."""
    id: str
    student_id: str
    title: str
    material_type: str
    page_count: int
    char_count: int
    processing_status: str
    created_at: datetime
    updated_at: datetime


class MaterialDetailData(MaterialData):
    """Detailed study material including chunk statistics."""
    chunk_count: int


class MaterialContentData(BaseModel):
    """Material extracted content with chunks and page numbers."""
    id: str
    title: str
    material_type: str
    page_count: int
    chunks: List[MaterialChunkItem]


class MaterialListResponse(BaseModel):
    """List of student study materials with count."""
    materials: List[MaterialData]
    total: int


class MaterialDeleteData(BaseModel):
    """Material deletion confirmation."""
    id: str
    deleted: bool
    message: str
