from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from typing import TypeVar

from google.api_core import exceptions as google_exceptions
from pydantic import BaseModel, ValidationError

import config as _config

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger(__name__)
_cache: dict[str, BaseModel] = {}

_RETRYABLE = (
    google_exceptions.ResourceExhausted,
    google_exceptions.ServiceUnavailable,
    google_exceptions.DeadlineExceeded,
)
_MAX_RETRIES = 2


def clear_cache() -> None:
    _cache.clear()


async def generate_structured(
    prompt: str,
    response_schema: type[T],
    temperature: float = 0.0,
    thinking_budget: int | None = None,
) -> T:
    cache_key = hashlib.sha256(
        (prompt + response_schema.__name__ + str(temperature)).encode()
    ).hexdigest()

    if cache_key in _cache:
        logger.info(
            "event=gemini_call schema=%s cache_hit=true",
            response_schema.__name__,
        )
        return _cache[cache_key]  # type: ignore[return-value]

    from google import genai

    settings = _config.get_settings()
    client = _config.get_gemini_client()

    config_kwargs: dict = {
        "response_mime_type": "application/json",
        "response_schema": response_schema,
        "temperature": temperature,
    }
    if thinking_budget is not None:
        config_kwargs["thinking_config"] = genai.types.ThinkingConfig(
            thinking_budget=thinking_budget
        )

    gen_config = genai.types.GenerateContentConfig(**config_kwargs)

    last_exc: Exception | None = None
    start = time.monotonic()
    retries = 0

    for attempt in range(_MAX_RETRIES + 1):
        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=gen_config,
            )
            break
        except _RETRYABLE as exc:
            last_exc = exc
            retries = attempt + 1
            if attempt < _MAX_RETRIES:
                await asyncio.sleep(2**attempt)
            continue
    else:
        latency = int((time.monotonic() - start) * 1000)
        logger.error(
            "event=gemini_call schema=%s retry_count=%d latency_ms=%d result=exhausted",
            response_schema.__name__,
            retries,
            latency,
        )
        raise ValueError(
            f"Gemini call failed after {_MAX_RETRIES} retries: {last_exc}"
        )

    latency = int((time.monotonic() - start) * 1000)

    candidate = response.candidates[0]
    finish_reason = getattr(candidate, "finish_reason", None)
    fr_name = getattr(finish_reason, "name", str(finish_reason))

    if fr_name == "MAX_TOKENS":
        raise ValueError("Gemini response truncated (MAX_TOKENS)")
    if fr_name == "SAFETY":
        raise ValueError("Gemini response blocked by safety filter")

    text = response.text

    try:
        result = response_schema.model_validate_json(text)
    except ValidationError as exc:
        raise ValueError(f"Gemini response validation failed: {exc}") from exc

    _cache[cache_key] = result

    logger.info(
        "event=gemini_call prompt_length=%d schema=%s temperature=%.1f "
        "latency_ms=%d retry_count=%d cache_hit=false",
        len(prompt),
        response_schema.__name__,
        temperature,
        latency,
        retries,
    )

    return result
