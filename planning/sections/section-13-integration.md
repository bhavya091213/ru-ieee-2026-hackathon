Now I have a comprehensive understanding of all the sections. Let me generate the section-13-integration content.

# Section 13: End-to-End Integration Tests

## Overview

This section provides the final integration test suite that validates the complete PanelForge pipeline from project creation through dashboard delivery. It exercises every section (01 through 12) working together as a cohesive system. All Gemini calls are mocked, but the test verifies real wiring between the FastAPI routes, orchestrator state machine, persona synthesis pipeline, simulation rounds, moderator/analyst phases, dashboard assembly, and optional TRIBE scoring.

The integration tests use `httpx.AsyncClient` with `ASGITransport` against the actual FastAPI app, covering the end-to-end HTTP contract that WS3 (frontend) consumes.

---

## Dependencies

This section depends on every other section in the workstream:

| Section | What It Provides |
|---------|-----------------|
| section-01-schemas | All Pydantic models: `DashboardPayload`, `Persona`, `PersonaResponse`, `ModeratorQuestion`, `AnalystSummary`, `Scenario`, `TribeResult`, etc. |
| section-02-gemini-client | `config.py` (Settings, env vars), `core/gemini.py` (`generate_structured()`), `main.py` (FastAPI app) |
| section-03-extraction | `core/extraction/extract.py` (`extract_chunk()`) |
| section-04-clustering | `core/personas/cluster.py` (`cluster_chunks()`, `ClusterResult`) |
| section-05-persona-synthesis | `core/personas/synthesize.py` (`synthesize_personas()`) |
| section-06-orchestrator-state | `core/simulation/orchestrator.py` (`SimulationState`, `SimPhase`, `run_simulation()`, `PHASE_ORDER`) |
| section-07-retrieval-mock | `core/simulation/retrieve.py` (`retrieve_for_persona()`), `core/simulation/mock_corpus.py` (demo chunks) |
| section-08-simulation-rounds | Round 1 and Round 2 phase implementations (`round1_phase`, `round2_phase`) |
| section-09-moderator-analyst | `core/simulation/moderator.py` (`analyze_disagreement()`), `core/simulation/analyst.py` (`synthesize_results()`) |
| section-10-dashboard-assembly | Dashboard builder producing `DashboardPayload` from simulation state |
| section-11-fastapi-routes | All route files: projects, ingest, simulate (202+polling), dashboard, tribe, health |
| section-12-tribe-scoring | `core/scoring/heuristics.py` and `core/scoring/tribe_runner.py` (`score_tribe()`) |

All of the above must be implemented and passing their own unit tests before this section's tests can run.

---

## Files to Create

```
tests/
  integration/
    __init__.py
    test_full_pipeline.py       # End-to-end integration tests
    conftest.py                 # Shared fixtures (mock Gemini, test client, factory helpers)
```

All paths are relative to the project root `/Users/bhavyapatel/Documents/Projects/focus-group-agent`.

---

## Tests (Write First)

Testing framework: **pytest** with **pytest-asyncio**. HTTP testing via **httpx.AsyncClient** with **ASGITransport**. All Gemini calls are mocked at the `core/gemini.py` `generate_structured` level.

### Fixture Strategy

The `conftest.py` file should provide the following shared fixtures:

1. **`mock_gemini`** -- A `pytest` fixture that patches `core.gemini.generate_structured` (and clears the prompt-hash cache via `core.gemini.clear_cache()`). The mock dispatches based on the `response_schema` type argument:
   - `Persona` schema calls return a factory-built test persona with realistic fields and valid `evidence_chunk_ids` referencing mock corpus chunk IDs.
   - `PersonaResponse` schema calls return a factory-built persona response with `cited_chunk_ids` drawn from the mock corpus.
   - `ModeratorQuestion` schema calls return a response with `targeted_persona_ids` matching the test personas.
   - `AnalystSummary` schema calls return a fully populated summary with non-empty lists for all fields.
   - `ChunkExtraction` schema calls return a valid extraction (for the ingest step if tested).

2. **`async_client`** -- An `httpx.AsyncClient` fixture wrapping the FastAPI app via `ASGITransport`. This is the HTTP client used in all integration tests.

3. **`test_scenario`** -- A reusable `Scenario` dict (not model instance) suitable for POST body: `{"product_name": "TestPhone X", "description": "A flagship smartphone", "hypotheses": ["Users care most about camera quality"], "facets_to_explore": ["camera", "battery", "price"]}`.

4. **`created_project_id`** -- A fixture that calls `POST /api/projects` and returns the `project_id` for use in subsequent test steps.

### `tests/integration/test_full_pipeline.py`

