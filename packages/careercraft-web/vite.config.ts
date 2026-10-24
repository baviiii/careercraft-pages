import { defineConfig, type Plugin } from "vite";
import { readFileSync, writeFileSync } from "fs";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/* Every address without its own page (the signed-in app, /upload, a
   mistyped link) is served dist/app.html: the bare shell, no page text,
   kept out of search; 404.html is the same shell for anything Vercel can't
   find, such as /tools/<a tool that doesn't exist>. Written by every client
   build, so the app still loads if the prerender step is skipped
   (build:dev, build:prod). scripts/prerender.mjs then fills index.html with
   the homepage, which is why the fallback can't simply be index.html. */
const appShell = (): Plugin => ({
  name: "faircopy-app-shell",
  apply: "build",
  writeBundle(options) {
    const dir = options.dir;
    if (!dir) return;
    let shell: string;
    try {
      shell = readFileSync(path.join(dir, "index.html"), "utf8");
    } catch {
      return; // the SSR build has no index.html
    }
    const noindex = shell.replace("</head>", `  <meta name="robots" content="noindex" />
  </head>`);
    writeFileSync(path.join(dir, "app.html"), noindex);
    writeFileSync(path.join(dir, "404.html"), noindex);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // The SSR build (src/seo/prerender.tsx) only feeds scripts/prerender.mjs;
  // it doesn't need its own copy of public/.
  build: { copyPublicDir: !isSsrBuild },
  plugins: [react(), appShell()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
