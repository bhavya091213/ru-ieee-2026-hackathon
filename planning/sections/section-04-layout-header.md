Now I have comprehensive understanding of the section. Let me produce the content.

# Section 04: Layout, Header, and HomePage

## Overview

This section builds three key pieces of the application shell: the **ProjectDashboard.tsx** page layout (responsive grid), the **Header** component (title bar with project metadata and data source badge), and the **HomePage.tsx** with the **IngestForm** component (product name, seed URLs, hypotheses submission). Together, these define the two pages a user interacts with and the top-level layout structure of the dashboard.

## Dependencies

This section depends on:

- **section-01-scaffold**: Vite 8 + React 19 + TypeScript project setup, `App.tsx` routing, `ErrorBoundary.tsx`, `app.css` with Tailwind v4, `main.tsx` with dark class
- **section-02-types-mock**: `types.ts` (DashboardPayload, PersonaSummary, IngestStatus interfaces), `mockData.ts` (mock DashboardPayload), `colors.ts`
- **section-03-api-hooks**: `api.ts` (createProject, startIngest), `useProject` hook (project lifecycle state), `useDashboard` hook (data fetching with `dataSource: 'live' | 'mock'`)

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/pages/ProjectDashboard.tsx` | Dashboard page with responsive grid layout |
| `apps/web/src/pages/ProjectDashboard.test.tsx` | Tests for dashboard layout |
| `apps/web/src/components/Header.tsx` | Title bar with metadata and data source badge |
| `apps/web/src/components/Header.test.tsx` | Tests for Header |
| `apps/web/src/pages/HomePage.tsx` | IngestForm wrapper page with status handling |
| `apps/web/src/pages/HomePage.test.tsx` | Tests for HomePage |
| `apps/web/src/components/IngestForm.tsx` | Product name, seed URLs, hypotheses input form |
| `apps/web/src/components/IngestForm.test.tsx` | Tests for IngestForm |

---

## Tests (Write First)

All tests use **Vitest** with **React Testing Library**. Test files are colocated with their source files.

### Header.test.tsx

Location: `apps/web/src/components/Header.test.tsx`

Tests to implement:

1. **Renders "PanelForge" title** -- Render the Header with a mock DashboardPayload and verify that the text "PanelForge" appears in the document.

2. **Shows persona count and source count from payload** -- Pass a DashboardPayload with a known number of personas (e.g., 5) and a source count. Verify the rendered output includes the correct persona count and source count values.

3. **Shows "MOCK DATA" badge when dataSource is 'mock' and VITE_SHOW_DATA_SOURCE is true** -- Set `import.meta.env.VITE_SHOW_DATA_SOURCE` to `'true'` (Vite env vars are always strings), pass `dataSource='mock'` as a prop. Verify an element with text "MOCK DATA" is visible and has an amber-colored style/class.

4. **Shows "LIVE DATA" badge when dataSource is 'live' and VITE_SHOW_DATA_SOURCE is true** -- Same env setup, pass `dataSource='live'`. Verify an element with text "LIVE DATA" is visible and has a green-colored style/class.

5. **Hides data source badge when VITE_SHOW_DATA_SOURCE is not set** -- Do not set the env var (or set to falsy). Verify neither "MOCK DATA" nor "LIVE DATA" text appears in the document.

For mocking the Vite env var in tests, use `vi.stubEnv('VITE_SHOW_DATA_SOURCE', 'true')` or directly assign to `import.meta.env.VITE_SHOW_DATA_SOURCE` in the test setup, restoring in `afterEach`.

### IngestForm.test.tsx

Location: `apps/web/src/components/IngestForm.test.tsx`

Tests to implement:

1. **Renders product name input, seed URLs textarea, and submit button** -- Render the IngestForm and verify all three elements are present. Use accessible role queries (e.g., `getByRole('textbox')`, `getByRole('button')`), or label text queries.

2. **Submit button is disabled when required fields are empty** -- Render with no user input. Verify the submit button is disabled.

3. **Typing a hypothesis and pressing Enter creates a chip** -- Type text into the hypothesis input and press Enter. Verify a chip element appears with the entered text. Verify the input clears after chip creation.

4. **Clicking X on a hypothesis chip removes it** -- Add a chip, then click the remove button on it. Verify the chip is no longer in the document.

5. **Submitting the form calls onCreate with correct arguments** -- Fill in product name, paste seed URLs (newline-separated), add hypotheses chips. Click submit. Verify the `onCreate` callback prop was called with `(name: string, urls: string[], hypotheses: string[])` matching the entered data.

6. **Form shows validation error for empty product name on submit attempt** -- Attempt to submit with an empty product name. Verify an error message appears (e.g., "Product name is required").

### HomePage.test.tsx

Location: `apps/web/src/pages/HomePage.test.tsx`

Tests to implement:

1. **Renders IngestForm component** -- Mount HomePage and verify the IngestForm is present (check for form elements like the product name input).

2. **Passes create handler from useProject to IngestForm** -- Mock the `useProject` hook. Verify that when the form is submitted, `useProject().create` is called with the correct arguments.

3. **Shows StatusBar when project status is 'creating' or 'ingesting'** -- Mock useProject to return `status: 'creating'`. Verify a loading/status indicator is visible with appropriate stage text.

### ProjectDashboard.test.tsx

Location: `apps/web/src/pages/ProjectDashboard.test.tsx`

Tests to implement:

1. **All P0 components render within the dashboard** -- Mount ProjectDashboard with a mock DashboardPayload (via mocked `useDashboard` hook). Verify that Header, KPICards, PersonaTable, and QuoteWall components are present. Since other section components may not exist yet, use placeholder div stubs or conditionally check for their presence.

2. **Layout uses grid with gap-6** -- Verify the outer container element has the expected grid CSS classes (`grid`, `gap-6`).

3. **KPICards and Header span full width** -- Verify the wrapper elements for Header and KPICards have the `col-span-full` class.

4. **Components render without console errors** -- Use `vi.spyOn(console, 'error')` before mounting. Assert it was not called during render.

---

## Implementation Details

### Header Component

**File:** `apps/web/src/components/Header.tsx`

The Header is a simple presentational component. It receives the following props:

- `data: DashboardPayload` -- The full dashboard payload for extracting metadata
- `dataSource: 'live' | 'mock'` -- Which data source is active

**Layout:** A horizontal flex bar with dark background.

- **Left side:** "PanelForge" as the app title, styled prominently (e.g., `text-xl font-bold text-white`).
- **Right side:** A row of small metadata chips/badges showing:
  - Persona count: `data.personas.length` (e.g., "5 Personas")
  - Source count: Derived from available data. If `IngestStatus` is not directly on the payload, show the count from another field or display a static label.
  - Round count: Always "2 Rounds" (hardcoded, since we have round1 and round2).
  - TRIBE status: "TRIBE Active" if `data.tribe !== null && data.tribe.enabled`, else omit.
- **Data source badge (conditional):** Only rendered when `import.meta.env.VITE_SHOW_DATA_SOURCE === 'true'`. When visible:
  - If `dataSource === 'mock'`: Show a small badge with text "MOCK DATA", amber background (`bg-amber-500/20 text-amber-400` or similar).
  - If `dataSource === 'live'`: Show a small badge with text "LIVE DATA", green background (`bg-green-500/20 text-green-400` or similar).

**Styling:** `bg-slate-800 rounded-xl p-4 shadow-lg` on the outer container, matching the dark theme design system. Use `flex items-center justify-between` for the horizontal layout.

### IngestForm Component

**File:** `apps/web/src/components/IngestForm.tsx`

A form component for creating a new project. It manages its own local state for form fields.

**Props:**
- `onCreate: (name: string, urls: string[], hypotheses: string[]) => void` -- Called on form submission
- `disabled?: boolean` -- Disables all inputs and the submit button (used during loading states)

**State (local):**
- `name: string` -- Product name
- `urlsText: string` -- Raw textarea content for seed URLs (one per line)
- `hypotheses: string[]` -- Array of hypothesis strings (chip display)
- `hypothesisInput: string` -- Current text in the hypothesis input
- `error: string | null` -- Validation error message

**Form fields:**
1. **Product Name** -- `<input type="text">` with a label. Required field.
2. **Seed URLs** -- `<textarea>` where each line is a URL. Parse into array on submit by splitting on newlines and filtering empty strings.
3. **Hypotheses** -- A text input where pressing Enter (or clicking an "Add" button) adds the current text as a chip. Each chip displays the hypothesis text and an X button to remove it. The input clears after adding.
4. **Submit button** -- "Create Project" or "Start Focus Group". Disabled when `name` is empty or when `disabled` prop is true.

**Validation:** On submit, check that `name` is non-empty. If empty, set `error` to "Product name is required" and do not call `onCreate`. If valid, call `onCreate(name, parsedUrls, hypotheses)`.

**Styling:** Dark theme consistent cards. Input fields: `bg-slate-700 border-slate-600 text-white rounded-lg p-2`. Chips: `bg-blue-500/20 text-blue-300 rounded-full px-3 py-1 text-sm` with an X button. Submit button: `bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2`.

### HomePage

**File:** `apps/web/src/pages/HomePage.tsx`

A wrapper page that renders the IngestForm and handles project creation flow.

**Behavior:**
- Uses the `useProject` hook to get `create`, `status`, and `progress`.
- Renders the IngestForm, passing `useProject().create` as the `onCreate` handler and `disabled={status === 'creating' || status === 'ingesting'}`.
- When `status` is `'creating'` or `'ingesting'`, renders a StatusBar component (from section-05) beneath the form. If StatusBar is not yet implemented, render a simple loading indicator placeholder (e.g., a `<div>` with pulsing text showing the stage label from `progress.stage`).
- When `status` transitions to `'ready'`, the parent `App.tsx` should handle navigation to the dashboard page. HomePage itself does not navigate; it signals readiness through the hook state.

**Styling:** Center the form in the viewport with a max width constraint (`max-w-2xl mx-auto mt-12`). Include the PanelForge title/logo above the form for branding on the landing page.

### ProjectDashboard Page Layout

**File:** `apps/web/src/pages/ProjectDashboard.tsx`

The main dashboard page that arranges all visualization components in a responsive grid.

**Props or hook usage:**
- Uses `useDashboard(projectId)` to get `data`, `loading`, `dataSource`, and `refresh`.
- Receives `projectId` either from props or from app-level state.

**Grid layout:** The outer container uses `grid grid-cols-1 xl:grid-cols-2 gap-6 p-6`. Components that should span the full width use `col-span-full` (via a wrapper div with that class).

**Layout structure at xl (1280px+):**

```
Row 1: [Header - col-span-full]
Row 2: [KPICards - col-span-full, 3-column internal grid]
Row 3: [FeatureHeatmap - 1 col] [EvidenceGraph - 1 col]
Row 4: [PersonaTable - 1 col] [QuoteWall - 1 col]
Row 5: [ScenarioEditor - 1 col] [TribePanel - 1 col]
Row 6: [ConsensusChart - 1 col] [DisagreementRadar - 1 col]
```

At smaller widths (below xl), everything stacks to a single column naturally.

**Implementation approach:** Since this section is built in parallel with other component sections, import components that exist and use placeholder `<div>` elements (styled as empty cards with the component name) for components not yet created. The placeholders should be replaced as other sections are completed.

Each component receives the appropriate slice of `data`:
- `Header` receives the full `data` and `dataSource`
- `KPICards` receives `consensus_score`, `disagreement_score`, `evidence_coverage`
- `PersonaTable` receives `personas`, `round1_responses`, `round2_responses`, `feature_scores`
- `QuoteWall` receives `quotes`
- `ConsensusChart` receives `feature_scores`
- `DisagreementRadar` receives `feature_scores`
- `FeatureHeatmap` receives `feature_scores`, `personas`
- `EvidenceGraph` receives graph data (from payload or separate endpoint)
- `ScenarioEditor` receives `projectId` and `refresh` callback
- `TribePanel` receives `tribe`

**Loading state:** When `loading` is true and `data` is null, show a full-page loading skeleton or spinner. When `data` is available (even if loading a refresh), render the grid.

**Null data guard:** If `data` is null and not loading, show an error state ("Unable to load dashboard data. Please try again.").

**Background styling:** The page background is `bg-slate-900 min-h-screen` (set on the outer wrapper or on `<html>` via main.tsx).

---

## Key Design Decisions

1. **Header as a presentational component:** It receives data via props rather than calling hooks directly, making it easy to test in isolation.

2. **IngestForm manages its own state:** Form state (name, urls, hypotheses) is local to the component. Only the final validated values are passed to the parent via `onCreate`.

3. **Placeholder components in ProjectDashboard:** Since sections 04 through 11 are built in parallel, the dashboard initially uses placeholder divs for components not yet implemented. This allows the layout to be validated immediately while other components are built independently.

4. **Data source badge controlled by env var:** The `VITE_SHOW_DATA_SOURCE` environment variable controls badge visibility. This avoids showing debug information to judges during the demo while keeping it available during development.

5. **Seed URLs as textarea:** Rather than multiple input fields or a dynamic list, a simple textarea with one URL per line is the fastest implementation for hackathon scope. Parsing splits on newlines and filters empty/whitespace-only lines.

---

## Integration Notes

- When `App.tsx` (from section-01) renders `ProjectDashboard`, it should pass the `projectId` from the `useProject` hook so that `useDashboard` can fetch the correct data.
- The `StatusBar` component referenced in `HomePage` is built in section-05. Until that section is complete, use a simple inline loading indicator as a placeholder.
- All components imported into `ProjectDashboard` should be wrapped in the `ErrorBoundary` component (from section-01) to prevent a single component crash from taking down the entire dashboard. At minimum, wrap chart/visualization components (FeatureHeatmap, EvidenceGraph, ConsensusChart, DisagreementRadar).