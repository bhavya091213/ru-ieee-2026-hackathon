import { render, screen } from "@testing-library/react";

import { ProjectDashboard } from "./ProjectDashboard";

describe("ProjectDashboard", () => {
  it("renders the key dashboard sections", async () => {
    render(<ProjectDashboard projectId="mock-project-id" />);

    expect(await screen.findByText(/persona table/i)).toBeInTheDocument();
    expect(screen.getByText(/quote wall/i)).toBeInTheDocument();
    expect(screen.getByText(/feature heatmap/i)).toBeInTheDocument();
  });
});
