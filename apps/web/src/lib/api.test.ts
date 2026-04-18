import { fetchDashboard } from "./api";
import { mockDashboardPayload } from "./mockData";

describe("api layer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns live dashboard data on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockDashboardPayload), { status: 200 }),
    );

    const result = await fetchDashboard("p1");

    expect(result.dataSource).toBe("live");
    expect(result.data.project_id).toBe(mockDashboardPayload.project_id);
  });

  it("falls back to mock data when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const result = await fetchDashboard("p1");

    expect(result.dataSource).toBe("mock");
    expect(result.data).toEqual(mockDashboardPayload);
  });
});
