"""Persona-related schemas for the AI engine."""

from pydantic import BaseModel
from typing import List, Dict


class SkepticismProfile(BaseModel):
    """Profile of a persona's skepticism across different information sources."""
    trust_in_reviews: float  # 0-1
    trust_in_brand_claims: float  # 0-1
    influencer_susceptibility: float  # 0-1


class Belief(BaseModel):
    """A specific belief held by a persona with supporting evidence."""
    claim: str
    stance: str
    evidence_chunk_ids: List[str]  # Minimum 2 required at synthesis layer, but schema allows empty


class Persona(BaseModel):
    """A synthetic persona representing a market segment."""
    segment_label: str
    summary: str
    jobs_to_be_done: List[str]
    feature_priorities: Dict[str, float]  # Keys should be valid facet names (validated at synthesis)
    beliefs: List[Belief]
    skepticism_profile: SkepticismProfile
    graph_entity_ids: List[str]