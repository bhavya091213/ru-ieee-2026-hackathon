Now I have all the context needed. Let me produce the section content for section-11-fastapi-routes.

# Section 11: FastAPI Routes

## Overview

This section implements the FastAPI application entry point (`main.py`) and all HTTP route modules: projects, ingest, simulate (with 202+polling), dashboard, tribe scoring, and health. It ties together the core logic from previous sections behind a RESTful API surface that the WS3 frontend consumes.

### Dependencies

- **section-01-schemas**: All Pydantic models (`Project`, `Scenario`, `DashboardPayload`, `TribeResult`, `PersonaResponse`, etc.)
- **section-02-gemini-client**: `config.py` (`Settings` with `CORS_ORIGINS`, `TRIBE_ENABLED`, `USE_MOCK_RETRIEVAL`), `get_gemini_client()`, the `generate_structured()` utility
- **section-10-dashboard-assembly**: `build_dashboard()` function that produces `DashboardPayload` from simulation state

### Key Design Decisions

- **In-memory only**: All project state lives in a `dict[str, Project]` keyed by `project_id`. No database, no file persistence.
- **Per-project `asyncio.Lock`**: Prevents concurrent simulation runs on the same project. A second `POST /simulate` while one is running returns `409 Conflict`.
- **202 Accepted + polling**: Simulation is launched as a background task. The client polls `GET /simulate/status` until `done=true`, then fetches `GET /dashboard`.
- **Rate limiting**: A shared `asyncio.Semaphore(5)` limits concurrent Gemini calls across all projects.
- **CORS**: Configured from `Settings.CORS_ORIGINS`, defaulting to `["http://localhost:5173", "*"]`.

---

## Tests

All tests use `pytest` with `pytest-asyncio` and `httpx.AsyncClient` with `ASGITransport`. Tests go in `tests/test_routes.py`.

```python
# tests/test_routes.py

"""
Tests for the FastAPI route layer.

Uses httpx.AsyncClient with ASGITransport pointed at the FastAPI app.
All core logic (orchestrator, clustering, Gemini) is mocked — these tests
verify HTTP semantics: status codes, JSON shapes, concurrency guards.
"""

# --- Health ---
# Test: GET /api/health returns 200 with {"status": "ok", "gemini_configured": bool}

# --- Projects ---
# Test: POST /api/projects creates project and returns project_id (UUID format)
# Test: POST /api/projects with missing name returns 422

# --- Ingest ---
# Test: POST /api/projects/{id}/ingest updates source_count and chunk_count
# Test: POST /api/projects/{unknown_id}/ingest returns 404

# --- Simulate ---
# Test: POST /api/projects/{id}/simulate returns 202 with run_id and status "started"
# Test: POST /api/projects/{id}/simulate returns 409 if already running
# Test: POST /api/projects/{unknown_id}/simulate returns 404

# --- Simulate Status Polling ---
# Test: GET /api/projects/{id}/simulate/status returns phase and done flag
# Test: GET /api/projects/{id}/simulate/status returns done=true after simulation completes

# --- Dashboard ---
# Test: GET /api/projects/{id}/dashboard returns DashboardPayload after simulation
# Test: GET /api/projects/{id}/dashboard returns 404 before simulation
# Test: GET /api/projects/{unknown_id}/dashboard returns 404

# --- Tribe ---
# Test: POST /api/projects/{id}/tribe/score returns TribeResult when TRIBE_ENABLED=True
# Test: POST /api/projects/{id}/tribe/score returns 400 or 404 when TRIBE_ENABLED=False

# --- Concurrency ---
# Test: per-project lock prevents concurrent simulate calls (two simultaneous POSTs,
#        second gets 409)

# --- Full Flow (integration-style) ---
# Test: create project -> ingest -> simulate -> poll status until done -> get dashboard
#        (all core logic mocked, verifies route wiring end to end)
```

### Test Setup Pattern

Each test creates an `httpx.AsyncClient` against the app, with the core orchestrator and clustering functions patched to return deterministic mock data. The key fixture provides a fresh in-memory project store per test so tests are isolated.

```python
# Fixture sketch (not full implementation):

# @pytest.fixture
# async def client():
#     """Yields an httpx.AsyncClient pointed at the test app with clean state."""
#     ...
```

The mock orchestrator should return a `SimulationState` with `phase=DONE` and a populated `DashboardPayload`. The mock ingest should set `source_count` and `chunk_count` on the project.

---

## Implementation Details

### File: `apps/api/main.py`

The FastAPI application entry point. Responsibilities:

