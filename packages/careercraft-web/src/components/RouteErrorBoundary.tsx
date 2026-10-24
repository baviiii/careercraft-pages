import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches a page that fails to load or render, so one broken page shows a
 * way out instead of blanking the whole app.
 *
 * The common case is a tab left open across a deploy: the next page's code
 * file no longer exists. A refresh fixes that, so the message says so.
 * Moving to another page clears the error: `resetKey` is the path, and the
 * boundary resets when it changes, without remounting the pages it wraps.
 */
export class RouteErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[route] page failed to load", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return (
      <div className="cc-root flex min-h-[70vh] items-center justify-center bg-[color:var(--cc-cream)] px-6">
        <div className="max-w-md text-center">
          <h1 className="cc-font-display text-3xl tracking-tight text-[color:var(--cc-ink)]">
            {offline ? "You're offline" : "This page didn't load"}
          </h1>
          <p className="mt-3 cc-font-sans text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
            {offline
              ? "Check your connection, then refresh."
              : "Faircopy may have just been updated. Refresh to load the new version."}
          </p>
          <button type="button" onClick={() => window.location.reload()} className="cc-action mt-6">
            Refresh
          </button>
        </div>
      </div>
    );
  }
}
