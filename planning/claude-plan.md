# Implementation Plan — Workstream 2: AI Engine

## 1. Context and Goals

PanelForge is a synthetic focus group simulator that ingests consumer opinion data (social media, reviews, surveys), clusters it into evidence-grounded personas, and runs a moderated two-round panel discussion to produce actionable product insights. This workstream builds the entire intelligence layer: schemas, Gemini-powered extraction, persona synthesis via Leiden clustering, simulation orchestration, and the FastAPI API surface.

The primary success metric is **evidence grounding** — every insight, persona belief, and recommendation must trace back to real source data. The judges evaluate trust in the outputs, not just technical sophistication.

This is a 24-hour hackathon build. WS1 (data pipeline) and WS3 (frontend dashboard) are built by teammates. WS2 defines all cross-workstream schemas and the API that WS3 consumes. WS1 provides a `retrieve()` function and graph community labels; until those are ready, WS2 uses mock implementations.

### Constraints
- **In-memory only**: no database, no file persistence — project state lives in a dict keyed by project_id, with per-project `asyncio.Lock` for concurrency safety
- **Fail fast**: if a Gemini call fails after retry, the whole pipeline errors — no partial results
- **Gemini 2.5 Flash**: all LLM calls use the `google-genai` SDK with structured JSON output
- **Python 3.11+**: enables `asyncio.TaskGroup`, `StrEnum`, `asyncio.timeout()`
- **Demo topic**: consumer electronics (phone launch), matches the facet taxonomy (camera, battery, price, etc.)

---

## 2. Architecture Overview

```
                    ┌──────────────┐
                    │  FastAPI App  │
                    │  (main.py)   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         routes/       routes/      routes/
        projects    simulate     dashboard
              │            │            │
              │     ┌──────┴──────┐    │
              │     │ Orchestrator │    │
              │     │ (state machine)  │
              │     └──────┬──────┘    │
              │            │           │
     ┌────────┼────────────┼───────────┼─────────┐
     │        │            │           │         │
  schemas/  personas/  simulation/  scoring/   retrieve.py
  (shared)  cluster    orchestrator  tribe     (mock/WS1)
            synthesize moderator    heuristics
                       analyst
```

The system is organized in three layers:
1. **API layer** (`apps/api/`): FastAPI routes, request/response handling, CORS
2. **Core logic** (`core/`): persona clustering, simulation orchestration, scoring
3. **Schemas** (`apps/api/schemas/`): Pydantic v2 models shared across all workstreams

### Data Flow

```
User submits project + scenario
  → POST /projects (create in-memory project)
  → POST /projects/{id}/ingest (trigger WS1 pipeline)
  → POST /projects/{id}/simulate
      → Orchestrator runs 6-phase state machine:
          1. Retrieve evidence per persona (parallel, from WS1 or mock)
          2. Round 1: fan-out persona responses (parallel Gemini calls)
          3. Moderator: disagreement analysis (single Gemini call)
          4. Round 2: persona revisions with context (parallel)
          5. Analyst: synthesis (single Gemini call)
          6. Optional TRIBE scoring (heuristic math)
      → Return DashboardPayload
  → GET /projects/{id}/dashboard (return cached result)
```

---

## 3. Pydantic Schemas (Hour 0-1)

Define all schemas first — they are the contract between WS1, WS2, and WS3. Every schema uses Pydantic v2 `BaseModel` with strict typing.

### Schema Files

**`schemas/chunk.py`** — Extraction output consumed by WS1:
- `ChunkExtraction`: the full extraction result for one text chunk
- `ExtractedEntity`: nodes for the knowledge graph (id, title, type enum, description)
- `ExtractedRelationship`: edges for the knowledge graph (source, target, type enum, weight)
- Facet enum: `camera | battery | price | design | privacy | ecosystem | other`
- Stance enum: `positive | negative | mixed | rumor | review`
- Entity type enum: `Product | Feature | Concern | Competitor | Segment | Claim`
- Relationship type enum: `MENTIONS | SUPPORTS | CONTRADICTS | COMPARES_TO | CO_OCCURS_WITH`

