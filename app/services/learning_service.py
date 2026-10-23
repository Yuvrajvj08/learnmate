import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.db import models
from app.services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)


class LearningService:
    """Manages topic mastery tracking, misconception diagnosis, and knowledge gap calculations."""

    @classmethod
    def update_topic_mastery(
        cls,
        db: Session,
        student_id: str,
        topic: str,
        was_correct: bool,
    ) -> models.TopicMastery:
        """Update student mastery statistics for a given topic."""
        clean_topic = topic.strip() or "General"
        mastery = (
            db.query(models.TopicMastery)
            .filter_by(student_id=student_id, topic=clean_topic)
            .first()
        )

        if not mastery:
            mastery = models.TopicMastery(
                student_id=student_id,
                topic=clean_topic,
                total_attempts=0,
                correct_attempts=0,
                accuracy=0.0,
                status="not_enough_data",
                confidence="low",
                recommended_action="Complete more practice quizzes on this topic to calibrate mastery.",
            )
            db.add(mastery)
            db.flush()

        mastery.total_attempts += 1
        if was_correct:
            mastery.correct_attempts += 1

        accuracy = (mastery.correct_attempts / mastery.total_attempts) * 100.0
        mastery.accuracy = round(accuracy, 1)

        # Apply documented, transparent calibration thresholds
        if mastery.total_attempts < 3:
            mastery.status = "not_enough_data"
            mastery.confidence = "low"
            mastery.recommended_action = "Complete more practice quizzes on this topic to calibrate mastery."
        elif accuracy < 60.0:
            mastery.status = "weak"
            mastery.confidence = "high" if mastery.total_attempts >= 5 else "medium"
            mastery.recommended_action = "Review core foundational notes and complete a targeted practice quiz."
        elif accuracy < 80.0:
            mastery.status = "developing"
            mastery.confidence = "high" if mastery.total_attempts >= 5 else "medium"
            mastery.recommended_action = "Reinforce nuanced concepts with targeted practice questions."
        else:
            mastery.status = "strong"
            mastery.confidence = "high" if mastery.total_attempts >= 5 else "medium"
            mastery.recommended_action = "Mastery demonstrated. Move on to advanced topics or periodic review."

        db.commit()
        db.refresh(mastery)
        return mastery

    @classmethod
    def record_misconception(
        cls,
        db: Session,
        student_id: str,
        topic: str,
        question_prompt: str,
        selected_option: str,
        correct_option: str,
        explanation: str,
    ) -> models.Misconception:
        """
        Diagnose and persist a student misconception from an incorrect answer.
        Uses Gemini if available; gracefully falls back to deterministic rule-based analysis.
        """
        clean_topic = topic.strip() or "General"
        misconception_text = f"Confusion between option '{selected_option}' and correct concept '{correct_option}'."
        suggested_practice = f"Re-read study notes regarding {clean_topic} and clarify why '{correct_option}' is correct: {explanation}"
        confidence = "medium"

        gemini = get_gemini_service()
        try:
            if gemini.api_key and gemini.api_key.strip() != "your_gemini_api_key_here":
                prompt = f"""A student answered a multiple choice quiz question incorrectly.
Topic: {clean_topic}
Question: {question_prompt}
Student's Chosen Answer: {selected_option}
Correct Answer: {correct_option}
Explanation: {explanation}

Identify the likely underlying conceptual misconception and suggest a specific corrective practice activity.
Return a JSON object with:
{{
  "misconception": "Brief 1-2 sentence description of the student's likely misconception (do not present as absolute fact)",
  "suggested_practice": "Actionable 1-2 sentence recommendation for the student to overcome this misconception",
  "confidence": "medium"
}}"""
                result = gemini.generate_json(
                    prompt=prompt,
                    category="misconceptions",
                    db=db,
                )
                if isinstance(result, dict) and "misconception" in result:
                    misconception_text = result.get("misconception", misconception_text)
                    suggested_practice = result.get("suggested_practice", suggested_practice)
                    confidence = result.get("confidence", "medium")
        except Exception as e:
            logger.info(f"Using deterministic misconception detection (Gemini unavailable or bypassed): {e}")

        misconception = models.Misconception(
            student_id=student_id,
            topic=clean_topic,
            misconception_text=misconception_text,
            evidence_question=question_prompt,
            evidence_answer=f"Selected: {selected_option} (Correct: {correct_option})",
            suggested_practice=suggested_practice,
            confidence=confidence,
        )
        db.add(misconception)
        db.commit()
        db.refresh(misconception)
        return misconception

    @classmethod
    def get_knowledge_gaps(cls, db: Session, student_id: str) -> List[models.TopicMastery]:
        """Retrieve all tracked topics for the student."""
        return (
            db.query(models.TopicMastery)
            .filter_by(student_id=student_id)
            .order_by(models.TopicMastery.accuracy.asc())
            .all()
        )

    @classmethod
    def get_misconceptions(cls, db: Session, student_id: str) -> List[models.Misconception]:
        """Retrieve all recorded student misconceptions."""
        return (
            db.query(models.Misconception)
            .filter_by(student_id=student_id)
            .order_by(models.Misconception.detected_at.desc())
            .all()
        )
