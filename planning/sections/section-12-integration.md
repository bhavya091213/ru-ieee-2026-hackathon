The project has no implementation files yet -- this is a greenfield plan. Now I have all the context needed to write section 12.

# Section 12: Integration Testing and Final Verification

## Overview

This is the final section of the WS3 Frontend Dashboard implementation. It covers end-to-end integration testing that verifies all components from sections 01-11 work together correctly, the production build compiles, and the full user flow (IngestForm to StatusBar to Dashboard) functions as expected. This section should only be implemented after all prior sections are complete.

## Dependencies

This section depends on **all** prior sections:

- **Section 01 (Scaffold):** Vite, React, TypeScript, Tailwind, Vitest configured in `apps/web/`
- **Section 02 (Types/Mock):** `types.ts`, `mockData.ts`, `colors.ts` in `apps/web/src/lib/`
- **Section 03 (API/Hooks):** `api.ts` in `apps/web/src/lib/`, `useProject.ts` and `useDashboard.ts` in `apps/web/src/hooks/`
- **Section 04 (Layout/Header):** `ProjectDashboard.tsx`, `HomePage.tsx` in `apps/web/src/pages/`, `Header.tsx`, `IngestForm.tsx` in `apps/web/src/components/`
- **Section 05 (KPI/Status):** `KPICards.tsx`, `StatusBar.tsx` in `apps/web/src/components/`
- **Section 06 (Persona Table):** `PersonaTable.tsx`, `RoundComparison.tsx` in `apps/web/src/components/`
- **Section 07 (Quotes Wall):** `QuoteWall.tsx` in `apps/web/src/components/`
- **Section 08 (Charts):** `ConsensusChart.tsx`, `DisagreementRadar.tsx` in `apps/web/src/components/`
- **Section 09 (Heatmap):** `FeatureHeatmap.tsx` in `apps/web/src/components/`
- **Section 10 (Graph Editor):** `EvidenceGraph.tsx`, `ScenarioEditor.tsx` in `apps/web/src/components/`
- **Section 11 (Tribe/Polish):** `TribePanel.tsx` in `apps/web/src/components/`, animation classes in `app.css`

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/pages/ProjectDashboard.integration.test.tsx` | Full dashboard integration test with all P0 components |
| `apps/web/src/pages/HomePage.integration.test.tsx` | IngestForm-to-Dashboard flow test |
| `apps/web/src/App.integration.test.tsx` | Full app flow: form submission through dashboard rendering |
| `apps/web/scripts/verify-build.sh` | Shell script to run `npm run build` and check exit code |

No existing files need to be modified (only new test and verification files are created).

## Background Context

### Application Architecture

PanelForge is a React 19 + Vite 8 + TypeScript SPA. It has two pages controlled by React state in `App.tsx`:

- **HomePage** contains `IngestForm` for creating a project (product name, seed URLs, hypotheses)
- **ProjectDashboard** is the main dashboard with all visualization components arranged in a responsive grid

Data flows through `api.ts` (typed fetch wrappers with mock fallback) into `useDashboard` / `useProject` hooks and down to components. When fetch calls fail, mock data from `mockData.ts` is returned transparently with a `dataSource: 'mock'` flag.

### Dashboard Grid Layout

The `ProjectDashboard` page uses a grid: `grid grid-cols-1 xl:grid-cols-2 gap-6 p-6`. Full-width items (Header, KPICards) use `col-span-full`. At the xl breakpoint:

- Row 1: Header (full width)
- Row 2: KPICards (full width)
- Row 3: FeatureHeatmap (1/2) + EvidenceGraph (1/2)
- Row 4: PersonaTable (1/2) + QuoteWall (1/2)
- Row 5: ScenarioEditor (1/2) + TribePanel (1/2)
- Row 6: ConsensusChart (1/2) + DisagreementRadar (1/2)

### Key Data Types

The `DashboardPayload` is the main data envelope with fields including `consensus_score`, `disagreement_score`, `evidence_coverage`, `personas` (array of `PersonaSummary`), `quotes` (array of `QuoteCard`), `feature_scores` (record of `FeatureScoreRow`), `round1_responses` and `round2_responses` (arrays of `PersonaResponse`), `tribe` (nullable `TribeResult`), and `analyst_summary` (`AnalystSummary`).

The mock data contains 5 personas, 6 facets, 8-12 quotes, round 1/2 responses, and realistic scores.

### Data Source Indicator

When `VITE_SHOW_DATA_SOURCE=true`, the Header shows a badge: "MOCK DATA" (amber) or "LIVE DATA" (green). This is critical for integration verification -- it confirms whether real API data or fallback mock data is being rendered.

---

## Tests FIRST

All integration tests use Vitest with React Testing Library. They mock `fetch` globally and provide mock data through the standard `mockDashboardPayload` export from `mockData.ts`.

### Test File 1: `apps/web/src/pages/ProjectDashboard.integration.test.tsx`

**Purpose:** Mount the full `ProjectDashboard` page with a complete mock `DashboardPayload` and verify every P0 component renders without errors or console warnings.

Tests to implement:

1. **"renders all P0 components within the dashboard"** -- Mount `ProjectDashboard` with mock data provided through context or props. Assert that the following are present in the document:
   - "PanelForge" text (Header)
   - Three KPI card values rendered as percentages (KPICards)
   - At least 5 persona rows in the table (PersonaTable)
   - At least 8 quote cards (QuoteWall)

2. **"layout uses grid with gap-6"** -- Assert the outer container element has CSS classes containing `grid` and `gap-6`.

3. **"KPICards span full width"** -- Assert the KPICards container or its parent has the `col-span-full` class.

4. **"renders without console errors"** -- Spy on `console.error` before rendering. After mount, assert that `console.error` was not called. This catches React key warnings, missing prop warnings, and any runtime issues.

5. **"renders without console warnings"** -- Spy on `console.warn` before rendering. After mount, assert no warnings were logged.

6. **"all chart components render within ErrorBoundary wrappers"** -- Verify that ConsensusChart, DisagreementRadar, and FeatureHeatmap render without throwing. If one is given deliberately bad data, the ErrorBoundary fallback ("Chart unavailable") should appear instead of crashing the entire page.

7. **"TribePanel renders when tribe data is present"** -- With mock data where `tribe` is not null and `tribe.enabled` is not false, verify the TribePanel content (caveat text, metric values) appears.

8. **"TribePanel is hidden when tribe is null"** -- With mock data where `tribe` is null, verify no TribePanel content appears.

9. **"data source badge shows MOCK DATA when dataSource is mock"** -- With `VITE_SHOW_DATA_SOURCE` set to `"true"` in the test environment and `dataSource` set to `'mock'`, verify the "MOCK DATA" badge text is rendered.

10. **"data source badge shows LIVE DATA when API succeeds"** -- Mock fetch to return a valid response. Verify "LIVE DATA" badge is rendered when `VITE_SHOW_DATA_SOURCE` is `"true"`.

#### Test Setup Pattern

```typescript
/**
 * Integration test for ProjectDashboard.
 *
 * Setup:
 * - Mock global fetch to return mockDashboardPayload
 * - Spy on console.error and console.warn
 * - Render ProjectDashboard within any required context providers
 *
 * Teardown:
 * - Restore all mocks (vi.restoreAllMocks)
 * - Clear console spies
 */
