Now I have all the information needed. Let me produce the section content.

# Section 01: Project Scaffold

## Overview

This section initializes the Vite 8 + React 19 + TypeScript project that serves as the PanelForge frontend dashboard. It covers project creation, dependency installation, build configuration, Tailwind CSS 4 setup, dark theme initialization, two-page routing, ErrorBoundary, and test infrastructure. Every subsequent section depends on this scaffold being complete.

**Project root:** `/Users/bhavyapatel/Documents/Projects/focus-group-agent/apps/web/`

## What This Section Produces

After completing this section, the following files will exist and the app will boot to a placeholder page in the browser:

```
apps/web/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    app.css
    pages/
      HomePage.tsx
      ProjectDashboard.tsx
    components/
      ErrorBoundary.tsx
```

## Dependencies

This section has no dependencies on other sections. It blocks all subsequent sections.

---

## Tests First

Testing framework: **Vitest** with **React Testing Library**. Tests live alongside source files as `*.test.tsx` / `*.test.ts`. All test files are colocated with the component they test.

### Test Configuration (vitest setup inside vite.config.ts)

Vitest must be configured inside `vite.config.ts` with a `test` block specifying `jsdom` as the environment, and globals enabled. Install `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` as dev dependencies.

### Test: vite.config.ts

**File:** `apps/web/src/__tests__/vite-config.test.ts`

These tests verify the build tooling is correctly configured:

- **Vite config includes @tailwindcss/vite plugin** -- Import the vite config and assert that the plugins array contains the Tailwind plugin.
- **Vite config has proxy for /api pointing to localhost:8000** -- Assert the server.proxy config maps `/api` to `http://localhost:8000`.
- **Build completes without errors** -- This is verified by running `npm run build` as a script-level check (not a unit test per se, but should be confirmed during scaffold completion).

### Test: app.css

- **Tailwind v4 @import and @theme compiles without errors** -- Verified implicitly by a successful `npm run build`. No separate unit test needed; the build step is the test.

### Test: Routing (App.tsx)

**File:** `apps/web/src/App.test.tsx`

- **App renders HomePage by default** -- Render `<App />`, assert that the HomePage content is in the document (e.g., presence of the IngestForm placeholder or a heading like "Create a New Project").
- **App renders ProjectDashboard when page state is 'dashboard'** -- Since routing is via internal state, this test needs a way to trigger the state change. Either expose a navigation callback or test through user interaction. Assert that dashboard placeholder content appears.
- **Navigation from home to dashboard updates view** -- Simulate the navigation action (e.g., a successful project creation callback) and assert the view switches from HomePage content to ProjectDashboard content.

### Test: ErrorBoundary

**File:** `apps/web/src/components/ErrorBoundary.test.tsx`

- **Renders children when no error** -- Render `<ErrorBoundary><div>child content</div></ErrorBoundary>`, assert "child content" is in the document.
- **Renders fallback card when child throws during render** -- Create a component that throws an error during render. Wrap it in `<ErrorBoundary>`. Assert the fallback UI appears instead of crashing.
- **Fallback card shows "Chart unavailable" message** -- Assert the fallback contains text like "Chart unavailable" (the exact wording should match implementation: "Chart unavailable — reload to try again").

---

## Implementation Details

### Step 1: Initialize the Vite Project

From the repository root (`/Users/bhavyapatel/Documents/Projects/focus-group-agent/`), create the project at `apps/web/`:

```bash
mkdir -p apps/web
cd apps/web
npm create vite@latest . -- --template react-ts
```

This generates the boilerplate `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, and `src/` skeleton.

### Step 2: Install Dependencies

**Core dependencies:**
```bash
npm install react react-dom
```

**Styling:**
```bash
npm install tailwindcss @tailwindcss/vite
```

**Charts and visualization (needed by later sections, but installed now to avoid scaffold churn):**
```bash
npm install recharts d3-scale d3-scale-chromatic react-force-graph-2d
```

**Dev dependencies for testing:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/d3-scale @types/d3-scale-chromatic
```

### Step 3: Configure vite.config.ts

**File:** `apps/web/vite.config.ts`

The config must include:

1. **@tailwindcss/vite plugin** -- Import from `@tailwindcss/vite` and add to the `plugins` array (alongside the standard React plugin).
2. **Proxy configuration** -- Under `server.proxy`, map `'/api'` to `'http://localhost:8000'`. This eliminates CORS issues during development. All API calls in `api.ts` (built in section 03) will use relative URLs like `/api/projects/...`.
3. **Vitest configuration** -- Add a `test` block with `environment: 'jsdom'`, `globals: true`, and `setupFiles` pointing to a test setup file if needed.
4. **Build target** -- Set to `'baseline-widely-available'` under `build.target` for broad browser compatibility.

The config does NOT need `resolve.tsconfigPaths` unless path aliases are configured in `tsconfig.json` (keep it simple for hackathon scope).

### Step 4: Configure tsconfig.json

**File:** `apps/web/tsconfig.json`

Ensure the generated `tsconfig.json` has strict mode enabled and includes the `src/` directory. The Vite template's default is usually sufficient. Verify `"jsx": "react-jsx"` is set for React 19 JSX transform.

### Step 5: Create app.css with Tailwind v4 Configuration

**File:** `apps/web/src/app.css`

Tailwind v4 uses CSS-first configuration (no `tailwind.config.js`). The file must contain:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;

  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
```

The `@custom-variant dark` line enables the `.dark` class-based dark mode strategy. The `@theme` block defines custom animation tokens used for visual polish (section 11), but they are defined now so the build validates cleanly.

### Step 6: Create main.tsx

**File:** `apps/web/src/main.tsx`

This is the React entry point. It must:

1. Import `app.css` for Tailwind styles.
2. Add the `dark` class to the `<html>` element (`document.documentElement.classList.add('dark')`) -- the dashboard is always in dark mode for the demo, no toggle needed.
3. Render `<App />` into the `#root` div using `ReactDOM.createRoot`.

