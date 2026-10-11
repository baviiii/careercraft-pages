/**
 * Per-page <title>, description, canonical and noindex for the public pages.
 *
 * Public pages take their title and description from src/seo/public-pages.json.
 * The build (scripts/prerender-meta.mjs) writes the same values into a static
 * HTML file per page, so crawlers that don't run JS — link previews, Bing, AI
 * search bots — see each page as itself rather than as the homepage. This hook
 * keeps the tags right as people move around the app.
 *
 * On unmount everything goes back to the homepage's values, so a page that
 * doesn't call this (everything behind sign-in) never inherits the last public
 * page's title.
 */
import { useEffect } from "react";

import publicPages from "@/seo/public-pages.json";

const SITE = publicPages.site;
const HOME = publicPages.pages.find((p) => p.path === "/")!;

// The homepage's values, not whatever HTML the visitor landed on: arriving at
// /about loads about/index.html, whose <title> is About's.
const DEFAULT_TITLE = HOME.title;
const DEFAULT_DESCRIPTION = HOME.description;

/** Title, description and path for a page listed in public-pages.json. */
export function publicPageMeta(path: string): PageMeta {
  const page = publicPages.pages.find((p) => p.path === path);
  if (!page) throw new Error(`usePageMeta: ${path} is not in src/seo/public-pages.json`);
  return page;
}

interface PageMeta {
  title: string;
  description?: string;
  /** Path this page should be indexed under, e.g. "/builder". Omit for noindex pages. */
  path?: string;
  /** Keep this page out of search results (sign-in, password reset, 404). */
  noindex?: boolean;
}

function upsertMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

export function usePageMeta({ title, description, path, noindex }: PageMeta) {
  useEffect(() => {
    document.title = title;
    upsertMeta("description", description ?? DEFAULT_DESCRIPTION);
    if (path && !noindex) upsertCanonical(SITE + path);
    if (noindex) upsertMeta("robots", "noindex");

    return () => {
      document.title = DEFAULT_TITLE;
      upsertMeta("description", DEFAULT_DESCRIPTION);
      document.querySelector('link[rel="canonical"]')?.remove();
      document.querySelector('meta[name="robots"]')?.remove();
    };
  }, [title, description, path, noindex]);
}
