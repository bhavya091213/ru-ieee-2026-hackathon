from __future__ import annotations

from pydantic import BaseModel


class RetrievalResult(BaseModel):
    chunk_id: str
    text: str
    facet: str
    stance: str
    community_id: str
