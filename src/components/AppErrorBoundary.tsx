import React from "react";
import { logger } from "@/lib/logger";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("Unhandled render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-card border border-border rounded-2xl p-6 shadow-card">
          <h1 className="text-xl font-bold font-display mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground font-body mb-4">
            Please refresh the page. If the problem continues, contact support.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 mt-5">
            <button
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
            <a
              className="border border-border px-4 py-2 rounded-lg text-sm font-semibold"
              href="/"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

