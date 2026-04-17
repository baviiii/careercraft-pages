import { createContext, useContext, useMemo } from "react";
import { HorusClient } from "@horus/sdk";
import type { ReactNode } from "react";

const HorusContext = createContext<HorusClient | null>(null);

export function useHorusClient(): HorusClient {
  const client = useContext(HorusContext);
  if (!client) {
    throw new Error("useHorusClient must be used within a HorusProvider");
  }
  return client;
}

interface HorusProviderProps {
  children: ReactNode;
}

export function HorusProvider({ children }: HorusProviderProps) {
  const client = useMemo(() => new HorusClient({
    azureFunctionsUrl: import.meta.env.VITE_AZURE_FUNCTIONS_URL || '',
    azureFunctionsKey: import.meta.env.VITE_AZURE_FUNCTIONS_KEY || '',
    agenticPlannerUrl: import.meta.env.VITE_AZURE_AGENTIC_PLANNER_URL || '',
    intersectionReasoningUrl: import.meta.env.VITE_AZURE_INTERSECTION_REASONING_URL || '',
    graphQueryUrl: import.meta.env.VITE_AZURE_GRAPH_QUERY_URL || '',
  }), []);

  return (
    <HorusContext.Provider value={client}>
      {children}
    </HorusContext.Provider>
  );
}
