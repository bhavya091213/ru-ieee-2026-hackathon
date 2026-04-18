The project hasn't been scaffolded yet. Now I have all the context needed. Let me produce the section content.

# Section 03: API Layer and Hooks

## Overview

This section implements the typed fetch wrapper layer (`api.ts`) and the two React hooks (`useProject`, `useDashboard`) that manage data flow between the backend API and frontend components. Every API function includes automatic fallback to mock data when the backend is unreachable, plus a `dataSource` flag so the UI knows whether it is showing live or mock results.

**Dependencies:** This section depends on section-01-scaffold (project structure, Vite config with `/api` proxy) and section-02-types-mock (`types.ts` interfaces, `mockData.ts` data, `colors.ts`). All imports from those files are assumed to exist and be type-correct.

**Blocks:** Sections 04 (layout/header), 05 (KPI/status), 06 (persona table), 10 (graph/editor), and 12 (integration) depend on the hooks and API functions defined here.

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/lib/api.ts` | Typed fetch wrappers with mock fallback |
| `apps/web/src/lib/api.test.ts` | Tests for API layer |
| `apps/web/src/hooks/useProject.ts` | Project lifecycle hook |
| `apps/web/src/hooks/useProject.test.ts` | Tests for useProject |
| `apps/web/src/hooks/useDashboard.ts` | Dashboard data fetch hook |
| `apps/web/src/hooks/useDashboard.test.ts` | Tests for useDashboard |

---

## Tests First

All tests use Vitest with React Testing Library (configured in section-01). Tests live alongside source files. Global `fetch` is mocked for API tests; hooks are tested with `renderHook` from `@testing-library/react`.

### api.test.ts

Location: `apps/web/src/lib/api.test.ts`

This file tests all five API functions. The global `fetch` should be mocked with `vi.fn()` at the top of the file and restored in `afterEach`. Import `mockDashboardPayload` from `../lib/mockData` as the expected fallback value.

Tests to write:

1. **fetchDashboard returns DashboardPayload on successful API call** -- Mock fetch to return a 200 response with a JSON body. Assert the returned `data` matches the body and `dataSource` is `'live'`.

2. **fetchDashboard returns mock data with dataSource='mock' when fetch throws** -- Mock fetch to reject with a network error. Assert the returned `data` equals `mockDashboardPayload` and `dataSource` is `'mock'`.

3. **fetchDashboard returns mock data with dataSource='mock' on non-200 response** -- Mock fetch to return a response with `ok: false` and status 500. Assert mock fallback with `dataSource: 'mock'`.

4. **fetchDashboard aborts after 10-second timeout** -- Use `vi.useFakeTimers()`. Mock fetch to return a promise that never resolves. Call `fetchDashboard`, advance timers by 10000ms, and assert mock fallback is returned. Restore real timers in cleanup.

5. **createProject sends POST to /api/projects with correct body** -- Mock fetch to return 200 with `{ project_id: 'abc123' }`. Call `createProject('Test', ['https://example.com'], ['hypothesis1'])`. Assert fetch was called with `/api/projects`, method POST, and body containing `name`, `seed_urls`, and `hypotheses`.

6. **runSimulation sends POST to /api/projects/{id}/simulate** -- Mock fetch to return 200 with a DashboardPayload. Call `runSimulation('proj-1')`. Assert fetch was called with `/api/projects/proj-1/simulate` and method POST.

7. **All API functions use relative URLs (not absolute)** -- Call each function with mocked fetch. For each call, inspect `fetch.mock.calls` and assert every URL starts with `/api/` (no `http://` prefix).

### useProject.test.ts

Location: `apps/web/src/hooks/useProject.test.ts`

Use `renderHook` from `@testing-library/react` and `act` for state updates. Mock the API module (`vi.mock('../lib/api')`) so no real fetch calls are made.

Tests to write:

1. **Initial state is idle with null projectId** -- Render the hook, assert `result.current.status === 'idle'` and `result.current.projectId === null`.

2. **create() transitions status to 'creating' then 'ingesting' then 'ready'** -- Mock `createProject` to resolve with `{ project_id: 'p1' }` and `startIngest` to resolve with a valid `IngestStatus`. Call `result.current.create(...)` inside `act`. Capture status transitions (use `waitFor` or check final state). Final status should be `'ready'`.

3. **create() sets projectId after successful creation** -- After calling `create()`, assert `result.current.projectId === 'p1'`.

4. **simulate() transitions status to 'simulating' then 'ready'** -- Set up hook with an existing projectId. Mock `runSimulation` to resolve. Call `simulate()` and assert status ends at `'ready'`.