**`schemas/persona.py`** — Persona model:
- `Persona`: segment_label, summary, jobs_to_be_done, feature_priorities (dict[str, float]), beliefs (list[Belief]), skepticism_profile, graph_entity_ids (list[str])
- `Belief`: claim (str), stance (str), evidence_chunk_ids (list[str]) — minimum 2 required
- `SkepticismProfile`: trust_in_reviews (float 0-1), trust_in_brand_claims (float 0-1), influencer_susceptibility (float 0-1)

**`schemas/scenario.py`** — Simulation input:
- `Scenario`: product_name, description, hypotheses (list[str] — 1-10 items, max 500 chars each), facets_to_explore (list[str] — must be valid facet literals)
- Add Pydantic validators: `product_name` non-empty max 200 chars, `hypotheses` length 1-10

**`schemas/simulation.py`** — Simulation outputs:
- `PersonaResponse`: persona_id, overall_reaction, adoption_likelihood_0_100, strongest_positive, strongest_concern, feature_scores (dict[str, float]), what_would_change_my_mind, quotable_sentence, cited_chunk_ids
- `ModeratorQuestion`: disagreement_summary, follow_up_question, targeted_persona_ids
- `AnalystSummary`: consensus_themes, disagreement_themes, top_risks, top_wins, feature_recommendations, messaging_suggestions, evidence_gaps

**`schemas/dashboard.py`** — API response consumed by WS3:
- `DashboardPayload`: aggregates everything into one response object
- `PersonaSummary`: flattened persona info for display
- `QuoteCard`: persona_id, segment_label, quote, facet, sentiment
- `ScoredLabel`: label + score (used for risks, wins)
- `FeatureScoreRow`: mean, min, max, std, persona_scores
- `TribeResult`: enabled, response_strength, response_variance, response_spread, scored_text

**`schemas/project.py`** — Project metadata:
- `Project`: project_id, name, status, created_at, source_count, chunk_count, dashboard (optional DashboardPayload)

### Design Principle

Use `Literal` types for enums (not Python `Enum`) since Gemini's structured output works best with string literals. All float scores are 0-1 unless explicitly noted (adoption_likelihood is 0-100 for readability).

---

## 4. Gemini Client and Configuration (Hour 2)

### `config.py`

Centralized settings using Pydantic `BaseSettings`:
- `GEMINI_API_KEY` from environment
- `GEMINI_MODEL` defaulting to `"gemini-2.5-flash"`
- `CORS_ORIGINS` defaulting to `["http://localhost:5173", "*"]` (wildcard for demo flexibility)
- `TRIBE_ENABLED` boolean flag, default `False`
- `USE_MOCK_RETRIEVAL` boolean flag, default `True` (explicit control, no auto-detection)
- `LOG_LEVEL` default `"INFO"`

Initialize the `google-genai` client in a module-level factory:

```python
def get_gemini_client() -> genai.Client:
    """Lazy singleton for Gemini client."""
```

### Gemini Wrapper

Create a `core/gemini.py` utility with a single function:

```python
T = TypeVar("T", bound=BaseModel)

async def generate_structured(
    prompt: str,
    response_schema: type[T],
    temperature: float = 0.0,
    thinking_budget: int | None = None,
) -> T:
    """Call Gemini with structured JSON output and Pydantic validation.

    Uses generic TypeVar for type-safe returns. Retries up to 2 times on transient errors.
    Includes prompt-hash cache (sha256 of prompt + schema name + temperature).
    Raises on persistent failure (fail-fast strategy).
    """
```

This wrapper:
1. Checks prompt-hash cache first; return cached result if hit
2. Sets `response_mime_type="application/json"` and `response_schema`
3. Optionally configures `thinking_config` based on `thinking_budget`
4. Validates the response with `model_validate()`
5. Checks `finish_reason` for truncation (`MAX_TOKENS`) or safety blocks
6. Retries up to 2 times on `ResourceExhausted`, `ServiceUnavailable`, `DeadlineExceeded` with exponential backoff (1s, 2s)
7. Caches successful result before returning
8. Raises `ValueError` on persistent failure

