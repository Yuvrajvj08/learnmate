from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import get_settings

settings = get_settings()

# SQLite requires check_same_thread=False for multithreaded web servers
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency to provide a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables and seed the default demo student profile."""
    from app.db import models  # Ensure all models are imported before creating tables
    Base.metadata.create_all(bind=engine)

    # Ensure demo profile exists
    db = SessionLocal()
    try:
        demo = db.query(models.StudentProfile).filter_by(id=settings.DEMO_STUDENT_ID).first()
        if not demo:
            demo = models.StudentProfile(
                id=settings.DEMO_STUDENT_ID,
                name="Demo Student",
                email="demo@learnmate.local"
            )
            db.add(demo)
            db.commit()
    finally:
        db.close()
