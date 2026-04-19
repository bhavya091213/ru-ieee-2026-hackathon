from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio

from apps.api.main import create_app


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("USE_MOCK_RETRIEVAL", "true")
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


class TestHealth:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"


class TestProjects:
    @pytest.mark.asyncio
    async def test_create_project(self, client):
        resp = await client.post("/api/projects", json={"name": "Test", "description": "A test"})
        assert resp.status_code == 201
        data = resp.json()
        assert "project_id" in data

    @pytest.mark.asyncio
    async def test_create_project_missing_name(self, client):
        resp = await client.post("/api/projects", json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_project(self, client):
        create_resp = await client.post("/api/projects", json={"name": "Test"})
        pid = create_resp.json()["project_id"]
        resp = await client.get(f"/api/projects/{pid}")
        assert resp.status_code == 200
        assert resp.json()["project_id"] == pid

    @pytest.mark.asyncio
    async def test_get_unknown_project(self, client):
        resp = await client.get("/api/projects/nonexistent")
        assert resp.status_code == 404


class TestIngest:
    @pytest.mark.asyncio
    async def test_ingest_returns_200(self, client):
        create_resp = await client.post("/api/projects", json={"name": "Test"})
        pid = create_resp.json()["project_id"]
        resp = await client.post(
            f"/api/projects/{pid}/ingest",
            json={"sources": []},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "source_count" in data
        assert "chunk_count" in data

    @pytest.mark.asyncio
    async def test_ingest_unknown_project(self, client):
        resp = await client.post("/api/projects/nonexistent/ingest", json={"sources": ["x"]})
        assert resp.status_code == 404


class TestSimulate:
    @pytest.mark.asyncio
    async def test_simulate_returns_202(self, client):
        create_resp = await client.post("/api/projects", json={"name": "Test"})
        pid = create_resp.json()["project_id"]
        await client.post(f"/api/projects/{pid}/ingest", json={"sources": ["mock"]})

        with patch("apps.api.routes.simulate._run_simulation_task", new_callable=AsyncMock):
            resp = await client.post(
                f"/api/projects/{pid}/simulate",
                json={
                    "product_name": "TestPhone",
                    "description": "Test",
                    "hypotheses": ["H1"],
                    "facets_to_explore": ["camera"],
                },
            )
        assert resp.status_code == 202
        assert "run_id" in resp.json()

    @pytest.mark.asyncio
    async def test_simulate_unknown_project(self, client):
        resp = await client.post(
            "/api/projects/nonexistent/simulate",
            json={
                "product_name": "TestPhone",
                "description": "Test",
                "hypotheses": ["H1"],
                "facets_to_explore": ["camera"],
            },
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_status_idle(self, client):
        create_resp = await client.post("/api/projects", json={"name": "Test"})
        pid = create_resp.json()["project_id"]
        resp = await client.get(f"/api/projects/{pid}/simulate/status")
        assert resp.status_code == 200
        assert resp.json()["phase"] == "IDLE"


    @pytest.mark.asyncio
    async def test_simulate_409_when_already_running(self, client, app):
        create_resp = await client.post("/api/projects", json={"name": "Test"})
        pid = create_resp.json()["project_id"]
        await client.post(f"/api/projects/{pid}/ingest", json={"sources": ["mock"]})

        app.state.running_sims.add(pid)

        resp = await client.post(
            f"/api/projects/{pid}/simulate",
            json={
                "product_name": "TestPhone",
                "description": "Test",
                "hypotheses": ["H1"],
                "facets_to_explore": ["camera"],
            },
        )
        assert resp.status_code == 409

        app.state.running_sims.discard(pid)


class TestTribe:
    @pytest.mark.asyncio
    async def test_tribe_disabled_returns_400(self, client, monkeypatch):
        monkeypatch.setenv("TRIBE_ENABLED", "false")
        import config
        config.get_settings.cache_clear()

        create_resp = await client.post("/api/projects", json={"name": "Test"})
        pid = create_resp.json()["project_id"]
        resp = await client.post(f"/api/projects/{pid}/tribe/score")
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_tribe_unknown_project(self, client, monkeypatch):
        monkeypatch.setenv("TRIBE_ENABLED", "true")
        import config
        config.get_settings.cache_clear()

        resp = await client.post("/api/projects/nonexistent/tribe/score")
        assert resp.status_code == 404


class TestDashboard:
    @pytest.mark.asyncio
    async def test_dashboard_before_simulation(self, client):
        create_resp = await client.post("/api/projects", json={"name": "Test"})
        pid = create_resp.json()["project_id"]
        resp = await client.get(f"/api/projects/{pid}/dashboard")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_dashboard_unknown_project(self, client):
        resp = await client.get("/api/projects/nonexistent/dashboard")
        assert resp.status_code == 404
