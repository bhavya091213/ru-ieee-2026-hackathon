import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";

describe("App", () => {
  it("renders HomePage by default", () => {
    render(<App />);

    expect(screen.getByText(/search a product\. see the panel\./i)).toBeInTheDocument();
  });

  it("navigates to dashboard after form submission", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/product name/i), "iPhone 18");
    await user.click(screen.getByRole("button", { name: /search product/i }));

    expect(await screen.findByText(/focus group/i)).toBeInTheDocument();
    expect(screen.getByText(/consensus by feature/i)).toBeInTheDocument();
  });

  it("returns to the search screen from dashboard", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/product name/i), "iPhone 18");
    await user.click(screen.getByRole("button", { name: /search product/i }));
    await user.click(await screen.findByRole("button", { name: /search again/i }));

    expect(screen.getByText(/search a product\. see the panel\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search product/i })).toBeInTheDocument();
  });
});