1. **Create the `FastAPI` instance** with title, version, and description.
2. **CORS middleware**: Add `CORSMiddleware` with origins from `Settings.CORS_ORIGINS`, allowing all methods and headers for demo flexibility.
3. **Lifespan context manager** (`@asynccontextmanager`): On startup, initialize:
   - The Gemini client (via `get_gemini_client()`)
   - The in-memory project store: `dict[str, Project]` stored on `app.state.projects`
   - Per-project locks: `dict[str, asyncio.Lock]` stored on `app.state.locks`
   - Rate limiter: `asyncio.Semaphore(5)` stored on `app.state.semaphore`
   - Response cache: `dict[str, BaseModel]` stored on `app.state.cache`
   - Simulation status tracker: `dict[str, dict]` stored on `app.state.sim_status` (tracks `phase`, `error`, `done` per project)
4. **Include routers** from all route modules with `/api` prefix.
5. **Structured logging**: Configure Python logging with JSON-structured output. Every request should log method, path, status code, and latency.

The lifespan pattern (Python 3.11+):

```python
# Signature only:
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     """Initialize shared state on startup, clean up on shutdown."""
#     ...
```

### File: `apps/api/routes/health.py`

Single endpoint:

- `GET /api/health` -- Returns `{"status": "ok", "gemini_configured": bool}`. The `gemini_configured` field is `True` if `GEMINI_API_KEY` is set in the environment, `False` otherwise. This never raises -- always returns 200.

### File: `apps/api/routes/projects.py`

Project CRUD (create and read only, no update/delete for hackathon scope):

- `POST /api/projects` -- Accepts `{"name": str, "description": str}`. Generates a `uuid4` project ID, creates a `Project` instance with `status="created"` and `created_at=datetime.utcnow()`, stores it in `app.state.projects`, and returns `{"project_id": str}`.
- `GET /api/projects/{project_id}` -- Returns the `Project` as JSON, or 404 if not found.

Helper for all routes: a shared function to look up a project by ID and raise `HTTPException(404)` if missing.

```python
# Sketch:
# def get_project(project_id: str, projects: dict[str, Project]) -> Project:
#     """Look up project or raise 404."""
#     ...
```

### File: `apps/api/routes/ingest.py`

- `POST /api/projects/{project_id}/ingest` -- Accepts `{"sources": list[str]}` (URLs or raw text strings). Calls the WS1 ingestion pipeline (or mock). Updates the project's `source_count` with `len(sources)` and `chunk_count` with the number of chunks produced. Updates project `status` to `"ingested"`. Returns `{"source_count": int, "chunk_count": int}`.

For the mock path (when `USE_MOCK_RETRIEVAL=True`), skip actual ingestion and set `chunk_count` to the size of the demo corpus (approximately 50).

### File: `apps/api/routes/simulate.py`

This is the most complex route module. Three endpoints:

**`POST /api/projects/{project_id}/simulate`**

1. Look up project (404 if missing).
2. Validate request body as a `Scenario` (Pydantic handles this via the route parameter type).
3. Acquire the per-project lock (`app.state.locks`). If the lock is already held, return `409 Conflict` with `{"detail": "Simulation already running for this project"}`. Use `lock.acquire()` with a non-blocking check pattern (try `lock.acquire()` -- if it returns `False` immediately, the lock is held). Alternatively, track a `running` boolean in `sim_status`.
4. Initialize `sim_status[project_id]` to `{"phase": "RETRIEVING", "error": None, "done": False}`.
5. Launch the orchestrator as a background task (`asyncio.create_task`). The background task:
   - Runs `run_simulation()` from the orchestrator (section-06/08/09)
   - Updates `sim_status[project_id]["phase"]` as phases progress
   - On success: calls `build_dashboard()` (section-10), stores result in `project.dashboard`, sets `done=True`, releases lock
   - On failure: sets `error` with the error message, sets `done=True`, releases lock
6. Return `202 Accepted` with `{"run_id": str(uuid4()), "status": "started"}`.

**`GET /api/projects/{project_id}/simulate/status`**

1. Look up project (404 if missing).
2. Return `sim_status[project_id]` as `{"phase": str, "error": str | None, "done": bool}`.
3. If no simulation has been started for this project, return `{"phase": "IDLE", "error": None, "done": False}`.

**Non-blocking lock pattern sketch:**

```python
# Approach: use a set of "running" project IDs rather than asyncio.Lock for
# the 409-conflict check, since asyncio.Lock doesn't have try_acquire.
#
# app.state.running_sims: set[str]
#
# if project_id in app.state.running_sims:
#     raise HTTPException(409, detail="Simulation already running")
# app.state.running_sims.add(project_id)
# ... launch background task that removes project_id from running_sims on completion
```

### File: `apps/api/routes/dashboard.py`

- `GET /api/projects/{project_id}/dashboard` -- Returns the `DashboardPayload` stored on the project from the last completed simulation run. Returns 404 with `{"detail": "No simulation results available"}` if `project.dashboard` is `None`.

### File: `apps/api/routes/tribe.py`

