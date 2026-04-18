import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "../App";

describe("HomePage integration", () => {
  it("moves from form to dashboard after submit", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/product name/i), "iPhone 18");
    await user.click(screen.getByRole("button", { name: /search product/i }));

    expect(await screen.findByText(/tripe signal|tribe signal/i)).toBeInTheDocument();
  });
});
