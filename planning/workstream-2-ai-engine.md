# Workstream 2: AI Engine (Extraction, Personas, Simulation, TRIBE)

**Owner:** You (Bhavya)
**Hours:** 0-18 (active), 20-23 (integration + pitch)

## Mission

Own the intelligence layer: Gemini-powered structured extraction, persona synthesis, the two-round moderated panel simulation, analyst synthesis, and optional TRIBE scoring. You define all schemas, prompts, and the orchestration state machine.

## Deliverables

| # | Deliverable | Target Hour | Depends On |
|---|-------------|-------------|------------|
| 1 | All Pydantic schemas (chunks, entities, personas, responses, dashboard) | 1 | - |
| 2 | Gemini extraction prompt + structured output pipeline | 4 | Schemas |
| 3 | Persona clustering + synthesis (Leiden clusters -> persona JSON) | 9 | WS1 retrieval API |
| 4 | Round 1 simulation: fan-out all personas on scenario | 11 | (3), WS1 retrieval |
| 5 | Moderator: disagreement analysis + follow-up question | 13 | (4) |
| 6 | Round 2 simulation: persona belief updates | 13 | (5) |
| 7 | Analyst synthesis: consensus, risks, wins, quotes, recommendations | 14 | (6) |
| 8 | FastAPI routes wiring everything together | 15-16 | (1)-(7) |
| 9 | Optional TRIBE scorer on scenario blurbs | 18 | (7) |
| 10 | Pitch narrative + judge Q&A prep | 22-23 | Everything |

## Files You Own

```
apps/
  api/
    main.py              # FastAPI app, CORS, lifespan
    config.py            # Settings, env vars, Gemini client
    routes/
      projects.py        # POST /api/projects
      ingest.py          # POST /api/projects/{id}/ingest (calls WS1)
      simulate.py        # POST /api/projects/{id}/simulate
      dashboard.py       # GET /api/projects/{id}/dashboard
      tribe.py           # POST /api/projects/{id}/tribe/score
    schemas/
      project.py
      chunk.py           # ChunkExtraction, ExtractedEntity, ExtractedRelationship
      graph.py           # GraphEntity, GraphRelationship (parquet-aligned)
      persona.py         # Persona, Belief, SkepticismProfile
      scenario.py        # Scenario, UserHypothesis
      simulation.py      # PersonaResponse, ModeratorQuestion, AnalystSummary
      dashboard.py       # DashboardPayload (consumed by WS3)
core/
  personas/
    cluster.py           # Evidence clustering -> segment candidates
    synthesize.py        # Gemini: clusters -> structured persona JSON
    prompts.py           # All persona-related prompts
  simulation/
    orchestrator.py      # Async state machine: scenario -> dashboard
    retrieve.py          # Thin wrapper calling WS1's retrieval layer
    moderator.py         # Disagreement detection + follow-up generation
    analyst.py           # Final synthesis: consensus, risk, wins
    prompts.py           # All simulation prompts
  scoring/
    tribe_runner.py      # TRIBE model loading + scoring
    heuristics.py        # response_strength, variance, spread
```

## Interface Contracts

### What you produce (consumed by WS1 and WS3)

**1. Extraction schemas (needed by WS1 at hour 4)**

```python
class ChunkExtraction(BaseModel):
    entities: list[ExtractedEntity]
    relationships: list[ExtractedRelationship]
    claims: list[str]
    facet: Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
    stance: Literal["positive", "negative", "mixed", "rumor", "review"]
    segment_hints: list[str]
    novelty_signals: list[str]
    evidence_score: float  # 0-1
    rumor_confidence: float  # 0-1
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

**2. Dashboard payload (consumed by WS3)**

```python
class DashboardPayload(BaseModel):
    project_id: str
    scenario_id: str
    consensus_score: float        # 0-1
    disagreement_score: float     # 0-1
    evidence_coverage: float      # 0-1
    top_risks: list[ScoredLabel]
    top_wins: list[ScoredLabel]
    feature_scores: dict[str, FeatureScoreRow]  # per-facet aggregated scores
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

**3. API endpoints (consumed by WS3 frontend)**

```
POST /api/projects                        -> { project_id }
POST /api/projects/{id}/ingest            -> { status, source_count, chunk_count }
POST /api/projects/{id}/simulate          -> DashboardPayload
GET  /api/projects/{id}/dashboard         -> DashboardPayload (cached last run)
POST /api/projects/{id}/tribe/score       -> TribeResult
```

### What you consume (from WS1)

- `retrieve()` function - available by hour 10
- Graph community labels - available by hour 9
- Chunk JSONL with metadata - available by hour 5

## Key Technical Decisions

- **Gemini 2.5 Flash** for all LLM calls (structured JSON output via `response_mime_type`)
- **temperature=0.0** for extraction and persona synthesis
- **temperature=0.2** for panel responses
- **asyncio state machine** for orchestration (no LangGraph unless time remains)
- **TRIBE is optional** - feature-flag it, don't block on it
- All prompts use strict schema-first design: Pydantic model -> JSON schema -> Gemini
- Persona beliefs require minimum 2 evidence chunk IDs or they get dropped

## Gemini Prompt Templates