```

Each test should use `render()` from React Testing Library. If the dashboard requires a project context or data prop, provide it through the same mechanism used by the real app (context provider or props, depending on how sections 03-04 implemented it). Import `mockDashboardPayload` from `../../lib/mockData` as the data source.

### Test File 2: `apps/web/src/pages/HomePage.integration.test.tsx`

**Purpose:** Verify the IngestForm submission triggers the correct API calls and status transitions.

Tests to implement:

1. **"IngestForm submits and triggers project creation"** -- Fill in the product name input, add seed URLs to the textarea, add at least one hypothesis chip. Click submit. Assert that `fetch` was called with `/api/projects` and a POST method.

2. **"StatusBar appears during ingestion"** -- After form submission, while the create/ingest API call is in flight (use a deferred promise to control timing), assert that the StatusBar is visible with appropriate stage text (e.g., "Ingesting sources..." or "Creating project...").

3. **"StatusBar disappears when ingestion completes"** -- Resolve the deferred API promise. Wait for the StatusBar to disappear from the document (use `waitForElementToBeRemoved` or assert absence).

4. **"navigates to dashboard after successful flow"** -- After the full create-ingest-simulate flow completes (mocked to succeed), verify the app navigates from HomePage to ProjectDashboard. The dashboard content (e.g., "PanelForge" title, KPI values) should be visible.

#### Test Setup Pattern

```typescript
/**
 * Integration test for HomePage flow.
 *
 * Setup:
 * - Mock global fetch with controllable promise resolution
 *   (createProject returns { project_id: "test-123" },
 *    startIngest returns { status: "complete", source_count: 5, chunk_count: 50 },
 *    runSimulation returns mockDashboardPayload,
 *    fetchDashboard returns mockDashboardPayload)
 * - Render the full App component (not just HomePage) to test navigation
 *
 * Teardown:
 * - Restore all mocks
 */
