Now I have all the context I need. Let me produce the section content for section-05-persona-synthesis.

# Section 05: Persona Synthesis

## Overview

This section implements the Gemini-powered conversion of Leiden clusters into grounded, structured personas. Each cluster produced by the clustering pipeline (section-04) is sent to Gemini along with its evidence chunks, graph entities, facets, and stances. Gemini returns a `Persona` model, which is then post-validated to ensure evidence grounding quality. All cluster synthesis calls run in parallel for speed.

The primary file is `core/personas/synthesize.py`, with prompt templates in `core/personas/prompts.py`.

---

## Dependencies

| Section | What It Provides | Status Required |
|---------|-----------------|-----------------|
| section-01-schemas | `Persona`, `Belief`, `SkepticismProfile` models in `apps/api/schemas/persona.py`; facet literals | Must be complete |
| section-02-gemini-client | `generate_structured()` in `core/gemini.py`; config with `GEMINI_API_KEY` | Must be complete |
| section-04-clustering | `cluster_chunks()` returning `list[ClusterResult]` from `core/personas/cluster.py` | Must be complete |

This section is consumed by:
- **section-06-orchestrator-state**: The orchestrator loads personas into `SimulationState`
- **section-08-simulation-rounds**: Round 1 and Round 2 use the `Persona` objects produced here

---

## Files to Create or Modify

| File Path | Action |
|-----------|--------|
| `core/personas/prompts.py` | **Create** -- persona synthesis prompt template |
| `core/personas/synthesize.py` | **Create** -- `synthesize_personas()` and `_synthesize_one()` functions |
| `tests/core/personas/test_synthesize.py` | **Create** -- all tests for persona synthesis |

All paths are relative to the project root `/Users/bhavyapatel/Documents/Projects/focus-group-agent`.

---

## Tests (Write First)

Test file: `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/core/personas/test_synthesize.py`

Testing framework: **pytest** with **pytest-asyncio**. All Gemini calls are mocked. The tests assume `ClusterResult` is a dataclass or model from `core/personas/cluster.py` containing at minimum: `cluster_id`, `chunk_texts`, `chunk_ids`, `entities`, `facets`, `stances`, `keywords`.

```python
# Test: synthesize_personas produces one Persona per cluster (mock Gemini)
#   - Create 3 mock ClusterResult objects
#   - Mock generate_structured to return a valid Persona for each call
#   - Call synthesize_personas(clusters)
#   - Assert len(result) == 3
#   - Assert each result is a Persona instance

# Test: synthesize_personas drops beliefs with <2 evidence_chunk_ids
#   - Mock Gemini to return a Persona with beliefs:
#       - belief_a: evidence_chunk_ids=["c1", "c2"] (valid, 2 IDs)
#       - belief_b: evidence_chunk_ids=["c3"] (invalid, only 1 ID)
#       - belief_c: evidence_chunk_ids=[] (invalid, 0 IDs)
#   - Call synthesize_personas
#   - Assert only belief_a survives in the result

# Test: synthesize_personas logs warning for persona with <3 beliefs after filtering
#   - Mock Gemini to return a Persona where filtering removes beliefs down to 2
#   - Use caplog or mock logging to assert a warning is emitted
#   - The persona should still be returned (not dropped)

# Test: synthesize_personas validates feature_priorities keys are valid facets
#   - Mock Gemini to return a Persona with feature_priorities containing
#     both valid keys ("camera", "battery") and an invalid key ("foobar")
#   - After synthesis, the invalid key should be removed from feature_priorities
#   - Valid keys should remain

# Test: synthesize_personas includes graph_entity_ids from cluster
#   - Create a ClusterResult with entities having IDs ["e1", "e2", "e3"]
#   - Mock Gemini to return a Persona (graph_entity_ids may or may not match)
#   - After synthesis, verify graph_entity_ids on the resulting Persona
#     are populated from the cluster's entity IDs

# Test: synthesize_personas runs cluster calls in parallel
#   - Create 4 mock ClusterResult objects
#   - Mock generate_structured with a small async sleep (0.05s per call)
#   - Time the overall synthesize_personas call
#   - Assert total time is significantly less than 4 * 0.05s (parallel, not sequential)

# Test: _synthesize_one constructs correct prompt with cluster data
#   - Call _synthesize_one with a known ClusterResult
#   - Capture the prompt string passed to generate_structured (via mock)
#   - Assert the prompt contains the cluster_id, chunk texts, entity info,
#     facets, and stances from the ClusterResult

# Test: synthesize_personas returns empty list for empty clusters input
#   - Call synthesize_personas([])
#   - Assert result is []
```

