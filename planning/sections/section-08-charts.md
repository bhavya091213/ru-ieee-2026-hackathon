The project has no source code yet -- this is a greenfield implementation plan. Now I have all the context I need. Let me produce the section content.

# Section 08: Charts (ConsensusChart and DisagreementRadar)

## Overview

This section implements two Recharts-based chart components for the PanelForge dashboard:

1. **ConsensusChart** -- A horizontal stacked bar chart showing positive/neutral/negative sentiment proportions per facet, derived from `feature_scores`.
2. **DisagreementRadar** -- A radar chart showing standard deviation of persona scores per facet, highlighting areas of disagreement.

Both components live in `apps/web/src/components/` and must handle empty `feature_scores` gracefully by rendering a placeholder instead of crashing.

## Dependencies on Other Sections

- **section-01-scaffold**: Vite + React + TypeScript project, Recharts installed as a dependency, Vitest + React Testing Library configured.
- **section-02-types-mock**: `types.ts` (specifically `FeatureScoreRow` with `persona_scores: Record<string, number>`, `mean`, `std` fields), `mockData.ts` (the `feature_scores` object in `mockDashboardPayload`), and `colors.ts`.

No dependency on section-03 (API hooks) is required -- these components receive data as props.

## Key Data Structures

The components consume `feature_scores` from `DashboardPayload`. The shape is:

```typescript
// From types.ts (defined in section-02)
interface FeatureScoreRow {
  mean: number;
  min: number;
  max: number;
  std: number;
  persona_scores: Record<string, number>; // persona_id -> score (0-1)
}

// feature_scores on DashboardPayload:
// Record<string, FeatureScoreRow>
// Keys are facet names, e.g. "camera", "battery", "price", "design", "privacy", "ecosystem"
```

## File Paths

| File | Action |
|------|--------|
| `apps/web/src/components/ConsensusChart.tsx` | Create |
| `apps/web/src/components/ConsensusChart.test.tsx` | Create |
| `apps/web/src/components/DisagreementRadar.tsx` | Create |
| `apps/web/src/components/DisagreementRadar.test.tsx` | Create |

---

## Tests (Write First)

### ConsensusChart.test.tsx

Location: `apps/web/src/components/ConsensusChart.test.tsx`

This test file validates that ConsensusChart renders correctly and handles edge cases.

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsensusChart } from './ConsensusChart';
import type { FeatureScoreRow } from '../lib/types';

// Helper: build a minimal feature_scores fixture
function makeFeatureScores(): Record<string, FeatureScoreRow> {
  return {
    camera: {
      mean: 0.72, min: 0.4, max: 0.95, std: 0.18,
      persona_scores: { p1: 0.9, p2: 0.7, p3: 0.55, p4: 0.2, p5: 0.8 },
    },
    battery: {
      mean: 0.5, min: 0.1, max: 0.85, std: 0.25,
      persona_scores: { p1: 0.85, p2: 0.1, p3: 0.45, p4: 0.65, p5: 0.4 },
    },
  };
}

describe('ConsensusChart', () => {
  it('renders a Recharts BarChart');
  it('has one bar group per facet');
  it('stacked bars show positive/neutral/negative proportions');
  it('renders empty state when feature_scores is empty object');
});
```

**Test details:**

1. **"renders a Recharts BarChart"**: Render `<ConsensusChart featureScores={makeFeatureScores()} />`. Assert that an SVG element with a Recharts bar chart class is present in the document (Recharts renders SVG elements; query for the `svg` tag or a known Recharts role/class).

2. **"has one bar group per facet"**: Render with the two-facet fixture. Verify that the chart contains bar groups corresponding to "camera" and "battery". Since Recharts renders bars as `<rect>` elements, count the number of bar groups (each facet produces three stacked rects: positive, neutral, negative -- so 2 facets times 3 segments = 6 rects).

3. **"stacked bars show positive/neutral/negative proportions"**: Using the "camera" facet fixture (scores: 0.9, 0.7, 0.55, 0.2, 0.8), the expected proportions are: positive (>0.6) = 3/5 = 60%, neutral (0.3-0.6) = 1/5 = 20%, negative (<0.3) = 1/5 = 20%. Verify the transformed data passed to the chart has these proportions. This can be tested by extracting and unit-testing the data transformation function separately (see Implementation below).

4. **"renders empty state when feature_scores is empty object"**: Render `<ConsensusChart featureScores={{}} />`. Assert no SVG is rendered. Assert a placeholder text like "No feature data" is visible.

### DisagreementRadar.test.tsx

Location: `apps/web/src/components/DisagreementRadar.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisagreementRadar } from './DisagreementRadar';
import type { FeatureScoreRow } from '../lib/types';

