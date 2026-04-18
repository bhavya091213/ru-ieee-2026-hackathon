# Research Findings: AI Engine (Workstream 2)

## 1. Gemini Structured JSON Output Patterns

### SDK & Setup
- Use the **new** `google-genai` SDK (not legacy `google-generativeai`)
- `pip install google-genai` — requires **Pydantic v2**

### Structured Output
- **Always** set both `response_mime_type="application/json"` AND `response_schema` together
- Pass Pydantic models directly as `response_schema` — SDK auto-converts to JSON schema
- Enums work for constrained values (`Literal` types map to string enums)

```python
from google import genai
from google.genai import types

client = genai.Client(api_key="YOUR_KEY")
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=MyPydanticModel,
        temperature=0.0,
    ),
)
```

### Temperature Guidelines
| Task | Temperature | Rationale |
|------|------------|-----------|
| Extraction / parsing | 0.0 | Deterministic, reproducible |
| Classification | 0.0 | Consistent categorization |
| Persona synthesis | 0.0 | Factual grounding matters |
| Panel responses | 0.2 | Some variety while coherent |
| Creative content | 0.5-1.0 | Diversity of output |

### Thinking Mode
- Gemini 2.5 Flash has "thinking" enabled by default
- For simple extraction: `thinking_config=types.ThinkingConfig(thinking_budget=0)` reduces latency 30-50%
- For complex reasoning (persona synthesis, analyst summary): keep thinking ON

### Key Gotchas
1. `Optional` fields may return `null` instead of being omitted — handle both
2. No support for `Union`/`anyOf`/`oneOf` — use enum discriminators instead
3. No `$ref` support — schemas must be fully inlined
4. Schema depth limit ~5 levels — flatten where possible
5. No `minItems`/`maxItems` — use prompt instructions for array length
6. Check `finish_reason == "MAX_TOKENS"` to detect truncation
7. Always validate with `model_validate()` even with schema constraint

### Error Handling Pattern
```python
def parse_gemini_json(response, schema_model=None):
    if not response.candidates:
        raise ValueError(f"No candidates: {response.prompt_feedback}")
    candidate = response.candidates[0]
    if candidate.finish_reason != "STOP":
        raise ValueError(f"Finish reason: {candidate.finish_reason}")
    data = json.loads(response.text)
    if schema_model:
        return schema_model.model_validate(data)
    return data
```

### Retry Strategy
- Retry on: `ResourceExhausted` (rate limit), `ServiceUnavailable`, `DeadlineExceeded`
- Exponential backoff: 1s, 2s, 4s
- Also retry on `ValueError` (malformed JSON) — can be transient

---

## 2. Leiden Community Detection for Persona Clustering

### Algorithm Background
- Leiden (Traag et al., 2019) improves on Louvain: guarantees connected communities, faster convergence
- Three phases per iteration: local moving, refinement, aggregation
- Source: https://arxiv.org/abs/1810.08473

### Package Setup
```bash
pip install leidenalg python-igraph sentence-transformers scikit-learn
```

### Recommended Pipeline: Embeddings -> KNN Graph -> Leiden (CPM)

**Step 1: Embed chunks**
- Use `sentence-transformers` with `all-MiniLM-L6-v2` (fast, 384-dim) or `all-mpnet-base-v2` (better quality, 768-dim)
- Normalize embeddings (`normalize_embeddings=True`)

**Step 2: Build KNN similarity graph**
- Use `sklearn.neighbors.kneighbors_graph` with `metric="cosine"`
- Convert distance to similarity: `sim = 1 - distance`
- Symmetrize the graph: `(knn_sim + knn_sim.T) / 2`
- k=15 neighbors is a good starting point

**Step 3: Run Leiden with CPMVertexPartition**
```python
import igraph as ig
import leidenalg

partition = leidenalg.find_partition(
    graph,
    leidenalg.CPMVertexPartition,
    weights="weight",
    resolution_parameter=0.05,
    n_iterations=-1,  # iterate until stable
    seed=42,
)
```