---

## Prompt Template

File: `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/personas/prompts.py`

This file holds string constants for persona-related prompts. The synthesis prompt follows the template established in the workstream spec.

The `PERSONA_SYNTHESIS_PROMPT` constant is a two-part prompt (system + user) stored as a single string or as two separate constants (`PERSONA_SYNTHESIS_SYSTEM` and `PERSONA_SYNTHESIS_USER`). The prompt uses the following placeholders:

- `{cluster_id}` -- integer or string identifier for the cluster
- `{chunks}` -- JSON-serialized list of chunk texts from the cluster
- `{entities}` -- JSON-serialized list of graph entities found in the cluster
- `{facets}` -- comma-separated list of common facets in the cluster
- `{stances}` -- comma-separated list of common stances in the cluster

Key instructions in the system portion:

1. "You are synthesizing a consumer persona from clustered evidence."
2. "The persona must be grounded in the provided evidence chunks. Never invent beliefs without evidence."
3. "Return valid JSON matching the provided schema."
4. "Every belief must include at least 2 evidence_chunk_ids referencing real chunk IDs from the input."

Key instructions in the user portion:

1. Present the cluster ID, evidence chunks, graph entities, common facets, and common stances.
2. Request the following fields: `segment_label`, `summary`, `jobs_to_be_done`, `feature_priorities`, `skepticism_profile`, and `beliefs` (each with `evidence_chunk_ids`).
3. For `feature_priorities`, instruct the model to use only valid facet names as keys: `camera`, `battery`, `price`, `design`, `privacy`, `ecosystem`, `other`.
4. For `skepticism_profile`, instruct the model to provide float values 0-1 for `trust_in_reviews`, `trust_in_brand_claims`, and `influencer_susceptibility`.

The full prompt text is the implementer's responsibility to compose. Keep the prompt concise but explicit about grounding requirements.

---

## Implementation Details

File: `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/personas/synthesize.py`

### Public Function: `synthesize_personas`

```python
async def synthesize_personas(
    clusters: list[ClusterResult],
) -> list[Persona]:
    """Convert Leiden clusters into grounded personas via Gemini synthesis.

    Runs cluster synthesis calls in parallel (one Gemini call per cluster).
    Post-validates each persona for evidence grounding quality.
    """
```

**Behavior:**

1. If `clusters` is empty, return an empty list immediately.
2. Use `asyncio.TaskGroup` to call `_synthesize_one(cluster)` for each cluster in parallel.
3. Collect all resulting `Persona` objects.
4. For each persona, run post-synthesis validation (see below).
5. Return the list of validated personas.

### Private Function: `_synthesize_one`

```python
async def _synthesize_one(cluster: ClusterResult) -> Persona:
    """Synthesize a single persona from one cluster's evidence.

    Constructs the prompt from cluster data, calls Gemini via generate_structured,
    and returns the raw Persona (before post-validation).
    """
```

**Behavior:**

1. Build the prompt string by formatting `PERSONA_SYNTHESIS_PROMPT` (or the system+user pair) with the cluster's data:
   - `cluster_id`: from `cluster.cluster_id`
   - `chunks`: JSON-serialized `cluster.chunk_texts` (or a list of dicts with chunk_id + text)
   - `entities`: JSON-serialized `cluster.entities`
   - `facets`: comma-joined `cluster.facets`
   - `stances`: comma-joined `cluster.stances`
2. Call `generate_structured(prompt=prompt, response_schema=Persona, temperature=0.0, thinking_budget=None)`.
   - Temperature 0.0 for factual grounding.
   - Thinking is ON (pass `thinking_budget` as a positive integer or leave as `None` to enable default thinking) because this is a complex reasoning task.
