# TDD Plan — Workstream 2: AI Engine

Testing framework: **pytest** with **pytest-asyncio** for async tests. HTTP testing via **httpx.AsyncClient** with ASGITransport. Tests mirror the source layout in a `tests/` directory.

---

## 3. Pydantic Schemas

```python
# Test: ChunkExtraction roundtrip serialize/deserialize with all fields populated
# Test: ChunkExtraction rejects invalid facet literal
# Test: ChunkExtraction rejects invalid stance literal
# Test: ExtractedEntity rejects invalid type literal
# Test: ExtractedRelationship rejects invalid type literal
# Test: Persona with graph_entity_ids serializes correctly
# Test: Belief with empty evidence_chunk_ids is valid (filtering happens in synthesis)
# Test: Scenario validator rejects empty product_name
# Test: Scenario validator rejects >10 hypotheses
# Test: Scenario validator rejects hypothesis >500 chars
# Test: Scenario validator rejects invalid facet in facets_to_explore
# Test: PersonaResponse roundtrip with all fields
# Test: DashboardPayload with tribe=None serializes correctly
# Test: DashboardPayload with TribeResult serializes correctly
# Test: ScoredLabel, FeatureScoreRow, QuoteCard roundtrip
# Test: All schema models export to JSON Schema (for Gemini response_schema)
```

---

## 4. Gemini Client and Configuration

```python
# Test: config loads GEMINI_API_KEY from environment
# Test: config defaults GEMINI_MODEL to "gemini-2.5-flash"
# Test: config defaults USE_MOCK_RETRIEVAL to True
# Test: config defaults TRIBE_ENABLED to False
# Test: generate_structured returns typed result matching schema (mock genai client)
# Test: generate_structured retries on ResourceExhausted (mock 2 failures then success)
# Test: generate_structured raises after 2 retries exhausted
# Test: generate_structured validates response with model_validate (reject malformed)
# Test: generate_structured detects finish_reason=MAX_TOKENS and raises
# Test: generate_structured detects finish_reason=SAFETY and raises
# Test: generate_structured cache hit returns cached result without API call
# Test: generate_structured cache miss calls API and caches result
# Test: generate_structured preserves generic type (TypeVar return)
```

---

## 5. Extraction Pipeline

```python
# Test: extract_chunk returns valid ChunkExtraction for sample text (mock Gemini)
# Test: extract_chunk uses temperature=0.0 and thinking_budget=0
# Test: extract_chunk handles empty chunk text gracefully
# Test: extracted entities have unique IDs
# Test: extracted relationships reference valid entity IDs
# Test: all Pydantic schemas pass Gemini structured output compatibility check
```

---

## 6. Persona Clustering

```python
# Test: cluster_chunks with known embeddings produces expected cluster count
# Test: cluster_chunks respects target_range (3, 8) bounds
# Test: cluster_chunks auto-tunes resolution when initial produces <3 clusters
# Test: cluster_chunks auto-tunes resolution when initial produces >8 clusters
# Test: cluster_chunks caps binary search at 10 iterations
# Test: cluster_chunks falls back to k-means after 10 iterations
# Test: cluster_chunks merges clusters with <3 chunks into nearest neighbor
# Test: cluster_chunks returns ClusterResult with chunk texts and keywords
# Test: KNN graph is symmetric after symmetrization
# Test: KNN graph has no self-loops
# Test: synthesize_personas produces one Persona per cluster (mock Gemini)
# Test: synthesize_personas drops beliefs with <2 evidence_chunk_ids
# Test: synthesize_personas logs warning for persona with <3 beliefs
# Test: synthesize_personas validates feature_priorities keys are valid facets
# Test: synthesize_personas includes graph_entity_ids from cluster
# Test: synthesize_personas runs cluster calls in parallel
```

---

## 7. Simulation Orchestrator

### State Machine

```python
# Test: SimulationState is immutable (frozen dataclass)
# Test: SimulationState.transition returns new object, original unchanged
# Test: SimPhase enum has all expected phases
# Test: run_simulation progresses through all phases in order
# Test: run_simulation short-circuits on FAILED phase
# Test: run_simulation sets phase=DONE on success
# Test: run_simulation respects phase-level timeout (180s)
# Test: run_simulation skips SCORING phase when tribe disabled
# Test: run_simulation includes SCORING phase when tribe enabled
```

### Retrieval

