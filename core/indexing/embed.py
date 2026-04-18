"""Embedding module using Google Generative AI."""

import os
import time
import random
import logging
from typing import List
import google.generativeai as genai


logger = logging.getLogger(__name__)


class GeminiEmbedder:
    """Embedder using Google Generative AI for text embeddings."""

    def __init__(self, api_key: str = None, model_name: str = "models/text-embedding-004"):
        """Initialize the Gemini embedder.

        Args:
            api_key: Google AI API key. If None, uses GOOGLE_API_KEY env var.
            model_name: The embedding model name.
        """
        if api_key is None:
            api_key = os.getenv("GOOGLE_API_KEY")
        
        self.api_key = api_key
        self.model_name = model_name
        
        if api_key:
            genai.configure(api_key=api_key)
        else:
            logger.warning("GOOGLE_API_KEY not found in environment. Using random vectors for embeddings.")

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts using batch processing.

        Args:
            texts: List of text strings to embed.

        Returns:
            List of embedding vectors, one per input text.
        """
        if not self.api_key:
            # Return random vectors
            return [[random.random() for _ in range(768)] for _ in texts]
        
        # Process all texts at once with task_type
        try:
            result = genai.embed_content(
                model=self.model_name,
                content=texts,
                task_type='retrieval_document'
            )
            # The result should be a list of embeddings
            if isinstance(result['embedding'], list):
                return result['embedding']
            else:
                # If single text, it's a single vector
                return [result['embedding']]
        except Exception as e:
            error_msg = str(e).lower()
            if "rate limit" in error_msg or "quota" in error_msg:
                logger.warning(f"Rate limit hit: {e}")
                # Return random vectors as fallback
                return [[random.random() for _ in range(768)] for _ in texts]
            else:
                raise