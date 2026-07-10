/* ───────────────────────────────────────────────────────────────
   Font registration for the vector resume PDF.

   The on-screen templates render in Inter (loaded in index.html)
   with a Georgia-class serif for the `font-serif` accents, so the
   PDF embeds Inter statics + Gelasio (metric-compatible with
   Georgia). Sources are injected so the same code runs in the
   browser (Vite asset URLs) and in Node (file paths) for the
   preview-render script.
   ─────────────────────────────────────────────────────────────── */

import { Font } from "@react-pdf/renderer";

export const INTER = "Inter";
export const GELASIO = "Gelasio";

export interface PdfFontSources {
  interLight: string;
  interRegular: string;
  interItalic: string;
  interMedium: string;
  interSemiBold: string;
  interBold: string;
  interExtraBold: string;
  interBlack: string;
  gelasioRegular: string;
  gelasioBold: string;
}

let registered = false;

export function registerPdfFonts(src: PdfFontSources): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: INTER,
    fonts: [
      { src: src.interLight, fontWeight: 300 },
      { src: src.interRegular, fontWeight: 400 },
      { src: src.interItalic, fontWeight: 400, fontStyle: "italic" },
      { src: src.interMedium, fontWeight: 500 },
      { src: src.interSemiBold, fontWeight: 600 },
      { src: src.interBold, fontWeight: 700 },
      { src: src.interExtraBold, fontWeight: 800 },
      { src: src.interBlack, fontWeight: 900 },
    ],
  });

  Font.register({
    family: GELASIO,
    fonts: [
      { src: src.gelasioRegular, fontWeight: 400 },
      { src: src.gelasioBold, fontWeight: 700 },
    ],
  });

  // Browsers don't hyphenate the templates, so the PDF must not either —
  // otherwise line breaks (and therefore pagination) drift from the preview.
  Font.registerHyphenationCallback((word) => [word]);

  // Colour emoji (📧 📍 ✨ …) used by a few templates, rendered like on screen.
  // Fetched from jsDelivr at export time: if the CDN is blocked (offline, or a
  // CSP without cdn.jsdelivr.net in connect-src/img-src) the export still
  // succeeds — the emoji just come out blank. Keep the CDN allow-listed.
  Font.registerEmojiSource({
    format: "png",
    url: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/",
  });
}
