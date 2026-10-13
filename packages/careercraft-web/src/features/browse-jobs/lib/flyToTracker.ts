/* The "saved" moment: a small ticket lifts off the card's button and drops
   into the "Job tracker" button in the top bar, which gives a little bump.

   About 0.6s, Web Animations API, then gone. Skipped entirely under reduce
   motion; the button changing to "In your tracker" says the same thing. */

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function flyToTracker(from: Element | null): void {
  const target = document.querySelector('[data-fly-target="tracker"]');
  if (!from || !target || prefersReducedMotion()) return;

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ticket = document.createElement("span");
  ticket.className = "cc-fly-ticket";
  ticket.style.left = `${a.left + a.width / 2 - 14}px`;
  ticket.style.top = `${a.top + a.height / 2 - 9}px`;
  document.body.appendChild(ticket);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const flight = ticket.animate(
    [
      { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) rotate(-14deg) scale(1.1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) rotate(6deg) scale(0.5)`, opacity: 0.2 },
    ],
    { duration: 620, easing: "cubic-bezier(.3,.7,.4,1)" },
  );
  flight.onfinish = () => {
    ticket.remove();
    target.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }],
      { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  };
}
