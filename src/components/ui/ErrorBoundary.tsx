"use client";

import { Component, type ReactNode } from "react";
import { track } from "@/lib/analytics";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    track("error_boundary_section", {
      message: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 300),
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-center">
          <p className="text-sm text-red-800 dark:text-red-200">
            This section encountered an error. Please refresh the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
