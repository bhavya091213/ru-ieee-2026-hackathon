No existing source code yet. I have all the context I need. Let me now produce the section content.

# Section 5: KPI Status Cards and StatusBar

## Overview

This section builds two P0 components for the PanelForge dashboard:

1. **KPICards** -- Three metric cards (consensus, disagreement, evidence coverage) displayed in a 3-column grid with color-coded thresholds and count-up animation.
2. **StatusBar** -- An indeterminate loading bar shown during API calls (ingesting, simulating) with a stage label, hidden when idle or ready.

These components are placed at the top of the ProjectDashboard page. KPICards spans the full width of the dashboard grid (`col-span-full`) and StatusBar is rendered above the dashboard grid when active.

## Dependencies

- **Section 02 (types-mock):** Provides `DashboardPayload` type (which contains `consensus_score`, `disagreement_score`, `evidence_coverage` fields) and `mockData.ts` for testing.
- **Section 03 (api-hooks):** Provides `useProject` hook (which supplies `status` and `progress` for StatusBar) and `useDashboard` hook (which supplies the `DashboardPayload` data for KPICards).

These sections must be completed before this one. This section does not depend on any other section-04+ components.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/components/KPICards.tsx` | Three metric cards component |
| `apps/web/src/components/KPICards.test.tsx` | Tests for KPICards |
| `apps/web/src/components/StatusBar.tsx` | Loading indicator component |
| `apps/web/src/components/StatusBar.test.tsx` | Tests for StatusBar |

## Tests First

All tests use **Vitest** with **React Testing Library**. Test files are colocated with source files.

### KPICards.test.tsx

Location: `apps/web/src/components/KPICards.test.tsx`

The following test cases must be implemented:

1. **Renders three cards** -- The component renders exactly three card elements (consensus, disagreement, coverage).

2. **Displays correct percentage values** -- Each score is multiplied by 100 and rendered as a percentage. For example, a `consensus_score` of `0.61` renders as `61%` (or `61` with a `%` label).

3. **Consensus card is green when score > 0.7** -- Pass `consensus_score: 0.85`. The consensus card should have a green color indicator (e.g., `text-green-400` or a green-colored element).

4. **Consensus card is amber when score between 0.4 and 0.7** -- Pass `consensus_score: 0.55`. The card should use an amber/yellow color.

5. **Consensus card is red when score < 0.4** -- Pass `consensus_score: 0.25`. The card should use a red color.

6. **Disagreement card uses inverted colors** -- Disagreement is "bad" when high. Pass `disagreement_score: 0.85`. The disagreement card should be red (not green). Pass `disagreement_score: 0.25` and it should be green.

7. **Handles score of 0 without error** -- Pass all scores as `0`. Component renders without throwing. Values display as `0%`.

8. **Handles score of 1 without error** -- Pass all scores as `1`. Component renders without throwing. Values display as `100%`.

The test file should import and render `<KPICards>` with props for the three score values. Use `screen.getByText` or `screen.getByTestId` to locate specific cards and verify their text content and applied CSS classes.

For the count-up animation: tests should either mock `requestAnimationFrame` to run synchronously or use `waitFor` to assert the final rendered value. The animation should only occur on first mount (tracked via a ref), so re-renders with the same data should not re-trigger animation.

### StatusBar.test.tsx

Location: `apps/web/src/components/StatusBar.test.tsx`

The following test cases must be implemented:

1. **Renders progress bar when status is 'ingesting'** -- Pass `status="ingesting"` and `stage="Ingesting sources..."`. The component renders a visible progress bar element.

2. **Renders progress bar when status is 'simulating'** -- Pass `status="simulating"` and `stage="Running simulation..."`. The progress bar is visible.

3. **Hidden when status is 'idle'** -- Pass `status="idle"`. The component renders nothing (or a hidden element). Use `queryByRole('progressbar')` to confirm absence.

4. **Hidden when status is 'ready'** -- Pass `status="ready"`. Same as idle -- no visible output.

5. **Shows correct stage label text** -- Pass `stage="Ingesting sources..."`. The text "Ingesting sources..." appears in the rendered output.

## Implementation Details

### KPICards Component

**File:** `apps/web/src/components/KPICards.tsx`

**Props interface:**

```typescript
interface KPICardsProps {
  consensus_score: number;   // 0 to 1
  disagreement_score: number; // 0 to 1
  evidence_coverage: number;  // 0 to 1
}
```

**Behavior:**

- Renders a `div` with `grid grid-cols-3 gap-6` containing three card elements.
- Each card uses: `rounded-xl bg-slate-800 p-6 shadow-lg` styling.
- Each card displays:
  - A large number (`text-4xl font-bold`) showing the score as a percentage (score * 100, rounded to nearest integer).
  - A small label (`text-sm text-slate-400`) underneath: "Consensus", "Disagreement", or "Evidence Coverage".

**Color logic:**

Define a helper function to determine the color class based on score and whether the metric is "inverted":

- For **consensus** and **evidence_coverage** (normal):
  - Score > 0.7 -> green (`text-green-400`)
  - Score 0.4 to 0.7 -> amber (`text-amber-400`)
  - Score < 0.4 -> red (`text-red-400`)

- For **disagreement** (inverted -- high disagreement is bad):
  - Score > 0.7 -> red (`text-red-400`)
  - Score 0.4 to 0.7 -> amber (`text-amber-400`)
  - Score < 0.4 -> green (`text-green-400`)

The threshold comparisons should be strict: `> 0.7` for green, `< 0.4` for red, and everything else (0.4 to 0.7 inclusive of boundaries) for amber. Be consistent about boundary handling -- scores of exactly 0.4 and 0.7 should be amber.

**Count-up animation:**

- On first mount only, animate the displayed number from 0 to the target value over approximately 600ms using `requestAnimationFrame`.
- Use a `useRef` boolean to track whether the animation has already run. After the first animation completes, set the ref to `true` so subsequent re-renders display the value immediately without re-animating.
- The animation should use easing (e.g., ease-out) for a polished feel. A simple approach: use elapsed time / duration ratio, apply an easing function like `1 - Math.pow(1 - t, 3)` (cubic ease-out), multiply by target value, and round.
- Edge case: if the component unmounts during animation, clean up the animation frame to avoid memory leaks.

**Data-testid attributes:** Add `data-testid` attributes to each card for reliable test targeting: `kpi-consensus`, `kpi-disagreement`, `kpi-coverage`.

### StatusBar Component

**File:** `apps/web/src/components/StatusBar.tsx`

**Props interface:**

```typescript
interface StatusBarProps {
  status: 'idle' | 'creating' | 'ingesting' | 'simulating' | 'ready' | 'error';
  stage?: string;  // e.g., "Ingesting sources...", "Running simulation..."
}
```

**Behavior:**

- If `status` is `'idle'` or `'ready'`, render nothing (return `null`).
- For any active status (`'creating'`, `'ingesting'`, `'simulating'`), render:
  - A container div with appropriate styling.
  - An indeterminate progress bar: a `div` with `role="progressbar"` containing an inner div that animates left-to-right using a CSS animation (e.g., a sliding gradient or a pulsing bar). Use Tailwind's `animate-pulse` or a custom `@keyframes` for the indeterminate effect.
  - A text label showing the `stage` string (or a default like "Loading..." if `stage` is not provided).
- For `'error'` status, either render nothing or optionally show an error state (not required for this section -- error display is handled elsewhere).

**Styling:**

- Container: `w-full` with a small vertical footprint (e.g., `py-2 px-6`).
- Progress bar track: `h-1 w-full bg-slate-700 rounded-full overflow-hidden`.
- Progress bar fill: `h-full bg-blue-500 rounded-full` with an indeterminate animation (a `@keyframes` that translates/scales a portion of the bar back and forth).
- Stage label: `text-sm text-slate-400 mt-1`.

**Indeterminate animation approach:** Use a CSS keyframe animation where the inner bar element starts narrow (e.g., `width: 30%`) and translates from `-30%` to `100%` over approximately 1.5 seconds in an infinite loop. This creates the familiar indeterminate progress bar effect. Define this animation either in `app.css` inside the `@theme` block or as an inline style with a `@keyframes` rule.

## Integration Notes

When `ProjectDashboard.tsx` is assembled (Section 12), these components are placed as follows:

- **StatusBar** is rendered conditionally above the main dashboard grid, receiving `status` and `progress.stage` from the `useProject` hook.
- **KPICards** is rendered as the first item in the dashboard grid with `col-span-full`, receiving `consensus_score`, `disagreement_score`, and `evidence_coverage` from the `DashboardPayload` returned by `useDashboard`.

Example usage (for context only -- the actual page assembly happens in Section 12):

```typescript
// In ProjectDashboard.tsx
<StatusBar status={project.status} stage={project.progress.stage} />
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
  <div className="col-span-full">
    <KPICards
      consensus_score={data.consensus_score}
      disagreement_score={data.disagreement_score}
      evidence_coverage={data.evidence_coverage}
    />
  </div>
  {/* ... other components ... */}
</div>
```

## Checklist

- [ ] Write `KPICards.test.tsx` with all 8 test cases (run tests, confirm they fail)
- [ ] Implement `KPICards.tsx` with color thresholds, percentage display, and count-up animation
- [ ] Run tests, confirm all KPICards tests pass
- [ ] Write `StatusBar.test.tsx` with all 5 test cases (run tests, confirm they fail)
- [ ] Implement `StatusBar.tsx` with indeterminate progress bar and stage label
- [ ] Run tests, confirm all StatusBar tests pass
- [ ] Verify edge cases: scores of 0 and 1, missing stage text, rapid status transitions
- [ ] Verify animation cleanup on unmount (no memory leaks from `requestAnimationFrame`)