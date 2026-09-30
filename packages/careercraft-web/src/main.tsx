import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/craft.css";
import "./styles/astral.css";
import "./styles/design-system.css";
/* Last on purpose: overrides the dark-theme Tailwind utilities still baked
   into the /intelligence components. Scoped to .as-root; delete it as those
   components migrate to --cc-*. */
import "./styles/observatory-bridge.css";

createRoot(document.getElementById("root")!).render(<App />);
