"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onError: () => void;
};

type State = {
  hasError: boolean;
};

export class TicketCardCanvasBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[tickets:TicketCardCanvasBoundary] WebGL renderer failed", {
      error,
      errorInfo,
    });
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
