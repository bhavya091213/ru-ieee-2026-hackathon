from __future__ import annotations

from apps.api.schemas.chunk import ChunkExtraction
from core.extraction.prompts import EXTRACTION_PROMPT
from core.gemini import generate_structured


async def extract_chunk(chunk_text: str, metadata: dict) -> ChunkExtraction:
    if not chunk_text or not chunk_text.strip():
        raise ValueError("chunk_text must be non-empty")

    prompt = EXTRACTION_PROMPT.format(
        source_type=metadata.get("source", "N/A"),
        url=metadata.get("url", "N/A"),
        timestamp=metadata.get("timestamp", "N/A"),
        chunk_text=chunk_text,
    )

    return await generate_structured(
        prompt=prompt,
        response_schema=ChunkExtraction,
        temperature=0.0,
        thinking_budget=0,
    )
