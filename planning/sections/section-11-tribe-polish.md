Now I have all the context I need. Let me produce the section content.

# Section 11: TribePanel and Visual Polish

## Overview

This section covers two related deliverables:

1. **TribePanel component** (P2 stretch) -- a conditionally rendered card showing TRIBE cortical-response metrics with a sparkline and prominent caveat text.
2. **Visual polish pass** -- adding entrance animations, hover effects, and verifying responsive layout across breakpoints with no console errors.

**Priority tier:** P2 (stretch). Build only after all P0 and P1 components are complete.

**Depends on:** section-02-types-mock (for `TribeResult` type and mock data, `colors.ts`)

**Blocks:** section-12-integration (final integration testing)

---

## Background and Context

PanelForge is a synthetic focus group simulator. The TRIBE system provides an experimental cortical-response signal with three metrics: `response_strength`, `response_variance`, and `response_spread`. Because this is an exploratory, non-validated metric, the UI must display a prominent amber caveat warning users not to treat it as a validated product metric.

The `DashboardPayload` includes a `tribe` field of type `TribeResult | null`. The TribePanel must handle all three states:
- `tribe` is `null` -- component is not rendered at all
- `tribe.enabled` is `false` -- component is not rendered
- `tribe` is present and enabled -- render metrics, sparkline, and caveat

### TribeResult Type (from types.ts)

```typescript
interface TribeResult {
  enabled: boolean;
  response_strength: number;
  response_variance: number;
  response_spread: number;
  scored_text: string;
}
```

This type is defined in section-02-types-mock. The mock data should include a `TribeResult` object for testing the visible state, and the dashboard should be tested with `tribe: null` as well.

---

## Tests First

All test files live alongside their source files. The testing framework is Vitest with React Testing Library and jsdom environment.

### File: `apps/web/src/components/TribePanel.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TribePanel } from './TribePanel';

describe('TribePanel', () => {
  const mockTribe = {
    enabled: true,
    response_strength: 0.72,
    response_variance: 0.15,
    response_spread: 0.48,
    scored_text: 'Sample scored text for tribe analysis',
  };

  it('is hidden when tribe is null', () => {
    /** Render TribePanel with tribe=null, assert nothing renders (container is empty). */
  });

  it('is hidden when tribe.enabled is false', () => {
    /** Render TribePanel with tribe={...mockTribe, enabled: false}, assert nothing renders. */
  });

  it('is visible when tribe is not null and enabled is true', () => {
    /** Render TribePanel with mockTribe, assert container has content. */
  });

  it('shows response_strength, response_variance, response_spread', () => {
    /** Render TribePanel with mockTribe. Assert all three metric values are displayed as text. */
  });

  it('shows caveat text about exploratory signal', () => {
    /**
     * Render TribePanel with mockTribe.
     * Assert text matching "Exploratory cortical-response signal" (or similar) is present.
     * Assert the caveat text is styled with amber color (check for a class containing 'amber').
     */
  });

  it('renders a sparkline chart element', () => {
    /**
     * Render TribePanel with mockTribe.
     * Assert a Recharts LineChart (or its SVG container) is present in the DOM.
     * The sparkline is decorative (120x40, no axes).
     */
  });
});
```

### File: `apps/web/src/components/VisualPolish.test.tsx`

These tests verify the visual polish additions across the dashboard.

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Visual Polish', () => {
  it('dashboard cards have animate-fade-in class', () => {
    /**
     * Render ProjectDashboard with mock data.
     * Query card-level containers and assert they include 'animate-fade-in' in classList.
     */
  });

  it('interactive cards have transition-shadow hover classes', () => {
    /**
     * Render a card component (e.g., KPICards or QuoteWall card).
     * Assert it includes 'transition-shadow' and 'hover:shadow-xl' classes.
     */
  });

  it('layout is responsive at xl breakpoint (1280px)', () => {
    /**
     * Render ProjectDashboard.
     * Assert the outer grid container has classes 'grid-cols-1' and 'xl:grid-cols-2'.
     * This is a class-presence check, not a visual regression test.
     */
  });

  it('no console errors during full dashboard render', () => {
    /**
     * Spy on console.error before render.
     * Render ProjectDashboard with full mock data.
     * Assert console.error was not called.
     * Restore console.error after test.
     */
  });
});
```

---

## Implementation Details

### TribePanel Component

**File to create:** `apps/web/src/components/TribePanel.tsx`

The TribePanel is a self-contained card component that receives a `TribeResult | null` prop.

**Conditional rendering logic:**
- If `tribe` is `null` or `tribe.enabled` is `false`, return `null` (render nothing).
- Otherwise, render the full panel.

**Component structure:**

1. **Card container:** `rounded-xl bg-slate-800 p-6 shadow-lg` (consistent with all other dashboard cards). Add `animate-fade-in` for entrance animation.

2. **Title:** "TRIBE Signal" or similar heading, styled `text-lg font-semibold text-slate-200`.

3. **Three mini metric cards** arranged in a row (flex or grid-cols-3):
   - Each shows the metric label (e.g., "Strength", "Variance", "Spread") in small muted text
   - The numeric value displayed prominently (e.g., `text-2xl font-bold`)
   - Values displayed as-is (they are already 0-1 scale numbers)

