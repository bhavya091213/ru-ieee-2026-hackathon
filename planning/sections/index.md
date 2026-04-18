<!-- PROJECT_CONFIG
runtime: python-uv
test_command: uv run pytest
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-schemas
section-02-gemini-client
section-03-extraction
section-04-clustering
section-05-persona-synthesis
section-06-orchestrator-state
section-07-retrieval-mock
section-08-simulation-rounds
section-09-moderator-analyst
section-10-dashboard-assembly
section-11-fastapi-routes
section-12-tribe-scoring
section-13-integration
END_MANIFEST -->

# Implementation Sections Index — Workstream 2: AI Engine

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-schemas | - | all | Yes |
| section-02-gemini-client | 01 | 03, 04, 
05, 08, 09 | No |
| section-03-extraction | 01, 02 | 13 | Yes |
| section-04-clustering | 01, 02 | 05 | Yes |
| section-05-persona-synthesis | 01, 02, 04 | 06, 08 | No |
| section-06-orchestrator-state | 01, 05 | 08, 09, 10 | No |
| section-07-retrieval-mock | 01 | 08 | Yes |
| section-08-simulation-rounds | 01, 02, 06, 07 | 09 | No |
| section-09-moderator-analyst | 01, 02, 06, 08 | 10 | No |
| section-10-dashboard-assembly | 01, 06, 08, 09 | 11 | No |
| section-11-fastapi-routes | 01, 02, 10 | 13 | No |
| section-12-tribe-scoring | 01 | 11 | Yes |
| section-13-integration | all | - | No |

## Execution Order

1. **Batch 1**: section-01-schemas (no dependencies — foundation for everything)
2. **Batch 2**: section-02-gemini-client (depends on schemas)
3. **Batch 3**: section-03-extraction, section-04-clustering, section-07-retrieval-mock, section-12-tribe-scoring (parallel — all depend on 01 and/or 02 but not each other)
4. **Batch 4**: section-05-persona-synthesis (depends on 04)
5. **Batch 5**: section-06-orchestrator-state (depends on 05)
6. **Batch 6**: section-08-simulation-rounds (depends on 06, 07)
7. **Batch 7**: section-09-moderator-analyst (depends on 08)
8. **Batch 8**: section-10-dashboard-assembly (depends on 09)
9. **Batch 9**: section-11-fastapi-routes (depends on 10, 12)
10. **Batch 10**: section-13-integration (depends on all)

## Section Summaries

### section-01-schemas
All Pydantic v2 schemas: ChunkExtraction, ExtractedEntity, ExtractedRelationship, Persona, Belief, Scenario, PersonaResponse, ModeratorQuestion, AnalystSummary, DashboardPayload, PersonaSummary, QuoteCard, ScoredLabel, FeatureScoreRow, TribeResult, Project. Validators for Scenario. JSON Schema export tests.

### section-02-gemini-client
config.py (BaseSettings with all env vars), Gemini client factory, generate_structured() with TypeVar generics, prompt-hash caching, retry logic (2 retries), response validation, finish_reason checking. Structured logging setup.

### section-03-extraction
extract_chunk() function with extraction prompt template. Temperature=0.0, thinking_budget=0. Tests against Gemini schema compatibility. Delivery artifact for WS1.

### section-04-clustering
Embedding pipeline (sentence-transformers all-MiniLM-L6-v2), KNN graph construction (k=15, cosine), Leiden CPMVertexPartition with resolution auto-tuning (binary search, 10 iter cap), k-means fallback, minimum cluster size=3, cluster merging, c-TF-IDF keyword extraction.

### section-05-persona-synthesis
Gemini-powered cluster-to-persona conversion. Synthesis prompt template. Post-validation: drop beliefs with <2 evidence_chunk_ids, validate feature_priorities facets, include graph_entity_ids. Parallel synthesis across clusters.

### section-06-orchestrator-state
SimulationState frozen dataclass, SimPhase StrEnum, transition() method, run_simulation() orchestrator loop with phase-level timeouts (180s), fail-fast short-circuit. State machine infrastructure only — no phase implementations.

### section-07-retrieval-mock
Mock retrieve() and get_community_labels() for demo. ~50 hardcoded demo chunks about consumer electronics. Facet filtering. USE_MOCK_RETRIEVAL env var control. retrieve_for_persona() wrapper.

### section-08-simulation-rounds
Round 1 and Round 2 phase implementations. TaskGroup parallel fan-out. Panel response prompt with evidence grounding enforcement. Anti-sycophancy instructions. Grounding validation (strip invalid chunk IDs, flag low_grounding). Semaphore(5) rate limiting.

### section-09-moderator-analyst
Moderator: analyze_disagreement() with moderator prompt. Identifies sharpest disagreement, generates follow-up question. Analyst: synthesize_results() with analyst prompt. Produces consensus/disagreement themes, risks, wins, recommendations.

### section-10-dashboard-assembly
Build DashboardPayload from simulation state. Explicit score formulas: consensus_score, disagreement_score, evidence_coverage. Quote extraction. Feature score aggregation (mean, min, max, std per facet). PersonaSummary construction.

### section-11-fastapi-routes
main.py (FastAPI app, CORS, lifespan), all route files (projects, ingest, simulate with 202+polling, dashboard, tribe, health). Per-project asyncio.Lock. 409 Conflict for concurrent simulate. Status polling endpoint.

### section-12-tribe-scoring
TRIBE heuristic calculations: response_strength, response_variance, response_spread. Hard-coded scored_text templates. Feature-flagged via TRIBE_ENABLED env var.

### section-13-integration
End-to-end test: create project -> ingest (mock) -> simulate -> poll status -> get dashboard. Full pipeline with mocked Gemini. Verify DashboardPayload schema. Verify evidence grounding end-to-end.
