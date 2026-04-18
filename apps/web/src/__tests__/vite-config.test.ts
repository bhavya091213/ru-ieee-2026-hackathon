import config from "../../vite.config";

describe("vite config", () => {
  it("includes the Tailwind plugin", () => {
    expect(config.plugins).toHaveLength(2);
  });

  it("proxies /api to localhost:8000", () => {
    expect(config.server?.proxy).toMatchObject({
      "/api": "http://localhost:8000",
    });
  });

  it("keeps the baseline build target", () => {
    expect(config.build?.target).toBe("baseline-widely-available");
  });
});
