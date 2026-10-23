from typing import Any, Dict, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class MetaResponse(BaseModel):
    """Standard metadata included in all responses."""
    request_id: str = Field(..., description="Unique request tracing identifier")


class ErrorDetails(BaseModel):
    """Standard error payload structure."""
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional context or validation details")


class ApiResponse(BaseModel, Generic[T]):
    """Standard success API response contract envelope."""
    data: T
    meta: MetaResponse


class ApiErrorResponse(BaseModel):
    """Standard error API response contract envelope."""
    error: ErrorDetails
    meta: MetaResponse