5. **Error during create sets status to 'error'** -- Mock `createProject` to reject with an error. Call `create()` and assert `result.current.status === 'error'`.

### useDashboard.test.ts

Location: `apps/web/src/hooks/useDashboard.test.ts`

Use `renderHook` with `@testing-library/react`. Mock the API module.

Tests to write:

1. **Returns mock data when projectId is null in dev mode** -- Set `import.meta.env.DEV` to `true` (or use `vi.stubEnv`). Render with `projectId = null`. Assert `result.current.data` equals `mockDashboardPayload` and `result.current.dataSource === 'mock'`.

2. **Returns null data when projectId is null in production mode** -- Set `import.meta.env.DEV` to `false`. Render with `projectId = null`. Assert `result.current.data === null`.

3. **Fetches dashboard data when projectId is set** -- Mock `fetchDashboard` to resolve with live data. Render with `projectId = 'p1'`. Assert `result.current.data` matches the mocked payload and `result.current.dataSource === 'live'`.

4. **dataSource is 'live' when API succeeds** -- Same as above; confirm `dataSource` value.

5. **dataSource is 'mock' when API fails and fallback activates** -- Mock `fetchDashboard` to resolve with mock fallback (the API function itself handles fallback, so it returns `{ data: mockData, dataSource: 'mock' }`). Assert `result.current.dataSource === 'mock'`.

6. **refresh() re-fetches data** -- After initial render, call `result.current.refresh()` inside `act`. Assert `fetchDashboard` was called twice.

---

## Implementation Details

### api.ts

Location: `apps/web/src/lib/api.ts`

This module exports five async functions. Each follows a uniform pattern:

**Imports:** `DashboardPayload`, `IngestStatus`, `TribeResult` from `./types`, and `mockDashboardPayload` (plus any other mock objects needed) from `./mockData`.

**Return type convention:** Each function returns a wrapper object containing the actual data payload plus a `dataSource` field. Define a generic type alias:

```typescript
type ApiResult<T> = { data: T; dataSource: 'live' | 'mock' }
```

**Fetch wrapper pattern (applies to all functions):**

1. Create an `AbortController`.
2. Set a 10-second timeout via `setTimeout(() => controller.abort(), 10_000)`.
3. Call `fetch(url, { signal: controller.signal, ...options })` inside a try block.
4. If the response is not ok (`!response.ok`), throw an error.
5. Parse JSON, clear the timeout, return `{ data: parsed, dataSource: 'live' }`.
6. In the catch block, clear the timeout and return `{ data: mockFallback, dataSource: 'mock' }`.

Consider extracting a private helper function (e.g., `fetchWithFallback<T>(url, options, fallback): Promise<ApiResult<T>>`) to avoid repeating the try/catch/timeout pattern five times.

**Function signatures:**

- `createProject(name: string, seedUrls: string[], hypotheses: string[]): Promise<ApiResult<{ project_id: string }>>` -- POST to `/api/projects` with JSON body `{ name, seed_urls: seedUrls, hypotheses }`. Mock fallback returns `{ project_id: 'mock-project-id' }`.

- `startIngest(projectId: string): Promise<ApiResult<IngestStatus>>` -- POST to `/api/projects/${projectId}/ingest`. Mock fallback returns `{ status: 'complete', source_count: 12, chunk_count: 87 }`.

- `runSimulation(projectId: string): Promise<ApiResult<DashboardPayload>>` -- POST to `/api/projects/${projectId}/simulate`. Mock fallback returns `mockDashboardPayload`.

- `fetchDashboard(projectId: string): Promise<ApiResult<DashboardPayload>>` -- GET to `/api/projects/${projectId}/dashboard`. Mock fallback returns `mockDashboardPayload`.

- `scoreTribe(projectId: string): Promise<ApiResult<TribeResult>>` -- POST to `/api/projects/${projectId}/tribe`. Mock fallback returns a `TribeResult` with `enabled: true`, `response_strength: 0.72`, `response_variance: 0.18`, `response_spread: 0.45`, and a sample `scored_text` array.

**URL convention:** All URLs are relative (e.g., `/api/projects/...`), relying on the Vite dev server proxy configured in section-01. No `VITE_API_URL` prefix is used.

### useProject.ts

Location: `apps/web/src/hooks/useProject.ts`

A custom React hook managing the full project lifecycle. Uses `useState` for state and exposes both data and action functions.

**State shape:**

