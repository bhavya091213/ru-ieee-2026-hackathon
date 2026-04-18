import pytest

from apps.api.schemas import (
    AnalystSummary,
    Belief,
    ChunkExtraction,
    DashboardPayload,
    ExtractedEntity,
    ExtractedRelationship,
    FeatureScoreRow,
    ModeratorQuestion,
    Persona,
    PersonaResponse,
    PersonaSummary,
    Project,
    QuoteCard,
    Scenario,
    ScoredLabel,
    SkepticismProfile,
    TribeResult,
)

ALL_MODELS = [
    ChunkExtraction,
    ExtractedEntity,
    ExtractedRelationship,
    Persona,
    Belief,
    SkepticismProfile,
    Scenario,
    PersonaResponse,
    ModeratorQuestion,
    AnalystSummary,
    DashboardPayload,
    PersonaSummary,
    QuoteCard,
    ScoredLabel,
    FeatureScoreRow,
    TribeResult,
    Project,
]


@pytest.mark.parametrize("model_cls", ALL_MODELS, ids=lambda m: m.__name__)
def test_json_schema_export(model_cls):
    schema = model_cls.model_json_schema()
    assert isinstance(schema, dict)
    assert "properties" in schema or "$defs" in schema
