/* Rasterises the rendered preview PDFs to PNGs (tmp/pdf-previews/png)
   using pdfjs-dist + node-canvas, so the output can be visually
   checked. Usage: node scripts/pdf-to-png.mjs [id ...] */

import { createCanvas } from "canvas";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

/* pdfjs must allocate ALL canvases (incl. gradient temp buffers)
   from node-canvas, or pattern fills throw in Node. */
class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "../tmp/pdf-previews");
const outDir = path.join(dir, "png");
mkdirSync(outDir, { recursive: true });

const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".pdf"));
const targets = only.length ? files.filter((f) => only.includes(f.replace(/\.pdf$/, ""))) : files;

for (const file of targets) {
  const data = new Uint8Array(readFileSync(path.join(dir, file)));
  const doc = await getDocument({
    data,
    disableFontFace: false,
    verbosity: 0,
    canvasFactory: new NodeCanvasFactory(),
  }).promise;
  const pages = Math.min(doc.numPages, 3);
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const out = path.join(outDir, `${file.replace(/\.pdf$/, "")}-p${p}.png`);
    writeFileSync(out, canvas.toBuffer("image/png"));
    console.log(`wrote ${path.basename(out)} (${doc.numPages} page${doc.numPages > 1 ? "s" : ""} total)`);
  }
}
