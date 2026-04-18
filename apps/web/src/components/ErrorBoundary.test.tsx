import { render, screen } from "@testing-library/react";

import { ErrorBoundary } from "./ErrorBoundary";

function Broken(): JSX.Element {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>child content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/chart unavailable/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