### `main.py`

FastAPI app with:
- CORS middleware (origins from config)
- Lifespan handler initializing: Gemini client, in-memory project store (`dict[str, Project]`), per-project locks (`dict[str, asyncio.Lock]`), rate limiter (`asyncio.Semaphore(5)`), response cache (`dict[str, BaseModel]`)
- Structured logging: every Gemini call (prompt length, latency, retry count), every phase transition (name, duration), every validation failure
- Include all route routers
- `GET /api/health` returning `{ status: "ok", gemini_configured: bool }`

---

## 5. Extraction Pipeline (Hours 3-4)

The extraction pipeline is consumed by WS1. WS2 provides the Gemini prompt and schema; WS1 calls it per chunk.

### `core/extraction/extract.py`

```python
async def extract_chunk(chunk_text: str, metadata: dict) -> ChunkExtraction:
    """Extract structured entities, relationships, and claims from a text chunk.

    Uses temperature=0.0 and thinking_budget=0 for fast, deterministic extraction.
    """
```

The prompt follows the template from the spec: system message establishing the extraction role, user message with chunk metadata and text, requesting JSON matching `ChunkExtraction` schema.

### Early Schema Validation

At hour 2-3, test all Pydantic schemas against Gemini's structured output to catch incompatibilities early (nested lists, optional fields, Literal types). Don't wait until hour 11 to discover schema issues.

### Delivery to WS1

By hour 4, commit the `ChunkExtraction` schema and `extract_chunk` function. WS1 imports and calls this in their ingestion pipeline.

---

## 6. Persona Clustering (Hours 7-9)

### `core/personas/cluster.py`

The clustering pipeline transforms raw evidence chunks into persona segment candidates.

**Step 1: Embed chunks**
- Load `sentence-transformers/all-MiniLM-L6-v2` model
- Encode all chunk texts with `normalize_embeddings=True`
- Produces 384-dimensional vectors

**Step 2: Build KNN similarity graph**
- Use `sklearn.neighbors.kneighbors_graph(embeddings, n_neighbors=15, metric="cosine", mode="distance")`
- Convert cosine distance to similarity: `sim = 1 - distance`
- Clip negatives to 0
- Symmetrize: `(knn_sim + knn_sim.T) / 2`

**Step 3: Leiden community detection**
- Build `igraph.Graph` from the symmetrized sparse matrix
- Run `leidenalg.find_partition` with `CPMVertexPartition`
- Resolution parameter: start at 0.03, adjust to get 3-8 clusters
- `n_iterations=-1` for convergence, `seed=42` for reproducibility
- If cluster count < 3: decrease resolution. If > 8: increase resolution. Binary search within [0.001, 0.5], capped at 10 iterations.
- If no resolution produces 3-8 clusters after 10 iterations, fall back to k-means with k=5.
- Minimum cluster size: 3 chunks. Merge smaller clusters into their nearest neighbor (by centroid cosine similarity).

