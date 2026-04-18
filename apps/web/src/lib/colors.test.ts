import { getPersonaColor } from "./colors";

describe("getPersonaColor", () => {
  it("returns a string for any persona id", () => {
    expect(getPersonaColor("persona-x")).toEqual(expect.any(String));
  });

  it("returns a consistent color for the same persona id", () => {
    expect(getPersonaColor("p1")).toBe(getPersonaColor("p1"));
  });

  it("returns multiple distinct colors for different persona ids", () => {
    const colors = new Set(["p1", "p2", "p3", "p4", "p5"].map(getPersonaColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});
