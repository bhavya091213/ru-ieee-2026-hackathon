import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IngestForm } from "./IngestForm";

describe("IngestForm", () => {
  it("renders core form fields", () => {
    render(<IngestForm onCreate={vi.fn()} />);

    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seed urls/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /search product/i }),
    ).toBeDisabled();
  });

  it("submits parsed values", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(<IngestForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/product name/i), "iPhone 18");
    await user.type(
      screen.getByLabelText(/seed urls/i),
      "https://example.com{enter}https://reddit.com/r/apple",
    );
    await user.type(
      screen.getByLabelText(/hypotheses/i),
      "Price will trigger the most disagreement{enter}",
    );
    await user.click(screen.getByRole("button", { name: /search product/i }));

    expect(onCreate).toHaveBeenCalledWith(
      "iPhone 18",
      ["https://example.com", "https://reddit.com/r/apple"],
      expect.arrayContaining(["Price will trigger the most disagreement"]),
    );
  });
});