**Chunk extraction prompt** (used by WS1's graph builder)
```
System: You are extracting product-research evidence for a synthetic focus-group simulator.
Return valid JSON matching the provided schema only.

User: Given the chunk below, extract entities, relationships, claims, facet, stance,
segment_hints, novelty_signals, evidence_score, rumor_confidence, and direct_quote_candidates.

Chunk metadata: {metadata}
Chunk text: {chunk_text}
```

**Persona synthesis prompt**
```
System: You are synthesizing a consumer persona from clustered evidence.
The persona must be grounded in the provided evidence chunks. Never invent beliefs
without evidence. Return valid JSON matching the provided schema.

User: 
Cluster ID: {cluster_id}
Cluster evidence chunks: {chunks}
Graph entities in cluster: {entities}
Common facets: {facets}
Common stances: {stances}

Synthesize a single persona with: segment_label, summary, jobs_to_be_done,
feature_priorities, skepticism_profile, and beliefs (each with evidence_chunk_ids).
```

**Panel response prompt**
```
System: You are simulating one focus-group participant. Stay consistent with your persona.
Never invent facts. Every claim must map to retrieved evidence chunk IDs. Return JSON only.

User:
Persona: {persona_json}
Scenario: {scenario_json}
Retrieved evidence: {chunks}
Graph neighbors: {graph_neighbors}
Discussion so far: {prior_rounds}

Respond with: overall_reaction, adoption_likelihood_0_100, strongest_positive,
strongest_concern, feature_scores, what_would_change_my_mind, quotable_sentence, cited_chunk_ids.
```

**Moderator prompt**
```
System: You are a skilled focus group moderator. Identify the sharpest disagreement
across persona responses and generate ONE targeted follow-up question that forces
the disagreeing personas to confront each other's evidence.

User:
Round 1 responses: {round1_responses}
Available evidence: {chunk_summaries}

Return: disagreement_summary, follow_up_question, targeted_persona_ids.
```

**Analyst prompt**
```
System: You are a senior product research analyst. Synthesize panel results into
actionable insights. Reference only persona outputs and retrieved evidence.

User:
Round 1: {round1}
Round 2: {round2}
Moderator question: {moderator_q}

Return: consensus_themes, disagreement_themes, top_risks, top_wins,
feature_recommendations, messaging_suggestions, evidence_gaps.
```

## Orchestration State Machine

```python
@dataclass
class SimulationState:
    project_id: str
    scenario: Scenario
    personas: list[Persona]
    retrieved_evidence: dict[str, RetrievalResult]  # keyed by persona_id
    round1_responses: list[PersonaResponse]
    moderator_question: ModeratorQuestion | None
    round2_responses: list[PersonaResponse]
    analyst_summary: AnalystSummary | None
    tribe_scores: TribeResult | None
    dashboard: DashboardPayload | None

# Flow
async def run_simulation(state: SimulationState) -> DashboardPayload:
    # 1. For each persona, retrieve evidence (parallel)
    # 2. Generate round 1 responses (parallel per persona)
    # 3. Run moderator disagreement analysis
    # 4. Generate round 2 responses with discussion context (parallel)
    # 5. Run analyst synthesis
    # 6. Optionally score with TRIBE
    # 7. Build dashboard payload
    # 8. Persist all artifacts as versioned JSON
```

## Hour-by-Hour

| Hour | Task | Output |
|------|------|--------|
| 0 | Env setup, Gemini API key, verify structured output | Working genai client |
| 1 | Define ALL Pydantic schemas in `apps/api/schemas/` | Schemas committed, shared with WS1 |
| 2 | `config.py` + `main.py` FastAPI scaffold + CORS | Server boots |
| 3 | Extraction prompt + test on sample chunks | Extraction pipeline verified |
| 4 | Ship extraction schemas to WS1; wire `extract_structured.py` | WS1 unblocked |
| 5-6 | `routes/projects.py` + `routes/ingest.py` (calls WS1 pipeline) | API creates projects + triggers ingest |
| 7-8 | `cluster.py`: chunk-feature matrix + Leiden/k-means clustering | Cluster assignments |
| 9 | `synthesize.py`: Gemini converts clusters to persona JSON | 4-5 grounded personas |
| 10 | Wait for WS1 retrieval API; test retrieval end-to-end | Retrieval confirmed working |
| 11 | `orchestrator.py` + round 1: fan-out personas with evidence | Round 1 responses |
| 12 | `moderator.py`: disagreement analysis + follow-up | Moderator question generated |
| 13 | Round 2: persona revisions with discussion context | Round 2 responses |
| 14 | `analyst.py`: final synthesis | AnalystSummary JSON |
| 15 | `routes/simulate.py` + `routes/dashboard.py` | API endpoints working |
| 16 | Smoke tests, schema validation, error handling | Stable API |
| 17 | Help WS1 with demo corpus | - |
| 18 | TRIBE spike: load model, score a scenario, feature-flag | TRIBE optional |
| 20-21 | End-to-end integration | Full pipeline |
| 22 | Pitch narrative + judge Q&A answers | Pitch ready |
| 23 | Rehearsal | - |

## Testing Checklist

- [ ] Gemini extraction returns valid `ChunkExtraction` for 10+ sample chunks
- [ ] Persona synthesis produces 4-5 personas with non-empty `evidence_chunk_ids`
- [ ] Round 1 responses all include `cited_chunk_ids` that exist in Chroma
- [ ] Moderator identifies at least one disagreement axis
- [ ] Round 2 responses show measurable shift from round 1
- [ ] Analyst summary references only persona outputs and evidence
- [ ] Dashboard payload validates against `DashboardPayload` schema
- [ ] Full simulation completes in under 60 seconds
- [ ] TRIBE feature-flag off -> no errors, no TRIBE fields in payload
