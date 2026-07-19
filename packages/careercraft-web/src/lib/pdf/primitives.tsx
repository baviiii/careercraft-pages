/* ───────────────────────────────────────────────────────────────
   Shared drawing kit for the vector PDF templates.

   The on-screen templates are 794×1123 CSS px (A4 @ 96 dpi), so
   every measurement ports at exactly ×0.75 pt/px via px(). Pages
   are emitted at 794×1123 px in pt-space (595.5×842.25pt — 0.07mm
   off true A4) so the geometry matches the preview 1:1.
   ─────────────────────────────────────────────────────────────── */

import {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ReactNode } from "react";

import { INTER } from "./fonts";

/* ── units ────────────────────────────────────────────────── */

const PT_PER_PX = 0.75;

/** Layout density multiplier applied to every px() measurement (type,
    gaps, margins, page padding). Page geometry (PAGE_W/H) never scales,
    so a lower density = same paper, more content per page. Set per
    render via setPdfDensityScale — renders are serialized in pdfExport
    so concurrent previews/exports can't bleed scales into each other. */
let densityScale = 1;

export function setPdfDensityScale(scale: number): void {
  densityScale = scale;
}

export const px = (n: number): number => n * PT_PER_PX * densityScale;

export const PAGE_W = 794 * PT_PER_PX;
export const PAGE_H = 1123 * PT_PER_PX;
export const PAGE_SIZE: [number, number] = [PAGE_W, PAGE_H];

/** Tailwind text size — fontSize + its paired line height (both CSS px). */
export const fsize = (sizePx: number, lineHeightPx?: number): Style => ({
  fontSize: px(sizePx),
  lineHeight: lineHeightPx ? lineHeightPx / sizePx : 1.5,
});

/** letter-spacing given in em for a font size in CSS px. */
export const track = (em: number, sizePx: number): number => px(em * sizePx);

export const ABS_FILL: Style = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/* ── translucent overlay (replaces bg-white/60 etc.) ───────── */

export function Tint({
  color,
  opacity,
  radius = 0,
}: {
  color: string;
  opacity: number;
  radius?: number;
}) {
  return (
    <View
      style={[ABS_FILL, { backgroundColor: color, opacity, borderRadius: radius }]}
    />
  );
}

/* ── gradients ────────────────────────────────────────────── */

export type GradDirection = "to-r" | "to-b" | "to-br" | "to-bl";

const DIR: Record<GradDirection, { x1: string; y1: string; x2: string; y2: string }> = {
  "to-r": { x1: "0", y1: "0", x2: "1", y2: "0" },
  "to-b": { x1: "0", y1: "0", x2: "0", y2: "1" },
  "to-br": { x1: "0", y1: "0", x2: "1", y2: "1" },
  "to-bl": { x1: "1", y1: "0", x2: "0", y2: "1" },
};

export interface GradStop {
  offset: string; // "0%" … "100%"
  color: string;
  opacity?: number;
}