### Why CPM over Modularity
- **No resolution limit**: Modularity can't detect communities smaller than a graph-size-dependent scale
- **Absolute resolution**: parameter has clear interpretation (minimum internal edge density)
- **Scale-independent**: meaning doesn't change with graph size

### Resolution Tuning (for cosine similarity weights 0-1)
| Resolution | Cluster Granularity |
|-----------|-------------------|
| 0.001-0.01 | Very coarse: broad themes |
| 0.01-0.05 | Medium: topic-level (good for persona segments) |
| 0.05-0.15 | Fine: sub-topic clusters |
| 0.15-0.5 | Very fine: near-duplicate groups |

For persona clustering (4-8 personas), target resolution 0.01-0.05 depending on corpus size.

### Keyword Extraction per Cluster
Use c-TF-IDF (class-based TF-IDF, as in BERTopic) to extract representative keywords per cluster for labeling.

### Key Pitfalls
1. Check `g.is_connected()` — disconnected components become separate communities regardless
2. CPM resolution must match edge weight scale (0-1 for cosine similarity)
3. KNN graphs are directed by default — must symmetrize
4. Set `n_iterations=-1` for convergence (default may be only 2)
5. Average degree 10-50 works best; too dense degrades results

### Leiden vs K-Means
- Leiden: discovers k automatically, handles uneven sizes, no shape assumption
- K-Means: needs k in advance, assumes spherical clusters, but provides centroids
- For persona clustering with unknown segment count: **Leiden wins**

---

## 3. LLM-Powered Synthetic Focus Group Simulation

### Key Academic References
- **"Out of One, Many"** (Argyle et al., 2023): Silicon sampling — LLMs conditioned on demographics reproduce survey distributions
- **"Generative Agents"** (Park et al., 2023): Persistent persona architecture with memory retrieval
- **"Multi-Agent Debate"** (Du et al., 2023): 3-4 agents debating over 2-3 rounds improves factual accuracy
- **"Homo Silicus"** (Horton, 2023): LLMs as computational economic agents
- **"Encouraging Divergent Thinking"** (Liang et al., 2023): Devil's advocate agents prevent premature consensus

### Multi-Round Discussion Architecture
Best pattern for our use case: **Round-Robin with Moderator**
1. Moderator poses scenario question
2. Each persona responds independently (Round 1 — reduces conformity bias)
3. Moderator identifies disagreement and probes deeper
4. Personas respond with awareness of others' positions (Round 2)
5. Analyst synthesizes

### Evidence Grounding (RAG + Persona)
Layered approach:
1. **Persona Profile Store**: Structured JSON with demographics, psychographics, beliefs
2. **Experience Memory**: Specific evidence chunks assigned to this persona
3. **Domain Knowledge RAG**: Retrieved context about the product/scenario
4. **Cited Reasoning**: Force agents to cite `evidence_chunk_ids` for every claim

### Measuring Disagreement and Consensus
**Quantitative metrics:**
- Likert-scale extraction: compute variance as disagreement index
- Sentiment polarity spread (std dev across agents)
- Stance classification (support/oppose/neutral): agreement ratios
- Pairwise cosine similarity of embedded responses

**Thematic analysis:**
- Themes mentioned by >70% of agents = consensus
- Themes mentioned by <30% = minority perspectives
- High sentiment variance themes = contested topics

### Avoiding False Consensus (Critical)
LLMs tend toward sycophancy/conformity. Countermeasures:
1. **Independent first responses**: All personas respond before seeing others (Round 1)
2. **Adversarial persona assignment**: 1-2 skeptic/contrarian personas
3. **Temperature diversity**: Some agents at higher temperature
4. **Anchor resistance instructions**: "Maintain your perspective even if others disagree"
5. **Moderator probes disagreement**: Explicitly ask for minority views

### Persona Consistency Best Practices
1. Rich profiles (200-500 words per persona, structured JSON)
2. Few-shot calibration examples showing persona voice
3. Per-persona memory of prior statements to prevent self-contradiction
4. Post-generation consistency checking against profile
5. Domain-bounded knowledge: "You only know about products you've used"

