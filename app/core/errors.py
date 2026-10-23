"""Core exception classes and error definitions for LearnMate."""
from typing import Any, Dict, Optional


class AppException(Exception):
    """Base application exception with standardized code and status code."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class MaterialNotFoundError(AppException):
    def __init__(self, material_id: str):
        super().__init__(
            code="MATERIAL_NOT_FOUND",
            message=f"Study material '{material_id}' was not found.",
            status_code=404,
            details={"material_id": material_id},
        )


class QuizNotFoundError(AppException):
    def __init__(self, quiz_id: str):
        super().__init__(
            code="QUIZ_NOT_FOUND",
            message=f"Quiz '{quiz_id}' was not found.",
            status_code=404,
            details={"quiz_id": quiz_id},
        )


class TaskNotFoundError(AppException):
    def __init__(self, task_id: str):
        super().__init__(
            code="TASK_NOT_FOUND",
            message=f"Revision task '{task_id}' was not found.",
            status_code=404,
            details={"task_id": task_id},
        )


class VerificationNotFoundError(AppException):
    def __init__(self, verification_id: str):
        super().__init__(
            code="VERIFICATION_NOT_FOUND",
            message=f"Assessment verification '{verification_id}' was not found.",
            status_code=404,
            details={"verification_id": verification_id},
        )


class InvalidFileTypeError(AppException):
    def __init__(self, message: str = "Only PDF files are supported for upload."):
        super().__init__(
            code="UNSUPPORTED_MEDIA_TYPE",
            message=message,
            status_code=415,
        )


class FileTooLargeError(AppException):
    def __init__(self, max_mb: int):
        super().__init__(
            code="FILE_TOO_LARGE",
            message=f"Uploaded file exceeds the maximum allowed size of {max_mb} MB.",
            status_code=413,
            details={"max_mb": max_mb},
        )


class PageLimitExceededError(AppException):
    def __init__(self, pages: int, max_pages: int):
        super().__init__(
            code="PAGE_LIMIT_EXCEEDED",
            message=f"PDF has {pages} pages, which exceeds the limit of {max_pages} pages.",
            status_code=400,
            details={"pages": pages, "max_pages": max_pages},
        )


class GeminiNotConfiguredError(AppException):
    def __init__(self):
        super().__init__(
            code="GEMINI_NOT_CONFIGURED",
            message="Gemini API is not configured. Please set GEMINI_API_KEY in the environment or .env file.",
            status_code=503,
        )


class GeminiServiceError(AppException):
    def __init__(self, message: str = "AI service temporarily unavailable. Please try again."):
        super().__init__(
            code="GEMINI_SERVICE_UNAVAILABLE",
            message=message,
            status_code=503,
        )


class InvalidSubmissionError(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="INVALID_SUBMISSION",
            message=message,
            status_code=400,
            details=details,
        )
