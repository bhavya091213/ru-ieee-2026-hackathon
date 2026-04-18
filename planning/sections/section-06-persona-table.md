Now I have all the context needed to write the section. Let me produce the content.

# Section 06: PersonaTable and RoundComparison Components

## Overview

This section builds two tightly coupled components:

1. **PersonaTable** -- A sortable table displaying all personas from the `DashboardPayload`, with expandable rows that reveal detailed per-persona information.
2. **RoundComparison** -- A side-by-side comparison of Round 1 and Round 2 responses for a given persona, rendered inside the expanded row of PersonaTable.

Both components are P0 (core dashboard). They render inside `ProjectDashboard.tsx` in the grid layout, occupying half-width at the `xl` breakpoint (Row 4, left column).

## Dependencies

- **section-01-scaffold**: Vite + React + TypeScript project must exist with Tailwind configured, Recharts installed, Vitest + React Testing Library available.
- **section-02-types-mock**: `types.ts` (especially `PersonaSummary`, `PersonaResponse`, `DashboardPayload`, `FeatureScoreRow`), `mockData.ts` (5 personas, round1/round2 responses), and `colors.ts` (`getPersonaColor`) must be implemented.
- **section-03-api-hooks**: `useDashboard` hook must be available to supply the `DashboardPayload` to the dashboard page, though PersonaTable itself receives data as props.

## File Paths

All files live under the `apps/web/src/` directory:

| File | Purpose |
|------|---------|
| `apps/web/src/components/PersonaTable.tsx` | Main persona table component |
| `apps/web/src/components/PersonaTable.test.tsx` | Tests for PersonaTable |
| `apps/web/src/components/RoundComparison.tsx` | Round 1 vs Round 2 comparison cards |
| `apps/web/src/components/RoundComparison.test.tsx` | Tests for RoundComparison |

## Key Type Definitions (from section-02)

These types are defined in `apps/web/src/lib/types.ts`. You do not create them here; they are listed for reference so you understand the data shapes PersonaTable and RoundComparison consume.

**PersonaSummary** -- one entry per persona in `DashboardPayload.personas`:
- `persona_id: string`
- `segment_label: string`
- `adoption_likelihood: number` (0-100 scale)
- `feature_priorities: Array<{ label: string; score: number }>`
- `strongest_positive: string`
- `strongest_concern: string`

**PersonaResponse** -- one entry per persona per round, found in `DashboardPayload.round1_responses` and `DashboardPayload.round2_responses`:
- `persona_id: string`
- `overall_reaction: string`
- `adoption_likelihood_0_100: number` (NOTE: this is a different field name than `PersonaSummary.adoption_likelihood`)
- `feature_scores: Record<string, number>`
- `strongest_positive: string`
- `strongest_concern: string`
- `cited_chunk_ids: string[]`

**Critical field name distinction:** `PersonaSummary` uses `adoption_likelihood`. `PersonaResponse` uses `adoption_likelihood_0_100`. RoundComparison must use `adoption_likelihood_0_100` when reading from round responses. Getting this wrong will render `undefined` values.

## Tests First

### PersonaTable.test.tsx

Located at `apps/web/src/components/PersonaTable.test.tsx`.

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PersonaTable from './PersonaTable';
// Import mock data and types from section-02
// import { mockDashboardPayload } from '../lib/mockData';
// import type { PersonaSummary, PersonaResponse } from '../lib/types';