```

### Test File 3: `apps/web/src/App.integration.test.tsx`

**Purpose:** Full end-to-end app flow test verifying the complete user journey from landing page to rendered dashboard.

Tests to implement:

1. **"full flow: create project, ingest, simulate, view dashboard"** -- Render `<App />`. The HomePage should be visible. Fill out the IngestForm (product name, seed URLs, hypotheses). Submit. Mock APIs resolve in sequence (createProject, startIngest, runSimulation). After all resolve, the ProjectDashboard should be rendered with all expected content sections.

2. **"dashboard displays real API data format correctly"** -- Create a mock response payload that has slightly different values from the default `mockDashboardPayload` (e.g., different persona names, different scores). Mock fetch to return this custom payload. Run through the full flow. Verify the dashboard renders the custom values (not the fallback mock data).

3. **"handles API failure gracefully with mock fallback"** -- Mock fetch to reject (network error). Run through the flow. The app should still render the dashboard using fallback mock data. If `VITE_SHOW_DATA_SOURCE` is true, the "MOCK DATA" badge should appear.

4. **"no TypeScript errors at runtime"** -- This is implicitly verified by all the above tests compiling and running successfully under Vitest with TypeScript. No explicit assertion needed, but this test file should use strict TypeScript imports of all key types (`DashboardPayload`, `PersonaSummary`, etc.) to verify they are correctly exported and usable.

---

## Implementation Details

### Integration Test Infrastructure

The integration tests require a few shared utilities:

**Deferred promise helper** -- A utility to create a promise whose resolution you control externally. This lets tests simulate in-flight API calls:

```typescript
/**
 * Creates a promise with externally-controlled resolution.
 * Usage:
 *   const { promise, resolve, reject } = createDeferred<T>();
 *   // pass `promise` to the code under test
 *   // call resolve(value) or reject(error) when ready
 */