```python
"""End-to-end integration tests for the full PanelForge pipeline.

Tests the complete flow: create project -> ingest -> simulate -> poll status -> get dashboard.
All Gemini calls are mocked. Uses httpx.AsyncClient against the real FastAPI app.
"""
import pytest
import asyncio

# ---- Full Pipeline Flow ----

# Test: full flow - create project -> ingest (mock) -> simulate -> poll status -> get dashboard
#
# Steps:
#   1. POST /api/projects with {"name": "Integration Test", "description": "E2E test project"}
#      Assert 200/201, extract project_id from response.
#   2. POST /api/projects/{project_id}/ingest with {"sources": ["mock://test"]}
#      Assert success. Verify project now has source_count > 0 and chunk_count > 0.
#   3. POST /api/projects/{project_id}/simulate with the test Scenario body.
#      Assert 202 Accepted. Extract run_id from response.
#   4. Poll GET /api/projects/{project_id}/simulate/status in a loop (max 30 iterations, 0.5s sleep).
#      Assert each response has "phase" and "done" fields.
#      Continue until done=True or max iterations reached.
#      Assert done=True was reached (simulation completed).
#   5. GET /api/projects/{project_id}/dashboard
#      Assert 200. Parse response body as DashboardPayload (or validate against its JSON schema).
#      Assert project_id in response matches.
#      Assert consensus_score is a float in [0, 1].
#      Assert disagreement_score is a float in [0, 1].
#      Assert evidence_coverage is a float in [0, 1].
#      Assert personas list is non-empty.
#      Assert round1_responses list is non-empty.
#      Assert round2_responses list is non-empty.
#      Assert moderator_question is a non-empty string.
#      Assert analyst_summary has non-empty consensus_themes.

# ---- DashboardPayload Schema Validation ----

# Test: DashboardPayload from pipeline validates cleanly against Pydantic schema
#
# After running the full pipeline (reuse the flow above or use a fixture):
#   - Take the raw JSON response from GET /api/projects/{id}/dashboard
#   - Call DashboardPayload.model_validate(response_json)
#   - Assert no ValidationError is raised
#   - Assert all required fields are present and correctly typed
#   - This catches any drift between the route serialization and the schema definition

# ---- Evidence Grounding End-to-End ----

# Test: every cited_chunk_id in round2 responses exists in the mock corpus
#
# After running the full pipeline:
#   - Collect all cited_chunk_ids from all round2_responses in the dashboard
#   - Import DEMO_CHUNKS from core.simulation.mock_corpus
#   - Build the set of valid chunk IDs from the demo corpus
#   - Assert every cited_chunk_id is found in the valid set
#   - This verifies the grounding validation logic works end-to-end:
#     the mock Gemini returns IDs, the grounding validator strips invalid ones,
#     and the dashboard only contains valid references

# Test: personas in dashboard have evidence-backed beliefs
#
# After running the full pipeline:
#   - For each PersonaSummary in the dashboard, verify it has non-empty fields:
#     segment_label, summary, strongest_positive, strongest_concern
#   - Verify adoption_likelihood is in range [0, 100]
#   - Verify feature_priorities keys are valid facet literals

# ---- Concurrent Simulation Rejection ----

# Test: second simulate call returns 409 Conflict while first is running
#
# Steps:
#   1. Create a project and ingest.
#   2. POST /api/projects/{id}/simulate -- assert 202.
#   3. Immediately POST /api/projects/{id}/simulate again (before first completes).
#   4. Assert the second call returns 409 Conflict.
#   5. Wait for the first simulation to complete (poll status).

# ---- Dashboard Before Simulation ----

# Test: GET /api/projects/{id}/dashboard returns 404 before any simulation
#
#   1. Create a project (no ingest, no simulate).
#   2. GET /api/projects/{id}/dashboard
#   3. Assert 404 response.

# ---- Unknown Project ----

# Test: GET /api/projects/{unknown_id}/dashboard returns 404
#
#   1. GET /api/projects/nonexistent-uuid/dashboard
#   2. Assert 404 response.

# ---- Health Check ----

# Test: GET /api/health returns ok status
#
#   1. GET /api/health
#   2. Assert 200 with {"status": "ok", "gemini_configured": bool}

# ---- TRIBE Scoring Integration ----

# Test: TRIBE scoring is included in dashboard when TRIBE_ENABLED=True
#
# Steps (with TRIBE_ENABLED env var set to "true"):
#   1. Run the full pipeline (create -> ingest -> simulate -> poll -> dashboard).
#   2. Assert dashboard.tribe is not None.
#   3. Assert dashboard.tribe.enabled is True.
#   4. Assert dashboard.tribe.response_strength is a float in [0, 1].
#   5. Assert dashboard.tribe.response_variance is a float in [0, 1].
#   6. Assert dashboard.tribe.response_spread is a float in [0, 1].
#   7. Assert dashboard.tribe.scored_text is a non-empty string.

# Test: TRIBE scoring is None in dashboard when TRIBE_ENABLED=False (default)
#
# Steps (with default env, TRIBE_ENABLED not set):
#   1. Run the full pipeline.
#   2. Assert dashboard.tribe is None.

# ---- Status Polling Phases ----

# Test: status polling shows phase progression
#
# During the full pipeline flow, collect all "phase" values observed
# from the polling loop. Assert that the observed phases are a subset
# of the valid SimPhase values (RETRIEVING, ROUND1, MODERATING, ROUND2,
# ANALYZING, SCORING, DONE). Assert the final phase is DONE.
```