### Step 7: Create App.tsx with Two-Page Routing

**File:** `apps/web/src/App.tsx`

Routing is managed via React state (no router library). The component maintains:

- A `page` state: `'home' | 'dashboard'`
- A `projectId` state: `string | null`

Rendering logic:
- When `page === 'home'`, render `<HomePage />` and pass a callback `onProjectCreated(id: string)` that sets `projectId` and switches `page` to `'dashboard'`.
- When `page === 'dashboard'`, render `<ProjectDashboard projectId={projectId} />`.

The `onProjectCreated` callback is the navigation mechanism: after a successful project creation and ingest (handled in section 03's `useProject` hook), the HomePage calls this callback to transition to the dashboard.

### Step 8: Create Placeholder Pages

**File:** `apps/web/src/pages/HomePage.tsx`

A minimal placeholder component that accepts an `onProjectCreated: (id: string) => void` prop. For now, render a heading ("Create a New Project") and a placeholder div where `IngestForm` will go (built in section 04). The actual form implementation is in section 04.

**File:** `apps/web/src/pages/ProjectDashboard.tsx`

A minimal placeholder component that accepts `projectId: string | null` as a prop. For now, render a heading ("Dashboard") and the grid container `<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">` with placeholder text. The full layout with all components is built in section 04 and beyond.

### Step 9: Create ErrorBoundary Component

**File:** `apps/web/src/components/ErrorBoundary.tsx`

A React class component (error boundaries require class components) that:

1. Implements `componentDidCatch(error, info)` to log the error.
2. Maintains a `hasError` boolean in state via `static getDerivedStateFromError()`.
3. When `hasError` is true, renders a fallback card: a `<div>` with `rounded-xl bg-slate-800 p-6 shadow-lg text-center` styling containing the text "Chart unavailable — reload to try again".
4. When `hasError` is false, renders `this.props.children`.

This component will be used by later sections to wrap all chart/visualization components (FeatureHeatmap, EvidenceGraph, ConsensusChart, DisagreementRadar).

### Step 10: Update index.html

**File:** `apps/web/index.html`

Ensure the `<html>` tag has `lang="en"` and the body has `class="bg-slate-900 text-white"` for the dark theme base styling. The `<div id="root">` should already exist from the Vite template.

### Step 11: Add npm Scripts

**File:** `apps/web/package.json`

Ensure these scripts exist (most are from the Vite template, add the test script):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

### Step 12: Verify the Scaffold

After all files are created:

1. Run `npm run build` from `apps/web/` -- must complete without errors.
2. Run `npm run dev` -- app should boot and show the HomePage placeholder in the browser.
3. Run `npm test` (or `npm run test:run` for single-run) -- all scaffold tests should pass.

---

## File Summary

| File | Purpose |
|------|---------|
| `apps/web/package.json` | Project manifest with all dependencies |
| `apps/web/vite.config.ts` | Vite 8 config with Tailwind plugin, API proxy, Vitest |
| `apps/web/tsconfig.json` | TypeScript configuration (strict, react-jsx) |
| `apps/web/index.html` | HTML shell with dark theme body classes |
| `apps/web/src/app.css` | Tailwind v4 CSS-first config with dark variant and animations |
| `apps/web/src/main.tsx` | React entry point, sets dark class on html |
| `apps/web/src/App.tsx` | Two-page routing via React state |
| `apps/web/src/App.test.tsx` | Tests for routing behavior |
| `apps/web/src/pages/HomePage.tsx` | Placeholder page for IngestForm |
| `apps/web/src/pages/ProjectDashboard.tsx` | Placeholder page for dashboard grid |
| `apps/web/src/components/ErrorBoundary.tsx` | Class component error boundary with fallback card |
| `apps/web/src/components/ErrorBoundary.test.tsx` | Tests for ErrorBoundary render/fallback |
| `apps/web/src/__tests__/vite-config.test.ts` | Tests for Vite configuration |

## Technology Versions

| Package | Version | Notes |
|---------|---------|-------|
| vite | 8.x | Build tool |
| react | 19.x | UI framework |
| react-dom | 19.x | React DOM renderer |
| typescript | latest | Type system |
| tailwindcss | 4.x | CSS framework (CSS-first config) |
| @tailwindcss/vite | latest | Vite plugin for Tailwind 4 |
| recharts | 3.8.x | Chart library (used by later sections) |
| d3-scale | latest | Scale functions for heatmap (used by section 09) |
| d3-scale-chromatic | latest | Color interpolation for heatmap (used by section 09) |
| react-force-graph-2d | latest | Graph visualization (used by section 10) |
| vitest | latest | Test runner |
| @testing-library/react | latest | Component testing |
| @testing-library/jest-dom | latest | DOM assertion matchers |
| jsdom | latest | Browser environment for tests |

## Key Design Decisions

1. **No router library** -- Two pages do not justify react-router. Simple `useState` in App.tsx is sufficient.
2. **All visualization dependencies installed upfront** -- Recharts, D3, and react-force-graph-2d are installed now even though they are used in later sections. This prevents dependency-related scaffold changes mid-implementation.
3. **Always-on dark theme** -- The `dark` class is set imperatively in `main.tsx` on the `<html>` element. No theme toggle is implemented (hackathon demo is always dark).
4. **Tailwind v4 CSS-first config** -- No `tailwind.config.js` file. All configuration lives in `app.css` using `@theme` and `@custom-variant`.
5. **ErrorBoundary as class component** -- React error boundaries require class components; there is no hooks-based equivalent.