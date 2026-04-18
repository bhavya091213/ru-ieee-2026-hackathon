The project has not been scaffolded yet. This section is for the FeatureHeatmap D3 component. Let me now produce the complete section content.

# Section 09: FeatureHeatmap (D3 SVG Component)

## Overview

This section builds the `FeatureHeatmap` component -- a custom D3-powered SVG heatmap that visualizes per-persona, per-facet feature scores. Unlike the Recharts-based charts in Section 08, this component renders SVG directly using D3 scale utilities (`d3-scale`, `d3-scale-chromatic`) for fine-grained control over cell layout and color mapping.

The heatmap is a P1 component placed in Row 3 of the ProjectDashboard grid alongside the EvidenceGraph. It is wrapped in an ErrorBoundary to prevent D3 errors from crashing the entire dashboard.

## Dependencies on Other Sections

- **Section 01 (scaffold):** Vite project with `d3-scale` and `d3-scale-chromatic` installed as dependencies.
- **Section 02 (types-mock):** `DashboardPayload`, `FeatureScoreRow`, `PersonaSummary` types defined in `types.ts`. Mock data in `mockData.ts` with 5 personas, 6 facets, and `feature_scores` containing `persona_scores: Record<string, number>`. `colors.ts` with `getPersonaColor`.
- **Section 01 (scaffold):** `ErrorBoundary` component at `apps/web/src/components/ErrorBoundary.tsx`.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/components/FeatureHeatmap.tsx` | The D3 SVG heatmap component |
| `apps/web/src/components/FeatureHeatmap.test.tsx` | Unit tests for the heatmap |

## Tests (Write First)

All tests live in `apps/web/src/components/FeatureHeatmap.test.tsx`. Use Vitest with React Testing Library and jsdom environment.

### Test: Renders SVG element

Render the FeatureHeatmap with valid `feature_scores` and `personas` from mock data. Assert that an `<svg>` element is present in the document.

### Test: Renders correct number of cells (personas x facets)

Given 5 personas and 6 facets, the SVG should contain exactly 30 `<rect>` elements (the heatmap cells). Query all `rect` elements within the SVG and assert the count equals `personas.length * Object.keys(feature_scores).length`.

### Test: Each cell has a fill color from interpolateRdYlGn

Query the rendered `<rect>` elements and verify that each has a `fill` attribute set to a non-empty string. The fill values should be valid CSS color strings (rgb format as returned by `interpolateRdYlGn`). Spot-check at least one cell: a score of 0.0 should produce a reddish color, a score of 1.0 should produce a greenish color.

### Test: Row labels show persona segment_labels

For each persona in the input data, assert that its `segment_label` text appears in the rendered output. Use `screen.getByText()` or `screen.getAllByText()` to verify all persona labels are present as SVG text elements.

### Test: Column labels show facet names

For each key in `feature_scores`, assert that the facet name string appears in the rendered output. All 6 facet names (e.g., "camera", "battery", "price", "design", "privacy", "ecosystem") should be visible.

### Test: Returns placeholder when feature_scores is empty

Render the FeatureHeatmap with `feature_scores = {}`. Assert that no `<svg>` element is rendered. Assert that a text element containing "No feature data" is visible instead.

### Test: Does not throw when wrapped in ErrorBoundary with empty data

Wrap FeatureHeatmap in an ErrorBoundary component. Pass `feature_scores = {}` (the component handles this gracefully with the guard). Verify it renders the placeholder text and the ErrorBoundary fallback is NOT triggered (since the guard prevents the throw).

### Test: Tooltip appears on hover

Simulate a `mouseEnter` event on one of the `<rect>` cells. Assert that a tooltip element becomes visible in the DOM containing the numeric score value. Simulate `mouseLeave` and assert the tooltip disappears or becomes hidden.

### Test stubs

```typescript
// apps/web/src/components/FeatureHeatmap.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureHeatmap } from './FeatureHeatmap';
import { ErrorBoundary } from './ErrorBoundary';
import { mockDashboardPayload } from '../lib/mockData';

