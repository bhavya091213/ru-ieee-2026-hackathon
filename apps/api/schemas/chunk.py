from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

Facet = Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
Stance = Literal["positive", "negative", "mixed", "rumor", "review"]
EntityType = Literal["Product", "Feature", "Concern", "Competitor", "Segment", "Claim"]
RelationshipType = Literal[
    "MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"
]

VALID_FACETS: frozenset[str] = frozenset(
    ["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
)


class RawDocument(BaseModel):
    doc_id: str
    title: str
    author: str | None = None
    date: str | None = None
    text: str
    url: str
    canonical_product: str


class ExtractedEntity(BaseModel):
    id: str
    title: str
    type: EntityType
    description: str


class ExtractedRelationship(BaseModel):
    source: str
    target: str
    type: RelationshipType
    description: str
    weight: float


class ChunkExtraction(BaseModel):
    entities: list[ExtractedEntity]
    relationships: list[ExtractedRelationship]
    claims: list[str]
    facet: Facet
    stance: Stance
    segment_hints: list[str]
    novelty_signals: list[str]
    evidence_score: float
    rumor_confidence: float
    direct_quote_candidates: list[str]
