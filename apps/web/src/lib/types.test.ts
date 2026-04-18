import { mockDashboardPayload } from "./mockData";

describe("mock dashboard payload", () => {
  it("contains the expected top-level fields", () => {
    expect(mockDashboardPayload.project_id).toBeTruthy();
    expect(mockDashboardPayload.personas).toHaveLength(5);
    expect(mockDashboardPayload.quotes.length).toBeGreaterThanOrEqual(8);
    expect(mockDashboardPayload.round1_responses.length).toBeGreaterThan(0);
    expect(mockDashboardPayload.round2_responses.length).toBeGreaterThan(0);
  });

  it("keeps persona and response adoption values in range", () => {
    for (const persona of mockDashboardPayload.personas) {
      expect(persona.adoption_likelihood).toBeGreaterThanOrEqual(0);
      expect(persona.adoption_likelihood).toBeLessThanOrEqual(100);
    }

    for (const response of [
      ...mockDashboardPayload.round1_responses,
      ...mockDashboardPayload.round2_responses,
    ]) {
      expect(response.adoption_likelihood_0_100).toBeGreaterThanOrEqual(0);
      expect(response.adoption_likelihood_0_100).toBeLessThanOrEqual(100);
    }
  });
});
