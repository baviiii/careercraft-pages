/* Renders every PDF template with the default placeholder data into
   tmp/template-thumbs/<id>.pdf — page 1 becomes the picker thumbnail.
   Run via generate-template-thumbnails.mjs. */

import ReactPDF from "@react-pdf/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defaultTemplateData } from "@/components/templates/types";
import { registerPdfFonts } from "@/lib/pdf/fonts";
import { ResumeDocument } from "@/lib/pdf/ResumeDocument";
import { PDF_TEMPLATES } from "@/lib/pdf/templates";

const here = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.resolve(here, "../src/assets/fonts");
const outDir = path.resolve(here, "../tmp/template-thumbs");

registerPdfFonts({
  interLight: path.join(fontsDir, "Inter-Light.ttf"),
  interRegular: path.join(fontsDir, "Inter-Regular.ttf"),
  interItalic: path.join(fontsDir, "Inter-Italic.ttf"),
  interMedium: path.join(fontsDir, "Inter-Medium.ttf"),
  interSemiBold: path.join(fontsDir, "Inter-SemiBold.ttf"),
  interBold: path.join(fontsDir, "Inter-Bold.ttf"),
  interExtraBold: path.join(fontsDir, "Inter-ExtraBold.ttf"),
  interBlack: path.join(fontsDir, "Inter-Black.ttf"),
  gelasioRegular: path.join(fontsDir, "Gelasio-Regular.ttf"),
  gelasioBold: path.join(fontsDir, "Gelasio-Bold.ttf"),
});

// Top-level await so the importing script only continues once all PDFs exist.
for (const id of Object.keys(PDF_TEMPLATES)) {
  const doc = <ResumeDocument data={defaultTemplateData} templateId={id} />;
  await ReactPDF.renderToFile(doc, path.join(outDir, `${id}.pdf`));
  console.log(`rendered ${id}`);
}