function makeFeatureScores(): Record<string, FeatureScoreRow> {
  return {
    camera:  { mean: 0.72, min: 0.4, max: 0.95, std: 0.18, persona_scores: {} },
    battery: { mean: 0.5, min: 0.1, max: 0.85, std: 0.25, persona_scores: {} },
    price:   { mean: 0.35, min: 0.1, max: 0.6, std: 0.31, persona_scores: {} },
  };
}

describe('DisagreementRadar', () => {
  it('renders a Recharts RadarChart');
  it('has axes for each facet');
  it('values correspond to std from feature_scores');
  it('renders empty state when feature_scores is empty object');
});
```

**Test details:**

1. **"renders a Recharts RadarChart"**: Render `<DisagreementRadar featureScores={makeFeatureScores()} />`. Assert an SVG element is present (Recharts RadarChart renders as SVG).

2. **"has axes for each facet"**: Verify that the facet names ("camera", "battery", "price") appear as axis labels in the rendered output. Use `screen.getByText()` or query SVG text elements.

3. **"values correspond to std from feature_scores"**: Unit-test the data transformation function that converts `Record<string, FeatureScoreRow>` to the radar data format `{ facet: string; std: number }[]`. Verify the output array has entries `{ facet: 'camera', std: 0.18 }`, `{ facet: 'battery', std: 0.25 }`, `{ facet: 'price', std: 0.31 }`.

4. **"renders empty state when feature_scores is empty object"**: Render `<DisagreementRadar featureScores={{}} />`. Assert placeholder text like "No feature data" is shown and no SVG is rendered.

### Data Transformation Unit Tests

Both components need a data transformation step that should be tested independently. These can either live in the component test files or in a shared utility test.

For ConsensusChart, test the function (e.g., `computeConsensusData`) that converts `Record<string, FeatureScoreRow>` into `{ facet: string; positive: number; neutral: number; negative: number }[]`.

Thresholds:
- **Positive**: persona score > 0.6
- **Neutral**: persona score >= 0.3 and <= 0.6
- **Negative**: persona score < 0.3

Given camera scores `[0.9, 0.7, 0.55, 0.2, 0.8]`:
- positive = 3 (0.9, 0.7, 0.8) / 5 = 0.6
- neutral = 1 (0.55) / 5 = 0.2
- negative = 1 (0.2) / 5 = 0.2

For DisagreementRadar, test the function (e.g., `computeRadarData`) that maps facet keys to `{ facet: string; std: number }[]`.

---

## Implementation Details

### ConsensusChart.tsx

Location: `apps/web/src/components/ConsensusChart.tsx`

**Props interface:**
```typescript
interface ConsensusChartProps {
  featureScores: Record<string, FeatureScoreRow>;
}
```

**Data transformation function** (`computeConsensusData`): Export this as a named function so it can be unit-tested. For each facet in `featureScores`:
1. Get all values from `persona_scores` (the `Record<string, number>`).
2. Count how many are >0.6 (positive), between 0.3 and 0.6 inclusive (neutral), and <0.3 (negative).
3. Divide each count by total persona count to get proportions (0 to 1).
4. Return `{ facet, positive, neutral, negative }`.

**Component structure:**
- Guard: If `Object.keys(featureScores).length === 0`, render a placeholder `<div>` with text "No feature data" and return early.
- Use Recharts `ResponsiveContainer` wrapping a `BarChart` with `layout="vertical"`.
- `YAxis` with `dataKey="facet"` and `type="category"` -- displays facet names.
- `XAxis` with `type="number"` and `domain={[0, 1]}` -- shows proportion from 0 to 100%.
- Three `Bar` components stacked: `<Bar dataKey="positive" stackId="a" fill="#22c55e" />` (green-500), `<Bar dataKey="neutral" stackId="a" fill="#f59e0b" />` (amber-500), `<Bar dataKey="negative" stackId="a" fill="#ef4444" />` (red-500).
- Optional `Tooltip` and `Legend` for usability.
- Wrapped in a card container `<div className="rounded-xl bg-slate-800 p-6 shadow-lg">` with a heading.

**Important Recharts notes for vertical layout:**
- `layout="vertical"` makes bars horizontal.
- The `YAxis` becomes the category axis and `XAxis` becomes the value axis.
- Ensure `width` and `height` props are not set directly on `BarChart` when using `ResponsiveContainer`.

**ErrorBoundary wrapping**: The parent layout (ProjectDashboard.tsx, section-12) wraps this component in an ErrorBoundary. The component itself does not need to import ErrorBoundary, but it should handle the empty state gracefully to avoid throwing.

### DisagreementRadar.tsx

Location: `apps/web/src/components/DisagreementRadar.tsx`

**Props interface:**
```typescript
interface DisagreementRadarProps {
  featureScores: Record<string, FeatureScoreRow>;
}
```

**Data transformation function** (`computeRadarData`): Export as named function. For each facet key in `featureScores`, produce `{ facet: string; std: number }` using `featureScores[facet].std`.

**Component structure:**
- Guard: If `Object.keys(featureScores).length === 0`, render a placeholder `<div>` with text "No feature data" and return early.
- Use Recharts `ResponsiveContainer` wrapping a `RadarChart`.
- `PolarGrid` with `stroke="#334155"` (slate-700) for dark theme visibility.
- `PolarAngleAxis` with `dataKey="facet"` to label each axis with the facet name. Set `tick` fill color to a light color (e.g., `#cbd5e1`, slate-300) for readability on dark background.
- `PolarRadiusAxis` -- optionally hide or style minimally. Set `angle={30}` and a light tick color.
- `Radar` with `dataKey="std"`, `stroke="#3b82f6"` (blue-500), `fill="#3b82f6"`, `fillOpacity={0.3}`.
- Wrapped in a card container `<div className="rounded-xl bg-slate-800 p-6 shadow-lg">` with a heading like "Disagreement by Facet".

