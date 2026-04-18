# Synthesized Specification — Workstream 2: AI Engine

## Overview

Build the intelligence layer for PanelForge: Gemini-powered structured extraction, evidence-grounded persona synthesis via Leiden clustering, a two-round moderated panel simulation, analyst synthesis, and optional TRIBE heuristic scoring. All schemas, prompts, and the orchestration state machine live in this workstream. The primary optimization target is **evidence grounding** — judges care that insights are backed by real data, not hallucinated.

## Scope

**In scope:**
- All Pydantic v2 schemas for cross-workstream communication (chunks, entities, personas, responses, dashboard)
- Gemini 2.5 Flash structured extraction pipeline (temperature=0.0, schema-first)
- Persona clustering: sentence embeddings -> KNN graph -> Leiden CPM -> Gemini synthesis
- Dynamic persona count (3-8, determined by Leiden clusters)
- Two-round panel simulation with moderator disagreement analysis
- Analyst synthesis producing actionable DashboardPayload
- FastAPI routes wiring everything together
- TRIBE as custom heuristics (response_strength, variance, spread) — feature-flagged
- Mock implementations of WS1 interfaces (retrieve(), graph community labels) until WS1 delivers
- In-memory-only project state (no database, no file persistence)

**Out of scope:**
- Data ingestion pipeline (WS1 responsibility)
- ChromaDB / vector store management (WS1)
- Frontend dashboard (WS3)
- User authentication
- Database persistence
- Deployment / CI/CD

## Key Decisions (from interview)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data sources | Mixed: social media, reviews, surveys, user-provided | System must handle varied formats |
| Demo topic | Consumer electronics (phone launch) | Rich opinion data, matches spec facet examples |
| Error handling | Fail fast, surface to user | Simple for hackathon; no partial results or retry queues |
| Persona count | Dynamic 3-8 from Leiden clustering | Let data determine segment count |
| TRIBE | Custom heuristic (strength, variance, spread) | Simple math on outputs, not external model |
| Persistence | In-memory only | Sufficient for demo, simplest approach |
| WS1 integration | Mock until ready, someone else builds it | Define interface contract, mock retrieve() |
| Gemini access | API key ready, no quota concerns | Standard access, sufficient limits |
| Pitch focus | Evidence grounding / trust | Primary differentiator for judges |

## Technology Stack

| Component | Library/Tool | Version |
|-----------|-------------|---------|
| LLM | Gemini 2.5 Flash | latest |
| LLM SDK | google-genai | latest |
| Schemas | Pydantic v2 | latest |
| Web framework | FastAPI | latest |
| Clustering | leidenalg + python-igraph | latest |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | latest |
| Graph construction | scikit-learn (kneighbors_graph) | latest |
| Async runtime | asyncio (stdlib) | Python 3.11+ |
| Testing | pytest + pytest-asyncio + httpx | latest |

## File Ownership

```
apps/
  api/
    main.py              # FastAPI app, CORS, lifespan
    config.py            # Settings, env vars, Gemini client init
    routes/
      projects.py        # POST /api/projects
      ingest.py          # POST /api/projects/{id}/ingest (calls WS1)
      simulate.py        # POST /api/projects/{id}/simulate
      dashboard.py       # GET /api/projects/{id}/dashboard
      tribe.py           # POST /api/projects/{id}/tribe/score
    schemas/
      project.py
      chunk.py           # ChunkExtraction, ExtractedEntity, ExtractedRelationship
      graph.py           # GraphEntity, GraphRelationship
      persona.py         # Persona, Belief, SkepticismProfile
      scenario.py        # Scenario, UserHypothesis
      simulation.py      # PersonaResponse, ModeratorQuestion, AnalystSummary
      dashboard.py       # DashboardPayload (consumed by WS3)
core/
  personas/
    cluster.py           # Embeddings -> KNN graph -> Leiden -> segment candidates
    synthesize.py        # Gemini: clusters -> structured persona JSON
    prompts.py           # All persona-related prompts
  simulation/
    orchestrator.py      # Async state machine: scenario -> dashboard
    retrieve.py          # Thin wrapper / mock calling WS1's retrieval layer
    moderator.py         # Disagreement detection + follow-up generation
    analyst.py           # Final synthesis: consensus, risk, wins
    prompts.py           # All simulation prompts
  scoring/
    tribe_runner.py      # TRIBE heuristic scoring
    heuristics.py        # response_strength, variance, spread calculations
```

