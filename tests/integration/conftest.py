from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio

from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse
from core.simulation.mock_corpus import DEMO_CHUNKS

_MOCK_CHUNK_IDS = [c["chunk_id"] for c in DEMO_CHUNKS[:6]]


def make_test_persona(index: int) -> Persona:
    facets = ["camera", "battery", "price", "design", "privacy"]
    primary = facets[index % len(facets)]
    return Persona(
        segment_label=f"Segment-{index}",
        summary=f"Test persona {index} focused on {primary}",
        jobs_to_be_done=["evaluate product", "compare options"],
        feature_priorities={primary: 0.9, "other": 0.3},
        beliefs=[
            Belief(
                claim=f"Test belief for persona {index}",
                stance="positive",
                evidence_chunk_ids=_MOCK_CHUNK_IDS[:2],
            ),
            Belief(
                claim=f"Secondary belief for persona {index}",
                stance="mixed",
                evidence_chunk_ids=_MOCK_CHUNK_IDS[2:4],
            ),
        ],
        skepticism_profile=SkepticismProfile(
            trust_in_reviews=0.7,
            trust_in_brand_claims=0.3,
            influencer_susceptibility=0.5,
        ),
        graph_entity_ids=[f"e-{index}"],
    )


def make_test_response(persona_id: str, chunk_ids: list[str] | None = None) -> PersonaResponse:
    return PersonaResponse(
        persona_id=persona_id,
        overall_reaction="Interesting product with potential",
        adoption_likelihood_0_100=65,
        strongest_positive="Camera quality",
        strongest_concern="Price point",
        feature_scores={"camera": 0.8, "battery": 0.6, "price": 0.4},
        what_would_change_my_mind="Lower price or better trade-in",
        quotable_sentence=f"As a {persona_id}, the camera makes this worth considering.",
        cited_chunk_ids=chunk_ids or _MOCK_CHUNK_IDS[:3],
    )


def make_test_moderator(persona_ids: list[str]) -> ModeratorQuestion:
    return ModeratorQuestion(
        disagreement_summary="Personas disagree on price vs camera priority",
        follow_up_question="Would a $200 price drop change your adoption likelihood?",
        targeted_persona_ids=persona_ids[:2],
    )


def make_test_analyst() -> AnalystSummary:
    return AnalystSummary(
        consensus_themes=["Camera quality is universally valued"],
        disagreement_themes=["Price sensitivity varies by segment"],
        top_risks=["Price resistance from budget segments"],
        top_wins=["Camera upgrade excites enthusiasts"],
        feature_recommendations=["Emphasize camera in marketing"],
        messaging_suggestions=["Lead with camera quality"],
        evidence_gaps=["Enterprise buyer data is limited"],
    )


def _mock_generate_dispatch(prompt, response_schema, **kwargs):
    name = response_schema.__name__
    if name == "Persona":
        return make_test_persona(0)
    elif name == "PersonaResponse":
        return make_test_response("test-persona", _MOCK_CHUNK_IDS[:3])
    elif name == "ModeratorQuestion":
        return make_test_moderator(["Segment-0", "Segment-1"])
    elif name == "AnalystSummary":
        return make_test_analyst()
    else:
        raise ValueError(f"Unexpected schema in mock: {name}")


@pytest.fixture
def mock_gemini():
    from core.gemini import clear_cache
    clear_cache()

    async def async_dispatch(*args, **kwargs):
        return _mock_generate_dispatch(*args, **kwargs)

    with patch("core.gemini.generate_structured", side_effect=async_dispatch) as mock:
        with patch("core.personas.synthesize.generate_structured", side_effect=async_dispatch):
            with patch("core.simulation.rounds.generate_structured", side_effect=async_dispatch):
                with patch("core.simulation.moderator.generate_structured", side_effect=async_dispatch):
                    with patch("core.simulation.analyst.generate_structured", side_effect=async_dispatch):
                        yield mock

    clear_cache()


@pytest.fixture
def mock_clustering():
    from core.personas.cluster import ClusterResult

    mock_clusters = [
        ClusterResult(
            cluster_id=i,
            chunk_ids=[c["chunk_id"] for c in DEMO_CHUNKS[i*10:(i+1)*10]],
            chunk_texts=[c["text"] for c in DEMO_CHUNKS[i*10:(i+1)*10]],
            facets=[c["facet"] for c in DEMO_CHUNKS[i*10:(i+1)*10]],
            stances=[c["stance"] for c in DEMO_CHUNKS[i*10:(i+1)*10]],
            keywords=["test", "keyword"],
            entity_ids=[f"e-{i}"],
        )
        for i in range(3)
    ]

    async def mock_cluster_chunks(*args, **kwargs):
        return mock_clusters

    with patch("core.personas.cluster.cluster_chunks", side_effect=mock_cluster_chunks):
        yield


@pytest.fixture
def app(monkeypatch, mock_gemini, mock_clustering):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("USE_MOCK_RETRIEVAL", "true")
    import config
    config.get_settings.cache_clear()

    from apps.api.main import create_app
    _app = create_app()
    _app.state.projects = {}
    _app.state.sim_status = {}
    _app.state.running_sims = set()
    _app.state.tasks = {}
    yield _app
    config.get_settings.cache_clear()


@pytest_asyncio.fixture
async def client(app):
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c


TEST_SCENARIO = {
    "product_name": "IntegrationPhone X",
    "description": "A flagship smartphone for integration testing",
    "hypotheses": ["Camera quality drives adoption"],
    "facets_to_explore": ["camera", "battery", "price"],
}


async def poll_until_done(
    client: httpx.AsyncClient,
    project_id: str,
    max_attempts: int = 60,
    interval: float = 0.2,
) -> dict:
    for _ in range(max_attempts):
        resp = await client.get(f"/api/projects/{project_id}/simulate/status")
        data = resp.json()
        if data.get("done"):
            return data
        await asyncio.sleep(interval)
    raise AssertionError(f"Simulation did not complete after {max_attempts} attempts")
