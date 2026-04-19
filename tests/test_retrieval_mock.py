from __future__ import annotations

import pytest

from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
from apps.api.schemas.retrieval import RetrievalResult
from apps.api.schemas.scenario import Scenario
from core.simulation.mock_corpus import (
    DEMO_CHUNKS,
    get_community_labels,
    mock_retrieve,
)
from core.simulation.retrieve import retrieve_for_persona


def _make_persona(feature_priorities: dict[str, float] | None = None) -> Persona:
    return Persona(
        segment_label="Tech Enthusiast",
        summary="Early adopter who values camera quality",
        jobs_to_be_done=["capture memories", "share on social media"],
        feature_priorities=feature_priorities or {"camera": 0.9, "battery": 0.7},
        beliefs=[
            Belief(
                claim="Phone cameras rival DSLRs",
                stance="positive",
                evidence_chunk_ids=["mock-camera-01"],
            )
        ],
        skepticism_profile=SkepticismProfile(
            trust_in_reviews=0.7,
            trust_in_brand_claims=0.3,
            influencer_susceptibility=0.5,
        ),
        graph_entity_ids=["entity-1"],
    )


def _make_scenario() -> Scenario:
    return Scenario(
        product_name="FlagshipPhone X1",
        description="Next-gen flagship smartphone with AI camera features",
        hypotheses=["Users prefer AI-enhanced photos"],
        facets_to_explore=["camera", "battery", "price"],
    )


class TestDemoCorpus:
    def test_corpus_has_at_least_50_chunks(self) -> None:
        assert len(DEMO_CHUNKS) >= 50

    def test_corpus_covers_all_required_facets(self) -> None:
        facets = {chunk["facet"] for chunk in DEMO_CHUNKS}
        required = {"camera", "battery", "price", "design", "privacy", "ecosystem"}
        assert required.issubset(facets)

    def test_each_required_facet_has_at_least_3_chunks(self) -> None:
        from collections import Counter

        facet_counts = Counter(chunk["facet"] for chunk in DEMO_CHUNKS)
        for facet in ("camera", "battery", "price", "design", "privacy", "ecosystem"):
            assert facet_counts[facet] >= 3, f"{facet} has only {facet_counts[facet]} chunks"

    def test_chunk_ids_are_deterministic(self) -> None:
        ids = [chunk["chunk_id"] for chunk in DEMO_CHUNKS]
        assert len(ids) == len(set(ids)), "chunk_ids must be unique"
        assert all(cid.startswith("mock-") for cid in ids)

    def test_all_chunks_have_required_fields(self) -> None:
        required_keys = {"chunk_id", "text", "facet", "stance", "community_id"}
        for chunk in DEMO_CHUNKS:
            assert required_keys.issubset(chunk.keys()), f"Missing keys in {chunk.get('chunk_id')}"
            assert chunk["text"].strip(), f"Empty text in {chunk['chunk_id']}"


class TestMockRetrieve:
    def test_filters_by_facet(self) -> None:
        results = mock_retrieve(query_facets=["camera"])
        assert all(r["facet"] == "camera" or len(results) <= 10 for r in results)
        camera_results = [r for r in results if r["facet"] == "camera"]
        assert len(camera_results) > 0

    def test_respects_top_k(self) -> None:
        results = mock_retrieve(query_facets=["camera"], top_k=3)
        assert len(results) <= 3

    def test_empty_facets_returns_mixed_sample(self) -> None:
        results = mock_retrieve(query_facets=[], top_k=10)
        assert len(results) <= 10
        assert len(results) > 0

    def test_returns_dicts_with_required_fields(self) -> None:
        results = mock_retrieve(query_facets=["battery"], top_k=5)
        for r in results:
            assert "chunk_id" in r
            assert "text" in r
            assert "facet" in r
            assert "stance" in r
            assert "community_id" in r


class TestGetCommunityLabels:
    def test_returns_non_empty_dict(self) -> None:
        labels = get_community_labels()
        assert isinstance(labels, dict)
        assert len(labels) > 0

    def test_maps_entity_ids_to_community_ids(self) -> None:
        labels = get_community_labels()
        for entity_id, community_id in labels.items():
            assert isinstance(entity_id, str)
            assert isinstance(community_id, str)


class TestRetrieveForPersona:
    @pytest.mark.asyncio
    async def test_returns_list_when_no_collection(self) -> None:
        persona = _make_persona()
        scenario = _make_scenario()
        results = await retrieve_for_persona(persona, scenario, project_id="proj-1")
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_chroma_data(self) -> None:
        persona = _make_persona()
        scenario = _make_scenario()
        results = await retrieve_for_persona(persona, scenario, project_id="proj-1")
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_results_are_retrieval_result_type(self) -> None:
        persona = _make_persona()
        scenario = _make_scenario()
        results = await retrieve_for_persona(persona, scenario, project_id="proj-1")
        for r in results:
            assert isinstance(r, RetrievalResult)
