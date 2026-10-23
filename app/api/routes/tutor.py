import logging
from typing import List
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.response_utils import success_response
from app.core.config import get_settings
from app.core.errors import MaterialNotFoundError
from app.db import models
from app.db.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.tutor import SourceReference, TutorAskRequest, TutorData
from app.services.gemini_service import get_gemini_service
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tutor", tags=["AI Tutor"])
settings = get_settings()


@router.post(
    "/ask",
    response_model=ApiResponse[TutorData],
    summary="Ask AI Tutor Grounded in Study Material",
)
def ask_tutor(
    request: Request,
    payload: TutorAskRequest,
    db: Session = Depends(get_db),
):
    """
    Ask a question grounded exclusively in the student's study material.
    Returns page-level/section citations and abstains when evidence is insufficient.
    """
    material = (
        db.query(models.StudyMaterial)
        .filter_by(id=payload.material_id, student_id=settings.DEMO_STUDENT_ID)
        .first()
    )
    if not material:
        raise MaterialNotFoundError(payload.material_id)

    # Retrieve relevant chunks
    chunks, is_sufficient = RetrievalService.retrieve_relevant_chunks(
        db=db,
        material_id=material.id,
        query=payload.question,
        top_k=4,
    )

    # Abstain explicitly if evidence cannot be retrieved
    if not chunks or not is_sufficient:
        # Generate safe suggested follow-ups based on available material topics
        any_chunks = db.query(models.MaterialChunk).filter_by(material_id=material.id).limit(2).all()
        suggested_followups = [
            f"What are the main topics covered in '{material.title}'?",
            "Can you summarize the introduction of these notes?",
        ]
        if any_chunks:
            suggested_followups.append("Can you explain the key concepts in this material?")

        abstention_data = TutorData(
            answer=(
                "The supplied study material does not provide sufficient information to answer your question. "
                "LearnMate strictly avoids inventing facts or citations. Please verify that your uploaded material "
                "covers this subject or ask a question directly related to the notes."
            ),
            sources=[],
            grounded=False,
            insufficient_evidence=True,
            follow_up_questions=suggested_followups,
        )
        return success_response(abstention_data.model_dump(), request)

    # Format retrieved context with source references
    context_blocks: List[str] = []
    for c in chunks:
        ref_label = c.section_reference or (f"Page {c.page_number}" if c.page_number else "Section")
        context_blocks.append(f"[{ref_label}]:\n{c.content}")
    context_str = "\n\n".join(context_blocks)

    system_instruction = (
        "You are LearnMate's AI Personal Tutor. Your purpose is to help students learn by explaining concepts "
        "simply and clearly. STRICT REQUIREMENT: Base your answer EXCLUSIVELY on the provided material excerpts. "
        "Do not invent facts, external history, or page references. If the material partially answers the question, "
        "state what is covered and note what is missing. Provide exact supporting excerpts in the sources list."
    )

    prompt = f"""Student Question: {payload.question}
Target Learning Level: {payload.learning_level or 'intermediate'}

Retrieved Material Excerpts:
{context_str}

Respond with a JSON object adhering to this schema:
{{
  "answer": "Simple, grounded explanation addressing the student question at the requested learning level.",
  "sources": [
    {{
      "page_number": 1,
      "section_reference": "Page 1",
      "excerpt": "A direct, short quotation from the text supporting the explanation."
    }}
  ],
  "grounded": true,
  "insufficient_evidence": false,
  "follow_up_questions": [
    "First intuitive question to deepen student understanding",
    "Second relevant follow-up question"
  ]
}}"""

    gemini = get_gemini_service()
    res = gemini.generate_json(
        prompt=prompt,
        system_instruction=system_instruction,
        category="tutor",
        db=db,
    )

    # Parse and validate response
    sources: List[SourceReference] = []
    for s in res.get("sources", []):
        if isinstance(s, dict):
            sources.append(
                SourceReference(
                    page_number=s.get("page_number"),
                    section_reference=s.get("section_reference"),
                    excerpt=s.get("excerpt", "").strip(),
                )
            )

    tutor_data = TutorData(
        answer=res.get("answer", "No answer could be formulated from the material."),
        sources=sources,
        grounded=res.get("grounded", True),
        insufficient_evidence=res.get("insufficient_evidence", False),
        follow_up_questions=res.get("follow_up_questions", []),
    )

    return success_response(tutor_data.model_dump(), request)
