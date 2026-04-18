from __future__ import annotations

import logging
import os
from typing import List

from google import genai

logger = logging.getLogger(__name__)


class GeminiEmbedder:
    def __init__(self, api_key: str | None = None, model_name: str = "gemini-embedding-001"):
        self.model_name = model_name
        self._client: genai.Client | None = None

        key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if key:
            self._client = genai.Client(api_key=key)
        else:
            logger.warning("No API key found for embeddings.")

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not self._client:
            raise ValueError("No API key configured for embeddings")

        embeddings: List[List[float]] = []
        batch_size = 20
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            result = self._client.models.embed_content(
                model=self.model_name,
                contents=batch,
            )
            for emb in result.embeddings:
                embeddings.append(list(emb.values))

        return embeddings