## Interface Contracts

### API Endpoints (produced, consumed by WS3)

```
POST /api/projects                        -> { project_id: str }
POST /api/projects/{id}/ingest            -> { status: str, source_count: int, chunk_count: int }
POST /api/projects/{id}/simulate          -> DashboardPayload
GET  /api/projects/{id}/dashboard         -> DashboardPayload (cached last run)
POST /api/projects/{id}/tribe/score       -> TribeResult
```

### Extraction Schemas (produced, consumed by WS1)

```python
class ChunkExtraction(BaseModel):
    entities: list[ExtractedEntity]
    relationships: list[ExtractedRelationship]
    claims: list[str]
    facet: Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
    stance: Literal["positive", "negative", "mixed", "rumor", "review"]
    segment_hints: list[str]
    novelty_signals: list[str]
    evidence_score: float          # 0-1
    rumor_confidence: float        # 0-1
    direct_quote_candidates: list[str]

class ExtractedEntity(BaseModel):
    id: str
    title: str
    type: Literal["Product", "Feature", "Concern", "Competitor", "Segment", "Claim"]
    description: str

class ExtractedRelationship(BaseModel):
    source: str
    target: str
    type: Literal["MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"]
    description: str
    weight: float
```

### DashboardPayload (produced, consumed by WS3)

```python
class DashboardPayload(BaseModel):
    project_id: str
    scenario_id: str
    consensus_score: float        # 0-1
    disagreement_score: float     # 0-1
    evidence_coverage: float      # 0-1
    top_risks: list[ScoredLabel]
    top_wins: list[ScoredLabel]
    feature_scores: dict[str, FeatureScoreRow]
    personas: list[PersonaSummary]
    quotes: list[QuoteCard]
    round1_responses: list[PersonaResponse]
    round2_responses: list[PersonaResponse]
    moderator_question: str
    analyst_summary: AnalystSummary
    tribe: TribeResult | None

class PersonaSummary(BaseModel):
    persona_id: str
    segment_label: str
    summary: str
    adoption_likelihood: int      # 0-100
    strongest_positive: str
    strongest_concern: str
    feature_priorities: dict[str, float]

class QuoteCard(BaseModel):
    persona_id: str
    segment_label: str
    quote: str
    facet: str
    sentiment: str

class TribeResult(BaseModel):
    enabled: bool
    response_strength: float
    response_variance: float
    response_spread: float
    scored_text: str
```

### WS1 Interface (consumed, mocked until ready)

```python
# Available by hour 10
async def retrieve(
    query: str,
    project_id: str,
    top_k: int = 10,
    facet_filter: str | None = None,
) -> list[RetrievalResult]:
    """Returns ranked chunks with metadata from ChromaDB."""
    ...

class RetrievalResult(BaseModel):
    chunk_id: str
    text: str
    metadata: dict
    score: float

# Available by hour 9
def get_community_labels(project_id: str) -> dict[str, int]:
    """Returns {entity_id: community_id} from graph."""
    ...
```

## Orchestration State Machine

