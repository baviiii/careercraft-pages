import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { Tool } from "../data/tools";

/** The heavy upright cut the homepage uses for the second half of a heading. */
export const Strong = ({ children, blue = false }: { children: ReactNode; blue?: boolean }) => (
  <span className={`cc-italic-wonk ${blue ? "text-[color:var(--cc-rust)]" : ""}`}>{children}</span>
);

/** "Career coach" → ["Career", "coach"], set on two lines like the homepage cards. */
const twoLine = (name: string): [string, string] => {
  const i = name.indexOf(" ");
  return i < 0 ? [name, ""] : [name.slice(0, i), name.slice(i + 1)];
};

/** A tool as a cosy card: screenshot, name on two lines, the promise. */
export function ToolCard({ tool, kicker, sizes, big = false }: { tool: Tool; kicker?: string; sizes: string; big?: boolean }) {
  const [a, b] = twoLine(tool.name);
  const thumb = tool.shot.src.replace(/\.webp$/, "-thumb.webp");
  return (
    <Link to={`/tools/${tool.slug}`} className="cc-tl-soft cc-tl-card group">
      <span className="cc-tl-card__thumb">
        <img
          src={thumb}
          srcSet={`${thumb} 720w, ${tool.shot.src.replace(/\.webp$/, "-thumb@2x.webp")} 1440w`}
          sizes={sizes}
          alt=""
          width={720}
          height={450}
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="block p-8">
        {kicker && <span className="mb-4 block cc-label-sm text-[color:var(--cc-rust)]">{kicker}</span>}
        <span className={`block cc-font-display leading-[0.95] tracking-tight text-[color:var(--cc-ink)] ${big ? "text-3xl md:text-4xl" : "text-3xl"}`}>
          {a}
          {big ? <br /> : " "}
          <Strong>{b}</Strong>
        </span>
        <span className="mt-4 block cc-font-editorial text-[16.5px] leading-snug text-[color:var(--cc-ink-soft)]">{tool.h1}</span>
        <span className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <span className="cc-label-sm text-[color:var(--cc-ash)]">{tool.account === "free" ? "Free account" : "No account to start"}</span>
          <span className="inline-flex items-center gap-1.5 cc-label-sm text-[color:var(--cc-rust)]">
            How it works <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </span>
      </span>
    </Link>
  );
}

