from fastapi import APIRouter

from app.api.routes import (
    analytics,
    health,
    materials,
    quizzes,
    revision,
    tutor,
)

api_router = APIRouter(prefix="/api/v1")

# Include all route groups under /api/v1
api_router.include_router(health.router)
api_router.include_router(materials.router)
api_router.include_router(tutor.router)
api_router.include_router(quizzes.router)
api_router.include_router(analytics.router)
api_router.include_router(revision.router)
