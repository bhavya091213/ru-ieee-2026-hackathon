from __future__ import annotations

from pydantic import BaseModel


class SkepticismProfile(BaseModel):
    trust_in_reviews: float
    trust_in_brand_claims: float
    influencer_susceptibility: float


class Belief(BaseModel):
    claim: str
    stance: str
    evidence_chunk_ids: list[str]


class Persona(BaseModel):
    segment_label: str
    summary: str
    jobs_to_be_done: list[str]
    feature_priorities: dict[str, float]
    beliefs: list[Belief]
    skepticism_profile: SkepticismProfile
    graph_entity_ids: list[str]