**Step 4: Per-cluster evidence collection**
- Group chunks by cluster assignment
- For each cluster: collect chunk texts, extract common facets and stances, identify entities from the graph (via WS1's community labels)
- Extract top keywords per cluster using c-TF-IDF (CountVectorizer on concatenated cluster texts, weighted by inverse cluster frequency)

```python
async def cluster_chunks(
    chunks: list[dict],
    target_range: tuple[int, int] = (3, 8),
) -> list[ClusterResult]:
    """Embed chunks, build KNN graph, run Leiden, return cluster assignments with evidence."""
```

### `core/personas/synthesize.py`

**Per cluster, call Gemini to synthesize a persona:**
- Input: cluster evidence chunks, graph entities, common facets/stances, keywords
- Output: `Persona` model with segment_label, summary, beliefs (each with evidence_chunk_ids), feature_priorities, skepticism_profile
- Temperature: 0.0 (factual grounding)
- Thinking: ON (complex reasoning task)

**Post-synthesis validation:**
- Drop any belief with fewer than 2 `evidence_chunk_ids`
- Verify `feature_priorities` keys are valid facet names
- Log warning if persona has fewer than 3 beliefs after filtering

```python
async def synthesize_personas(
    clusters: list[ClusterResult],
) -> list[Persona]:
    """Convert Leiden clusters into grounded personas via Gemini synthesis.

    Runs cluster synthesis calls in parallel (one Gemini call per cluster).
    """
```

---

## 7. Simulation Orchestrator (Hours 10-14)

### State Machine Design

The orchestrator uses a frozen dataclass `SimulationState` with a `transition()` method that returns a new state via `dataclasses.replace()`. Phases are defined as a `StrEnum`.

Each phase is an async function with signature `(SimulationState) -> SimulationState`. The orchestrator iterates through phases sequentially, short-circuiting if any phase sets `phase=FAILED`.

Phase-level timeout: 180 seconds via `asyncio.timeout()`. Per-Gemini-call timeout: 30 seconds (includes all retries for that call).

### `core/simulation/retrieve.py` (Hour 10)

Thin wrapper around WS1's retrieval function. Until WS1 delivers, use a mock that returns canned chunks from the demo corpus.

```python
async def retrieve_for_persona(
    persona: Persona,
    scenario: Scenario,
    project_id: str,
) -> list[RetrievalResult]:
    """Retrieve evidence relevant to this persona's perspective on the scenario.

    Constructs a query combining persona segment keywords with scenario hypotheses.
    Filters by facets in persona's feature_priorities.
    Returns top 10 chunks.
    """
```

### `core/simulation/orchestrator.py` (Hours 11-14)

**Phase 1: RETRIEVING**
- For each persona, call `retrieve_for_persona` in parallel via `asyncio.TaskGroup`
- Use `asyncio.Semaphore(5)` to rate-limit concurrent calls
- TaskGroup provides automatic fail-fast: cancels remaining tasks on first failure

**Phase 2: ROUND1**
- For each persona, call Gemini with the panel response prompt
- Input: persona JSON, scenario JSON, retrieved evidence chunks, discussion context (empty for round 1)
- Output: `PersonaResponse` per persona
- Temperature: 0.2 (slight variety)
- Thinking: ON
- Parallel fan-out via `asyncio.TaskGroup` for automatic fail-fast with cancellation

**Evidence grounding enforcement in prompt:**
- System prompt explicitly states: "Every claim must map to retrieved evidence chunk IDs"
- Include "Maintain your own perspective even if others disagree" to prevent sycophancy
- Require `cited_chunk_ids` in output; post-validate they exist in the retrieved set
- **Grounding validation**: strip any `cited_chunk_ids` not found in retrieved evidence, log warning. If a response has zero valid citations after stripping, flag it as `low_grounding` in metadata but do NOT drop the persona (moderator/analyst phases need all personas)

### `core/simulation/moderator.py` (Hour 12)

Single Gemini call analyzing round 1 responses.

```python
async def analyze_disagreement(
    round1_responses: list[PersonaResponse],
    chunk_summaries: list[str],
) -> ModeratorQuestion:
    """Identify the sharpest disagreement and generate a targeted follow-up question.

    Returns disagreement_summary, follow_up_question, and targeted_persona_ids.
    """
```

The moderator prompt instructs Gemini to:
- Compare adoption_likelihood spread across personas
- Identify opposing strongest_positive vs strongest_concern pairs
- Find feature_score divergences
- Generate ONE specific follow-up that forces disagreeing personas to confront each other's evidence

### Phase 4: ROUND2 (Hour 13)

Same fan-out pattern as Round 1, but with additional context:
- All round 1 responses (so personas can see what others said)
- The moderator's follow-up question
- Instruction to update beliefs based on new evidence from discussion

The prompt adds: "You have now heard other panelists' perspectives and a moderator follow-up question. Update your position if the evidence warrants it. Explain what changed and why."

### `core/simulation/analyst.py` (Hour 14)

Single Gemini call producing the final synthesis.

```python
async def synthesize_results(
    round1: list[PersonaResponse],
    round2: list[PersonaResponse],
    moderator_question: ModeratorQuestion,
) -> AnalystSummary:
    """Produce actionable insights from the panel discussion.

    Returns consensus_themes, disagreement_themes, risks, wins,
    feature_recommendations, messaging_suggestions, evidence_gaps.
    """
```

The analyst prompt instructs Gemini to:
- Identify themes where >70% of personas agree (consensus)
- Identify themes with high adoption_likelihood variance (disagreement)
- Rank risks by severity (how many personas flagged them, how strong the concern)
- Rank wins by strength (adoption boost, evidence quality)
- Provide actionable feature recommendations
- Suggest messaging angles based on persona language
- Flag evidence gaps (topics discussed but poorly supported by data)

### Dashboard Payload Assembly

After all phases complete, build `DashboardPayload` by:
- Computing `consensus_score`: `1 - (std(adoption_likelihoods) / 50)`, clamped to [0, 1]. Higher means more agreement.
- Computing `disagreement_score`: mean over facets of `std(persona scores for that facet)`, clamped to [0, 1]. Higher means more polarization.
- Computing `evidence_coverage`: `count(personas with >= 3 unique cited_chunk_ids in round2) / total_personas`, clamped to [0, 1].
- Extracting `quotes` from persona responses' `quotable_sentence` fields
- Aggregating `feature_scores` across personas into `FeatureScoreRow` per facet
- Building `PersonaSummary` from each persona + their round 2 response

---

## 8. FastAPI Routes (Hours 15-16)

### `routes/projects.py`

- `POST /api/projects`: Accept `{ name: str, description: str }`, generate UUID, store in-memory, return `{ project_id }`

### `routes/ingest.py`

- `POST /api/projects/{id}/ingest`: Accept `{ sources: list[str] }` (URLs or text), call WS1's ingestion pipeline (or mock), update project with source_count and chunk_count

### `routes/simulate.py`

- `POST /api/projects/{id}/simulate`: Accept `Scenario` body, acquire per-project lock (reject with 409 Conflict if already running), load personas (run clustering if not done), run orchestrator in background, return `202 Accepted` with `{ run_id, status: "started" }`
- `GET /api/projects/{id}/simulate/status`: Return `{ phase, error, done: bool }` for polling
- Frontend polls this endpoint until `done=true`, then fetches `/dashboard`

### `routes/dashboard.py`

- `GET /api/projects/{id}/dashboard`: Return the cached DashboardPayload from the last simulation run, or 404 if no simulation has been run

### `routes/tribe.py`

- `POST /api/projects/{id}/tribe/score`: Run TRIBE heuristics on the last simulation results, return `TribeResult`
- Only available if `TRIBE_ENABLED=true`

### Error Handling

All routes use FastAPI's `HTTPException`:
- 404 for unknown project_id
- 400 for invalid input
- 500 for Gemini failures (with error message from the orchestrator)

---

## 9. TRIBE Heuristic Scoring (Hour 18, Optional)

### `core/scoring/heuristics.py`

Three simple metrics computed from simulation outputs:

**response_strength**: Mean absolute deviation of `adoption_likelihood` from 50 (neutral), normalized to 0-1. Formula: `mean(|likelihood - 50|) / 50`. Higher means personas had strong reactions (positive or negative).

**response_variance**: Standard deviation of `adoption_likelihood` across personas, normalized by theoretical max (50). Higher means more disagreement between personas.

**response_spread**: For each facet in `feature_scores`, compute (max - min) across personas, then average. Higher means more polarization on features.

### `core/scoring/tribe_runner.py`

```python
async def score_tribe(
    round2_responses: list[PersonaResponse],
    scenario: Scenario,
) -> TribeResult:
    """Compute TRIBE heuristic scores from simulation outputs.

    No LLM calls — pure numeric computation.
    """
```

The `scored_text` field contains a brief narrative interpreting the three scores using hard-coded templates based on score ranges (e.g., "Strong polarization detected — personas have very different reactions to this concept"). No Gemini call — pure string formatting.

---

## 10. WS1 Mock Layer

### `core/simulation/retrieve.py` (mock mode)

Until WS1 delivers their retrieval function (target: hour 10), use a mock:
- Maintain a list of ~50 demo chunks about consumer electronics (hardcoded)
- Mock `retrieve()` returns random subsets filtered by facet
- Mock `get_community_labels()` returns pre-assigned cluster IDs

The mock is controlled by the `USE_MOCK_RETRIEVAL` environment variable (default `True`). When `False`, import WS1's module directly — let it fail loudly if unavailable. No auto-detection or try/except import pattern.

### Demo Corpus

Prepare ~50 short text chunks covering opinions about a flagship phone launch:
- 10 about camera quality (mix of positive/negative)
- 8 about battery life
- 8 about pricing
- 8 about design
- 6 about privacy concerns
- 5 about ecosystem lock-in
- 5 general/mixed

This gives the clustering pipeline real data to work with and produces realistic personas for the demo.

---

## 11. Prompt Management

### `core/personas/prompts.py`

All persona-related prompt templates stored as string constants:
- `PERSONA_SYNTHESIS_PROMPT`: system + user template for cluster-to-persona
- Uses `{cluster_id}`, `{chunks}`, `{entities}`, `{facets}`, `{stances}` placeholders

### `core/simulation/prompts.py`

All simulation prompt templates:
- `PANEL_RESPONSE_PROMPT`: system + user template for persona round response
- `MODERATOR_PROMPT`: system + user template for disagreement analysis
- `ANALYST_PROMPT`: system + user template for final synthesis
- `EXTRACTION_PROMPT`: system + user template for chunk extraction

Each prompt follows the pattern:
1. System message establishing the role and constraints
2. Evidence grounding instruction: "Never invent facts. Every claim must map to evidence chunk IDs."
3. JSON schema reference: "Return valid JSON matching the provided schema only."
4. User message with the actual data placeholders

---

## 12. Testing Plan

### Unit Tests

- **Schema validation**: roundtrip serialize/deserialize all Pydantic models
- **Gemini wrapper**: mock the `google-genai` client, verify retry logic, timeout handling, validation
- **Clustering**: test with known embeddings, verify cluster count bounds, resolution auto-tuning
- **Heuristics**: test TRIBE calculations with known inputs (e.g., all-50 likelihoods -> strength=0)
- **Dashboard assembly**: verify score computations, quote extraction, feature aggregation

### Integration Tests

- **Extraction pipeline**: mock Gemini, verify ChunkExtraction output matches schema
- **Persona synthesis**: mock Gemini + cluster input, verify belief evidence_chunk_ids validation
- **Full simulation**: mock Gemini for all 5 phases, verify state transitions and DashboardPayload
- **API routes**: use httpx.AsyncClient, test create project -> simulate -> get dashboard flow

### Key Assertions

- Every `cited_chunk_ids` entry in a PersonaResponse exists in the retrieved evidence set
- Personas with < 2 evidence chunks per belief get those beliefs filtered
- Moderator targets at least one persona_id that exists
- analyst_summary only contains themes present in round responses
- DashboardPayload validates cleanly against the schema
- TRIBE disabled -> `tribe` field is `None`, no errors

---

## 13. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Gemini rate limits during demo | Semaphore(5) concurrency limit; cache demo results in-memory |
| Gemini returns malformed JSON despite schema | Pydantic validation + 3 retries; fail fast with clear error |
| Leiden produces 1 or 2 clusters | Auto-tune resolution; fallback to k-means if Leiden degenerates |
| All personas converge (sycophancy) | Prompt engineering: anchor resistance, moderator probes dissent |
| WS1 not ready by hour 10 | Mock layer covers full demo flow independently |
| Simulation takes > 60s | Parallel fan-out reduces to ~2 sequential Gemini calls (moderator + analyst); monitor token counts |
| Evidence grounding looks weak to judges | Require cited_chunk_ids everywhere; show source text in dashboard (WS3) |
