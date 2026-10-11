/* A small paper-confetti burst for the first time a job reaches Offer.

   About twenty pieces, about a second, then gone. Skipped entirely when the
   user has asked their system to reduce motion; the card's static "Offer!"
   mark is the celebration there. Each job celebrates once, remembered in
   this browser. */

const KEY = "cc-tracker-celebrated";
const COLORS = ["#2A52CC", "#3F7A5C", "#B4872C", "#C2412D", "#FFE7C6", "#E2E9FF"];

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function celebrated(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** True the first time it's asked about a given job, false after. */
export function firstCelebration(applicationId: string): boolean {
  const seen = celebrated();
  if (seen.has(applicationId)) return false;
  seen.add(applicationId);
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen].slice(-200)));
  } catch {
    /* private mode: it may celebrate again, which is fine */
  }
  return true;
}

export function confettiFrom(el: Element | null): void {
  if (!el || prefersReducedMotion() || typeof el.getBoundingClientRect !== "function") return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 20; i++) {
    const piece = document.createElement("span");
    piece.className = "cc-confetti";
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.left = `${r.left + r.width * (0.2 + Math.random() * 0.6)}px`;
    piece.style.top = `${r.top + 12}px`;
    document.body.appendChild(piece);
    const dx = (Math.random() - 0.5) * 220;
    const dy = 120 + Math.random() * 160;
    const rot = (Math.random() - 0.5) * 720;
    const anim = piece.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx * 0.6}px, ${-40 - Math.random() * 50}px) rotate(${rot / 3}deg)`,
          opacity: 1,
          offset: 0.3,
        },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 1000 + Math.random() * 300, easing: "cubic-bezier(.3,.6,.5,1)" },
    );
    anim.onfinish = () => piece.remove();
  }
}