```
POST /simulate
  |
  v
SimulationState(phase=INIT)
  |
  v
Phase 1: RETRIEVING
  - For each persona, retrieve evidence (parallel via asyncio.gather)
  - Semaphore(5) for rate limiting
  - All-or-nothing: TaskGroup, fail fast if any retrieval fails
  |
  v
Phase 2: ROUND1
  - Fan-out: all personas respond independently (parallel)
  - Each gets: persona profile + scenario + retrieved evidence
  - Fail fast on error
  |
  v
Phase 3: MODERATING
  - Single Gemini call: analyze round 1 for sharpest disagreement
  - Produce follow-up question targeting specific personas
  |
  v
Phase 4: ROUND2
  - Fan-out: personas respond with discussion context (round 1 + moderator Q)
  - Same parallel pattern as round 1
  |
  v
Phase 5: ANALYZING
  - Single Gemini call: synthesize all rounds into AnalystSummary
  - Compute consensus_score, disagreement_score, evidence_coverage
  |
  v
Phase 6 (optional): SCORING
  - TRIBE heuristics on scenario + responses
  - Feature-flagged, skipped if disabled
  |
  v
Phase 7: DONE
  - Build DashboardPayload
  - Store in-memory
  - Return to client
```

State machine uses frozen dataclasses with `replace()` for immutable transitions. Each phase is a pure function: `State -> State`. Pipeline short-circuits on FAILED phase.

## Gemini Prompt Design

All prompts follow **schema-first design**: define Pydantic model -> convert to JSON schema -> pass as `response_schema` to Gemini with `response_mime_type="application/json"`.

**Temperature strategy:**
- Extraction: 0.0 (deterministic)
- Persona synthesis: 0.0 (factual grounding)
- Panel responses: 0.2 (slight variety while coherent)
- Moderator/Analyst: 0.0 (analytical precision)

**Thinking mode strategy:**
- Extraction: `thinking_budget=0` (simple, fast)
- Persona synthesis: thinking ON (complex reasoning)
- Panel responses: thinking ON (nuanced character work)
- Analyst: thinking ON (deep synthesis)

**Evidence grounding enforcement** (critical for pitch):
- Every persona response must include `cited_chunk_ids`
- Beliefs require minimum 2 evidence chunk IDs or get dropped
- Analyst summary must reference only persona outputs and evidence
- Moderator must reference specific persona disagreements

## Persona Clustering Pipeline

```
Chunks with metadata
  |
  v
Embed chunks using sentence-transformers (all-MiniLM-L6-v2)
  |
  v
Build KNN similarity graph (k=15, cosine distance -> similarity)
  |
  v
Symmetrize graph
  |
  v
Leiden CPMVertexPartition (resolution=0.01-0.05, n_iterations=-1, seed=42)
  |
  v
3-8 clusters (dynamic)
  |
  v
Per-cluster: extract c-TF-IDF keywords + collect evidence chunks
  |
  v
Gemini synthesis: cluster evidence -> structured Persona JSON
  |
  v
Validate: drop beliefs with < 2 evidence_chunk_ids
```

## TRIBE Heuristic Scoring

Custom metrics computed on simulation outputs (no external model):

- **response_strength**: Mean absolute sentiment deviation from neutral across personas. Higher = stronger reactions.
- **response_variance**: Variance of adoption_likelihood across personas. Higher = more disagreement.
- **response_spread**: Range (max - min) of feature_scores across personas. Higher = more polarization.

Feature-flagged: when disabled, `tribe` field is `None` in DashboardPayload.

## Environment Variables

```
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
TRIBE_ENABLED=false
```

## Testing Strategy

- **Framework**: pytest + pytest-asyncio
- **HTTP testing**: httpx.AsyncClient with ASGITransport
- **Mocking**: unittest.mock.patch for Gemini calls
- **Coverage target**: 80%+
- **Test structure**: mirrors core/ and apps/api/ layout
- **Key tests**:
  - Gemini extraction returns valid ChunkExtraction for sample chunks
  - Persona synthesis produces personas with non-empty evidence_chunk_ids
  - Round 1 responses include cited_chunk_ids that exist
  - Moderator identifies at least one disagreement axis
  - Round 2 responses show measurable shift from round 1
  - Dashboard payload validates against DashboardPayload schema
  - Full simulation completes in under 60 seconds
  - TRIBE feature-flag off -> no errors, no TRIBE fields
