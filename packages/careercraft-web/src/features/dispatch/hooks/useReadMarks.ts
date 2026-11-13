import { useCallback, useState } from "react";

/* Which stories on Home you've opened, kept in this browser only. Nothing
   ranks on it; it just lets a read story look read. */
const STORE = "fc.dispatch.read";
const KEEP = 200;

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORE);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function useReadMarks() {
  const [read, setRead] = useState<Set<string>>(() => new Set(load()));

  const markRead = useCallback((key: string) => {
    setRead((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev).add(key);
      try {
        localStorage.setItem(STORE, JSON.stringify([...next].slice(-KEEP)));
      } catch {
        // Private windows and full storage: the mark just won't outlive the tab.
      }
      return next;
    });
  }, []);

  return { read, markRead };
}