describe('PersonaTable', () => {
  // Setup: extract personas, round1_responses, round2_responses from mockDashboardPayload
  // Pass them as props to PersonaTable

  it('renders a row for each persona in the payload', () => {
    // Render PersonaTable with 5 mock personas
    // Expect 5 rows visible (by segment_label text)
  });

  it('each row shows segment_label, adoption_likelihood bar, strongest_positive, strongest_concern', () => {
    // For each persona, verify segment_label text is present
    // Verify adoption_likelihood is rendered as a percentage (e.g., "72%")
    // Verify strongest_positive text appears (possibly truncated)
    // Verify strongest_concern text appears (possibly truncated)
  });

  it('clicking adoption likelihood header sorts personas descending', () => {
    // Click the "Adoption Likelihood" column header
    // Verify personas are now ordered from highest to lowest adoption_likelihood
  });

  it('clicking again sorts ascending', () => {
    // Click header once (descending), click again (ascending)
    // Verify order is now lowest to highest
  });

  it('clicking a row expands it to show feature_priorities and round comparison', () => {
    // Click on first persona row
    // Expect expanded content to become visible
    // Verify feature_priorities bar chart or labels appear
    // Verify RoundComparison content appears (e.g., "Round 1", "Round 2" text)
  });

  it('clicking expanded row collapses it', () => {
    // Click to expand, then click again
    // Expanded content should no longer be visible
  });

  it('renders empty state when personas array is empty', () => {
    // Render with personas=[]
    // Expect "No data available" or similar placeholder text
  });
});
```

### RoundComparison.test.tsx

Located at `apps/web/src/components/RoundComparison.test.tsx`.

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoundComparison from './RoundComparison';
// import type { PersonaResponse } from '../lib/types';

describe('RoundComparison', () => {
  // Setup: create mock round1 and round2 PersonaResponse objects
  // with known adoption_likelihood_0_100 values

  it('renders Round 1 card and Round 2 card side by side', () => {
    // Verify "Round 1" and "Round 2" headings are present
  });

  it('shows correct adoption_likelihood_0_100 from PersonaResponse (not adoption_likelihood)', () => {
    // Provide round1 with adoption_likelihood_0_100 = 55
    // Provide round2 with adoption_likelihood_0_100 = 72
    // Verify "55" and "72" (or "55%" and "72%") appear in the rendered output
    // This test catches the bug of accidentally using the wrong field name
  });

  it('shows delta indicator (arrow up/green for increase, arrow down/red for decrease)', () => {
    // round1: 55, round2: 72 => delta = +17, should show up arrow
    // Verify the delta text/arrow is present and indicates increase
  });

  it('handles missing round2 response gracefully (shows "No Round 2 data")', () => {
    // Render with round1 provided but round2 = undefined/null
    // Verify "No Round 2 data" text appears
    // Verify no crash
  });
});
```

## Implementation Details

### PersonaTable Component

**File:** `apps/web/src/components/PersonaTable.tsx`

**Props interface:**

```typescript
interface PersonaTableProps {
  personas: PersonaSummary[];
  round1Responses: PersonaResponse[];
  round2Responses: PersonaResponse[];
}
```

**State:**
- `sortDirection: 'asc' | 'desc' | null` -- local state toggled by clicking the Adoption Likelihood header. Default is `null` (unsorted, original order).
- `expandedPersonaId: string | null` -- tracks which row is expanded. Only one row expanded at a time.

**Sorting logic:**
- First click on header sets `sortDirection` to `'desc'` (highest first, most interesting for demo).
- Second click flips to `'asc'`.
- Third click returns to `null` (original order), or optionally just toggles between desc/asc.
- Sort the `personas` array by `adoption_likelihood` using `Array.from(personas).sort(...)` (never mutate the original array).

**Table structure:**

The table uses standard HTML `<table>` elements styled with Tailwind:
- Container: `rounded-xl bg-slate-800 shadow-lg overflow-hidden`
- Table: `w-full text-left`
- `<thead>`: `bg-slate-700/50 text-slate-300 text-sm uppercase tracking-wider`
- `<tbody>`: rows with `hover:bg-slate-700/30 cursor-pointer transition-colors`
- Each `<tr>` gets an `onClick` handler that toggles `expandedPersonaId`

**Columns:**
1. **Color dot**: A small `<span>` with `inline-block w-3 h-3 rounded-full` and `backgroundColor` set via inline style from `getPersonaColor(persona.persona_id)`.
2. **Segment Label**: `persona.segment_label` as text.
3. **Adoption Likelihood**: A horizontal progress bar. Outer container: `bg-slate-600 rounded-full h-2 w-24 inline-block`. Inner bar: `bg-emerald-500 h-full rounded-full` with `width` set as percentage (`${persona.adoption_likelihood}%`). Next to the bar, show the numeric percentage as text (e.g., `72%`).
4. **Top Positive**: `persona.strongest_positive`, truncated with `truncate max-w-[200px]`.
5. **Top Concern**: `persona.strongest_concern`, truncated with `truncate max-w-[200px]`.

**Expanded row:**

When `expandedPersonaId === persona.persona_id`, render an additional `<tr>` below the persona's row containing a single `<td colSpan={5}>` with:

