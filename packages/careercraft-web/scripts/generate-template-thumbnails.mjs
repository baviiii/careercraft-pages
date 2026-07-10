/* Generates static picker thumbnails: renders each PDF template with
   placeholder data, rasterises page 1 with poppler's pdftoppm, and
   writes compressed JPEGs to public/template-thumbnails/<id>.jpg.

   Needs pdftoppm on PATH, or set POPPLER_PDFTOPPM to the exe path.
   Usage: node scripts/generate-template-thumbnails.mjs */

import { createCanvas, loadImage } from "canvas";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const pdfDir = path.join(root, "tmp", "template-thumbs");
const outDir = path.join(root, "public", "template-thumbnails");
const THUMB_WIDTH = 600;

const pdftoppm = process.env.POPPLER_PDFTOPPM || "pdftoppm";

/* 1 · Render the PDFs */
mkdirSync(pdfDir, { recursive: true });
const bundle = path.join(root, "tmp", "template-thumbs.bundle.mjs");
await build({
  entryPoints: [path.join(here, "template-thumbs.entry.tsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  outfile: bundle,
  alias: { "@": path.join(root, "src") },
  external: ["react", "react/jsx-runtime", "@react-pdf/renderer"],
  logLevel: "warning",
});
await import(pathToFileURL(bundle).href);

/* 2 · Rasterise page 1 at 96dpi (794px wide), then downscale to JPEG */
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(pdfDir).filter((f) => f.endsWith(".pdf"))) {
  const id = file.replace(/\.pdf$/, "");
  const pngBase = path.join(pdfDir, `${id}-thumb`);
  execFileSync(pdftoppm, ["-png", "-r", "96", "-f", "1", "-l", "1", "-singlefile", path.join(pdfDir, file), pngBase]);

  const img = await loadImage(`${pngBase}.png`);
  const h = Math.round((img.height / img.width) * THUMB_WIDTH);
  const canvas = createCanvas(THUMB_WIDTH, h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, THUMB_WIDTH, h);
  writeFileSync(path.join(outDir, `${id}.jpg`), canvas.toBuffer("image/jpeg", { quality: 0.87 }));
  rmSync(`${pngBase}.png`);
  console.log(`thumb ${id}.jpg`);
}

console.log(`done → ${outDir}`);
