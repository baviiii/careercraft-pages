/* Small drawing helpers shared by Fay and the scene behind her. */

export const INK = "var(--cc-ink)";

/* Where an SVG part turns or scales from, in the drawing's own coordinates.
   framer-motion 12 measures an SVG element's origin from its own bounding
   box unless told otherwise ("fill-box"), which put every pivot in the wrong
   place: a blink pulled her eyes down to her tummy, ears and paws swung round
   points far off them. "view-box" makes "50px 41px" mean the point (50, 41). */
export const at = (x: number, y: number) => ({
  transformBox: "view-box" as const,
  originX: `${x}px`,
  originY: `${y}px`,
});

/* A four-point star like the one above the mark's doorway. */
export const sparkPath = (cx: number, cy: number, r: number) => {
  const k = r * 0.28;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
};

/* Her drawing on its own, and with room round it for the scene's window. */
export const PLAIN_BOX = { x: 0, y: 0, w: 100, h: 120 };
export const SCENE_BOX = { x: -7, y: 5, w: 114, h: 120 };

/** Her drawn size in px for a given `size`, and where her eyes sit in it. */
export function fayFrame(size: number, withScene: boolean) {
  const b = withScene ? SCENE_BOX : PLAIN_BOX;
  const unit = size / 100;
  return {
    width: b.w * unit,
    height: b.h * unit,
    eyeX: (50 - b.x) * unit,
    eyeY: (41 - b.y) * unit,
  };
}
