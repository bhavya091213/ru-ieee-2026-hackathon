from __future__ import annotations

from pydantic import BaseModel


class PersonaResponse(BaseModel):
    persona_id: str
    overall_reaction: str
    adoption_likelihood_0_100: int
    strongest_positive: str
    strongest_concern: str
    feature_scores: dict[str, float]
    what_would_change_my_mind: str
    quotable_sentence: str
    cited_chunk_ids: list[str]


class ModeratorQuestion(BaseModel):
    disagreement_summary: str
    follow_up_question: str
    targeted_persona_ids: list[str]


class AnalystSummary(BaseModel):
    consensus_themes: list[str]
    disagreement_themes: list[str]
    top_risks: list[str]
    top_wins: list[str]
    feature_recommendations: list[str]
    messaging_suggestions: list[str]
    evidence_gaps: list[str]