describe('FeatureHeatmap', () => {
  const { personas, feature_scores } = mockDashboardPayload;

  it('renders an SVG element with valid data', () => {
    /** Render with personas and feature_scores, assert svg present */
  });

  it('renders correct number of rect cells (personas × facets)', () => {
    /** Assert rect count === personas.length * Object.keys(feature_scores).length */
  });

  it('each cell has a fill color from interpolateRdYlGn', () => {
    /** Query rects, verify fill attributes are non-empty color strings */
  });

  it('shows persona segment_labels as row labels', () => {
    /** For each persona, assert segment_label text is in the document */
  });

  it('shows facet names as column labels', () => {
    /** For each key in feature_scores, assert text is in the document */
  });

  it('renders placeholder when feature_scores is empty', () => {
    /** Pass feature_scores={}, assert "No feature data" visible, no svg */
  });

  it('does not trigger ErrorBoundary fallback with empty data', () => {
    /** Wrap in ErrorBoundary, pass empty feature_scores, assert no fallback shown */
  });

  it('shows tooltip on cell hover with exact score', () => {
    /** fireEvent.mouseEnter on a rect, assert tooltip visible with score value */
  });
});
```

## Implementation Details

### Component Props

The `FeatureHeatmap` component accepts these props:

- `feature_scores: Record<string, FeatureScoreRow>` -- keys are facet names, values contain `persona_scores: Record<string, number>` mapping persona IDs to their 0-1 score for that facet.
- `personas: PersonaSummary[]` -- the list of personas, used to extract `persona_id` and `segment_label` for row labels and color lookups.

### Empty Data Guard

Before any D3 logic runs, check `Object.keys(feature_scores).length === 0`. If empty, return a styled placeholder div with the text "No feature data". This prevents D3 scale functions from receiving empty domains, which would cause errors.

```typescript
if (Object.keys(feature_scores).length === 0) {
  return (
    <div className="rounded-xl bg-slate-800 p-6 text-slate-400 text-center">
      No feature data
    </div>
  );
}
```

### SVG Layout and Dimensions

Define layout constants for the SVG:

- `margin`: `{ top: 60, right: 20, bottom: 20, left: 140 }` -- left margin is wide to accommodate persona segment labels; top margin accommodates rotated or horizontal facet column labels.
- `cellSize`: Compute dynamically or use a reasonable default (e.g., 40px per cell). The total width and height derive from margin + (number of columns * cellSize) and margin + (number of rows * cellSize).

Use `useMemo` to derive the computed data (facet names array, persona IDs array, dimensions) so it does not recalculate on every render.

### D3 Scales

Import from `d3-scale` and `d3-scale-chromatic`:

- **`scaleBand`** for X-axis (facets/columns) and Y-axis (personas/rows). Domain is the array of facet names or persona IDs. Range spans from 0 to the inner width/height (after margins). Set `padding(0.05)` for slight gaps between cells.
- **`scaleSequential`** with `interpolateRdYlGn` for color mapping. Domain is `[0, 1]`. This maps 0 to red, 0.5 to yellow, 1 to green -- an intuitive "bad to good" color ramp.

```typescript
import { scaleBand, scaleSequential } from 'd3-scale';
import { interpolateRdYlGn } from 'd3-scale-chromatic';
```

### Rendering Cells

Iterate over each facet (column) and each persona (row). For each combination, look up the score from `feature_scores[facet].persona_scores[persona.persona_id]`. Default to 0 if the key is missing.

Render an SVG `<rect>` for each cell:
- `x` from the facet band scale
- `y` from the persona band scale
- `width` and `height` from `bandScale.bandwidth()`
- `fill` from `colorScale(score)`
- `rx="2"` for slightly rounded corners
- Attach `onMouseEnter` and `onMouseLeave` handlers for the tooltip

### Row and Column Labels

- **Row labels (personas):** Render `<text>` elements positioned to the left of the first column. Y-coordinate centered within the band. Use `segment_label` as the display text. Style with `fill="white"` and `fontSize={12}`.
- **Column labels (facets):** Render `<text>` elements positioned above the first row. X-coordinate centered within the band. Optionally rotate 45 degrees if labels are long. Style similarly.

### Tooltip

Manage tooltip state with `useState`:

```typescript
const [tooltip, setTooltip] = useState<{
  x: number;
  y: number;
  score: number;
  facet: string;
  persona: string;
} | null>(null);
```

On `mouseEnter` of a cell `<rect>`, set the tooltip state with the cell's position (computed from mouse event or from the scale positions plus an offset) and the score value. On `mouseLeave`, set tooltip to `null`.

Render the tooltip as an absolutely positioned `<div>` overlay (not inside the SVG) showing:
- The facet name and persona name
- The exact score formatted to two decimal places
- Styled with `bg-slate-900 text-white rounded px-2 py-1 text-sm shadow-lg pointer-events-none`

The component's root must be a `relative` positioned container so the tooltip `absolute` positioning works correctly.

### Wrapper Structure

The entire component is wrapped in an outer `<div>` with:
- `className="rounded-xl bg-slate-800 p-6 shadow-lg"`
- A heading like "Feature Scores" (optional, can be added by the dashboard layout)
- `position: relative` for tooltip positioning

Inside that, the `<svg>` element with computed width and height, containing a `<g>` group translated by the margins.

### ErrorBoundary Wrapping

The FeatureHeatmap should be wrapped in an `ErrorBoundary` when used in `ProjectDashboard.tsx` (Section 12). The component itself does NOT internally wrap in ErrorBoundary -- the parent is responsible. The empty-data guard inside the component prevents the most common error case.

### Memoization

Use `useMemo` to memoize:
- The list of facet names (`Object.keys(feature_scores)`)
- The X and Y scales
- The color scale
- The flattened cell data array (array of `{ facet, personaId, segmentLabel, score, x, y, width, height, color }`)

This avoids recalculating D3 scales on every render. Only recalculate when `feature_scores` or `personas` change.

### Accessibility

Add `role="img"` and an `aria-label` to the SVG element describing the heatmap (e.g., "Feature score heatmap showing persona ratings across facets"). Each cell rect should have a `<title>` child element as a basic tooltip fallback for screen readers, even though the visual tooltip is a positioned div.

### Component Signature

```typescript
// apps/web/src/components/FeatureHeatmap.tsx

