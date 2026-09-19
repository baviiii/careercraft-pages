/* Bundles the TSX entry with esbuild and runs it in Node to render
   all PDF templates into tmp/pdf-previews. Usage:
     node scripts/render-pdf-previews.mjs */

import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outfile = path.join(root, "tmp", "render-previews.bundle.mjs");

mkdirSync(path.join(root, "tmp", "pdf-previews"), { recursive: true });

await build({
  entryPoints: [path.join(here, "render-pdf-previews.entry.tsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  outfile,
  alias: { "@": path.join(root, "src") },
  external: ["react", "react/jsx-runtime", "@react-pdf/renderer"],
  logLevel: "warning",
});

await import(pathToFileURL(outfile).href);
