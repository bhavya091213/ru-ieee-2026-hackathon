from unittest.mock import AsyncMock, patch

import pytest

from apps.api.schemas.chunk import ChunkExtraction, ExtractedEntity, ExtractedRelationship
from core.extraction.extract import extract_chunk

SAMPLE_TEXT = (
    "The new XPhone 15 camera blows away the competition with its 200MP sensor, "
    "but battery drain is severe during video recording."
)
SAMPLE_META = {"source": "reddit", "url": "https://reddit.com/r/phones/abc", "timestamp": "2025-01-15"}


def _mock_extraction() -> ChunkExtraction:
    return ChunkExtraction(
        entities=[
            ExtractedEntity(id="e1", title="XPhone 15", type="Product", description="Flagship phone"),
            ExtractedEntity(id="e2", title="200MP sensor", type="Feature", description="Camera sensor"),
            ExtractedEntity(id="e3", title="battery drain", type="Concern", description="Battery issue"),
        ],
        relationships=[
            ExtractedRelationship(source="e1", target="e2", type="MENTIONS", description="phone has sensor", weight=0.9),
            ExtractedRelationship(source="e1", target="e3", type="CONTRADICTS", description="good camera but bad battery", weight=0.7),
        ],
        claims=["XPhone 15 camera is excellent", "Battery drains fast during video"],
        facet="camera",
        stance="mixed",
        segment_hints=["tech enthusiasts"],
        novelty_signals=["200MP sensor"],
        evidence_score=0.8,
        rumor_confidence=0.1,
        direct_quote_candidates=["blows away the competition"],
    )


@pytest.mark.asyncio
async def test_extract_chunk_returns_valid_extraction():
    with patch("core.extraction.extract.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = _mock_extraction()
        result = await extract_chunk(SAMPLE_TEXT, SAMPLE_META)
        assert isinstance(result, ChunkExtraction)
        assert len(result.entities) > 0
        assert len(result.relationships) > 0


@pytest.mark.asyncio
async def test_extract_chunk_uses_correct_params():
    with patch("core.extraction.extract.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = _mock_extraction()
        await extract_chunk(SAMPLE_TEXT, SAMPLE_META)
        call_kwargs = mock_gen.call_args
        assert call_kwargs.kwargs["temperature"] == 0.0
        assert call_kwargs.kwargs["thinking_budget"] == 0


@pytest.mark.asyncio
async def test_extract_chunk_rejects_empty():
    with pytest.raises(ValueError, match="non-empty"):
        await extract_chunk("", SAMPLE_META)

    with pytest.raises(ValueError, match="non-empty"):
        await extract_chunk("   ", SAMPLE_META)


@pytest.mark.asyncio
async def test_extracted_entities_have_unique_ids():
    with patch("core.extraction.extract.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = _mock_extraction()
        result = await extract_chunk(SAMPLE_TEXT, SAMPLE_META)
        ids = [e.id for e in result.entities]
        assert len(ids) == len(set(ids))


@pytest.mark.asyncio
async def test_relationships_reference_valid_entity_ids():
    with patch("core.extraction.extract.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = _mock_extraction()
        result = await extract_chunk(SAMPLE_TEXT, SAMPLE_META)
        entity_ids = {e.id for e in result.entities}
        for rel in result.relationships:
            assert rel.source in entity_ids
            assert rel.target in entity_ids


@pytest.mark.asyncio
async def test_schemas_produce_valid_json_schema():
    schema = ChunkExtraction.model_json_schema()
    assert isinstance(schema, dict)
    assert "properties" in schema
    assert "entities" in schema["properties"]