```python
# Test: retrieve_for_persona returns chunks (mock retrieval)
# Test: retrieve_for_persona constructs query from persona keywords + scenario
# Test: retrieve_for_persona filters by persona's facets
# Test: mock retrieval returns demo corpus chunks when USE_MOCK_RETRIEVAL=True
# Test: retrieval fails loudly when USE_MOCK_RETRIEVAL=False and WS1 unavailable
```

### Round 1 & Round 2

```python
# Test: fan_out_round1 calls Gemini for each persona in parallel (mock)
# Test: fan_out_round1 uses TaskGroup for fail-fast
# Test: fan_out_round1 fails entire phase if any persona call fails
# Test: fan_out_round1 uses temperature=0.2
# Test: round1 responses include cited_chunk_ids
# Test: grounding validation strips invalid cited_chunk_ids
# Test: grounding validation flags response as low_grounding when zero valid citations
# Test: grounding validation does NOT drop persona with zero citations
# Test: fan_out_round2 includes round1 responses and moderator question in context
# Test: round2 prompt includes "update your position if evidence warrants it"
```

### Moderator

```python
# Test: analyze_disagreement returns ModeratorQuestion (mock Gemini)
# Test: moderator identifies at least one targeted_persona_id
# Test: targeted_persona_ids exist in the persona set
# Test: follow_up_question is non-empty
# Test: disagreement_summary references specific persona disagreements
```

### Analyst

```python
# Test: synthesize_results returns AnalystSummary (mock Gemini)
# Test: analyst produces consensus_themes and disagreement_themes
# Test: analyst produces non-empty top_risks and top_wins
# Test: analyst produces feature_recommendations
```

### Dashboard Assembly

```python
# Test: consensus_score = 1 - (std(likelihoods) / 50), clamped [0, 1]
# Test: consensus_score = 1.0 when all personas have same likelihood
# Test: consensus_score = 0.0 when max disagreement (0 and 100)
# Test: disagreement_score = mean of per-facet std, clamped [0, 1]
# Test: evidence_coverage = fraction of personas with >=3 cited chunks in round2
# Test: quotes extracted from quotable_sentence fields
# Test: feature_scores aggregated correctly (mean, min, max, std per facet)
# Test: PersonaSummary built from persona + round2 response
# Test: DashboardPayload validates cleanly against schema
```

---

## 8. FastAPI Routes

```python
# Test: POST /api/projects creates project and returns project_id
# Test: POST /api/projects/{id}/ingest updates source_count and chunk_count
# Test: POST /api/projects/{id}/simulate returns 202 with run_id
# Test: POST /api/projects/{id}/simulate returns 409 if already running
# Test: GET /api/projects/{id}/simulate/status returns phase and done flag
# Test: GET /api/projects/{id}/dashboard returns DashboardPayload after simulation
# Test: GET /api/projects/{id}/dashboard returns 404 before simulation
# Test: GET /api/projects/{unknown}/dashboard returns 404
# Test: POST /api/projects/{id}/tribe/score returns TribeResult when enabled
# Test: POST /api/projects/{id}/tribe/score returns 400/404 when disabled
# Test: GET /api/health returns ok status
# Test: per-project lock prevents concurrent simulate calls
# Test: full flow: create project -> ingest -> simulate -> poll status -> get dashboard
```

---

## 9. TRIBE Heuristic Scoring

```python
# Test: response_strength = 0.0 when all likelihoods are 50
# Test: response_strength = 1.0 when all likelihoods are 0 or 100
# Test: response_variance = 0.0 when all likelihoods are equal
# Test: response_variance increases with spread of likelihoods
# Test: response_spread = 0.0 when all personas have same feature scores
# Test: response_spread increases with feature score divergence
# Test: scored_text uses hard-coded templates based on score ranges
# Test: score_tribe returns TribeResult with all fields populated
# Test: TribeResult.enabled = True when scores computed
```

---

## 10. WS1 Mock Layer

```python
# Test: mock retrieve returns chunks filtered by facet
# Test: mock retrieve returns at most top_k results
# Test: mock get_community_labels returns dict mapping entity_id to community_id
# Test: demo corpus has chunks for all facets (camera, battery, price, design, privacy, ecosystem)
# Test: mock layer activates when USE_MOCK_RETRIEVAL=True
# Test: mock layer does NOT activate when USE_MOCK_RETRIEVAL=False
```
