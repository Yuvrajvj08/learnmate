from datetime import datetime
from pydantic import BaseModel, Field


class HealthData(BaseModel):
    """Health check payload."""
    status: str = Field(..., json_schema_extra={"example": "ok"})
    database: str = Field(..., json_schema_extra={"example": "connected"})
    timestamp: datetime = Field(...)


class ConfigStatusData(BaseModel):
    """Readiness indicators without exposing sensitive credentials."""
    gemini_configured: bool = Field(..., description="Whether a Gemini API key is configured")
    model: str = Field(..., description="Configured Gemini model")
    database_status: str = Field(..., description="Database connection status")
    max_pdf_pages: int = Field(..., description="Maximum allowed pages per uploaded PDF")
    max_upload_mb: int = Field(..., description="Maximum allowed upload file size in megabytes")
    environment: str = Field(..., description="Current deployment environment")