function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};
```

Place this in `apps/web/src/test-utils/deferred.ts` or define it inline within test files.

**Mock fetch setup** -- A `beforeEach` / `afterEach` pattern that stubs `globalThis.fetch` using `vi.fn()`. The mock should route by URL pattern:

- `POST /api/projects` returns `{ project_id: "test-project-id" }`
- `POST /api/projects/*/ingest` returns `{ status: "complete", source_count: 5, chunk_count: 50 }`
- `POST /api/projects/*/simulate` returns the full `mockDashboardPayload`
- `GET /api/projects/*/dashboard` returns the full `mockDashboardPayload`

Each route should return a `Response` object with `ok: true`, `status: 200`, and `json()` resolving to the appropriate data.

**Console spy pattern** -- Use `vi.spyOn(console, 'error').mockImplementation(() => {})` and the same for `warn`. Assert `.not.toHaveBeenCalled()` at the end of each "no errors" test. Restore in `afterEach`.

### Production Build Verification

Create a simple verification script at `apps/web/scripts/verify-build.sh`:

```bash
#!/usr/bin/env bash
# Verifies that the production build compiles without errors.
# Run from the apps/web directory: bash scripts/verify-build.sh

set -euo pipefail

echo "Running TypeScript type check..."
npx tsc --noEmit

echo "Running production build..."
npm run build

echo "Build succeeded. Checking output..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "dist/index.html exists. Build verified."
else
  echo "ERROR: dist/index.html not found."
  exit 1
fi

echo "All checks passed."
```

This script verifies three things:
1. TypeScript type checking passes (`tsc --noEmit`)
2. Vite production build succeeds (`npm run build`)
3. Output files exist in `dist/`

### Live API Integration Testing

When the WS2 FastAPI backend is available, manual or semi-automated testing should verify real data flows. The steps:

1. Start the backend: `cd apps/api && uvicorn main:app --port 8000`
2. Start the frontend dev server: `cd apps/web && npm run dev`
3. Set `VITE_SHOW_DATA_SOURCE=true` in `apps/web/.env` to enable the data source badge
4. Open the app in a browser
5. Fill out the IngestForm and submit
6. Observe the StatusBar during ingestion/simulation
7. Verify the dashboard renders with "LIVE DATA" badge visible
8. Verify all components show real data (persona names, scores, quotes should differ from mock data)

This manual verification cannot be fully automated in unit tests because it requires a running backend. However, the mock-fetch integration tests in this section validate the same code paths -- the only difference is whether `fetch` hits a real server or a mock.

### Screenshot Generation for Pitch Deck

After all integration tests pass and the production build is verified, generate dashboard screenshots for the pitch deck. This is a manual step:

1. Run the dev server with mock data (`npm run dev`)
2. Navigate to the dashboard (either auto-navigate after form submission or directly set page state)
3. Use browser DevTools to capture at:
   - 1920x1080 (desktop, full dashboard view)
   - 1280x800 (laptop, verify responsive layout)
4. Save screenshots to `docs/screenshots/` for use in the pitch deck

If Playwright is available as a stretch goal, automate screenshot capture:

```typescript
/**
 * Playwright screenshot spec (stretch goal, not required).
 * File: apps/web/e2e/screenshots.spec.ts
 *
 * - Navigate to dashboard page
 * - Wait for all components to render (wait for specific text elements)
 * - Take full-page screenshot at 1920x1080
 * - Take full-page screenshot at 1280x800
 * - Save to docs/screenshots/
 */
```

### Responsive Layout Verification

The integration tests should include at least a basic check that the grid layout is configured correctly. While Vitest/jsdom does not support real CSS layout, you can verify the correct CSS classes are applied:

- The outer `ProjectDashboard` container should have classes: `grid`, `grid-cols-1`, `xl:grid-cols-2`, `gap-6`, `p-6`
- Header and KPICards containers should have `col-span-full`
- Each component card should have the standard styling classes: `rounded-xl`, `bg-slate-800`, `shadow-lg`

For true visual regression testing at specific viewport sizes, Playwright or a similar browser-based tool is required (stretch goal).

### Test Execution

All integration tests run with the standard test command:

```bash
cd /Users/bhavyapatel/Documents/Projects/focus-group-agent/apps/web
npm test
```

Vitest is already configured (from section 01) with `jsdom` environment and React Testing Library support. Integration test files follow the naming convention `*.integration.test.tsx` so they can be selectively run:

```bash
# Run only integration tests
npx vitest run --reporter=verbose "integration"

# Run all tests including integration
npm test
```

### Checklist Before Marking Complete

- [ ] All integration tests pass (`npm test` exits with code 0)
- [ ] No console errors or warnings in integration tests
- [ ] Production build compiles (`bash scripts/verify-build.sh` exits with code 0)
- [ ] TypeScript type check passes (`npx tsc --noEmit`)
- [ ] Data source badge correctly shows MOCK or LIVE status
- [ ] Dashboard renders all P0 components (Header, KPICards, PersonaTable, QuoteWall)
- [ ] Dashboard renders all P1 components (ConsensusChart, DisagreementRadar, FeatureHeatmap, ScenarioEditor)
- [ ] TribePanel conditional rendering works (visible when tribe is present, hidden when null)
- [ ] ErrorBoundary catches chart errors without crashing the page
- [ ] Full user flow works: IngestForm submission through dashboard rendering
- [ ] Screenshots captured for pitch deck (manual step)