- `POST /api/projects/{project_id}/tribe/score` -- Runs TRIBE heuristic scoring on the last simulation's round 2 responses. Returns `TribeResult`.
  - If `Settings.TRIBE_ENABLED` is `False`, return `400` with `{"detail": "TRIBE scoring is disabled"}`.
  - If no simulation results exist, return `404`.
  - Otherwise, call `score_tribe()` from section-12, store result, and return it.

### Error Handling Convention

All routes use FastAPI's `HTTPException` consistently:

| Status Code | When |
|---|---|
| 200 | Successful retrieval |
| 201 | Successful creation (projects) |
| 202 | Simulation started (async) |
| 400 | Invalid input or feature disabled |
| 404 | Unknown project_id or missing results |
| 409 | Concurrent simulation conflict |
| 422 | Pydantic validation failure (automatic) |
| 500 | Unhandled Gemini/orchestrator failure |

For 500-level errors from the orchestrator, the background task catches the exception and stores the error message in `sim_status[project_id]["error"]`. The client discovers this via the status polling endpoint.

### Router Registration

Each route file defines an `APIRouter` with a prefix and tags:

```python
# In each route file:
# router = APIRouter(prefix="/projects", tags=["projects"])
# or
# router = APIRouter(prefix="/projects", tags=["simulate"])
```

In `main.py`, all routers are included under the `/api` prefix:

```python
# app.include_router(health_router, prefix="/api")
# app.include_router(projects_router, prefix="/api")
# app.include_router(ingest_router, prefix="/api")
# app.include_router(simulate_router, prefix="/api")
# app.include_router(dashboard_router, prefix="/api")
# app.include_router(tribe_router, prefix="/api")
```

---

## File Listing

All files to be created in this section:

| File | Purpose |
|---|---|
| `apps/api/main.py` | FastAPI app, CORS, lifespan, router includes |
| `apps/api/routes/__init__.py` | Package init |
| `apps/api/routes/health.py` | Health check endpoint |
| `apps/api/routes/projects.py` | Project create/read |
| `apps/api/routes/ingest.py` | Ingestion trigger |
| `apps/api/routes/simulate.py` | Simulate (202+poll), status polling |
| `apps/api/routes/dashboard.py` | Dashboard retrieval |
| `apps/api/routes/tribe.py` | TRIBE scoring endpoint |
| `tests/test_routes.py` | All route tests |

---

## Background Task Pattern

The simulate endpoint uses `asyncio.create_task` (not FastAPI's `BackgroundTasks`) because the task needs to update shared state (`sim_status`, `running_sims`) that the status polling endpoint reads. The task reference should be stored to prevent garbage collection:

```python
# Sketch:
# task = asyncio.create_task(_run_simulation_task(project_id, scenario, app.state))
# app.state.tasks[project_id] = task  # prevent GC
```

The background task function signature:

```python
# async def _run_simulation_task(
#     project_id: str,
#     scenario: Scenario,
#     state: AppState,
# ) -> None:
#     """Run the full simulation pipeline and update shared state."""
#     ...
```

Inside this function:
1. Wrap everything in a `try/except`.
2. Call `run_simulation()` with the project's personas, scenario, and the rate-limiting semaphore.
3. Update `sim_status[project_id]["phase"]` after each phase (the orchestrator can accept a callback for this).
4. On success, call `build_dashboard()` and store on the project.
5. On any exception, set `sim_status[project_id]["error"]` to `str(exception)`.
6. In the `finally` block: set `done=True`, remove from `running_sims`, release resources.

---

## CORS Configuration

The CORS middleware is configured permissively for hackathon demo purposes:

- `allow_origins`: from `Settings.CORS_ORIGINS` (default `["http://localhost:5173", "*"]`)
- `allow_methods`: `["*"]`
- `allow_headers`: `["*"]`
- `allow_credentials`: `True`

---

## Request/Response Schemas for Routes

For routes that accept custom request bodies (not already covered by the domain schemas), define small Pydantic models:

```python
# apps/api/routes/projects.py
# class CreateProjectRequest(BaseModel):
#     name: str
#     description: str = ""

# apps/api/routes/ingest.py
# class IngestRequest(BaseModel):
#     sources: list[str]
```

Route responses can use plain dicts for simple cases (`{"project_id": "..."}`) or return domain models directly (FastAPI serializes Pydantic models automatically).

---

## Accessing Shared State in Routes

Routes access the shared in-memory state via FastAPI's `Request` object:

```python
# Pattern used in route handlers:
# @router.post("/projects")
# async def create_project(body: CreateProjectRequest, request: Request):
#     projects = request.app.state.projects
#     ...
```

This avoids global mutable state and keeps everything scoped to the app lifecycle. In tests, the test client uses the same app instance, so the state is accessible and can be reset between tests.