---

## Implementation Details

### Conftest Fixtures (`tests/integration/conftest.py`)

The conftest file is critical. It wires up the mock Gemini layer so that the entire pipeline can run without real API calls while still exercising all the real code paths (routing, orchestration, state machine transitions, dashboard assembly, grounding validation).

**Mock Gemini Dispatch Logic:**

The mock for `generate_structured` should be an async function that inspects the `response_schema` parameter and returns the appropriate test data. The key requirement is that returned mock data must be internally consistent:

- `PersonaResponse.cited_chunk_ids` must contain IDs that exist in the mock corpus (`DEMO_CHUNKS`). Import the corpus and pick real chunk IDs from it.
- `ModeratorQuestion.targeted_persona_ids` must reference persona IDs that exist in the test persona set. Since persona IDs are generated during synthesis, the mock for `Persona` should use deterministic IDs (e.g., `"persona-0"`, `"persona-1"`, etc.), and the `ModeratorQuestion` mock should reference those same IDs.
- `AnalystSummary` fields should contain plausible strings referencing themes from the test scenario.

**Factory Helper Functions:**

Create helper functions (not fixtures) for building consistent test data. These should live in `conftest.py` or a separate `tests/integration/factories.py` module:

- `make_test_persona(index: int) -> Persona` -- Returns a Persona with deterministic ID `"persona-{index}"`, realistic segment_label, beliefs with valid mock corpus chunk IDs (at least 2 per belief), and feature_priorities with valid facet keys.
- `make_test_persona_response(persona_id: str, chunk_ids: list[str]) -> PersonaResponse` -- Returns a PersonaResponse with the given persona_id, cited_chunk_ids from the provided list, realistic scores, and a non-empty quotable_sentence.
- `make_test_moderator_question(persona_ids: list[str]) -> ModeratorQuestion` -- Returns a ModeratorQuestion targeting a subset of the given persona_ids.
- `make_test_analyst_summary() -> AnalystSummary` -- Returns an AnalystSummary with non-empty lists for all fields.

**AsyncClient Fixture:**

```python
@pytest.fixture
async def async_client(mock_gemini):
    """HTTP client for testing FastAPI routes.
    
    Uses ASGITransport to make requests directly to the app without a real server.
    The mock_gemini fixture must be active to prevent real API calls.
    """
    # Import the FastAPI app from main.py
    # Create httpx.AsyncClient with ASGITransport(app=app)
    # Yield the client
    # Close the client on teardown
```

The client must be created after the mock is applied so that the app's lifespan handler runs with mocked dependencies.

**Environment Variable Management:**

For tests that require specific env var values (e.g., `TRIBE_ENABLED=True`), use `monkeypatch` or a dedicated fixture that sets and restores environment variables. Reset the settings singleton (`get_settings.cache_clear()`) after changing env vars so the new values take effect.

### Mocking Strategy

The integration tests mock at the **`generate_structured` level only**. Everything else runs as real code:

- Real FastAPI routing and middleware
- Real request validation
- Real orchestrator state machine transitions
- Real dashboard assembly (score computations, aggregations)
- Real mock corpus retrieval (section-07)
- Real grounding validation (strip invalid chunk IDs)
- Real TRIBE heuristic calculations (section-12)

This is deliberate. Mocking only the LLM boundary means the integration test catches wiring bugs, state machine errors, data flow issues, and schema mismatches that unit tests miss.

For the clustering pipeline (section-04), the integration test may also need to mock `cluster_chunks()` and `synthesize_personas()` since they are called during project setup before simulation begins. Two approaches:

1. **Mock at the cluster level**: Patch `core.personas.cluster.cluster_chunks` to return pre-built `ClusterResult` objects, and patch `core.personas.synthesize.synthesize_personas` to return pre-built `Persona` objects. This avoids needing the sentence-transformers model in CI.
2. **Mock at the Gemini level only**: If the test environment has sentence-transformers installed, let the real embedding and clustering code run against the mock corpus chunks. Only mock the Gemini call inside `synthesize_personas`. This provides deeper integration coverage.

Option 1 is recommended for CI reliability and speed. The section should support both approaches via a configurable fixture.

### Polling Helper

The simulate endpoint returns 202 and runs in the background. Tests need a polling helper:

