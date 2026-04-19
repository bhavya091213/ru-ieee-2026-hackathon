import { mockDashboardPayload, mockTribeResult } from "./mockData";
import type {
  DashboardPayload,
  IngestStatus,
  SimulateResponse,
  SimulateStatus,
  TribeResult,
} from "./types";

export type ApiResult<T> = { data: T; dataSource: "live" | "mock" };

async function fetchStrict<T>(
  url: string,
  options: RequestInit,
  timeoutMs: number = 600_000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const detail = body ? JSON.parse(body)?.detail ?? body : `HTTP ${response.status}`;
      throw new Error(detail);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchWithFallback<T>(
  url: string,
  options: RequestInit,
  fallback: T,
): Promise<ApiResult<T>> {
  try {
    const data = await fetchStrict<T>(url, options);
    return { data, dataSource: "live" };
  } catch {
    return { data: fallback, dataSource: "mock" };
  }
}

export async function createProject(
  name: string,
  seedUrls: string[],
  hypotheses: string[],
): Promise<ApiResult<{ project_id: string }>> {
  const data = await fetchStrict<{ project_id: string }>(
    "/api/projects",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: hypotheses.join("; ") }),
    },
  );
  return { data, dataSource: "live" };
}

export async function startIngest(
  projectId: string,
  sources: string[] = [],
  productName: string = "",
): Promise<ApiResult<IngestStatus>> {
  const data = await fetchStrict<IngestStatus>(
    `/api/projects/${projectId}/ingest`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources, product_name: productName }),
    },
  );
  return { data, dataSource: "live" };
}

export async function runSimulation(
  projectId: string,
  productName: string,
  description: string,
  hypotheses: string[],
  facets: string[],
): Promise<ApiResult<SimulateResponse>> {
  const data = await fetchStrict<SimulateResponse>(
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
  );
  return { data, dataSource: "live" };
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

export async function fetchProgressLogs(
  projectId: string,
  after: number = 0,
): Promise<ApiResult<{ messages: string[] }>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/progress?after=${after}`,
    { method: "GET" },
    { messages: [] },
  );
}

export function suggestFacets(
  productName: string,
  description: string = "",
  seedUrls: string[] = [],
): Promise<ApiResult<{ facets: string[] }>> {
  return fetchWithFallback(
    "/api/suggest-facets",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_name: productName, description, seed_urls: seedUrls }),
    },
    { facets: ["camera", "battery", "price", "design", "performance", "software"] },
  );
}
