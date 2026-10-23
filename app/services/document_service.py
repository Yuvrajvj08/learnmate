import re
from typing import List, Tuple
import pymupdf
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import (
    AppException,
    FileTooLargeError,
    InvalidFileTypeError,
    PageLimitExceededError,
)
from app.db import models

settings = get_settings()

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


class DocumentService:
    """Service for validating, extracting, and chunking PDFs and text notes."""

    @staticmethod
    def validate_file_size(content_bytes: bytes) -> None:
        """Validate uploaded file does not exceed MAX_UPLOAD_MB."""
        max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
        if len(content_bytes) > max_bytes:
            raise FileTooLargeError(max_mb=settings.MAX_UPLOAD_MB)

    @staticmethod
    def extract_pdf_pages(file_bytes: bytes) -> List[Tuple[int, str]]:
        """
        Extract text page-by-page from a PDF byte stream.
        Returns a list of (page_number, text) tuples where page_number is 1-indexed.
        """
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise AppException(
                code="MALFORMED_PDF",
                message=f"Could not parse PDF file: {str(e)}",
                status_code=400,
            )

        try:
            total_pages = len(doc)
            if total_pages > settings.MAX_PDF_PAGES:
                raise PageLimitExceededError(pages=total_pages, max_pages=settings.MAX_PDF_PAGES)

            pages_content: List[Tuple[int, str]] = []
            has_any_text = False

            for page_idx in range(total_pages):
                page = doc[page_idx]
                text = page.get_text("text").strip()
                if text:
                    has_any_text = True
                pages_content.append((page_idx + 1, text))

            if not has_any_text:
                raise AppException(
                    code="EMPTY_OR_SCANNED_PDF",
                    message="The uploaded PDF contains no extractable text (likely a scanned or image-only document). OCR is not supported in this version. Please upload a PDF with selectable text or paste study notes.",
                    status_code=400,
                )

            return pages_content
        finally:
            doc.close()

    @staticmethod
    def chunk_pdf(pages_content: List[Tuple[int, str]], material_id: str) -> List[models.MaterialChunk]:
        """Split page texts into granular, page-referenced chunks."""
        chunks: List[models.MaterialChunk] = []
        position = 0

        for page_num, text in pages_content:
            if not text:
                continue

            # Split by paragraphs or length
            paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
            if not paragraphs:
                paragraphs = [text]

            current_chunk = ""
            for p in paragraphs:
                if len(current_chunk) + len(p) + 2 <= CHUNK_SIZE:
                    current_chunk = f"{current_chunk}\n\n{p}".strip() if current_chunk else p
                else:
                    if current_chunk:
                        chunk_obj = models.MaterialChunk(
                            material_id=material_id,
                            page_number=page_num,
                            chunk_position=position,
                            section_reference=f"Page {page_num}",
                            content=current_chunk,
                            char_length=len(current_chunk),
                        )
                        chunks.append(chunk_obj)
                        position += 1

                    # Handle very long paragraphs by slicing
                    if len(p) > CHUNK_SIZE:
                        start = 0
                        while start < len(p):
                            slice_text = p[start : start + CHUNK_SIZE]
                            chunk_obj = models.MaterialChunk(
                                material_id=material_id,
                                page_number=page_num,
                                chunk_position=position,
                                section_reference=f"Page {page_num}",
                                content=slice_text,
                                char_length=len(slice_text),
                            )
                            chunks.append(chunk_obj)
                            position += 1
                            start += CHUNK_SIZE - CHUNK_OVERLAP
                        current_chunk = ""
                    else:
                        current_chunk = p

            if current_chunk:
                chunk_obj = models.MaterialChunk(
                    material_id=material_id,
                    page_number=page_num,
                    chunk_position=position,
                    section_reference=f"Page {page_num}",
                    content=current_chunk,
                    char_length=len(current_chunk),
                )
                chunks.append(chunk_obj)
                position += 1

        return chunks

    @staticmethod
    def chunk_text_notes(content: str, material_id: str) -> List[models.MaterialChunk]:
        """Split pasted notes into section/paragraph-referenced chunks."""
        chunks: List[models.MaterialChunk] = []
        position = 0

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
        if not paragraphs:
            paragraphs = [content.strip()]

        current_chunk = ""
        section_idx = 1
        for p in paragraphs:
            if len(current_chunk) + len(p) + 2 <= CHUNK_SIZE:
                current_chunk = f"{current_chunk}\n\n{p}".strip() if current_chunk else p
            else:
                if current_chunk:
                    chunk_obj = models.MaterialChunk(
                        material_id=material_id,
                        page_number=None,
                        chunk_position=position,
                        section_reference=f"Section {section_idx}",
                        content=current_chunk,
                        char_length=len(current_chunk),
                    )
                    chunks.append(chunk_obj)
                    position += 1
                    section_idx += 1

                if len(p) > CHUNK_SIZE:
                    start = 0
                    while start < len(p):
                        slice_text = p[start : start + CHUNK_SIZE]
                        chunk_obj = models.MaterialChunk(
                            material_id=material_id,
                            page_number=None,
                            chunk_position=position,
                            section_reference=f"Section {section_idx}",
                            content=slice_text,
                            char_length=len(slice_text),
                        )
                        chunks.append(chunk_obj)
                        position += 1
                        section_idx += 1
                        start += CHUNK_SIZE - CHUNK_OVERLAP
                    current_chunk = ""
                else:
                    current_chunk = p

        if current_chunk:
            chunk_obj = models.MaterialChunk(
                material_id=material_id,
                page_number=None,
                chunk_position=position,
                section_reference=f"Section {section_idx}",
                content=current_chunk,
                char_length=len(current_chunk),
            )
            chunks.append(chunk_obj)

        return chunks

    @classmethod
    def ingest_pdf(cls, db: Session, student_id: str, title: str, file_bytes: bytes) -> models.StudyMaterial:
        """Process and persist an uploaded PDF."""
        cls.validate_file_size(file_bytes)
        pages = cls.extract_pdf_pages(file_bytes)
        total_chars = sum(len(txt) for _, txt in pages)

        material = models.StudyMaterial(
            student_id=student_id,
            title=title,
            material_type="pdf",
            page_count=len(pages),
            char_count=total_chars,
            processing_status="completed",
        )
        db.add(material)
        db.flush()

        chunks = cls.chunk_pdf(pages, material.id)
        db.add_all(chunks)
        db.commit()
        db.refresh(material)
        return material

    @classmethod
    def ingest_text_notes(cls, db: Session, student_id: str, title: str, content: str) -> models.StudyMaterial:
        """Process and persist pasted text study material."""
        clean_content = content.strip()
        if not clean_content:
            raise AppException(code="EMPTY_CONTENT", message="Study notes content cannot be empty.", status_code=400)

        material = models.StudyMaterial(
            student_id=student_id,
            title=title,
            material_type="text",
            page_count=1,
            char_count=len(clean_content),
            processing_status="completed",
        )
        db.add(material)
        db.flush()

        chunks = cls.chunk_text_notes(clean_content, material.id)
        db.add_all(chunks)
        db.commit()
        db.refresh(material)
        return material
