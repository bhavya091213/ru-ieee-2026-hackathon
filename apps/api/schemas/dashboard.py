from __future__ import annotations

from pydantic import BaseModel

from apps.api.schemas.simulation import AnalystSummary, PersonaResponse


class ScoredLabel(BaseModel):
    label: str
    score: float


class FeatureScoreRow(BaseModel):
    mean: float
    min: float
    max: float
    std: float
    persona_scores: dict[str, float]


class QuoteCard(BaseModel):
    persona_id: str
    segment_label: str
    quote: str
    facet: str
    sentiment: str


class TribeResult(BaseModel):
    enabled: bool
    response_strength: float
    response_variance: float
    response_spread: float
    scored_text: str


class PersonaSummary(BaseModel):
    persona_id: str
    segment_label: str
    summary: str
    adoption_likelihood: int
    strongest_positive: str
    strongest_concern: str
    feature_priorities: dict[str, float]


class DashboardPayload(BaseModel):
    project_id: str
    scenario_id: str
    consensus_score: float
    disagreement_score: float
    evidence_coverage: float
    top_risks: list[ScoredLabel]
    top_wins: list[ScoredLabel]
    feature_scores: dict[str, FeatureScoreRow]
    personas: list[PersonaSummary]
    quotes: list[QuoteCard]
    round1_responses: list[PersonaResponse]
    round2_responses: list[PersonaResponse]
    moderator_question: str
    analyst_summary: AnalystSummary
    tribe: TribeResult | None
