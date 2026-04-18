from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio

from apps.api.main import create_app
from apps.api.schemas.dashboard import DashboardPayload
from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse


def _mock_persona_response(persona_id: str = "persona-1") -> PersonaResponse:
    return PersonaResponse(
        persona_id=persona_id,
        overall_reaction="Positive overall impression",
        adoption_likelihood_0_100=72,
        strongest_positive="Excellent camera quality",
        strongest_concern="High price point",
        feature_scores={"camera": 0.85, "battery": 0.7, "price": 0.4},
        what_would_change_my_mind="A more competitive price",
        quotable_sentence="The camera alone makes it worth considering.",
        cited_chunk_ids=["mock-camera-01", "mock-camera-02"],
    )


def _mock_moderator_question() -> ModeratorQuestion:
    return ModeratorQuestion(
        disagreement_summary="Price sensitivity varies across segments",
        follow_up_question="How much would the price need to drop for you to switch?",
        targeted_persona_ids=["persona-1"],
    )


def _mock_analyst_summary() -> AnalystSummary:
    return AnalystSummary(
        consensus_themes=["Camera quality is universally praised"],
        disagreement_themes=["Price tolerance differs by segment"],
        top_risks=["Price may limit adoption among budget segments"],
        top_wins=["Camera quality exceeds expectations"],
        feature_recommendations=["Emphasize camera in marketing"],
        messaging_suggestions=["Lead with camera, address price with trade-in"],
        evidence_gaps=["Limited data on long-term durability"],
    )


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("USE_MOCK_RETRIEVAL", "true")
    monkeypatch.setenv("TRIBE_ENABLED", "true")
    import config
    config.get_settings.cache_clear()
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


class TestEndToEnd:
    @pytest.mark.asyncio
    async def test_full_pipeline_with_mocked_gemini(self, client, app):
        resp = await client.post("/api/projects", json={"name": "Integration Test"})
        assert resp.status_code == 201
        project_id = resp.json()["project_id"]

        resp = await client.post(
            f"/api/projects/{project_id}/ingest",
            json={"sources": ["mock://consumer-electronics"]},
        )
        assert resp.status_code == 200
        assert resp.json()["chunk_count"] > 0

        call_count = 0

        async def mock_generate_structured(prompt, response_schema, temperature=0.0, thinking_budget=None):
            nonlocal call_count
            call_count += 1

            from apps.api.schemas.persona import Belief, Persona, SkepticismProfile

            if response_schema == Persona:
                return Persona(
                    segment_label=f"Segment-{call_count}",
                    summary=f"Test persona {call_count}",
                    jobs_to_be_done=["evaluate product"],
                    feature_priorities={"camera": 0.8, "battery": 0.6},
                    beliefs=[
                        Belief(claim="Camera is great", stance="positive",
                               evidence_chunk_ids=["mock-camera-01", "mock-camera-02"]),
                        Belief(claim="Price is high", stance="negative",
                               evidence_chunk_ids=["mock-price-01", "mock-price-02"]),
                    ],
                    skepticism_profile=SkepticismProfile(
                        trust_in_reviews=0.7,
                        trust_in_brand_claims=0.3,
                        influencer_susceptibility=0.5,
                    ),
                    graph_entity_ids=[],
                )
            elif response_schema == PersonaResponse:
                return _mock_persona_response(f"persona-{call_count}")
            elif response_schema == ModeratorQuestion:
                return _mock_moderator_question()
            elif response_schema == AnalystSummary:
                return _mock_analyst_summary()
            else:
                raise ValueError(f"Unexpected schema: {response_schema}")

        with patch("core.gemini.generate_structured", side_effect=mock_generate_structured):
            resp = await client.post(
                f"/api/projects/{project_id}/simulate",
                json={
                    "product_name": "FlagshipPhone X1",
                    "description": "Next-gen flagship smartphone",
                    "hypotheses": ["Users prefer AI-enhanced photos"],
                    "facets_to_explore": ["camera", "battery", "price"],
                },
            )
            assert resp.status_code == 202

            for _ in range(100):
                await asyncio.sleep(0.1)
                status_resp = await client.get(
                    f"/api/projects/{project_id}/simulate/status"
                )
                status = status_resp.json()
                if status.get("done"):
                    break

        assert status["phase"] in ("DONE", "FAILED"), f"Unexpected phase: {status}"

        if status["phase"] == "DONE":
            resp = await client.get(f"/api/projects/{project_id}/dashboard")
            assert resp.status_code == 200
            dashboard = resp.json()

            assert dashboard["project_id"] == project_id
            assert 0.0 <= dashboard["consensus_score"] <= 1.0
            assert 0.0 <= dashboard["disagreement_score"] <= 1.0
            assert 0.0 <= dashboard["evidence_coverage"] <= 1.0
            assert len(dashboard["round1_responses"]) > 0
            assert len(dashboard["round2_responses"]) > 0
            assert dashboard["analyst_summary"] is not None
            assert len(dashboard["analyst_summary"]["consensus_themes"]) > 0

            DashboardPayload.model_validate(dashboard)

            for r in dashboard["round2_responses"]:
                assert "cited_chunk_ids" in r

    @pytest.mark.asyncio
    async def test_project_lifecycle(self, client):
        resp = await client.post("/api/projects", json={"name": "Lifecycle Test"})
        assert resp.status_code == 201
        pid = resp.json()["project_id"]

        resp = await client.get(f"/api/projects/{pid}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "created"
        assert resp.json()["chunk_count"] == 0

        resp = await client.post(
            f"/api/projects/{pid}/ingest",
            json={"sources": ["mock://test"]},
        )
        assert resp.status_code == 200

        resp = await client.get(f"/api/projects/{pid}")
        assert resp.json()["status"] == "ingested"
        assert resp.json()["chunk_count"] > 0

    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        assert resp.json()["gemini_configured"] is True
