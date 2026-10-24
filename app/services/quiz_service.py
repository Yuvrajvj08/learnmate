import logging
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.errors import (
    AppException,
    InvalidSubmissionError,
    MaterialNotFoundError,
    QuizNotFoundError,
)
from app.db import models
from app.schemas.quizzes import (
    QuestionEvaluation,
    QuizResultData,
    TopicPerformance,
    UpdatedMasteryIndicator,
)
from app.services.gemini_service import get_gemini_service
from app.services.learning_service import LearningService

logger = logging.getLogger(__name__)


def normalize_option(opt: str) -> str:
    """Extract standard option identifier (e.g. 'A', 'B', 'C', 'D')."""
    clean = opt.strip()
    match = re.match(r"^([A-D])[\.\:\)\s]", clean, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    if len(clean) == 1 and clean.upper() in ["A", "B", "C", "D"]:
        return clean.upper()
    return clean


class QuizService:
    """Service to generate quizzes, grade attempts deterministically, and record feedback."""

    @classmethod
    def generate_quiz(
        cls,
        db: Session,
        student_id: str,
        material_id: str,
        quiz_type: str = "practice",
        topic: Optional[str] = None,
        question_count: int = 5,
        difficulty: str = "medium",
    ) -> models.QuizSession:
        """Generate a multiple-choice quiz from material content using Gemini."""
        material = db.query(models.StudyMaterial).filter_by(id=material_id).first()
        if not material:
            raise MaterialNotFoundError(material_id)

        chunks = (
            db.query(models.MaterialChunk)
            .filter_by(material_id=material_id)
            .order_by(models.MaterialChunk.chunk_position)
            .all()
        )
        if not chunks:
            raise AppException(
                code="NO_CONTENT_FOR_QUIZ",
                message="Cannot generate quiz because this study material has no extracted text content.",
                status_code=400,
            )

        # Build context from chunks (limit context to ~6000 chars to remain token-efficient)
        material_context = "\n---\n".join(
            [f"[{c.section_reference or 'Section'}]: {c.content}" for c in chunks[:8]]
        )

        topic_instruction = f"Focus particularly on the topic: '{topic}'." if topic else "Cover key concepts across the material."

        prompt = f"""You are a high-standard educational assessment engine.
Generate a {quiz_type} quiz consisting of {question_count} multiple-choice questions at '{difficulty}' difficulty.
{topic_instruction}

Ground all questions strictly in the following material notes. Do not hallucinate external facts:
{material_context}

Return a valid JSON object matching this exact schema:
{{
  "questions": [
    {{
      "question_number": 1,
      "prompt": "Clear, precise question prompt",
      "options": [
        "A. First plausible option",
        "B. Second plausible option",
        "C. Third plausible option",
        "D. Fourth plausible option"
      ],
      "correct_option": "A",
      "explanation": "Clear explanation of why this option is correct and why other options are incorrect based on the material.",
      "topic": "Specific subtopic or concept name"
    }}
  ]
}}"""

        gemini = get_gemini_service()
        gen_result = gemini.generate_json(
            prompt=prompt,
            category="quiz_generation",
            db=db,
        )

        questions_data = gen_result.get("questions", [])
        if not questions_data or not isinstance(questions_data, list):
            raise AppException(
                code="QUIZ_GENERATION_FAILED",
                message="AI service did not return valid quiz questions. Please try again.",
                status_code=500,
            )

        quiz = models.QuizSession(
            student_id=student_id,
            material_id=material_id,
            quiz_type=quiz_type,
            topic=topic or (questions_data[0].get("topic") if questions_data else "General"),
            difficulty=difficulty,
            question_count=len(questions_data),
        )
        db.add(quiz)
        db.flush()

        for idx, q_dict in enumerate(questions_data):
            q_num = q_dict.get("question_number", idx + 1)
            prompt_text = q_dict.get("prompt", f"Question {q_num}")
            options = q_dict.get("options", ["A. True", "B. False"])
            correct_opt = normalize_option(q_dict.get("correct_option", "A"))
            explanation = q_dict.get("explanation", "Refer to the study material for details.")
            q_topic = q_dict.get("topic") or quiz.topic or "General"

            question_obj = models.QuizQuestion(
                quiz_id=quiz.id,
                question_number=q_num,
                prompt=prompt_text,
                question_type="multiple_choice",
                correct_option=correct_opt,
                explanation=explanation,
                topic=q_topic,
            )
            question_obj.options = options
            db.add(question_obj)

        db.commit()
        db.refresh(quiz)
        return quiz

    @classmethod
    def evaluate_quiz_submission(
        cls,
        db: Session,
        student_id: str,
        quiz_id: str,
        submitted_answers: List[Dict[str, str]],
    ) -> QuizResultData:
        """
        Grade a submitted quiz attempt deterministically server-side.
        Update topic mastery and detect misconceptions.
        """
        quiz = db.query(models.QuizSession).filter_by(id=quiz_id).first()
        if not quiz:
            raise QuizNotFoundError(quiz_id)

        questions = (
            db.query(models.QuizQuestion)
            .filter_by(quiz_id=quiz_id)
            .order_by(models.QuizQuestion.question_number)
            .all()
        )
        if not questions:
            raise AppException(
                code="QUIZ_HAS_NO_QUESTIONS",
                message="This quiz has no questions associated with it.",
                status_code=400,
            )

        # Validate question IDs
        valid_question_ids = {q.id for q in questions}
        submitted_map = {}
        for ans in submitted_answers:
            qid = ans.get("question_id")
            if not qid or qid not in valid_question_ids:
                raise InvalidSubmissionError(
                    f"Question ID '{qid}' is not part of this quiz.",
                    details={"invalid_question_id": qid},
                )
            if qid in submitted_map:
                raise InvalidSubmissionError(
                    f"Duplicate answer submitted for question ID '{qid}'.",
                    details={"duplicate_question_id": qid},
                )
            submitted_map[qid] = ans.get("selected_option", "").strip()

        # Grade each question
        correct_count = 0
        evaluated_questions: List[QuestionEvaluation] = []
        topic_counts: Dict[str, Dict[str, int]] = {}
        affected_topics = set()

        for q in questions:
            selected_raw = submitted_map.get(q.id, "")
            selected_norm = normalize_option(selected_raw)
            correct_norm = normalize_option(q.correct_option)

            # Check correctness: match normalized letter or full option text match
            is_correct = bool(
                selected_raw
                and (
                    selected_norm == correct_norm
                    or selected_raw.lower() == q.correct_option.lower()
                )
            )

            if is_correct:
                correct_count += 1

            topic_name = q.topic or "General"
            affected_topics.add(topic_name)
            if topic_name not in topic_counts:
                topic_counts[topic_name] = {"total": 0, "correct": 0}
            topic_counts[topic_name]["total"] += 1
            if is_correct:
                topic_counts[topic_name]["correct"] += 1

            # Update topic mastery in real-time
            LearningService.update_topic_mastery(
                db=db,
                student_id=student_id,
                topic=topic_name,
                was_correct=is_correct,
            )

            # If incorrect, record a misconception
            if not is_correct and selected_raw:
                LearningService.record_misconception(
                    db=db,
                    student_id=student_id,
                    topic=topic_name,
                    question_prompt=q.prompt,
                    selected_option=selected_raw,
                    correct_option=q.correct_option,
                    explanation=q.explanation,
                )

            evaluated_questions.append(
                QuestionEvaluation(
                    question_id=q.id,
                    question_number=q.question_number,
                    prompt=q.prompt,
                    selected_option=selected_raw,
                    correct_option=q.correct_option,
                    is_correct=is_correct,
                    explanation=q.explanation,
                    topic=q.topic,
                )
            )

        total_questions = len(questions)
        score_percentage = round((correct_count / total_questions) * 100.0, 1) if total_questions > 0 else 0.0

        # Persist Attempt
        attempt = models.QuizAttempt(
            quiz_id=quiz.id,
            student_id=student_id,
            total_questions=total_questions,
            correct_count=correct_count,
            score_percentage=score_percentage,
        )
        db.add(attempt)
        db.flush()

        for q in questions:
            selected_raw = submitted_map.get(q.id, "")
            ans_record = models.QuizAttemptAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_option=selected_raw,
                is_correct=(normalize_option(selected_raw) == normalize_option(q.correct_option)),
            )
            db.add(ans_record)

        db.commit()

        # Build topic performance summary
        topic_performance: List[TopicPerformance] = []
        for t_name, counts in topic_counts.items():
            t_total = counts["total"]
            t_correct = counts["correct"]
            t_pct = round((t_correct / t_total) * 100.0, 1) if t_total > 0 else 0.0
            topic_performance.append(
                TopicPerformance(
                    topic=t_name,
                    total=t_total,
                    correct=t_correct,
                    percentage=t_pct,
                )
            )

        # Retrieve updated mastery indicators
        updated_mastery: List[UpdatedMasteryIndicator] = []
        for t_name in affected_topics:
            m = db.query(models.TopicMastery).filter_by(student_id=student_id, topic=t_name).first()
            if m:
                updated_mastery.append(
                    UpdatedMasteryIndicator(
                        topic=m.topic,
                        accuracy=m.accuracy,
                        status=m.status,
                        confidence=m.confidence,
                        recommended_action=m.recommended_action,
                    )
                )

        # Determine recommended next action
        if score_percentage >= 80.0:
            next_action = "Excellent performance! Generate a follow-up assessment or proceed to advanced topics."
        elif score_percentage >= 60.0:
            next_action = "Good foundation. Review explanations for missed questions and check your adaptive revision plan."
        else:
            next_action = "Several core misconceptions detected. Consult the AI Tutor for clarification and complete suggested revision tasks."

        return QuizResultData(
            quiz_id=quiz.id,
            attempt_id=attempt.id,
            total_questions=total_questions,
            correct_count=correct_count,
            score_percentage=score_percentage,
            questions=evaluated_questions,
            topic_performance=topic_performance,
            recommended_next_action=next_action,
            updated_mastery=updated_mastery,
        )
