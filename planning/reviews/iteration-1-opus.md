# Opus Review — Workstream 2: AI Engine

**Model:** claude-opus-4
**Generated:** 2026-04-18

---

## Overall Assessment

Well-structured plan for a 24-hour hackathon. Schema-first approach is correct, data flow is clear, risk mitigations reasonable. Several concrete issues that could burn hours if not addressed before implementation.

## HIGH SEVERITY

### 1. Synchronous `/simulate` endpoint will timeout (~30-60s blocks)
Most HTTP clients/proxies timeout at 30s. With retries, can exceed 60s. Recommendation: return 202 Accepted with job ID, frontend polls `/dashboard`, or configure longer timeouts.

### 2. In-memory state is not concurrency-safe
`dict[str, Project]` has race conditions. Two simultaneous `/simulate` calls overwrite each other. Recommendation: per-project `asyncio.Lock`.

### 3. `generate_structured` return type loses generic info
`-> BaseModel` loses concrete type. Use `TypeVar("T", bound=BaseModel)` for type safety.

### 4. Fail-fast contradicts `asyncio.gather(return_exceptions=True)`
`return_exceptions=True` waits for all tasks. For fail-fast, use `asyncio.TaskGroup` consistently (already available via Python 3.11+).

### 5. Schema divergence between plan and WS2 spec
Plan's Persona missing `graph_entity_ids`. DashboardPayload missing `scenario_id`. ChunkExtraction description is vaguer than WS2 spec. Reconcile before implementation.

## MODERATE SEVERITY

### 6. No Gemini response caching
Every debug run burns API quota and takes 30-60s. Add cache to `generate_structured()` using hash of prompt+schema+temperature.

### 7. Leiden resolution auto-tuning has no iteration limit
Binary search could loop infinitely. Cap at 10 iterations, fall back to k-means with k=5.

### 8. Evidence grounding validation has no defined failure behavior
What happens when cited_chunk_ids don't exist? Strip invalid IDs, log warning, flag as `low_grounding` rather than dropping persona.

### 9. No input validation on route parameters
Validate Scenario (1-10 hypotheses, max 500 chars each), facets as valid literals, project_id format.

### 10. Dashboard assembly score formulas are underspecified
Provide explicit formulas for consensus_score, disagreement_score, evidence_coverage with clamping.

### 11. Mock layer try/except import is fragile
Use explicit `USE_MOCK_RETRIEVAL` env var instead of auto-detection.

## LOW SEVERITY

### 12. No health check endpoint — Add `GET /api/health`
### 13. Phase vs per-call timeout interaction — increase phase to 180s or reduce retries to 2
### 14. String-interpolated prompts fragile with JSON — use structured prompt composition
### 15. No handling of tiny clusters (<5 chunks) — merge into nearest neighbor or drop
### 16. TRIBE `scored_text` ambiguous — use hard-coded templates
### 17. No dependency specification — list exact versions
### 18. Extraction ownership ambiguity — make extraction a POST endpoint for clean boundary

## MISSING CONSIDERATIONS

- **No logging/observability strategy**: Log Gemini calls, phase transitions, validation failures
- **CORS for demo**: Add wildcard or document hostname requirements
- **Test schemas against Gemini early** (hour 2, not hour 11)
- **No partial result display**: Consider showing "Round 1 done, Round 2 failed" rather than blank error
