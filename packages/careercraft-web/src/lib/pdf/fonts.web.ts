/* Browser-side font registration: Vite turns these imports into
   same-origin asset URLs, so export never depends on third-party
   font CDNs. Kept separate from fonts.ts so the Node preview
   script can register from file paths instead. */

import interBlack from "@/assets/fonts/Inter-Black.ttf?url";
import interBold from "@/assets/fonts/Inter-Bold.ttf?url";
import interExtraBold from "@/assets/fonts/Inter-ExtraBold.ttf?url";
import interItalic from "@/assets/fonts/Inter-Italic.ttf?url";
import interLight from "@/assets/fonts/Inter-Light.ttf?url";
import interMedium from "@/assets/fonts/Inter-Medium.ttf?url";
import interRegular from "@/assets/fonts/Inter-Regular.ttf?url";
import interSemiBold from "@/assets/fonts/Inter-SemiBold.ttf?url";
import gelasioBold from "@/assets/fonts/Gelasio-Bold.ttf?url";
import gelasioRegular from "@/assets/fonts/Gelasio-Regular.ttf?url";

import { registerPdfFonts } from "./fonts";

export function registerPdfFontsForWeb(): void {
  registerPdfFonts({
    interLight,
    interRegular,
    interItalic,
    interMedium,
    interSemiBold,
    interBold,
    interExtraBold,
    interBlack,
    gelasioRegular,
    gelasioBold,
  });
}
