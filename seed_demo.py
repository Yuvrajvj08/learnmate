"""
Demo Seed Script for LearnMate Backend.
Populates deterministic sample study materials, quizzes, attempts,
knowledge gaps, and revision tasks for rapid local frontend testing.
"""
import sys
from app.db.database import SessionLocal, init_db
from app.db import models
from app.core.config import get_settings
from app.services.document_service import DocumentService
from app.services.quiz_service import QuizService
from app.services.revision_service import RevisionService

settings = get_settings()

SAMPLE_NOTES = """Cellular Energetics and Molecular Genetics

1. Cellular Respiration:
Cellular respiration is the biochemical process that converts chemical energy from glucose into ATP.
It consists of three stages: Glycolysis, the Citric Acid Cycle (Krebs cycle), and Oxidative Phosphorylation.
Glycolysis occurs in the cytoplasm (cytosol) and breaks one glucose molecule into two pyruvate molecules, producing a net yield of 2 ATP and 2 NADH without requiring oxygen.

2. Mitochondrial Function:
Mitochondria are double-membraned organelles known as the powerhouse of eukaryotic cells.
The Citric Acid Cycle takes place in the mitochondrial matrix.
The Electron Transport Chain (ETC) and ATP synthase reside within the inner mitochondrial cristae, generating approximately 30-32 ATP molecules per glucose under aerobic conditions.

3. Molecular Genetics & DNA Replication:
DNA replication is semi-conservative: each daughter molecule contains one parental strand and one newly synthesized strand.
DNA Helicase unwinds the double helix, while DNA Polymerase synthesizes new complementary strands in the 5' to 3' direction.
Transcription converts DNA into messenger RNA (mRNA) in the nucleus, and translation synthesizes polypeptide chains on ribosomes in the cytoplasm."""


def seed_demo_data():
    print("Initializing LearnMate Database...")
    init_db()
    db = SessionLocal()

    try:
        student_id = settings.DEMO_STUDENT_ID
        print(f"Targeting Student: {student_id}")

        # Clean existing demo student data
        print("Cleaning previous demo data...")
        db.query(models.QuizAttemptAnswer).filter(
            models.QuizAttemptAnswer.attempt_id.in_(
                db.query(models.QuizAttempt.id).filter_by(student_id=student_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.QuizAttempt).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(models.QuizQuestion).filter(
            models.QuizQuestion.quiz_id.in_(
                db.query(models.QuizSession.id).filter_by(student_id=student_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.QuizSession).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(models.AssessmentVerification).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(models.RevisionTask).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(models.Misconception).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(models.TopicMastery).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(models.MaterialChunk).filter(
            models.MaterialChunk.material_id.in_(
                db.query(models.StudyMaterial.id).filter_by(student_id=student_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.StudyMaterial).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.commit()

        # Ingest Study Material
        print("Ingesting sample study material...")
        mat = DocumentService.ingest_text_notes(
            db=db,
            student_id=student_id,
            title="Cellular Energetics & Molecular Genetics",
            content=SAMPLE_NOTES,
        )
        print(f"-> Material Created: '{mat.title}' (ID: {mat.id}) with {len(mat.chunks)} chunks")

        # Create Diagnostic Quiz
        print("Creating diagnostic quiz...")
        quiz = models.QuizSession(
            student_id=student_id,
            material_id=mat.id,
            quiz_type="diagnostic",
            topic="Cellular Energetics",
            difficulty="medium",
            question_count=3,
        )
        db.add(quiz)
        db.flush()

        q1 = models.QuizQuestion(
            quiz_id=quiz.id,
            question_number=1,
            prompt="Where does glycolysis occur within a eukaryotic cell?",
            question_type="multiple_choice",
            correct_option="A",
            explanation="Glycolysis occurs in the cytoplasm (cytosol) and does not require oxygen.",
            topic="Cellular Energetics",
        )
        q1.options = [
            "A. Cytoplasm (Cytosol)",
            "B. Mitochondrial Matrix",
            "C. Inner Cristae",
            "D. Endoplasmic Reticulum",
        ]

        q2 = models.QuizQuestion(
            quiz_id=quiz.id,
            question_number=2,
            prompt="Which organelle generates the vast majority of cellular ATP during aerobic respiration?",
            question_type="multiple_choice",
            correct_option="B",
            explanation="Mitochondria generate ~30-32 ATP through the Krebs cycle and oxidative phosphorylation.",
            topic="Mitochondrial Function",
        )
        q2.options = [
            "A. Golgi Apparatus",
            "B. Mitochondria",
            "C. Lysosome",
            "D. Vacuole",
        ]

        q3 = models.QuizQuestion(
            quiz_id=quiz.id,
            question_number=3,
            prompt="In what direction does DNA polymerase synthesize new DNA strands?",
            question_type="multiple_choice",
            correct_option="C",
            explanation="DNA polymerase always synthesizes in the 5' to 3' direction.",
            topic="Molecular Genetics",
        )
        q3.options = [
            "A. 3' to 5' only",
            "B. Both directions simultaneously",
            "C. 5' to 3' only",
            "D. Non-directionally",
        ]
        db.add_all([q1, q2, q3])
        db.commit()
        print(f"-> Diagnostic Quiz Created (ID: {quiz.id})")

        # Submit attempt with 2 correct, 1 wrong to calibrate mastery and misconception
        print("Simulating student quiz submission...")
        submission = [
            {"question_id": q1.id, "selected_option": "A"},  # Correct
            {"question_id": q2.id, "selected_option": "B"},  # Correct
            {"question_id": q3.id, "selected_option": "A"},  # Wrong (selected 3' to 5')
        ]
        res = QuizService.evaluate_quiz_submission(
            db=db,
            student_id=student_id,
            quiz_id=quiz.id,
            submitted_answers=submission,
        )
        print(f"-> Attempt graded: {res.correct_count}/{res.total_questions} ({res.score_percentage}%)")

        # Generate Adaptive Revision Plan
        print("Generating adaptive revision plan...")
        tasks = RevisionService.generate_plan(db, student_id)
        print(f"-> Generated {len(tasks)} personalized revision tasks.")

        print("\n=== Demo Seed Completed Successfully ===")
        print(f"Demo Student ID: {student_id}")
        print(f"Sample Material ID: {mat.id}")
        print(f"Sample Quiz ID: {quiz.id}")
        print("You can now start the server and connect your Stitch frontend or inspect /docs!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