4. **Sparkline:** A small Recharts `LineChart` component:
   - Dimensions: `width={120} height={40}`
   - No axes (`XAxis` and `YAxis` hidden or omitted)
   - No grid, no legend
   - `dot={false}` on the Line component
   - Since TRIBE returns single-point data, generate a short synthetic trend line for visual effect. Create a small array of 5-7 points slightly varying around `response_strength` to produce a believable sparkline.
   - Stroke color: `blue-400` or `slate-400`
   - Wrap in a `ResponsiveContainer` only if needed; fixed dimensions are fine for a sparkline.

5. **Caveat text:** Prominent amber-colored warning text:
   - Text: "Exploratory cortical-response signal. Not a validated product metric."
   - Styled with `text-amber-400 text-sm italic mt-4` or similar
   - Must be clearly visible and not easily overlooked

**Props interface:**

```typescript
interface TribePanelProps {
  tribe: TribeResult | null;
}
```

### Visual Polish Pass

These are modifications to existing components created in other sections. The implementer should add these classes/attributes across the codebase.

**Files to modify:**

- `apps/web/src/pages/ProjectDashboard.tsx` -- add `animate-fade-in` to each dashboard card wrapper
- `apps/web/src/components/KPICards.tsx` -- add `transition-shadow duration-200 hover:shadow-xl` to each KPI card
- `apps/web/src/components/QuoteWall.tsx` -- add `transition-shadow duration-200 hover:shadow-xl` to each quote card
- `apps/web/src/components/PersonaTable.tsx` -- add `transition-shadow duration-200 hover:shadow-xl` to expandable rows
- `apps/web/src/app.css` -- confirm the `@theme` block already defines the `fade-in` keyframes (done in section-01-scaffold):

```css
@theme {
  --animate-fade-in: fade-in 0.3s ease-out;
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
}
```

**Staggered animation:** For cards that appear together (like KPICards or the grid items in ProjectDashboard), consider adding incremental `animation-delay` via inline styles (e.g., `style={{ animationDelay: '0.1s' }}` for the second card, `0.2s` for the third). This creates a cascade effect. Use `animation-fill-mode: backwards` (Tailwind class: `fill-mode-backwards` or inline style) so cards remain invisible until their delay elapses.

**Responsive verification checklist (manual, not automated):**
- At 1280px (xl breakpoint): dashboard should show 2-column grid layout
- At 1920px: layout should still look good with wider columns, no excessively stretched content
- Below 1280px: everything stacks to single column (`grid-cols-1`)
- Text remains readable on dark backgrounds (sufficient contrast)
- No horizontal scrollbar at any reasonable viewport width

**Console error sweep:**
- Render the full dashboard with mock data
- Verify no React key warnings, no missing prop warnings, no unhandled promise rejections
- Verify no D3 or Recharts errors from empty data (all components should have empty-state guards from their respective sections)

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/components/TribePanel.tsx` | Create | TribePanel component with conditional rendering, mini metrics, sparkline, caveat |
| `apps/web/src/components/TribePanel.test.tsx` | Create | Tests for null/visible logic, metric display, caveat text, sparkline |
| `apps/web/src/components/VisualPolish.test.tsx` | Create | Tests for animation classes, hover effects, responsive classes, no console errors |
| `apps/web/src/pages/ProjectDashboard.tsx` | Modify | Add `animate-fade-in` to card wrappers |
| `apps/web/src/components/KPICards.tsx` | Modify | Add `transition-shadow duration-200 hover:shadow-xl` |
| `apps/web/src/components/QuoteWall.tsx` | Modify | Add `transition-shadow duration-200 hover:shadow-xl` |
| `apps/web/src/components/PersonaTable.tsx` | Modify | Add `transition-shadow duration-200 hover:shadow-xl` |
| `apps/web/src/app.css` | Verify | Confirm fade-in keyframes are defined in `@theme` block |

---

## Dependencies

- **section-02-types-mock:** Provides `TribeResult` type definition in `types.ts` and mock data in `mockData.ts`. The mock `DashboardPayload` must include a `tribe` field (either populated or null) for testing.
- **section-01-scaffold:** Provides `app.css` with `@theme` keyframe definitions for `animate-fade-in`.
- **All component sections (04-10):** The visual polish modifications apply to components built in those sections. Those components must exist before the polish classes can be added. However, the TribePanel itself can be built in isolation as long as the `TribeResult` type is available.

---

## Implementation Notes

1. The sparkline uses synthetic data points since TRIBE only returns single-value metrics. Generate the points deterministically from the metric values (e.g., add small +/- offsets) so the sparkline looks consistent across renders. Do not use `Math.random()` in the render path.

2. The `animate-fade-in` class uses the custom Tailwind v4 animation defined in `app.css` via `@theme`. In Tailwind v4, custom animations defined in `@theme` are automatically available as utility classes.

3. For the console error sweep test, use `vi.spyOn(console, 'error')` before rendering and assert it was not called. Remember to restore after the test with `mockRestore()`.

4. The TribePanel should be placed in Row 5 of the ProjectDashboard grid layout (alongside ScenarioEditor), occupying the right half at xl breakpoint. This placement is defined in section-12-integration's layout verification but the component itself is self-contained.