**Interpretation**: Higher `std` values indicate more disagreement among personas for that facet. The radar shape bulges outward on controversial facets and contracts on consensus facets.

---

## Styling Notes

Both components use the dark dashboard theme:
- Card wrapper: `rounded-xl bg-slate-800 p-6 shadow-lg`
- Text colors: `text-white` for headings, `text-slate-400` for secondary labels
- Chart backgrounds are transparent (the card background shows through)
- The explicit color values on chart elements (green-500, amber-500, red-500, blue-500, slate-700) ensure dark theme compatibility without relying on Recharts' default theme

## Empty State Handling

Both components must render a meaningful placeholder when `feature_scores` is an empty object `{}`. The placeholder should be:
- A centered `<div>` with `text-slate-500` text
- Text: "No feature data"
- Same card wrapper dimensions so the dashboard grid does not collapse

This avoids Recharts throwing errors when attempting to render charts with no data points, and ensures the dashboard layout remains stable regardless of data availability.

## Integration with Dashboard Layout

These two components are placed in Row 6 of the ProjectDashboard grid (defined in section-12-integration):

```
Row 6: [ConsensusChart - 1/2 width] [DisagreementRadar - 1/2 width]
```

They are rendered as direct children of the dashboard grid and each occupy one grid column at the `xl` breakpoint. Both should be wrapped in an `ErrorBoundary` at the layout level (not internally).

The components receive `featureScores` from `DashboardPayload.feature_scores` which is passed down from `useDashboard` in the parent page component.