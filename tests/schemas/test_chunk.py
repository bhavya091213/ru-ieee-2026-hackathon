import pytest
from pydantic import ValidationError

from apps.api.schemas.chunk import (
    ChunkExtraction,
    ExtractedEntity,
    ExtractedRelationship,
)


def _make_entity(**overrides):
    defaults = {
        "id": "ent-1",
        "title": "iPhone Camera",
        "type": "Feature",
        "description": "48MP main camera sensor",
    }
    return ExtractedEntity(**{**defaults, **overrides})


def _make_relationship(**overrides):
    defaults = {
        "source": "ent-1",
        "target": "ent-2",
        "type": "MENTIONS",
        "description": "Review mentions camera",
        "weight": 0.8,
    }
    return ExtractedRelationship(**{**defaults, **overrides})


def _make_chunk(**overrides):
    defaults = {
        "entities": [_make_entity()],
        "relationships": [_make_relationship()],
        "claims": ["Camera is best in class"],
        "facet": "camera",
        "stance": "positive",
        "segment_hints": ["tech-enthusiast"],
        "novelty_signals": ["first 48MP sensor"],
        "evidence_score": 0.9,
        "rumor_confidence": 0.1,
        "direct_quote_candidates": ["I love the camera quality"],
    }
    return ChunkExtraction(**{**defaults, **overrides})


class TestChunkExtractionRoundtrip:
    def test_roundtrip_all_fields(self):
        original = _make_chunk()
        data = original.model_dump()
        restored = ChunkExtraction.model_validate(data)
        assert restored == original

    def test_rejects_invalid_facet(self):
        with pytest.raises(ValidationError):
            _make_chunk(facet="invalid_facet")

    def test_rejects_invalid_stance(self):
        with pytest.raises(ValidationError):
            _make_chunk(stance="invalid_stance")


class TestExtractedEntity:
    def test_rejects_invalid_type(self):
        with pytest.raises(ValidationError):
            _make_entity(type="InvalidType")


class TestExtractedRelationship:
    def test_rejects_invalid_type(self):
        with pytest.raises(ValidationError):
            _make_relationship(type="INVALID_REL")
