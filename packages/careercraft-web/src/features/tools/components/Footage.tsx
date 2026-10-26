/* The homepage's painted footage, for the dark bands on the tool pages.
   The first frame is a plain image, so it's in the prerendered HTML. The
   ~340 KB loop fades in over it only on desktop, with motion allowed and
   no data saver, after the page has loaded, and (for a band further down)
   once it's close to the screen. Same rules as the homepage hero. */

import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function Footage({ priority = false }: { priority?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, { once: true, margin: "400px 0px" });
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const lessMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (lessMotion || small || saveData) return;
    const start = () => setAllowed(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 200);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  const play = allowed && (priority || near);
  return (
    <div ref={box} aria-hidden className="absolute inset-0">
      <img
        src="/media/hero-poster.webp"
        srcSet="/media/hero-poster-800.webp 800w, /media/hero-poster.webp 1600w"
        sizes="100vw"
        alt=""
        width={1600}
        height={895}
        decoding="async"
        loading={priority ? undefined : "lazy"}
        {...(priority ? { fetchpriority: "high" } : {})}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {play && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <source src="/media/hero.webm" type="video/webm" />
          <source src="/media/hero.mp4" type="video/mp4" />
        </video>
      )}
      {/* The homepage hero's washes, so cream type reads over any frame. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0E0C0A]/55 via-[#0E0C0A]/20 to-[#0E0C0A]/85" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 62% at 50% 48%, rgba(14,12,10,0.5) 0%, rgba(14,12,10,0.15) 45%, transparent 78%)" }}
      />
    </div>
  );
}
