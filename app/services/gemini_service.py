import json
import logging
from typing import Any, Dict, Optional
from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import GeminiNotConfiguredError, GeminiServiceError
from app.db import models

logger = logging.getLogger(__name__)
settings = get_settings()


class GeminiService:
    """Reusable wrapper around official google-genai SDK with usage logging and error handling."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self._client: Optional[genai.Client] = None

    @property
    def client(self) -> genai.Client:
        """Lazy-initialize and return official Google GenAI client."""
        if not self.api_key or not self.api_key.strip() or self.api_key.strip() == "your_gemini_api_key_here":
            raise GeminiNotConfiguredError()
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key.strip())
        return self._client

    def record_usage(
        self,
        db: Optional[Session],
        category: str,
        prompt_tokens: int,
        candidate_tokens: int,
        total_tokens: int,
        is_estimated: bool = False,
        status: str = "success",
        error_message: Optional[str] = None,
    ) -> None:
        """Persist API usage statistics in the database."""
        if db is None:
            return
        try:
            record = models.GeminiUsageRecord(
                request_category=category,
                model=self.model,
                prompt_tokens=prompt_tokens,
                candidate_tokens=candidate_tokens,
                total_tokens=total_tokens,
                is_estimated=is_estimated,
                status=status,
                error_message=error_message[:500] if error_message else None,
            )
            db.add(record)
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to record Gemini usage: {e}")
            db.rollback()

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.3,
        category: str = "general",
        db: Optional[Session] = None,
    ) -> str:
        """Generate plain text content from Gemini."""
        try:
            client = self.client
            config = types.GenerateContentConfig(
                temperature=temperature,
                system_instruction=system_instruction,
            )
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )

            # Extract token metadata
            p_tokens, c_tokens, t_tokens, estimated = self._extract_tokens(prompt, response)
            self.record_usage(db, category, p_tokens, c_tokens, t_tokens, estimated, status="success")

            return (response.text or "").strip()
        except GeminiNotConfiguredError:
            raise
        except Exception as e:
            logger.error(f"Gemini API failure in category '{category}': {str(e)}")
            p_tokens = len(prompt) // 4
            self.record_usage(db, category, p_tokens, 0, p_tokens, is_estimated=True, status="error", error_message=str(e))
            raise GeminiServiceError(f"AI generation failed: {str(e)}")

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        category: str = "structured",
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Generate structured JSON with one automatic repair attempt if parsing fails."""
        try:
            client = self.client
            config = types.GenerateContentConfig(
                temperature=temperature,
                system_instruction=system_instruction,
                response_mime_type="application/json",
            )
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )

            p_tokens, c_tokens, t_tokens, estimated = self._extract_tokens(prompt, response)
            self.record_usage(db, category, p_tokens, c_tokens, t_tokens, estimated, status="success")

            raw_text = (response.text or "").strip()
            try:
                return json.loads(raw_text)
            except json.JSONDecodeError:
                logger.warning("Initial JSON decoding failed; attempting 1 repair call.")
                # Attempt 1 controlled repair
                repair_prompt = f"The following text is supposed to be valid JSON but failed parsing. Fix it and return valid JSON only:\n{raw_text}"
                repair_res = client.models.generate_content(
                    model=self.model,
                    contents=repair_prompt,
                    config=config,
                )
                repaired_text = (repair_res.text or "").strip()
                return json.loads(repaired_text)
        except GeminiNotConfiguredError:
            raise
        except Exception as e:
            logger.error(f"Gemini structured generation failed in '{category}': {str(e)}")
            p_tokens = len(prompt) // 4
            self.record_usage(db, category, p_tokens, 0, p_tokens, is_estimated=True, status="error", error_message=str(e))
            raise GeminiServiceError(f"AI structured generation failed: {str(e)}")

    def _extract_tokens(self, prompt: str, response: Any) -> tuple[int, int, int, bool]:
        """Extract exact tokens from response usage_metadata or compute estimate."""
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            meta = response.usage_metadata
            p = getattr(meta, "prompt_token_count", 0) or 0
            c = getattr(meta, "candidates_token_count", 0) or 0
            t = getattr(meta, "total_token_count", 0) or (p + c)
            return p, c, t, False
        # Fallback estimate
        p = len(prompt) // 4
        c = len(response.text or "") // 4
        return p, c, p + c, True


_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Return singleton GeminiService instance."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
