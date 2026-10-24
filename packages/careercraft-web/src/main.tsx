import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { preloadPublicPage } from "./publicPages";
import { toast } from "@/hooks/use-toast";
import "./styles/fonts.css";
import "./index.css";
import "./styles/craft.css";
import "./styles/astral.css";
import "./styles/design-system.css";
/* Last on purpose: overrides the dark-theme Tailwind utilities still baked
   into the /intelligence components. Scoped to .as-root; delete it as those
   components migrate to --cc-*. */
import "./styles/observatory-bridge.css";
/* In the main stylesheet, not split off with the tool pages: the prerendered
   /tools HTML only links the main stylesheet, so a split file painted those
   pages unstyled until their code arrived. */
import "./features/tools/tools.css";

/* Public pages are already on screen as prerendered HTML. Load that page's
   code first, so React's first render is the page itself rather than the
   loading spinner. Capped, so a slow connection still gets a working app. */
/* A tab left open across a deploy asks for code files the new deploy no
   longer has (exporting a PDF, opening another page). The action that failed
   shows its own error; this says why, once, and what fixes it. */
let told = false;
window.addEventListener("vite:preloadError", () => {
  if (told) return;
  told = true;
  toast({ title: "Faircopy has just been updated", description: "Refresh the page to carry on with the new version." });
});

const container = document.getElementById("root")!;
const root = createRoot(container);
const path = window.location.pathname.replace(/\/+$/, "") || "/";
if (container.dataset.prerendered === path) {
  Promise.race([preloadPublicPage(path), new Promise((r) => setTimeout(r, 4000))])
    .catch(() => undefined)
    .finally(() => root.render(<App />));
} else {
  root.render(<App />);
}
