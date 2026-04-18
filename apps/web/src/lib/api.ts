import { mockDashboardPayload, mockTribeResult } from "./mockData";
import type {
  DashboardPayload,
  IngestStatus,
  SimulateResponse,
  SimulateStatus,
  TribeResult,
} from "./types";

export type ApiResult<T> = { data: T; dataSource: "live" | "mock" };

async function fetchWithFallback<T>(
  url: string,
  options: RequestInit,
  fallback: T,
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as T;
    return { data, dataSource: "live" };
  } catch {
    return { data: fallback, dataSource: "mock" };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function createProject(
  name: string,
  seedUrls: string[],
  hypotheses: string[],
): Promise<ApiResult<{ project_id: string }>> {
  return fetchWithFallback(
    "/api/projects",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: hypotheses.join("; ") }),
    },
    { project_id: "mock-project-id" },
  );
}

export function startIngest(
  projectId: string,
  sources: string[] = [],
  productName: string = "",
): Promise<ApiResult<IngestStatus>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/ingest`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources, product_name: productName }),
    },
    { source_count: 12, chunk_count: 87 },
  );
}

export function runSimulation(
  projectId: string,
  productName: string,
  description: string,
  hypotheses: string[],
  facets: string[],
): Promise<ApiResult<SimulateResponse>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/simulate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: productName,
        description,
        hypotheses,
        facets_to_explore: facets,
      }),
    },
    { run_id: "mock-run-id", status: "started" },
  );
}

export function pollSimulationStatus(
  projectId: string,
): Promise<ApiResult<SimulateStatus>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/simulate/status`,
    { method: "GET" },
    { phase: "DONE", error: null, done: true },
  );
}

export function fetchDashboard(
  projectId: string,
): Promise<ApiResult<DashboardPayload>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/dashboard`,
    { method: "GET" },
    mockDashboardPayload,
  );
}

export function scoreTribe(
  projectId: string,
): Promise<ApiResult<TribeResult>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/tribe/score`,
    { method: "POST" },
    mockTribeResult,
  );
}
