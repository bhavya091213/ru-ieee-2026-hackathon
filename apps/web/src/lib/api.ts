import { mockDashboardPayload, mockTribeResult } from "./mockData";
import type { DashboardPayload, IngestStatus, TribeResult } from "./types";

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
      body: JSON.stringify({ name, seed_urls: seedUrls, hypotheses }),
    },
    { project_id: "mock-project-id" },
  );
}

export function startIngest(projectId: string): Promise<ApiResult<IngestStatus>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/ingest`,
    { method: "POST" },
    { status: "complete", source_count: 12, chunk_count: 87 },
  );
}

export function runSimulation(projectId: string): Promise<ApiResult<DashboardPayload>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/simulate`,
    { method: "POST" },
    mockDashboardPayload,
  );
}

export function fetchDashboard(projectId: string): Promise<ApiResult<DashboardPayload>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/dashboard`,
    { method: "GET" },
    mockDashboardPayload,
  );
}

export function scoreTribe(projectId: string): Promise<ApiResult<TribeResult>> {
  return fetchWithFallback(
    `/api/projects/${projectId}/tribe`,
    { method: "POST" },
    mockTribeResult,
  );
}