interface FeatureHeatmapProps {
  feature_scores: Record<string, FeatureScoreRow>;
  personas: PersonaSummary[];
}

export function FeatureHeatmap({ feature_scores, personas }: FeatureHeatmapProps): JSX.Element {
  /** 
   * Custom D3 SVG heatmap.
   * - Guard: early return on empty feature_scores
   * - scaleBand for row/column layout
   * - scaleSequential + interpolateRdYlGn for cell color
   * - Tooltip on hover as positioned div overlay
   */
}
```

## Integration Point

In `ProjectDashboard.tsx` (Section 12), the FeatureHeatmap is placed in Row 3 of the grid, occupying one half-width column:

```tsx
<ErrorBoundary>
  <FeatureHeatmap
    feature_scores={data.feature_scores}
    personas={data.personas}
  />
</ErrorBoundary>
```

The `data` object comes from the `useDashboard` hook and is of type `DashboardPayload`.

## Key Data Shape Reference

For implementing without referencing other sections, here is the relevant data shape:

```typescript
interface FeatureScoreRow {
  mean: number;
  min: number;
  max: number;
  std: number;
  persona_scores: Record<string, number>; // persona_id -> score (0-1)
}

interface PersonaSummary {
  persona_id: string;
  segment_label: string;
  adoption_likelihood: number; // 0-100
  feature_priorities: ScoredLabel[];
  strongest_positive: string;
  strongest_concern: string;
}

// feature_scores is Record<string, FeatureScoreRow>
// Keys are facet names like "camera", "battery", "price", etc.
```

## Fallback Strategy

If the custom D3 heatmap proves too time-consuming during implementation, the plan notes a fallback: replace the SVG heatmap with a styled HTML table where each `<td>` uses inline `background-color` set via `interpolateRdYlGn`. This achieves the same visual effect with far less code but loses the tooltip and fine layout control. The tests for cell count and color mapping would need minor adjustments (query `td` elements instead of `rect` elements).