### Known Limitations
- **Monoculture problem**: All personas from same model = correlated biases
- **Emotional flatness**: Simulated emotion language but lacks intensity
- **Sycophancy**: Strongest single threat to validity — must actively counter
- **Validation gap**: Limited rigorous comparison to real focus groups
- Best used for **hypothesis generation**, not replacement for human research

---

## 4. FastAPI Async Orchestration State Machines

### Immutable State Machine Pattern
Use `frozen=True` dataclass with `dataclasses.replace()` for transitions:

```python
from dataclasses import dataclass, field, replace
from enum import StrEnum, auto

class SimPhase(StrEnum):
    INIT = auto()
    RETRIEVING = auto()
    ROUND1 = auto()
    MODERATING = auto()
    ROUND2 = auto()
    ANALYZING = auto()
    SCORING = auto()
    DONE = auto()
    FAILED = auto()

@dataclass(frozen=True, slots=True)
class SimulationState:
    project_id: str
    scenario: dict
    personas: tuple[dict, ...] = ()
    phase: SimPhase = SimPhase.INIT
    # ... fields for each phase output
    error: str | None = None

    def transition(self, **changes) -> "SimulationState":
        return replace(self, **changes)
```

### Fan-Out / Fan-In Patterns

**`asyncio.gather(return_exceptions=True)`** — for persona responses (partial results OK):
- Collects all results including failures
- One persona timing out doesn't kill the round
- Separate successes from failures post-gather

**`asyncio.TaskGroup`** — for retrieval (all-or-nothing):
- All must succeed or all are cancelled
- Use `except*` for ExceptionGroup handling (Python 3.11+)

| Pattern | Use When | Error Behavior |
|---------|----------|---------------|
| `gather(return_exceptions=True)` | Partial results OK (persona responses) | Collects errors; no cancellation |
| `TaskGroup` | All-or-nothing (evidence retrieval) | Cancels remaining on first failure |

### Orchestrator Structure
Pure async pipeline — no LangGraph needed:

```python
async def run_simulation(state, enable_tribe=False):
    phases = [
        (SimPhase.RETRIEVING, retrieve_all_evidence),
        (SimPhase.ROUND1, fan_out_round1),
        (SimPhase.MODERATING, run_moderator),
        (SimPhase.ROUND2, fan_out_round2),
        (SimPhase.ANALYZING, run_analyst),
    ]
    if enable_tribe:
        phases.append((SimPhase.SCORING, run_tribe_scoring))

    for target_phase, phase_fn in phases:
        if state.phase == SimPhase.FAILED:
            break
        state = state.transition(phase=target_phase)
        try:
            async with asyncio.timeout(120):
                state = await phase_fn(state)
        except (TimeoutError, Exception) as exc:
            state = state.transition(phase=SimPhase.FAILED, error=str(exc))
    return state
```

### Rate Limiting
- `asyncio.Semaphore(5)` to limit concurrent Gemini calls
- Nested timeouts: per-phase (120s) wrapping per-call (30s)
- Retry with exponential backoff + jitter for transient errors

### FastAPI Integration
- `lifespan` context manager for shared resources (Gemini client, rate limiter)
- Background tasks or WebSocket for long-running simulation
- `contextvars.ContextVar` for request-scoped state (run_id, project_id)

### Testing
- Each phase is independently testable: pass state in, assert returned state
- Mock Gemini calls, verify partial failure handling
- Verify immutability: `state1 is not state2` after transition
- `pytest-asyncio` + `httpx.AsyncClient` with `ASGITransport`

---

## 5. Testing Preferences (New Project)

Since this is a new project, recommended testing setup:
- **Framework**: `pytest` with `pytest-asyncio` (anyio backend)
- **HTTP testing**: `httpx.AsyncClient` with `ASGITransport` for FastAPI
- **Mocking**: `unittest.mock.patch` for Gemini API calls
- **Coverage**: `pytest-cov` targeting 80%+
- **Test structure**: Mirror `core/` and `apps/api/` directory structure in `tests/`
