import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Panel crashed inside ErrorBoundary", error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl bg-slate-800 p-6 text-center text-slate-100 shadow-lg">
          Chart unavailable - reload to try again
        </div>
      );
    }

    return this.props.children;
  }
}
