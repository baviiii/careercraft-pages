/* How the rest of the app tells Fay something happened, without importing
   her: a window event she listens for. Calling it when she isn't on screen
   does nothing, so features can call it freely. */

import { useEffect } from "react";

export type FayEvent = {
  kind: "status";
  status: "saved" | "applied" | "interview" | "offer" | "rejected";
  company: string;
};

const EVENT = "faircopy:fay";

export function fayReact(event: FayEvent) {
  try {
    window.dispatchEvent(new CustomEvent<FayEvent>(EVENT, { detail: event }));
  } catch {
    /* no window (tests, SSR): nothing to tell */
  }
}

export function useFayEvents(onEvent: (event: FayEvent) => void) {
  useEffect(() => {
    const listener = (e: Event) => onEvent((e as CustomEvent<FayEvent>).detail);
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [onEvent]);
}
