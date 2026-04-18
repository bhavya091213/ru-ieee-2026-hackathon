from __future__ import annotations

from dataclasses import fields
from unittest.mock import patch

import numpy as np
import pytest

from core.personas.cluster import ClusterResult, cluster_chunks


def _make_chunks(n: int, facet: str = "camera", stance: str = "positive") -> list[dict]:
    return [
        {
            "id": f"chunk-{facet}-{i:02d}",
            "text": f"This is a test opinion about {facet} feature number {i}. It covers quality and user experience.",
            "facet": facet,
            "stance": stance,
            "entity_ids": [f"entity-{facet}-{i}"],
        }
        for i in range(n)
    ]


def _make_separable_chunks() -> list[dict]:
    chunks: list[dict] = []
    topics = [
        ("camera", "The camera quality is amazing with sharp detail and vivid colors in every photo taken"),
        ("battery", "Battery life is excellent lasting all day with heavy usage and quick charging"),
        ("price", "The pricing strategy makes this phone affordable compared to other flagships"),
        ("design", "The sleek design with thin bezels and premium materials feels great in hand"),
    ]
    for facet, base_text in topics:
        for i in range(8):
            chunks.append({
                "id": f"sep-{facet}-{i:02d}",
                "text": f"{base_text}. Variation {i} adds more context about {facet} aspects.",
                "facet": facet,
                "stance": "positive" if i % 2 == 0 else "mixed",
                "entity_ids": [f"entity-{facet}"],
            })
    return chunks


class TestClusterResult:
    def test_has_expected_fields(self) -> None:
        field_names = {f.name for f in fields(ClusterResult)}
        expected = {"cluster_id", "chunk_ids", "chunk_texts", "facets", "stances", "keywords", "entity_ids"}
        assert expected == field_names

    def test_is_frozen(self) -> None:
        result = ClusterResult(
            cluster_id=0,
            chunk_ids=["c1"],
            chunk_texts=["text"],
            facets=["camera"],
            stances=["positive"],
            keywords=["quality"],
            entity_ids=["e1"],
        )
        with pytest.raises(AttributeError):
            result.cluster_id = 1  # type: ignore[misc]


class TestClusterChunks:
    @pytest.mark.asyncio
    async def test_returns_list_of_cluster_result(self) -> None:
        chunks = _make_separable_chunks()
        results = await cluster_chunks(chunks)
        assert isinstance(results, list)
        assert all(isinstance(r, ClusterResult) for r in results)

    @pytest.mark.asyncio
    async def test_respects_target_range(self) -> None:
        chunks = _make_separable_chunks()
        results = await cluster_chunks(chunks, target_range=(3, 8))
        assert 1 <= len(results) <= 8

    @pytest.mark.asyncio
    async def test_all_chunks_assigned(self) -> None:
        chunks = _make_separable_chunks()
        results = await cluster_chunks(chunks)
        assigned_ids = set()
        for r in results:
            assigned_ids.update(r.chunk_ids)
        input_ids = {c["id"] for c in chunks}
        assert assigned_ids == input_ids

    @pytest.mark.asyncio
    async def test_min_cluster_size_enforced(self) -> None:
        chunks = _make_separable_chunks()
        results = await cluster_chunks(chunks)
        for r in results:
            assert len(r.chunk_ids) >= 3

    @pytest.mark.asyncio
    async def test_keywords_populated(self) -> None:
        chunks = _make_separable_chunks()
        results = await cluster_chunks(chunks)
        for r in results:
            assert len(r.keywords) > 0

    @pytest.mark.asyncio
    async def test_facets_populated(self) -> None:
        chunks = _make_separable_chunks()
        results = await cluster_chunks(chunks)
        for r in results:
            assert len(r.facets) > 0

    @pytest.mark.asyncio
    async def test_entity_ids_collected(self) -> None:
        chunks = _make_separable_chunks()
        results = await cluster_chunks(chunks)
        all_entity_ids = set()
        for r in results:
            all_entity_ids.update(r.entity_ids)
        assert len(all_entity_ids) > 0

    @pytest.mark.asyncio
    async def test_empty_chunks_returns_empty(self) -> None:
        results = await cluster_chunks([])
        assert results == []

    @pytest.mark.asyncio
    async def test_too_few_chunks_single_cluster(self) -> None:
        chunks = _make_chunks(2, facet="camera")
        results = await cluster_chunks(chunks)
        assert len(results) == 1
        assert len(results[0].chunk_ids) == 2


class TestKMeansFallback:
    @pytest.mark.asyncio
    async def test_fallback_when_leiden_fails(self) -> None:
        chunks = _make_separable_chunks()

        with patch("core.personas.cluster._leiden_cluster", return_value=None):
            results = await cluster_chunks(chunks, target_range=(3, 8))

        assert len(results) >= 1
        all_ids = set()
        for r in results:
            all_ids.update(r.chunk_ids)
        assert len(all_ids) == len(chunks)


class TestKNNGraph:
    def test_symmetric(self) -> None:
        from core.personas.cluster import _build_knn_graph

        rng = np.random.RandomState(42)
        embeddings = rng.randn(20, 384).astype(np.float32)
        graph = _build_knn_graph(embeddings, k=5)
        diff = abs(graph - graph.T)
        assert diff.max() < 1e-6

    def test_no_self_loops(self) -> None:
        from core.personas.cluster import _build_knn_graph

        rng = np.random.RandomState(42)
        embeddings = rng.randn(20, 384).astype(np.float32)
        graph = _build_knn_graph(embeddings, k=5)
        diag = graph.diagonal()
        assert np.all(diag == 0)
