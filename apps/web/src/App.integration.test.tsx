import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";

describe("App integration", () => {
  it("supports the full mock flow from home to dashboard", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/product name/i), "iPhone 18");
    await user.click(screen.getByRole("button", { name: /search product/i }));

    expect(await screen.findByText(/evidence graph/i)).toBeInTheDocument();
    expect(screen.getByText(/consensus by feature/i)).toBeInTheDocument();
  });
});
