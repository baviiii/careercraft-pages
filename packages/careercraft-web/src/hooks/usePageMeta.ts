/**
 * Per-page <title>, description, canonical and noindex for the public pages.
 *
 * The site is one index.html, so without this every route reads to Google as
 * the homepage. Google renders the JS and picks these up; link-preview bots
 * don't run JS and only ever see index.html, which is fine — the homepage is
 * what gets shared.
 *
 * On unmount everything goes back to index.html's own values, so a page that
 * doesn't call this (everything behind sign-in) never inherits the last public
 * page's title.
 */
import { useEffect } from "react";

const SITE = "https://www.faircopy.au";

// What index.html shipped with, read once before any page changes it.
const DEFAULT_TITLE = document.title;
const DEFAULT_DESCRIPTION =
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "";

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
