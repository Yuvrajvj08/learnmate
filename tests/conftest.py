import os
import tempfile
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import pymupdf

# Set testing environment before importing app
os.environ["DATABASE_URL"] = "sqlite:///./test_learnmate.db"
os.environ["ALLOW_DEMO_RESET"] = "true"
os.environ["MAX_PDF_PAGES"] = "20"
os.environ["MAX_UPLOAD_MB"] = "10"

from app.core.config import get_settings
from app.db.database import Base, get_db
from app.db import models
from app.main import app
from app.services.gemini_service import get_gemini_service, GeminiService

TEST_DB_FILE = "./test_learnmate.db"
test_engine = create_engine(
    f"sqlite:///{TEST_DB_FILE}",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create test tables once for the test session."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Seed demo student
    db = TestingSessionLocal()
    demo = models.StudentProfile(id="demo-student-001", name="Demo Student", email="demo@learnmate.local")
    db.add(demo)
    db.commit()
    db.close()

    yield

    # Clean up test DB file after tests
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide an isolated database session per test function."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Ensure demo profile exists in this transaction
    demo = session.query(models.StudentProfile).filter_by(id="demo-student-001").first()
    if not demo:
        demo = models.StudentProfile(id="demo-student-001", name="Demo Student", email="demo@learnmate.local")
        session.add(demo)
        session.commit()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient configured with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_gemini(monkeypatch):
    """Mock GeminiService methods to avoid API calls and quota consumption in automated tests."""
    service = get_gemini_service()

    def mock_generate_text(prompt, system_instruction=None, temperature=0.3, category="general", db=None):
        return "This is a deterministic mock answer grounded in study notes."

    def mock_generate_json(prompt, system_instruction=None, temperature=0.2, category="structured", db=None):
        if category == "quiz_generation":
            return {
                "questions": [
                    {
                        "question_number": 1,
                        "prompt": "What is the primary function of mitochondria?",
                        "options": [
                            "A. Produce cellular ATP energy",
                            "B. Synthesize nuclear DNA",
                            "C. Digest cellular waste",
                            "D. Regulate cell division"
                        ],
                        "correct_option": "A",
                        "explanation": "Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions.",
                        "topic": "Cell Biology"
                    },
                    {
                        "question_number": 2,
                        "prompt": "Which process converts glucose into pyruvate in the cytoplasm?",
                        "options": [
                            "A. Fermentation",
                            "B. Glycolysis",
                            "C. Krebs Cycle",
                            "D. Oxidative Phosphorylation"
                        ],
                        "correct_option": "B",
                        "explanation": "Glycolysis breaks down glucose into pyruvate in the cytosol.",
                        "topic": "Cell Biology"
                    }
                ]
            }
        elif category == "tutor":
            return {
                "answer": "Mitochondria are often referred to as the powerhouse of the cell because they produce adenosine triphosphate (ATP) through cellular respiration.",
                "sources": [
                    {
                        "page_number": 1,
                        "section_reference": "Page 1",
                        "excerpt": "Mitochondria produce ATP through cellular respiration."
                    }
                ],
                "grounded": True,
                "insufficient_evidence": False,
                "follow_up_questions": [
                    "How does ATP provide energy for cellular work?",
                    "What happens in the Krebs cycle?"
                ]
            }
        elif category == "misconceptions":
            return {
                "misconception": "Confusing glycolysis location with mitochondrial matrix.",
                "suggested_practice": "Review the cell diagram highlighting cytosol vs mitochondrial cristae.",
                "confidence": "high"
            }
        return {"result": "mock_data"}

    monkeypatch.setattr(service, "generate_text", mock_generate_text)
    monkeypatch.setattr(service, "generate_json", mock_generate_json)
    return service


@pytest.fixture
def create_pdf_bytes():
    """Helper factory to create in-memory PDFs for test cases."""
    def _create(page_count: int = 1, text_per_page: str = "Test study notes content about cell biology and mitochondria.") -> bytes:
        doc = pymupdf.open()
        for i in range(page_count):
            page = doc.new_page()
            if text_per_page:
                page.insert_text((50, 72), f"{text_per_page} (Page {i+1})")
        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes

    return _create
