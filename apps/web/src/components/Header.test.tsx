import { render, screen } from "@testing-library/react";

import { mockDashboardPayload } from "../lib/mockData";
import { Header } from "./Header";

describe("Header", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders PanelForge title", () => {
    render(<Header data={mockDashboardPayload} dataSource="mock" />);
    expect(screen.getByText("PanelForge")).toBeInTheDocument();
  });

  it("shows a data source badge when enabled", () => {
    vi.stubEnv("VITE_SHOW_DATA_SOURCE", "true");
    render(<Header data={mockDashboardPayload} dataSource="mock" />);
    expect(screen.getByText("MOCK DATA")).toBeInTheDocument();
  });
});