```typescript
{
  projectId: string | null
  status: 'idle' | 'creating' | 'ingesting' | 'simulating' | 'ready' | 'error'
  progress: { stage: string; percent: number | null }
  error: string | null
}
```

**Exposed interface:**

```typescript
{
  projectId: string | null
  status: string
  progress: { stage: string; percent: number | null }
  error: string | null
  create: (name: string, urls: string[], hypotheses: string[]) => Promise<void>
  simulate: () => Promise<void>
}
```

**create() implementation logic:**

1. Set status to `'creating'`, progress to `{ stage: 'Creating project...', percent: null }`.
2. Call `createProject(name, urls, hypotheses)` from `api.ts`. On success, store the returned `project_id` in state.
3. Set status to `'ingesting'`, progress to `{ stage: 'Ingesting sources...', percent: null }`.
4. Call `startIngest(projectId)` from `api.ts`. Await the result (this is a long-running synchronous call -- no polling).
5. Set status to `'ready'`, clear progress.
6. On any error, set status to `'error'`, store error message.

The WS2 API endpoints are synchronous (they block until completion). There is no polling endpoint. The hook simply awaits each long-running fetch. The StatusBar (implemented in section-05) shows an indeterminate loading indicator while awaiting.

**simulate() implementation logic:**

1. Set status to `'simulating'`, progress to `{ stage: 'Running simulation...', percent: null }`.
2. Call `runSimulation(projectId!)` from `api.ts`. Await result.
3. Set status to `'ready'`, clear progress.
4. On error, set status to `'error'`.

### useDashboard.ts

Location: `apps/web/src/hooks/useDashboard.ts`

A custom React hook that fetches and caches the `DashboardPayload`.

**Parameters:** `projectId: string | null`

**State shape:**

```typescript
{
  data: DashboardPayload | null
  loading: boolean
  dataSource: 'live' | 'mock' | null
}
```

**Exposed interface:**

```typescript
{
  data: DashboardPayload | null
  loading: boolean
  dataSource: 'live' | 'mock' | null
  refresh: () => void
}
```

**Fetch logic (runs in a useEffect triggered by projectId changes):**

1. If `projectId` is `null` and `import.meta.env.DEV` is `true`: set `data` to `mockDashboardPayload` (imported from `../lib/mockData`), set `dataSource` to `'mock'`, set `loading` to `false`. Return early. This allows development without the backend running.

2. If `projectId` is `null` and not in dev mode: set `data` to `null`, `dataSource` to `null`, `loading` to `false`. Return early. Do not silently render mock data in production for a missing project.

3. If `projectId` is a valid string: set `loading` to `true`, call `fetchDashboard(projectId)`, store the returned `data` and `dataSource`, set `loading` to `false`.

**refresh():** A function (stabilized with `useCallback`) that re-executes the fetch logic. Consumers call this after a simulation completes to get updated data.

**Cleanup:** The useEffect should use an `ignore` flag pattern (or `AbortController`) to prevent state updates on unmounted components if the fetch completes after navigation away.

---

## Key Design Decisions

**Why a unified `ApiResult<T>` return type:** Every consumer of the API layer needs to know whether data is live or mocked. Returning a consistent wrapper avoids ad-hoc boolean flags scattered across components.

**Why no polling in useProject:** The WS2 backend runs ingest and simulation synchronously. The HTTP request blocks until the work is done, so there is no status endpoint to poll. The hook simply `await`s the promise and shows an indeterminate loading bar via the `progress` state.

**Why mock fallback in dev mode for null projectId in useDashboard:** During development (hours 3-16), the backend does not exist yet. Components need data to render while being built. The null-projectId + DEV check allows the dashboard to render mock data automatically without requiring a backend or manual setup. In production, a null projectId means something went wrong and should show an error state.

**Why relative URLs:** The Vite dev server proxy (configured in section-01 as `server.proxy['/api'] = 'http://localhost:8000'`) forwards all `/api/*` requests to the backend. This eliminates CORS issues entirely and means no environment variable is needed for the API URL during development.

---

## Integration Notes

- The `Header` component (section-04) consumes `dataSource` from `useDashboard` to show the MOCK/LIVE badge.
- The `StatusBar` (section-05) consumes `status` and `progress` from `useProject`.
- The `ScenarioEditor` (section-10) calls `simulate()` from `useProject` and `refresh()` from `useDashboard`.
- The `ProjectDashboard` page (section-04) orchestrates both hooks, passing data down to child components as props.
- The `HomePage` (section-04) uses `useProject.create()` to initiate project creation and navigates to the dashboard on success.