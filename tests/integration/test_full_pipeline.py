from __future__ import annotations

import asyncio

import pytest

from apps.api.schemas.dashboard import DashboardPayload
from tests.integration.conftest import TEST_SCENARIO, poll_until_done


class TestFullPipeline:
    @pytest.mark.asyncio
    async def test_create_ingest_simulate_dashboard(self, client):
        # 1. Create project
        resp = await client.post("/api/projects", json={"name": "E2E Test"})
        assert resp.status_code == 201
        project_id = resp.json()["project_id"]

        # 2. Ingest
        resp = await client.post(
            f"/api/projects/{project_id}/ingest",
            json={"sources": ["mock://test"]},
        )
        assert resp.status_code == 200
        assert resp.json()["chunk_count"] > 0

        # 3. Start simulation
        resp = await client.post(
            f"/api/projects/{project_id}/simulate",
            json=TEST_SCENARIO,
        )
        assert resp.status_code == 202

        # 4. Poll until done
        status = await poll_until_done(client, project_id)
        assert status["done"] is True
        assert status.get("error") is None, f"Simulation failed: {status.get('error')}"

        # 5. Get dashboard
        resp = await client.get(f"/api/projects/{project_id}/dashboard")
        assert resp.status_code == 200

        data = resp.json()
        dashboard = DashboardPayload.model_validate(data)
        assert dashboard.project_id == project_id
        assert 0.0 <= dashboard.consensus_score <= 1.0
        assert 0.0 <= dashboard.disagreement_score <= 1.0
        assert 0.0 <= dashboard.evidence_coverage <= 1.0
        assert len(dashboard.round1_responses) > 0
        assert len(dashboard.round2_responses) > 0
        assert dashboard.moderator_question
        assert dashboard.analyst_summary is not None
        assert len(dashboard.analyst_summary.consensus_themes) > 0


class TestDashboardBeforeSimulation:
    @pytest.mark.asyncio
    async def test_returns_404(self, client):
        resp = await client.post("/api/projects", json={"name": "No Sim"})
        pid = resp.json()["project_id"]
        resp = await client.get(f"/api/projects/{pid}/dashboard")
        assert resp.status_code == 404


class TestUnknownProject:
    @pytest.mark.asyncio
    async def test_returns_404(self, client):
        resp = await client.get("/api/projects/nonexistent-uuid/dashboard")
        assert resp.status_code == 404


class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_returns_ok(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"


class TestConcurrentSimulation:
    @pytest.mark.asyncio
    async def test_second_simulate_returns_409(self, client):
        resp = await client.post("/api/projects", json={"name": "Concurrent"})
        pid = resp.json()["project_id"]
        await client.post(f"/api/projects/{pid}/ingest", json={"sources": ["mock"]})

        # Start first simulation
        resp1 = await client.post(f"/api/projects/{pid}/simulate", json=TEST_SCENARIO)
        assert resp1.status_code == 202

        # Immediately try second - should get 409
        resp2 = await client.post(f"/api/projects/{pid}/simulate", json=TEST_SCENARIO)
        assert resp2.status_code == 409

        # Wait for first to finish
        await poll_until_done(client, pid)