1. **Feature Priorities mini bar chart**: A small Recharts `<BarChart>` (width ~300, height ~120) rendering `persona.feature_priorities` as horizontal bars. Each bar shows the label and score. Use `layout="vertical"` so labels appear on the Y-axis. Keep it minimal -- no legend, simple fill color matching the persona's assigned color.

2. **RoundComparison component**: Pass the matching round1 and round2 responses for this persona. Find them by filtering `round1Responses.find(r => r.persona_id === persona.persona_id)` and similarly for round2.

The expanded section uses `animate-fade-in` (from the Tailwind @theme keyframes defined in section-01) and `p-4 bg-slate-800/50` for visual distinction.

**Empty state:**

If `personas.length === 0`, render a placeholder card: `rounded-xl bg-slate-800 p-8 text-center text-slate-400` with text "No persona data available".

### RoundComparison Component

**File:** `apps/web/src/components/RoundComparison.tsx`

**Props interface:**

```typescript
interface RoundComparisonProps {
  round1: PersonaResponse | undefined;
  round2: PersonaResponse | undefined;
}
```

**Layout:**

A flex row (`flex gap-4`) containing two cards side by side.

**Round 1 card:**
- Header: "Round 1" in `text-sm font-semibold text-slate-400 uppercase`
- `overall_reaction`: the persona's overall take, displayed as body text
- `adoption_likelihood_0_100`: displayed as a badge (e.g., `rounded-full px-3 py-1 bg-blue-500/20 text-blue-300 text-sm font-bold`)
- `strongest_positive`: short label
- `strongest_concern`: short label
- Card styling: `flex-1 rounded-lg bg-slate-700/50 p-4`

**Round 2 card:**
- Same structure as Round 1
- If `round2` is `undefined`, render a placeholder card: `flex-1 rounded-lg bg-slate-700/50 p-4` with centered text "No Round 2 data" in `text-slate-500`.

**Delta indicator:**

Displayed on the Round 2 card (or between the two cards). Compute delta:

```
const delta = (round2?.adoption_likelihood_0_100 ?? 0) - (round1?.adoption_likelihood_0_100 ?? 0);
```

- If `delta > 0`: show an up arrow (Unicode `\u2191` or an SVG chevron) in green (`text-emerald-400`) with `+{delta}` text.
- If `delta < 0`: show a down arrow (`\u2193`) in red (`text-red-400`) with `{delta}` text (already negative).
- If `delta === 0`: show a horizontal dash in slate (`text-slate-400`) with `0` or "No change".
- Only show the delta if both `round1` and `round2` are defined.

**Critical implementation note:** Always read `adoption_likelihood_0_100` from `PersonaResponse`, never `adoption_likelihood`. The latter only exists on `PersonaSummary` and will be `undefined` on response objects.

## Defensive Rendering Checklist

- Guard `personas` array: if empty or undefined, show empty state.
- Guard `feature_priorities`: if empty array, skip the mini bar chart or show "No priorities data".
- Guard round responses: `find()` may return `undefined` if a persona has no matching round response. RoundComparison already handles `undefined` for both round1 and round2.
- Truncate long text in positive/concern columns to prevent layout breakage.
- Never mutate the `personas` prop array -- always create a sorted copy.

## Styling Reference

All components use the dark theme established in section-01 (dark class on `<html>`, Tailwind dark mode via custom variant). Key color tokens:

- Card background: `bg-slate-800`
- Table header background: `bg-slate-700/50`
- Hover state: `bg-slate-700/30`
- Primary text: `text-slate-100`
- Secondary text: `text-slate-400`
- Positive accent: `text-emerald-400` / `bg-emerald-500`
- Negative accent: `text-red-400` / `bg-red-500`
- Persona colors: from `getPersonaColor()` in `colors.ts`

## Integration with Dashboard Layout

PersonaTable is rendered in `ProjectDashboard.tsx` (built in section-04) at Row 4, left column of the 2-column grid. It receives its data from the `DashboardPayload` provided by `useDashboard()`:

```typescript
<PersonaTable
  personas={data.personas}
  round1Responses={data.round1_responses}
  round2Responses={data.round2_responses}
/>
```

The component occupies one grid cell at `xl` breakpoint (half width) and full width on smaller screens. No special grid classes are needed on PersonaTable itself -- the parent grid handles positioning.