/** Absolute-fill linear gradient. Put first inside a relative parent. */
export function GradientFill({
  id,
  stops,
  direction = "to-r",
}: {
  id: string;
  stops: GradStop[];
  direction?: GradDirection;
}) {
  const d = DIR[direction];
  return (
    <View style={ABS_FILL}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={id} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}>
            {stops.map((s, i) => (
              <Stop
                key={i}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={s.opacity ?? 1}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url('#${id}')`} />
      </Svg>
    </View>
  );
}

/** Same gradient repeated on every page (page/sidebar backgrounds). */
export function FixedGradient(props: {
  id: string;
  stops: GradStop[];
  direction?: GradDirection;
  style?: Style;
}) {
  return (
    <View fixed style={[ABS_FILL, props.style ?? {}]}>
      <View style={[ABS_FILL, { position: "relative", width: "100%", height: "100%" }]}>
        <GradientFill id={props.id} stops={props.stops} direction={props.direction} />
      </View>
    </View>
  );
}

/** Solid colour repeated on every page (full-bleed bg / sidebar rail). */
export function FixedFill({ color, style }: { color: string; style?: Style }) {
  return <View fixed style={[ABS_FILL, { backgroundColor: color }, style ?? {}]} />;
}

/* ── gradient headline text (bg-clip-text equivalents) ─────── */

export function GradientText({
  id,
  text,
  stops,
  fontSizePx,
  widthPx,
  fontWeight = 800,
  letterSpacingPx = 0,
  align = "left",
  heightPx,
}: {
  id: string;
  text: string;
  stops: GradStop[];
  fontSizePx: number;
  /** available line width in CSS px (needed to centre) */
  widthPx: number;
  fontWeight?: number;
  letterSpacingPx?: number;
  align?: "left" | "center";
  heightPx?: number;
}) {
  const h = px(heightPx ?? Math.ceil(fontSizePx * 1.18));
  const w = px(widthPx);
  // SVG text cannot wrap; shrink very long names to keep one line.
  const estimated = text.length * fontSizePx * 0.62 + text.length * letterSpacingPx;
  const size = estimated > widthPx ? fontSizePx * (widthPx / estimated) : fontSizePx;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {stops.map((s, i) => (
            <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
          ))}
        </LinearGradient>
      </Defs>
      <Text
        x={align === "center" ? w / 2 : 0}
        y={px(fontSizePx) * 0.93 - (px(fontSizePx) - px(size)) * 0.45}
        textAnchor={align === "center" ? "middle" : "start"}
        style={{
          fontFamily: INTER,
          fontWeight,
          fontSize: px(size),
          letterSpacing: px(letterSpacingPx),
        }}
        fill={`url('#${id}')`}
      >
        {text}
      </Text>
    </Svg>
  );
}

/* ── tiny vector glyphs (replace ▸ ● ★ ✦ ✉ ☎ ⌂ text symbols) ── */

function Glyph({
  sizePx,
  color,
  d,
  filled,
  strokeWidth = 2,
  style,
}: {
  sizePx: number;
  color: string;
  d: string | string[];
  filled?: boolean;
  strokeWidth?: number;
  style?: Style;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <Svg viewBox="0 0 24 24" style={[{ width: px(sizePx), height: px(sizePx) }, style ?? {}]}>
      {paths.map((p, i) => (
        <Path
          key={i}
          d={p}
          fill={filled ? color : "none"}
          stroke={filled ? "none" : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export const IconEnvelope = (p: { sizePx: number; color: string; style?: Style }) => (
  <Glyph {...p} d={["M2 5h20v14H2z", "M2 6l10 7L22 6"]} />
);

export const IconPhone = (p: { sizePx: number; color: string; style?: Style }) => (
  <Glyph
    {...p}
    filled
    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
  />
);

export const IconHouse = (p: { sizePx: number; color: string; style?: Style }) => (
  <Glyph {...p} d={["M3 10.5L12 3l9 7.5", "M5 10v11h14V10"]} />
);

export const IconStar = (p: { sizePx: number; color: string; style?: Style }) => (
  <Glyph
    {...p}
    filled
    d="M12 2l2.94 6.36 6.96.6-5.27 4.57 1.58 6.81L12 16.9l-6.21 3.44 1.58-6.81L2.1 8.96l6.96-.6L12 2z"
  />
);

export const IconStar4 = (p: { sizePx: number; color: string; style?: Style }) => (
  <Glyph {...p} filled d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6L12 1z" />
);

export const IconTriangleRight = (p: { sizePx: number; color: string; style?: Style }) => (
  <Glyph {...p} filled d="M7 4l12 8-12 8z" />
);

/* ── shapes ───────────────────────────────────────────────── */

export function Dot({
  sizePx,
  color,
  style,
}: {
  sizePx: number;
  color: string;
  style?: Style;
}) {
  return (
    <View
      style={[
        { width: px(sizePx), height: px(sizePx), borderRadius: px(sizePx) / 2, backgroundColor: color },
        style ?? {},
      ]}
    />
  );
}

export function Diamond({
  sizePx,
  color,
  style,
  opacity,
}: {
  sizePx: number;
  color: string;
  style?: Style;
  opacity?: number;
}) {
  return (
    <View
      style={[
        {
          width: px(sizePx),
          height: px(sizePx),
          backgroundColor: color,
          transform: "rotate(45deg)",
          ...(opacity !== undefined ? { opacity } : {}),
        },
        style ?? {},
      ]}
    />
  );
}

/* ── bullet lists ─────────────────────────────────────────── */

export type BulletMarker = "disc-inside" | "disc-outside" | "square" | "dot-sm" | "triangle";

/**
 * Bullet list matching the browser's list rendering.
 * - disc-inside  → `list-disc list-inside` (marker inline, wraps under it)
 * - disc-outside → `list-disc ml-N` (gutter, wraps aligned past marker)
 * - square       → `list-style-type: square`
 * - dot-sm       → Minimal1's small round pseudo-marker
 * - triangle     → Creative2's ▸ marker
 */
export function Bullets({
  items,
  textStyle,
  marker = "disc-outside",
  markerColor,
  gutterPx = 16,
  itemGapPx = 2,
  style,
}: {
  items: string[];
  textStyle: Style;
  marker?: BulletMarker;
  markerColor?: string;
  gutterPx?: number;
  itemGapPx?: number;
  style?: Style;
}) {
  const clean = items.filter((b) => b.trim());
  if (clean.length === 0) return null;
  const mColor = markerColor ?? (textStyle.color as string) ?? "#000";
  const fSize = (textStyle.fontSize as number) ?? px(12);

  if (marker === "disc-inside") {
    return (
      <View style={[{ gap: px(itemGapPx) }, style ?? {}]}>
        {clean.map((b, i) => (
          <Text key={i} style={textStyle}>
            {`•  ${b}`}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={[{ gap: px(itemGapPx) }, style ?? {}]}>
      {clean.map((b, i) => (
        <View key={i} style={{ flexDirection: "row" }}>
          <View
            style={{
              width: px(gutterPx),
              flexShrink: 0,
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingRight: px(5),
            }}
          >
            {marker === "square" ? (
              <View
                style={{
                  width: fSize * 0.38,
                  height: fSize * 0.38,
                  backgroundColor: mColor,
                  marginTop: fSize * 0.45,
                }}
              />
            ) : marker === "dot-sm" ? (
              <Dot sizePx={4} color={mColor} style={{ marginTop: fSize * 0.5 }} />
            ) : marker === "triangle" ? (
              <IconTriangleRight
                sizePx={(fSize / 0.75) * 0.7}
                color={mColor}
                style={{ marginTop: fSize * 0.18 }}
              />
            ) : (
              <Text style={{ ...textStyle, color: mColor }}>•</Text>
            )}
          </View>
          <Text style={[textStyle, { flex: 1 }]}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── page-break control ───────────────────────────────────── */

/** Rough rendered height (CSS px) of an entry's text content. */
function estimateEntryHeightPx(entry: { bullets?: string[]; description?: string }): number {
  const texts = [...(entry.bullets ?? []), entry.description ?? ""].filter(Boolean);
  const textLines = texts.reduce((n, t) => n + Math.ceil(t.length / 85), 0);
  return (2 + textLines) * 22 + 24; // header lines + body lines + spacing
}

/** `wrap` value for an experience/project entry: keep the whole entry
    on one page (title, dates and bullets never separate — no orphaned
    date rows, no lone spilled lines) unless the entry is so tall that
    forcing it onto one page would waste half the sheet. */
export function wrapEntry(entry: { bullets?: string[]; description?: string }): boolean {
  return estimateEntryHeightPx(entry) > 520;
}

/* ── layout helpers ───────────────────────────────────────── */

/** `flex justify-between items-start/baseline` row where the right
    side is a date that must never collide with the left block. */
export function BetweenRow({
  left,
  right,
  rightStyle,
  style,
  wrap,
}: {
  left: ReactNode;
  right?: string;
  rightStyle?: Style;
  style?: Style;
  /** Pass false to keep the row atomic — never split across pages. */
  wrap?: boolean;
}) {
  return (
    <View
      {...(wrap === false ? { wrap: false } : {})}
      style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, style ?? {}]}
    >
      <View style={{ flex: 1, paddingRight: px(8) }}>{left}</View>
      {right ? (
        <Text style={[{ flexShrink: 0, textAlign: "right" }, rightStyle ?? {}]}>{right}</Text>
      ) : null}
    </View>
  );
}

export function joinPresent(parts: Array<string | undefined | null>, sep: string): string {
  return parts.filter(Boolean).join(sep);
}
