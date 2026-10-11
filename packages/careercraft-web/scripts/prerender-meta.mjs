/**
 * Runs after `vite build`. Writes dist/<path>/index.html for every page in
 * src/seo/public-pages.json, each with that page's own <title>, description,
 * canonical link and Open Graph tags.
 *
 * The app is a single index.html, so to anything that doesn't run JavaScript
 * — link previews, Bing (which feeds ChatGPT search), AI search bots — every
 * URL read as the homepage. Vercel serves a real file before it applies the
 * SPA rewrite in vercel.json, so these files win for their paths and every
 * other route still falls through to index.html.
 *
 * Only the <head> changes. The body is the same app shell, so what a visitor
 * sees is unchanged.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const { site, pages } = JSON.parse(
  readFileSync(join(root, "src/seo/public-pages.json"), "utf8"),
);
const shell = readFileSync(join(dist, "index.html"), "utf8");

const attr = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replace the one match of `re`, or stop the build — a silent miss would ship homepage tags. */
function swap(html, re, value, what) {
  if (!re.test(html)) throw new Error(`prerender-meta: ${what} not found in dist/index.html`);
  return html.replace(re, (_, before, after) => before + value + after);
}

function render(page) {
  const url = site + page.path;
  let html = shell;
  html = swap(html, /(<title>)[^<]*(<\/title>)/, attr(page.title), "<title>");
  html = swap(html, /(<meta name="description" content=")[^"]*(")/, attr(page.description), "description");
  html = swap(html, /(<meta property="og:title" content=")[^"]*(")/, attr(page.title), "og:title");
  html = swap(html, /(<meta property="og:description" content=")[^"]*(")/, attr(page.description), "og:description");
  html = swap(html, /(<meta property="og:url" content=")[^"]*(")/, url, "og:url");
  return html.replace("</head>", `  <link rel="canonical" href="${url}" />\n  </head>`);
}

for (const page of pages) {
  const out =
    page.path === "/" ? join(dist, "index.html") : join(dist, page.path.slice(1), "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, render(page));
  console.log(`prerender-meta: ${page.path} → ${out.slice(root.length + 1)}`);
}
