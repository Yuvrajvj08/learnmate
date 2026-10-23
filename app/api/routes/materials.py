from typing import Optional
from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.response_utils import success_response
from app.core.config import get_settings
from app.core.errors import InvalidFileTypeError, MaterialNotFoundError
from app.db import models
from app.db.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.materials import (
    MaterialChunkItem,
    MaterialContentData,
    MaterialCreateText,
    MaterialData,
    MaterialDeleteData,
    MaterialDetailData,
    MaterialListResponse,
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/materials", tags=["Study Materials"])
settings = get_settings()


@router.post(
    "",
    response_model=ApiResponse[MaterialData],
    status_code=status.HTTP_201_CREATED,
    summary="Upload Study Material PDF",
)
async def upload_pdf_material(
    request: Request,
    file: UploadFile = File(..., description="PDF document (up to configured page/size limit)"),
    title: Optional[str] = Form(None, description="Optional title for the study material"),
    db: Session = Depends(get_db),
):
    """
    Upload and index a PDF document page-by-page.
    Extracts text, preserves page numbers, and breaks content into searchable chunks.
    """
    # Validate content-type or filename
    filename = file.filename or "uploaded_document.pdf"
    if not (filename.lower().endswith(".pdf") or file.content_type == "application/pdf"):
        raise InvalidFileTypeError("Uploaded file must be a PDF document.")

    content_bytes = await file.read()
    doc_title = (title or filename).strip() or "Untitled Document"

    material = DocumentService.ingest_pdf(
        db=db,
        student_id=settings.DEMO_STUDENT_ID,
        title=doc_title,
        file_bytes=content_bytes,
    )

    data = MaterialData(
        id=material.id,
        student_id=material.student_id,
        title=material.title,
        material_type=material.material_type,
        page_count=material.page_count,
        char_count=material.char_count,
        processing_status=material.processing_status,
        created_at=material.created_at,
        updated_at=material.updated_at,
    )
    return success_response(data.model_dump(), request)


@router.post(
    "/text",
    response_model=ApiResponse[MaterialData],
    status_code=status.HTTP_201_CREATED,
    summary="Add Pasted Study Notes",
)
def create_text_material(
    request: Request,
    payload: MaterialCreateText,
    db: Session = Depends(get_db),
):
    """Store and index pasted study notes with section references."""
    material = DocumentService.ingest_text_notes(
        db=db,
        student_id=settings.DEMO_STUDENT_ID,
        title=payload.title.strip(),
        content=payload.content,
    )

    data = MaterialData(
        id=material.id,
        student_id=material.student_id,
        title=material.title,
        material_type=material.material_type,
        page_count=material.page_count,
        char_count=material.char_count,
        processing_status=material.processing_status,
        created_at=material.created_at,
        updated_at=material.updated_at,
    )
    return success_response(data.model_dump(), request)


@router.get(
    "",
    response_model=ApiResponse[MaterialListResponse],
    summary="List Study Materials",
)
def list_materials(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve all study materials for the demo student with pagination."""
    query = (
        db.query(models.StudyMaterial)
        .filter_by(student_id=settings.DEMO_STUDENT_ID)
        .order_by(models.StudyMaterial.created_at.desc())
    )
    total = query.count()
    materials = query.offset(offset).limit(limit).all()

    items = [
        MaterialData(
            id=m.id,
            student_id=m.student_id,
            title=m.title,
            material_type=m.material_type,
            page_count=m.page_count,
            char_count=m.char_count,
            processing_status=m.processing_status,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in materials
    ]

    response_data = MaterialListResponse(materials=items, total=total)
    return success_response(response_data.model_dump(), request)


@router.get(
    "/{material_id}",
    response_model=ApiResponse[MaterialDetailData],
    summary="Get Study Material Metadata",
)
def get_material(
    material_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Retrieve metadata and chunk statistics for a single study material."""
    material = (
        db.query(models.StudyMaterial)
        .filter_by(id=material_id, student_id=settings.DEMO_STUDENT_ID)
        .first()
    )
    if not material:
        raise MaterialNotFoundError(material_id)

    chunk_count = db.query(models.MaterialChunk).filter_by(material_id=material.id).count()

    data = MaterialDetailData(
        id=material.id,
        student_id=material.student_id,
        title=material.title,
        material_type=material.material_type,
        page_count=material.page_count,
        char_count=material.char_count,
        processing_status=material.processing_status,
        chunk_count=chunk_count,
        created_at=material.created_at,
        updated_at=material.updated_at,
    )
    return success_response(data.model_dump(), request)


@router.get(
    "/{material_id}/content",
    response_model=ApiResponse[MaterialContentData],
    summary="Get Study Material Extracted Content",
)
def get_material_content(
    material_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Retrieve extracted chunks with page/section numbers."""
    material = (
        db.query(models.StudyMaterial)
        .filter_by(id=material_id, student_id=settings.DEMO_STUDENT_ID)
        .first()
    )
    if not material:
        raise MaterialNotFoundError(material_id)

    chunks = (
        db.query(models.MaterialChunk)
        .filter_by(material_id=material_id)
        .order_by(models.MaterialChunk.chunk_position)
        .all()
    )

    chunk_items = [
        MaterialChunkItem(
            id=c.id,
            page_number=c.page_number,
            section_reference=c.section_reference,
            chunk_position=c.chunk_position,
            content=c.content,
            char_length=c.char_length,
        )
        for c in chunks
    ]

    data = MaterialContentData(
        id=material.id,
        title=material.title,
        material_type=material.material_type,
        page_count=material.page_count,
        chunks=chunk_items,
    )
    return success_response(data.model_dump(), request)


@router.delete(
    "/{material_id}",
    response_model=ApiResponse[MaterialDeleteData],
    summary="Delete Study Material",
)
def delete_material(
    material_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Delete study material and its indexed chunks. Associated quiz sessions retain material_id=NULL."""
    material = (
        db.query(models.StudyMaterial)
        .filter_by(id=material_id, student_id=settings.DEMO_STUDENT_ID)
        .first()
    )
    if not material:
        raise MaterialNotFoundError(material_id)

    db.delete(material)
    db.commit()

    return success_response(
        MaterialDeleteData(
            id=material_id,
            deleted=True,
            message="Study material and its indexed chunks were deleted successfully.",
        ).model_dump(),
        request,
    )
