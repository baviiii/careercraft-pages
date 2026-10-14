import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // The SSR build (src/seo/prerender.tsx) only feeds scripts/prerender.mjs;
  // it doesn't need its own copy of public/.
  build: { copyPublicDir: !isSsrBuild },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
