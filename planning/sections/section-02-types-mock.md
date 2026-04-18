Good. `IngestStatus` is mentioned in the plan but not explicitly typed in the spec. I have enough information now. Let me produce the section content.

# Section 02 — Type System, Mock Data, and Color Utilities

## Overview

This section defines the TypeScript type system (`types.ts`), comprehensive mock data (`mockData.ts`), and the persona color palette (`colors.ts`). These three files form the data foundation for every other frontend section. All subsequent components, hooks, and API wrappers depend on the types and mock data defined here.

**Depends on:** section-01-scaffold (project must be initialized with Vite + React + TypeScript)
**Blocks:** sections 03 through 11 (everything that consumes typed data)

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/lib/types.ts` | All TypeScript interfaces mirroring the WS2 Pydantic schemas |
| `apps/web/src/lib/mockData.ts` | Hardcoded realistic `DashboardPayload` for standalone rendering |
| `apps/web/src/lib/colors.ts` | Persona color palette and `getPersonaColor` function |
| `apps/web/src/lib/types.test.ts` | Type conformance and mock data validation tests |
| `apps/web/src/lib/colors.test.ts` | Color utility tests |

---

## Tests First

All test files use **Vitest**. They live alongside source files.

### `apps/web/src/lib/types.test.ts`

This file imports `mockDashboardPayload` from `mockData.ts` and validates that the mock data conforms to all type contracts and contains realistic content. Tests to write:

1. **Mock data satisfies DashboardPayload type** -- The import itself is a compile-time check; the runtime test asserts the object is not null/undefined.

2. **All required top-level fields present on mock DashboardPayload** -- Assert that `project_id`, `scenario_id`, `consensus_score`, `disagreement_score`, `evidence_coverage`, `top_risks`, `top_wins`, `feature_scores`, `personas`, `quotes`, `round1_responses`, `round2_responses`, `moderator_question`, `analyst_summary`, and `tribe` all exist (are not `undefined`).

3. **mockDashboardPayload has 5 personas** -- `expect(mock.personas).toHaveLength(5)`.

4. **mockDashboardPayload has at least 8 quotes** -- `expect(mock.quotes.length).toBeGreaterThanOrEqual(8)`.

5. **mockDashboardPayload.consensus_score is between 0 and 1** -- Assert `>= 0` and `<= 1`.

6. **mockDashboardPayload has both round1_responses and round2_responses** -- Assert both arrays have length > 0.

7. **Each persona has corresponding round1 and round2 responses (matched by persona_id)** -- For every persona in `personas`, find a matching entry in `round1_responses` and `round2_responses` by `persona_id`.

8. **PersonaSummary.adoption_likelihood is number 0-100** -- For each persona, assert `adoption_likelihood >= 0` and `adoption_likelihood <= 100`.

9. **PersonaResponse.adoption_likelihood_0_100 is number 0-100** -- For each response in `round1_responses` and `round2_responses`, assert the field `adoption_likelihood_0_100` exists and is in range 0-100.

### `apps/web/src/lib/colors.test.ts`

1. **getPersonaColor returns a string for any persona_id** -- Call with an arbitrary string, assert return type is string and non-empty.

2. **getPersonaColor returns consistent color for same persona_id** -- Call twice with the same id, assert both returns are identical.

3. **5 different persona_ids get 5 distinct colors** -- Call with 5 different ids, collect results into a Set, assert Set size is 5.

---

## Implementation Details

### `apps/web/src/lib/types.ts`

Define these interfaces exactly as shown. These mirror the WS2 (FastAPI/Pydantic) schemas. Do not add optional fields or defaults -- keep them 1:1 with the API contract.

```typescript
export interface DashboardPayload {
  project_id: string;
  scenario_id: string;
  consensus_score: number;        // 0-1
  disagreement_score: number;     // 0-1
  evidence_coverage: number;      // 0-1
  top_risks: ScoredLabel[];
  top_wins: ScoredLabel[];
  feature_scores: Record<string, FeatureScoreRow>;
  personas: PersonaSummary[];
  quotes: QuoteCard[];
  round1_responses: PersonaResponse[];
  round2_responses: PersonaResponse[];
  moderator_question: string;
  analyst_summary: AnalystSummary;
  tribe: TribeResult | null;
}
```

```typescript
export interface PersonaSummary {
  persona_id: string;
  segment_label: string;
  summary: string;
  adoption_likelihood: number;    // 0-100
  strongest_positive: string;
  strongest_concern: string;
  feature_priorities: Record<string, number>;
}
```

**Critical field-name difference:** `PersonaSummary` uses `adoption_likelihood` (0-100). `PersonaResponse` uses `adoption_likelihood_0_100` (0-100). These are different field names for the same concept. The `RoundComparison` component (section-06) must use the correct field for each type.

```typescript
export interface PersonaResponse {
  persona_id: string;
  overall_reaction: string;
  adoption_likelihood_0_100: number;  // 0-100, NOTE: different name from PersonaSummary
  strongest_positive: string;
  strongest_concern: string;
  feature_scores: Record<string, number>;
  cited_chunk_ids: string[];
}
```

```typescript
export interface QuoteCard {
  persona_id: string;
  segment_label: string;
  quote: string;
  facet: string;
  sentiment: string;              // "positive" | "negative" | "neutral" (kept as string for flexibility)
}
```

```typescript
export interface FeatureScoreRow {
  mean: number;
  min: number;
  max: number;
  std: number;
  persona_scores: Record<string, number>;  // persona_id -> score (0-1), used by FeatureHeatmap
}
```

```typescript
export interface ScoredLabel {
  label: string;
  score: number;
}
```

```typescript
export interface TribeResult {
  enabled: boolean;
  response_strength: number;
  response_variance: number;
  response_spread: number;
  scored_text: string;
}
```

```typescript
export interface AnalystSummary {
  consensus_themes: string[];
  disagreement_themes: string[];
  top_risks: ScoredLabel[];
  top_wins: ScoredLabel[];
  feature_recommendations: string[];
  messaging_suggestions: string[];
  evidence_gaps: string[];
}
```

```typescript
export interface IngestStatus {
  status: string;
  source_count: number;
  chunk_count: number;
}
```

All interfaces are exported individually. No default exports.

---

### `apps/web/src/lib/mockData.ts`

Export a single `mockDashboardPayload` constant of type `DashboardPayload`. This object must be realistic and internally consistent so that every dashboard component can render meaningful content from day one.

**Requirements for the mock data:**

**5 Personas** with distinct market segments:
- "Early Adopter Enthusiast" (high adoption ~82)
- "Privacy-Conscious Professional" (moderate adoption ~58)
- "Budget-Minded Student" (low-moderate adoption ~45)
- "Ecosystem Loyalist" (moderate-high adoption ~71)
- "Skeptical Tech Journalist" (low adoption ~33)

Each persona needs: `persona_id` (e.g., `"p1"` through `"p5"`), `segment_label`, `summary` (2-3 sentence description), `adoption_likelihood` (0-100), `strongest_positive`, `strongest_concern`, and `feature_priorities` as a Record mapping facet names to scores (0-1).

**6 Facets:** `camera`, `battery`, `price`, `design`, `privacy`, `ecosystem`.

**Top-level scores:**
- `consensus_score`: approximately 0.61
- `disagreement_score`: approximately 0.34
- `evidence_coverage`: approximately 0.89

**10+ Quote cards** (aim for 10-12) with varied `persona_id`, `facet`, and `sentiment` values. Each quote should be 1-3 sentences of realistic market research commentary. Sentiments should be a mix of `"positive"`, `"negative"`, and `"neutral"`.

**Round 1 and Round 2 responses** for all 5 personas. Round 2 should show belief evolution -- some personas increase adoption likelihood after deliberation, others decrease. Use the field `adoption_likelihood_0_100` (not `adoption_likelihood`). Each response includes `overall_reaction`, `strongest_positive`, `strongest_concern`, `feature_scores` (Record of facet to 0-1 score), and `cited_chunk_ids` (array of strings like `"chunk_01"`).

**Feature scores** (`Record<string, FeatureScoreRow>`) for all 6 facets. Each `FeatureScoreRow` must have `mean`, `min`, `max`, `std`, and `persona_scores` (mapping each persona_id to a 0-1 score). The data should tell a coherent story: camera highly positive across personas, price contentious (high std), privacy polarizing.

**top_risks and top_wins:** 3-4 `ScoredLabel` items each. Example risks: "Price sensitivity in student segment", "Privacy concerns among professionals". Example wins: "Camera innovation excites early adopters", "Ecosystem integration valued by loyalists".

**analyst_summary:** Populate all fields (`consensus_themes`, `disagreement_themes`, `top_risks`, `top_wins`, `feature_recommendations`, `messaging_suggestions`, `evidence_gaps`) with 2-4 realistic entries each.

**tribe:** Set to `null` for the default mock (TribePanel is P2 stretch). Optionally export a separate `mockTribeResult` for TribePanel testing:

```typescript
export const mockTribeResult: TribeResult = {
  enabled: true,
  response_strength: 0.72,
  response_variance: 0.15,
  response_spread: 0.41,
  scored_text: "Product concept shows strong cortical engagement...",
};
```

**moderator_question:** A realistic moderator prompt string, e.g., "How would this product fit into your daily workflow, and what would make you recommend it to a colleague?"

**project_id and scenario_id:** Use fixed strings like `"proj_mock_001"` and `"scen_mock_001"`.

---

### `apps/web/src/lib/colors.ts`

**Persona color palette:** Define an array of 5 muted colors that are distinguishable on dark (slate-900) backgrounds. Good choices are muted/pastel-ish tones with enough saturation to read clearly:

```typescript
const PERSONA_COLORS = [
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
];
```

**`getPersonaColor(persona_id: string): string`** -- Deterministically assign a color. Strategy: maintain a module-level map (`Record<string, string>`). On first call for a given `persona_id`, assign the next unused color from the palette (cycling if more than 5 personas). On subsequent calls, return the cached color. This ensures consistency across the app lifetime.

**Chart color constants** (also exported):

```typescript
export const SENTIMENT_COLORS = {
  positive: '#22c55e',  // green-500
  negative: '#ef4444',  // red-500
  neutral: '#f59e0b',   // amber-500
} as const;

export const CHART_COLORS = {
  primary: '#3b82f6',   // blue-500
  grid: '#334155',      // slate-700
} as const;
```

---

## Internal Consistency Checklist

Before marking this section complete, verify:

- [ ] Every field in `DashboardPayload` has a corresponding value in `mockDashboardPayload`
- [ ] `PersonaSummary` uses `adoption_likelihood` (not `adoption_likelihood_0_100`)
- [ ] `PersonaResponse` uses `adoption_likelihood_0_100` (not `adoption_likelihood`)
- [ ] Each of the 5 persona_ids appears in `personas`, `round1_responses`, `round2_responses`, `quotes` (at least one), and every `feature_scores[facet].persona_scores`
- [ ] `feature_scores` has entries for all 6 facets
- [ ] `getPersonaColor` returns the same color for the same id across multiple calls
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript compilation errors