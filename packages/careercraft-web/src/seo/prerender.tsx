/**
 * Build-time render of the public pages, for crawlers that don't run JS.
 *
 * `vite build --ssr` compiles this file for Node; scripts/prerender.mjs then
 * calls render() for each page in public-pages.json and writes the HTML into
 * that page's static file. Visitors' browsers still start the app as before
 * (main.tsx uses createRoot, which replaces this markup), so nothing here
 * runs in the browser.
 *
 * Pages are imported directly rather than lazily: renderToString can't wait
 * for a lazy import, so it would print the loading fallback instead.
 *
 * /builder is left out. It reads `window` while rendering and pulls in pdf.js,
 * which needs browser APIs just to load; its static file keeps the title and
 * description only (scripts/prerender.mjs handles pages missing from here).
 */
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import AboutUs from "@/pages/AboutUs";
import ContactUs from "@/pages/ContactUs";
import Index from "@/pages/Index";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

const PAGES: Record<string, ComponentType> = {
  "/": Index,
  "/about": AboutUs,
  "/contact": ContactUs,
  "/privacy": Privacy,
  "/terms": Terms,
};

/** The page's markup, or null if `path` has no page here. */
export function render(path: string): string | null {
  const Page = PAGES[path];
  if (!Page) return null;
  return renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <StaticRouter location={path}>
          <Page />
        </StaticRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}