```python
async def poll_until_done(
    client: httpx.AsyncClient,
    project_id: str,
    max_attempts: int = 30,
    interval: float = 0.5,
) -> dict:
    """Poll the simulate status endpoint until done=True or max_attempts reached.
    
    Returns the final status response dict.
    Raises AssertionError if simulation does not complete within max_attempts.
    """
```

This helper is used by multiple tests to avoid duplicating polling logic.

### Test Execution Order

The tests within `test_full_pipeline.py` are independent -- each creates its own project and runs its own pipeline. Tests should not share state. Use `pytest` markers if you need to control execution order, but independent tests are preferred.

For the full pipeline test, the sequence within a single test function is:

1. `POST /api/projects` -- create
2. `POST /api/projects/{id}/ingest` -- ingest mock data
3. `POST /api/projects/{id}/simulate` -- start simulation (202)
4. Poll `GET /api/projects/{id}/simulate/status` until done
5. `GET /api/projects/{id}/dashboard` -- retrieve results
6. Assertions on the dashboard payload

### Assertion Specifics

**DashboardPayload Schema Validation:**
- Call `DashboardPayload.model_validate(response.json())` on the raw HTTP response body. If this passes without raising `ValidationError`, the schema contract is satisfied. This single assertion covers field presence, types, nesting, and optional fields.

**Evidence Grounding Chain:**
- Import `DEMO_CHUNKS` from `core.simulation.mock_corpus`.
- Build `valid_ids = {chunk["chunk_id"] for chunk in DEMO_CHUNKS}`.
- For every `PersonaResponse` in `dashboard.round2_responses`, assert that `set(response.cited_chunk_ids).issubset(valid_ids)`.
- This validates the entire grounding chain: mock corpus provides IDs, mock Gemini references them, grounding validation strips any invalid ones, and the dashboard surfaces only valid references.

**Score Range Validation:**
- `consensus_score`: must be in `[0.0, 1.0]`.
- `disagreement_score`: must be in `[0.0, 1.0]`.
- `evidence_coverage`: must be in `[0.0, 1.0]`.
- These are computed by the dashboard assembly (section-10), not returned by Gemini, so they exercise real computation.

**TRIBE Conditional Inclusion:**
- When `TRIBE_ENABLED=False` (default), `dashboard.tribe` must be `None`.
- When `TRIBE_ENABLED=True`, `dashboard.tribe` must be a `TribeResult` with `enabled=True` and all numeric fields in `[0.0, 1.0]`.

---

## Error Scenarios to Cover

Beyond the happy path, these error scenarios validate system robustness:

1. **409 Conflict on concurrent simulate**: Start a simulation, immediately try another on the same project. The per-project `asyncio.Lock` should cause the second request to receive 409.

2. **404 on dashboard before simulation**: Requesting the dashboard for a project that has not been simulated yet must return 404, not 500 or an empty payload.

3. **404 on unknown project**: Any route called with a non-existent `project_id` must return 404.

4. **Health check availability**: The health endpoint must respond even when no projects exist and no simulations have run.

---

## Key File Paths Summary

| File | Purpose |
|------|---------|
| `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/integration/__init__.py` | Package init |
| `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/integration/conftest.py` | Shared fixtures: mock_gemini, async_client, test_scenario, factory helpers, polling helper |
| `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/integration/test_full_pipeline.py` | All integration tests |
| `/Users/bhavyapatel/Documents/Projects/focus-group-agent/apps/api/main.py` | FastAPI app (imported by async_client fixture) |
| `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/gemini.py` | The single mock target (`generate_structured` and `clear_cache`) |
| `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/simulation/mock_corpus.py` | `DEMO_CHUNKS` used for grounding assertions |
| `/Users/bhavyapatel/Documents/Projects/focus-group-agent/config.py` | `Settings`, `get_settings` (cleared between tests for env var changes) |

---

## Verification Checklist

After implementation, confirm:

- [ ] All tests in `tests/integration/test_full_pipeline.py` pass with `uv run pytest tests/integration/`
- [ ] The full pipeline test completes: create -> ingest -> simulate -> poll -> dashboard
- [ ] `DashboardPayload.model_validate()` succeeds on the raw dashboard response
- [ ] Every `cited_chunk_id` in round2 responses maps to a real mock corpus chunk
- [ ] Score fields (`consensus_score`, `disagreement_score`, `evidence_coverage`) are in `[0, 1]`
- [ ] Dashboard `personas` list is non-empty with valid `PersonaSummary` objects
- [ ] Second concurrent simulate returns 409
- [ ] Dashboard returns 404 before simulation
- [ ] Unknown project returns 404
- [ ] Health endpoint returns 200 with `status: "ok"`
- [ ] TRIBE is `None` when disabled, populated `TribeResult` when enabled
- [ ] No real Gemini API calls are made during test execution