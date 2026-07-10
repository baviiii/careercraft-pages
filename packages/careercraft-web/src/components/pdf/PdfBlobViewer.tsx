/* ───────────────────────────────────────────────────────────
   PdfBlobViewer — renders a PDF blob page-by-page with PDF.js,
   scaled to the container width. Used for the WYSIWYG export
   preview: what it shows IS the file the user downloads.

   pdfjs-dist is imported dynamically inside the effect so the
   library (≈0.5 MB gzip) never lands in an eagerly loaded chunk.
   ─────────────────────────────────────────────────────────── */

import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";

interface PdfBlobViewerProps {
  blob: Blob;
  className?: string;
  /** Gap between pages, px. */
  pageGap?: number;
}

export function PdfBlobViewer({ blob, className = "", pageGap = 24 }: PdfBlobViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !width) return;

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      const data = await blob.arrayBuffer();
      if (cancelled) return;

      loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;
      if (cancelled) return;

      const canvases: HTMLCanvasElement[] = [];
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const scale = width / base.width;
        const viewport = page.getViewport({ scale: scale * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        canvas.style.display = "block";
        canvas.style.boxShadow = "0 10px 40px -12px rgba(14,12,10,0.35)";
        if (p > 1) canvas.style.marginTop = `${pageGap}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (cancelled) return;
        canvases.push(canvas);
      }

      if (cancelled) return;
      el.replaceChildren(...canvases);
    })().catch((err) => {
      if (!cancelled) console.error("PDF preview render failed:", err);
    });

    return () => {
      cancelled = true;
      loadingTask?.destroy().catch(() => undefined);
    };
  }, [blob, width, pageGap]);

  return <div ref={containerRef} className={`w-full ${className}`} />;
}
