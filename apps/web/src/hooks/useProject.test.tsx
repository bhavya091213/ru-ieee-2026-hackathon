import { act, renderHook } from "@testing-library/react";

import * as api from "../lib/api";
import { useProject } from "./useProject";

describe("useProject", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts idle with no project id", () => {
    const { result } = renderHook(() => useProject());

    expect(result.current.status).toBe("idle");
    expect(result.current.projectId).toBeNull();
  });

  it("creates a project and ends ready", async () => {
    vi.spyOn(api, "createProject").mockResolvedValue({
      data: { project_id: "p1" },
      dataSource: "mock",
    });
    vi.spyOn(api, "startIngest").mockResolvedValue({
      data: { status: "complete", source_count: 4, chunk_count: 40 },
      dataSource: "mock",
    });

    const { result } = renderHook(() => useProject());

    await act(async () => {
      await result.current.create("Test", ["https://example.com"], ["h1"]);
    });

    expect(result.current.projectId).toBe("p1");
    expect(result.current.status).toBe("ready");
  });
});
