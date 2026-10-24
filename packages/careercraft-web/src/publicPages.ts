/* The public pages that arrive prerendered (src/seo/public-pages.json).
   main.tsx loads the one being opened before starting React, so the static
   HTML is replaced by the same page instead of a loading spinner. Kept out
   of App.tsx so that file only exports components (fast refresh). */
import { lazyPage } from "@/lib/lazyPage";

export const Index = lazyPage(() => import("./pages/Index"));
export const ResumeBuilder = lazyPage(() => import("./features/resume-builder/ResumeBuilderPage"));
export const ToolsIndex = lazyPage(() => import("./features/tools/ToolsIndexPage"));
export const ToolRoute = lazyPage(() => import("./features/tools/ToolPage"));
export const ContactUs = lazyPage(() => import("./pages/ContactUs"));
export const AboutUs = lazyPage(() => import("./pages/AboutUs"));
export const Privacy = lazyPage(() => import("./pages/Privacy"));
export const Terms = lazyPage(() => import("./pages/Terms"));

export function preloadPublicPage(pathname: string): Promise<unknown> {
  const path = pathname.replace(/\/+$/, "") || "/";
  const page =
    path === "/" ? Index
    : path === "/builder" ? ResumeBuilder
    : path === "/tools" ? ToolsIndex
    : path.startsWith("/tools/") ? ToolRoute
    : path === "/about" ? AboutUs
    : path === "/contact" ? ContactUs
    : path === "/privacy" ? Privacy
    : path === "/terms" ? Terms
    : null;
  return page ? page.preload() : Promise.resolve();
}