3. Attach `graph_entity_ids` from the cluster to the resulting persona. The Gemini call may or may not produce these IDs correctly, so overwrite with the cluster's known entity IDs: `persona.graph_entity_ids = [e.id for e in cluster.entities]`. Since schemas are Pydantic models (immutable by default with `model_copy`), create a new copy with the updated field.
4. Return the persona.

### Post-Synthesis Validation

Applied to each persona after `_synthesize_one` returns. This is a pure function (no LLM calls).

```python
def _validate_persona(persona: Persona, cluster: ClusterResult) -> Persona:
    """Post-validate a synthesized persona for evidence grounding quality.

    - Drops beliefs with fewer than 2 evidence_chunk_ids
    - Removes invalid facet keys from feature_priorities
    - Logs warnings for low belief count
    - Returns a new Persona with validated fields
    """
```

**Validation steps:**

1. **Filter beliefs**: Keep only beliefs where `len(belief.evidence_chunk_ids) >= 2`. This is the minimum evidence grounding threshold specified in the plan.
2. **Log warning**: If the filtered beliefs list has fewer than 3 entries, log a warning: `"Persona '{segment_label}' has only {n} beliefs after filtering (minimum recommended: 3)"`. Do NOT drop the persona -- the moderator and analyst phases need all personas.
3. **Validate feature_priorities keys**: The valid facet names are `camera`, `battery`, `price`, `design`, `privacy`, `ecosystem`, `other`. Remove any keys from `feature_priorities` that are not in this set. Log a warning for each removed key.
4. **Ensure graph_entity_ids**: Should already be set by `_synthesize_one`, but verify it is a non-empty list if the cluster had entities.
5. Return a new `Persona` (via `model_copy(update=...)`) with the validated fields.

### Valid Facets Constant

Define a module-level constant for the valid facet literals, shared with validation logic:

```python
VALID_FACETS: set[str] = {"camera", "battery", "price", "design", "privacy", "ecosystem", "other"}
```

This should match the facet literals defined in `apps/api/schemas/chunk.py`.

### Error Handling

- If `generate_structured` raises (after its internal retries are exhausted), the exception propagates up through `TaskGroup`, which cancels all remaining cluster synthesis calls. This is the fail-fast behavior specified in the plan.
- No partial results are returned. Either all personas are synthesized or the entire call fails.

### Logging

Use Python's `logging` module with a module-level logger:

```python
import logging
logger = logging.getLogger(__name__)
```

Log at these points:
- `INFO`: Starting synthesis for N clusters
- `INFO`: Completed synthesis for cluster {cluster_id} -> persona "{segment_label}"
- `WARNING`: Persona has < 3 beliefs after filtering
- `WARNING`: Removed invalid feature_priority key "{key}" from persona "{segment_label}"
- `INFO`: All {N} personas synthesized successfully

---

## ClusterResult Interface (from section-04)

The `synthesize_personas` function expects a `ClusterResult` type from `core/personas/cluster.py`. For the purposes of this section, assume the following interface (do not reimplement it; it comes from section-04):

```python
@dataclass
class ClusterResult:
    cluster_id: int
    chunk_texts: list[str]       # raw text of each chunk in the cluster
    chunk_ids: list[str]         # IDs of chunks in the cluster
    entities: list[ExtractedEntity]  # graph entities associated with this cluster
    facets: list[str]            # common facets found in this cluster
    stances: list[str]           # common stances found in this cluster
    keywords: list[str]          # c-TF-IDF keywords for this cluster
```

If section-04's actual implementation uses a different field naming or structure, adjust imports and field access accordingly.

---

## Integration Notes

- The `synthesize_personas` function is called by the simulation orchestrator (section-06) as part of project setup, before the simulation state machine begins its phases.
- The resulting `list[Persona]` is stored in `SimulationState.personas` and used by the retrieval, round 1, round 2, moderator, and analyst phases.
- All prompt templates live in `core/personas/prompts.py` to keep prompt text separate from logic. The simulation prompts (panel response, moderator, analyst) live separately in `core/simulation/prompts.py` (section-08 and section-09).
- The `VALID_FACETS` set should ideally be imported from or kept in sync with the facet literals in `apps/api/schemas/chunk.py` (section-01). If section-01 exports a `FACET_LITERALS` constant, import it. Otherwise, define the set locally and add a comment noting the dependency.