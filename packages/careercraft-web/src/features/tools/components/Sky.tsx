/* The homepage's painted sky for the tool pages: a warm gradient for the
   time of day, a low sun, a few clouds and paper grain. Pure CSS, so it's
   in the prerendered HTML. The clouds drift only when the device allows
   motion (tools.css). */

import type { ReactNode } from "react";

export type Tone = "dawn" | "day" | "dusk";

const GRADIENT: Record<Tone, string> = {
  dawn: "linear-gradient(180deg,#F5E2CB 0%,#F3EADB 48%,#ECE0CB 100%)",
  day: "linear-gradient(180deg,#DEE6DC 0%,#F0E9D8 55%,#F3EADB 100%)",
  dusk: "linear-gradient(180deg,#F1D7AF 0%,#ECD4BE 52%,#E6D2BD 100%)",
};

export function Sky({ tone, clouds = true }: { tone: Tone; clouds?: boolean }) {
  return (
    <div aria-hidden className="cc-tl-sky">
      <div className="cc-tl-sky__wash" style={{ background: GRADIENT[tone] }} />
      <div className="cc-tl-sun" />
      {clouds && (
        <>
          <div className="cc-tl-cloud cc-tl-cloud--a" />
          <div className="cc-tl-cloud cc-tl-cloud--b" />
          <div className="cc-tl-cloud cc-tl-cloud--c" />
        </>
      )}
      <div className="cc-grain absolute inset-0" />
      <div className="cc-tl-sky__vignette" />
    </div>
  );
}

export function SkySection({
  tone,
  id,
  className = "",
  labelledBy,
  children,
}: {
  tone: Tone;
  id?: string;
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`relative overflow-hidden py-24 md:py-32 ${className}`}>
      <Sky tone={tone} />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">{children}</div>
    </section>
  );
}
