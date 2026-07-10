/* ───────────────────────────────────────────────────────────────
   Exact Tailwind v3 palette values used by the on-screen resume
   templates, so the exported PDF colours match pixel-for-pixel.
   Dumped from tailwindcss/colors — do not eyeball-edit.
   ─────────────────────────────────────────────────────────────── */

export const tw = {
  white: "#ffffff",
  black: "#000000",
  gray: { 50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db", 400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151", 800: "#1f2937", 900: "#111827" },
  slate: { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a" },
  blue: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a" },
  indigo: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81" },
  teal: { 50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e" },
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b" },
  green: { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 600: "#16a34a", 700: "#15803d", 800: "#166534" },
  rose: { 50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48" },
  cyan: { 50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490", 900: "#164e63" },
  purple: { 50: "#faf5ff", 100: "#f3e8ff", 200: "#e9d5ff", 300: "#d8b4fe", 600: "#9333ea", 700: "#7e22ce", 800: "#6b21a8", 900: "#581c87" },
  pink: { 50: "#fdf2f8", 100: "#fce7f3", 200: "#fbcfe8", 500: "#ec4899", 600: "#db2777" },
  fuchsia: { 50: "#fdf4ff", 100: "#fae8ff", 500: "#d946ef", 600: "#c026d3" },
  violet: { 50: "#f5f3ff", 100: "#ede9fe", 500: "#8b5cf6", 600: "#7c3aed" },
  amber: { 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e" },
  orange: { 50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c" },
  red: { 50: "#fef2f2", 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
  yellow: { 50: "#fefce8", 500: "#eab308" },
  stone: { 100: "#f5f5f4" },
  neutral: { 50: "#fafafa" },
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear blend of two hex colours (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t = 0.5): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Flatten `fg` at `alpha` over an opaque `bg` — replaces CSS colour/NN opacity. */
export function flatten(fg: string, alpha: number, bg: string): string {
  return mix(bg, fg, alpha);
}
