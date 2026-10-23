import uuid
from typing import Any, Dict
from fastapi import Request
from app.schemas.common import MetaResponse


def get_request_id(request: Request) -> str:
    """Extract or generate request tracking ID."""
    return getattr(request.state, "request_id", None) or uuid.uuid4().hex


def success_response(data: Any, request: Request) -> Dict[str, Any]:
    """Wrap payload in standard ApiResponse envelope."""
    req_id = get_request_id(request)
    return {
        "data": data,
        "meta": {"request_id": req_id}
    }
