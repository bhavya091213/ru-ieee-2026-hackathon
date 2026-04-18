from pydantic import BaseModel
from typing import List, Literal, Optional

# Type Aliases for Gemini Compatibility
Facet = Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
Stance = Literal["positive", "negative", "mixed", "rumor", "review"]
EntityType = Literal["Product", "Feature", "Concern", "Competitor", "Segment", "Claim"]
RelationshipType = Literal["MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"]

class RawDocument(BaseModel):
    """Raw document fetched from a URL before processing."""
    doc_id: str
    title: str
    author: Optional[str]
    date: Optional[str]
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
    entities: List[ExtractedEntity]
    relationships: List[ExtractedRelationship]
    claims: List[str]
    facet: Facet
    stance: Stance
    segment_hints: List[str]
    novelty_signals: List[str]
    evidence_score: float
    rumor_confidence: float
    direct_quote_candidates: List[str]
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
    entities: List[ExtractedEntity]
    relationships: List[ExtractedRelationship]
    claims: List[str]
    facet: Facet
    stance: Stance
    segment_hints: List[str]
    novelty_signals: List[str]
    evidence_score: float
    rumor_confidence: float
    direct_quote_candidates: List[str]