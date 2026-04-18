from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
from core.personas.cluster import ClusterResult
from core.personas.synthesize import _validate_persona, synthesize_personas


def _make_cluster(cluster_id: int = 0) -> ClusterResult:
    return ClusterResult(
        cluster_id=cluster_id,
        chunk_ids=[f"c{cluster_id}-1", f"c{cluster_id}-2", f"c{cluster_id}-3"],
        chunk_texts=["Camera is great", "Battery lasts all day", "Price is too high"],
        facets=["camera", "battery"],
        stances=["positive", "mixed"],
        keywords=["camera", "battery"],
        entity_ids=[f"e{cluster_id}-1", f"e{cluster_id}-2"],
    )


def _make_persona(
    beliefs: list[Belief] | None = None,
    feature_priorities: dict[str, float] | None = None,
) -> Persona:
    if beliefs is None:
        beliefs = [
            Belief(claim="Camera is excellent", stance="positive", evidence_chunk_ids=["c0-1", "c0-2"]),
            Belief(claim="Battery is okay", stance="mixed", evidence_chunk_ids=["c0-2", "c0-3"]),
            Belief(claim="Price is too high", stance="negative", evidence_chunk_ids=["c0-1", "c0-3"]),
        ]
    return Persona(
        segment_label="Tech Enthusiasts",
        summary="Early adopters focused on camera quality",
        jobs_to_be_done=["capture photos", "stay connected"],
        feature_priorities=feature_priorities or {"camera": 0.9, "battery": 0.6},
        beliefs=beliefs,
        skepticism_profile=SkepticismProfile(
            trust_in_reviews=0.7,
            trust_in_brand_claims=0.3,
            influencer_susceptibility=0.5,
        ),
        graph_entity_ids=["old-e1"],
    )


class TestSynthesizePersonas:
    @pytest.mark.asyncio
    async def test_produces_one_per_cluster(self):
        clusters = [_make_cluster(i) for i in range(3)]
        with patch("core.personas.synthesize.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona()
            result = await synthesize_personas(clusters)
        assert len(result) == 3
        assert all(isinstance(p, Persona) for p in result)

    @pytest.mark.asyncio
    async def test_empty_clusters(self):
        result = await synthesize_personas([])
        assert result == []

    @pytest.mark.asyncio
    async def test_parallel_execution(self):
        clusters = [_make_cluster(i) for i in range(4)]
        call_times: list[float] = []

        async def slow_gen(*args, **kwargs):
            import time
            start = time.monotonic()
            await asyncio.sleep(0.05)
            call_times.append(time.monotonic() - start)
            return _make_persona()

        with patch("core.personas.synthesize.generate_structured", side_effect=slow_gen):
            import time
            start = time.monotonic()
            await synthesize_personas(clusters)
            total = time.monotonic() - start

        assert total < 4 * 0.05 * 0.9  # must be parallel


class TestValidatePersona:
    def test_drops_beliefs_with_few_evidence(self):
        beliefs = [
            Belief(claim="Good", stance="positive", evidence_chunk_ids=["c1", "c2"]),
            Belief(claim="Bad", stance="negative", evidence_chunk_ids=["c3"]),
            Belief(claim="None", stance="mixed", evidence_chunk_ids=[]),
        ]
        persona = _make_persona(beliefs=beliefs)
        cluster = _make_cluster()
        validated = _validate_persona(persona, cluster)
        assert len(validated.beliefs) == 1
        assert validated.beliefs[0].claim == "Good"

    def test_removes_invalid_facet_keys(self):
        persona = _make_persona(feature_priorities={"camera": 0.9, "foobar": 0.5, "battery": 0.6})
        cluster = _make_cluster()
        validated = _validate_persona(persona, cluster)
        assert "foobar" not in validated.feature_priorities
        assert "camera" in validated.feature_priorities

    def test_sets_graph_entity_ids_from_cluster(self):
        persona = _make_persona()
        cluster = _make_cluster()
        validated = _validate_persona(persona, cluster)
        assert set(validated.graph_entity_ids) == set(cluster.entity_ids)
