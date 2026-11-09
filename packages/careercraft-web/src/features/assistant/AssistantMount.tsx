/* Where the app mounts the assistant. The dock loads as its own chunk so it
   never holds up a page, and anything that goes wrong inside it (a chunk
   that fails to load, a render error) hides the assistant instead of taking
   the page down with it. */

import { Component, lazy, Suspense, type ReactNode } from "react";

const AssistantDock = lazy(() => import("./AssistantDock"));

class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[assistant] hidden after an error", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const AssistantMount = () => (
  <QuietBoundary>
    <Suspense fallback={null}>
      <AssistantDock />
    </Suspense>
  </QuietBoundary>
);
