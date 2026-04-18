import { render, screen } from "@testing-library/react";

import { ProjectDashboard } from "./ProjectDashboard";

describe("ProjectDashboard integration", () => {
  it("renders the main P0 sections together", async () => {
    render(<ProjectDashboard projectId="mock-project-id" />);

    expect(await screen.findByText(/PanelForge/i)).toBeInTheDocument();
    expect(screen.getByText(/consensus by feature/i)).toBeInTheDocument();
    expect(screen.getByText(/quote wall/i)).toBeInTheDocument();
  });
});
