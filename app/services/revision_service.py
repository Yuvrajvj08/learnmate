import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.errors import TaskNotFoundError
from app.db import models

logger = logging.getLogger(__name__)


class RevisionService:
    """Generates and manages adaptive revision tasks grounded in student mastery and quiz history."""

    @classmethod
    def get_tasks(cls, db: Session, student_id: str) -> List[models.RevisionTask]:
        """Fetch all revision tasks for the student, sorted by priority and date."""
        priority_order = {"high": 1, "medium": 2, "low": 3}
        tasks = db.query(models.RevisionTask).filter_by(student_id=student_id).all()
        tasks.sort(key=lambda t: (priority_order.get(t.priority, 2), t.created_at))
        return tasks

    @classmethod
    def update_task_status(cls, db: Session, student_id: str, task_id: str, status: str) -> models.RevisionTask:
        """Update status of a revision task ('pending', 'in_progress', 'completed')."""
        task = db.query(models.RevisionTask).filter_by(id=task_id, student_id=student_id).first()
        if not task:
            raise TaskNotFoundError(task_id)

        task.status = status
        db.commit()
        db.refresh(task)
        return task

    @classmethod
    def generate_plan(cls, db: Session, student_id: str) -> List[models.RevisionTask]:
        """
        Generate or update adaptive revision tasks based on real mastery data, misconceptions, and quizzes.
        If no quiz history exists, generates a clearly identified starter plan.
        """
        mastery_list = db.query(models.TopicMastery).filter_by(student_id=student_id).all()
        misconceptions = db.query(models.Misconception).filter_by(student_id=student_id).all()
        existing_tasks = db.query(models.RevisionTask).filter_by(student_id=student_id).all()
        existing_topics = {t.topic.lower() for t in existing_tasks if t.status != "completed"}

        new_tasks: List[models.RevisionTask] = []

        # Case 1: No learning history exists -> create transparent Starter Plan
        if not mastery_list and not misconceptions:
            if not existing_tasks:
                starter_tasks = [
                    models.RevisionTask(
                        student_id=student_id,
                        title="Upload Study Material & Take Diagnostic Quiz",
                        topic="Orientation & Diagnostic",
                        priority="high",
                        reason="No quiz attempts recorded yet. A diagnostic assessment is needed to map knowledge gaps.",
                        suggested_activity="Upload a PDF or paste notes, then run a Diagnostic Quiz from the Quizzes tab.",
                        status="pending",
                        due_date="Today",
                    ),
                    models.RevisionTask(
                        student_id=student_id,
                        title="Consult AI Tutor for Concept Exploration",
                        topic="Foundations",
                        priority="medium",
                        reason="Exploring definitions early establishes strong foundational retention.",
                        suggested_activity="Ask the AI Tutor 2-3 questions about your primary study topics.",
                        status="pending",
                        due_date="Within 2 days",
                    ),
                ]
                db.add_all(starter_tasks)
                db.commit()
                return starter_tasks
            return existing_tasks

        # Case 2: Student has mastery records and/or misconceptions
        # 1. High priority for weak topics
        for m in mastery_list:
            if m.status == "weak" and m.topic.lower() not in existing_topics:
                task = models.RevisionTask(
                    student_id=student_id,
                    title=f"Review Core Concepts: {m.topic}",
                    topic=m.topic,
                    priority="high",
                    reason=f"Current accuracy is {m.accuracy}% ({m.status}). Evidence shows recurring difficulty on this topic.",
                    suggested_activity=f"Ask the AI Tutor to explain {m.topic} with beginner-level analogies, then retake a 5-question practice quiz.",
                    status="pending",
                    due_date="Immediate",
                )
                db.add(task)
                new_tasks.append(task)
                existing_topics.add(m.topic.lower())

        # 2. High priority for recent misconceptions
        for misc in misconceptions[:3]:  # Top 3 most recent misconceptions
            if misc.topic.lower() not in existing_topics:
                task = models.RevisionTask(
                    student_id=student_id,
                    title=f"Clarify Misconception: {misc.topic}",
                    topic=misc.topic,
                    priority="high",
                    reason=f"Detected conceptual confusion: {misc.misconception_text}",
                    suggested_activity=misc.suggested_practice,
                    status="pending",
                    due_date="Today",
                )
                db.add(task)
                new_tasks.append(task)
                existing_topics.add(misc.topic.lower())

        # 3. Medium priority for developing topics
        for m in mastery_list:
            if m.status == "developing" and m.topic.lower() not in existing_topics:
                task = models.RevisionTask(
                    student_id=student_id,
                    title=f"Strengthen Nuances in {m.topic}",
                    topic=m.topic,
                    priority="medium",
                    reason=f"Current accuracy is {m.accuracy}%. Good baseline understanding, needs practice on edge cases.",
                    suggested_activity=f"Generate a practice quiz on {m.topic} with medium/hard difficulty.",
                    status="pending",
                    due_date="Within 3 days",
                )
                db.add(task)
                new_tasks.append(task)
                existing_topics.add(m.topic.lower())

        # 4. Low priority for strong topics (spaced repetition)
        for m in mastery_list:
            if m.status == "strong" and m.topic.lower() not in existing_topics:
                task = models.RevisionTask(
                    student_id=student_id,
                    title=f"Spaced Review: {m.topic}",
                    topic=m.topic,
                    priority="low",
                    reason=f"Strong mastery ({m.accuracy}%). Periodic review ensures long-term memory retention.",
                    suggested_activity="Quick 3-question follow-up check to maintain mastery.",
                    status="pending",
                    due_date="Next week",
                )
                db.add(task)
                new_tasks.append(task)
                existing_topics.add(m.topic.lower())

        if new_tasks:
            db.commit()

        return cls.get_tasks(db, student_id)
