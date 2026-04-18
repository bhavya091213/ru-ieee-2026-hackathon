import { renderHook, waitFor } from "@testing-library/react";

import * as api from "../lib/api";
import { mockDashboardPayload } from "../lib/mockData";
import { useDashboard } from "./useDashboard";

describe("useDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns mock data when projectId is null in dev mode", () => {
    const { result } = renderHook(() => useDashboard(null));

    expect(result.current.data).toEqual(mockDashboardPayload);
    expect(result.current.dataSource).toBe("mock");
  });

  it("fetches dashboard data when projectId is set", async () => {
    vi.spyOn(api, "fetchDashboard").mockResolvedValue({
      data: mockDashboardPayload,
      dataSource: "live",
    });

    const { result } = renderHook(() => useDashboard("p1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.dataSource).toBe("live");
    expect(result.current.data?.project_id).toBe(mockDashboardPayload.project_id);
  });
});
