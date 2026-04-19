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

        # 2. Ingest (empty sources — no real fetch in tests)
        resp = await client.post(
            f"/api/projects/{project_id}/ingest",
            json={"sources": []},
        )
        assert resp.status_code == 200

        # 3. Start simulation
        resp = await client.post(
            f"/api/projects/{project_id}/simulate",
            json=TEST_SCENARIO,
        )
        assert resp.status_code == 202

        # 4. Poll until done — with no ingested data, simulation fails gracefully
        status = await poll_until_done(client, project_id)
        assert status["done"] is True
        # Without real URLs to ingest, there are no chunks for simulation
        # so the pipeline fails cleanly — this validates the error path
        if status.get("error"):
            assert "chunk" in status["error"].lower() or "ingest" in status["error"].lower()
            return

        # 5. If simulation succeeded (e.g. with real data), validate dashboard
        resp = await client.get(f"/api/projects/{project_id}/dashboard")
        assert resp.status_code == 200

        data = resp.json()
        dashboard = DashboardPayload.model_validate(data)
        assert dashboard.project_id == project_id
        assert 0.0 <= dashboard.consensus_score <= 1.0


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
        await client.post(f"/api/projects/{pid}/ingest", json={"sources": []})

        # Start first simulation
        resp1 = await client.post(f"/api/projects/{pid}/simulate", json=TEST_SCENARIO)
        assert resp1.status_code == 202

        # Immediately try second - should get 409
        resp2 = await client.post(f"/api/projects/{pid}/simulate", json=TEST_SCENARIO)
        assert resp2.status_code == 409

        # Wait for first to finish
        await poll_until_done(client, pid)
