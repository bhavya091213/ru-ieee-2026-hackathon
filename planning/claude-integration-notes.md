# Integration Notes — Opus Review Feedback (WS2 AI Engine)

## Changes Integrated

### HIGH: #1 — Synchronous `/simulate` timeout risk
**Integrating.** Change `/simulate` to return 202 Accepted with a run_id. Frontend polls `GET /dashboard` until ready. This aligns with how WS3 already handles long-running ops (polling with progress). Added to Section 8.

### HIGH: #2 — In-memory state concurrency
**Integrating.** Add per-project `asyncio.Lock` in the project store. Reject concurrent `/simulate` for the same project with 409. Added to Sections 4 and 8.

### HIGH: #3 — `generate_structured` generic return type
**Integrating.** Use `TypeVar("T", bound=BaseModel)` for type-safe returns. Added to Section 4.

### HIGH: #4 — TaskGroup vs gather for fail-fast
**Integrating.** Switch all parallel fan-out to `asyncio.TaskGroup` since we require Python 3.11+ and want fail-fast. Added to Section 7.

### HIGH: #5 — Schema divergence
**Integrating.** WS2 spec is the authoritative contract. Plan now references it as single source of truth and adds the missing fields (graph_entity_ids on Persona, scenario_id on DashboardPayload). Added to Section 3.

### MODERATE: #6 — Gemini response caching
**Integrating.** Add a prompt-hash cache to `generate_structured()`. Cache key = sha256(prompt + schema_name + temperature). In-memory dict, optionally write to disk. Added to Section 4.

### MODERATE: #7 — Leiden iteration limit
**Integrating.** Cap binary search at 10 iterations, fall back to k-means with k=5. Added to Section 6.

### MODERATE: #8 — Evidence grounding failure behavior
**Integrating.** Strip invalid chunk IDs, log warning, flag `low_grounding` on persona response. Don't drop the persona. Added to Section 7.

### MODERATE: #9 — Input validation
**Integrating.** Add Pydantic validators to Scenario model. Added to Section 3.

### MODERATE: #10 — Score formulas
**Integrating.** Added explicit formulas with clamping to Section 7.

### MODERATE: #11 — Mock layer explicit flag
**Integrating.** Use `USE_MOCK_RETRIEVAL` env var. No auto-detection. Added to Sections 4 and 10.

## Changes NOT Integrated

### LOW: #12 — Health check endpoint
**Not integrating.** Good idea but trivial to add during implementation. Not worth plan space.

### LOW: #13 — Timeout interaction
**Integrating partially.** Reducing retries to 2 (not 3) to fit within phase timeout. Mentioned in Section 7.

### LOW: #14 — String-interpolated prompts
**Not integrating.** Valid concern but prompt templates with `.format()` are fine for a hackathon. JSON escaping can be handled by json.dumps() inside the template variables.

### LOW: #15 — Tiny cluster handling
**Integrating.** Added minimum cluster size of 3 chunks. Merge small clusters. Added to Section 6.

### LOW: #16 — TRIBE scored_text
**Integrating.** Hard-coded templates, no Gemini call. Added to Section 9.

### LOW: #17 — Dependency specification
**Not integrating in plan.** Will be in pyproject.toml during implementation.

### LOW: #18 — Extraction as endpoint
**Not integrating.** Direct function import is simpler for a hackathon monorepo. The extraction function is stable after hour 4.

### MISSING: Logging strategy
**Integrating.** Added structured logging requirements to Section 4.

### MISSING: CORS wildcard for demo
**Integrating.** Added `"*"` as demo fallback to Section 4.

### MISSING: Test schemas early
**Integrating.** Added to Section 5 — test all schemas against Gemini at hour 2-3.

### MISSING: Partial result display
**Not integrating.** Contradicts the fail-fast decision from the interview. Keeping it simple.
