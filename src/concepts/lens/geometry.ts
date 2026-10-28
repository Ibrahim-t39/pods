// Lens concept geometry. Everything is laid out in screen px from the viewport, so the SVG plane and the HTML
// captions share one coordinate system. Composition rules: you sit low-left, off-centre (PB 1.1; AW 04/06/12),
// ~70% of the field stays empty (PB 1.2; TS 8/5/49).
import type { Stage } from "./store";
import { HUE, type Hue } from "./data";

export interface C {
  x: number;
  y: number;
  r: number;
}

export const isWide = (W: number) => W >= 900;

export function meCircle(stage: Stage, W: number, H: number): C {
  const wide = isWide(W);
  switch (stage) {
    case "landing":
      return wide ? { x: W * 0.27, y: H * 0.9, r: H * 0.44 } : { x: W * 0.32, y: H * 0.79, r: W * 0.6 };
    case "name":
      return wide ? { x: W * 0.36, y: H * 0.58, r: H * 0.3 } : { x: W * 0.5, y: H * 0.58, r: W * 0.4 };
    case "loves":
    case "roots":
      return wide ? { x: W * 0.3, y: H * 0.64, r: H * 0.28 } : { x: W * 0.46, y: H * 0.77, r: W * 0.36 };
    case "week":
      return wide ? { x: W * 0.38, y: H * 0.57, r: H * 0.34 } : { x: W * 0.5, y: H * 0.6, r: W * 0.43 };
    default:
      return wide ? { x: W * 0.3, y: H * 0.7, r: H * 0.28 } : { x: W * 0.38, y: H * 0.74, r: W * 0.4 };
  }
}

const HOME_ANGLES = [-112, -42, 28];

/** Pod circles for a stage. `apart` = after a hangout the Hoops circle has drifted (0..1). */
export function podCircles(stage: Stage, W: number, H: number, apart = 0): (C & { opacity: number })[] {
  const wide = isWide(W);
  const me = meCircle(stage, W, H);
  if (stage === "landing") {
    // The mark, alive: three inks resting top-right, not touching you yet.
    const cx = wide ? W * 0.8 : W * 0.78;
    const cy = wide ? H * 0.3 : H * 0.2;
    const r = wide ? H * 0.12 : W * 0.13;
    return [
      { x: cx, y: cy - r * 0.62, r, opacity: 1 },
      { x: cx - r * 0.72, y: cy + r * 0.55, r, opacity: 1 },
      { x: cx + r * 0.72, y: cy + r * 0.55, r, opacity: 1 },
    ];
  }
  if (!["faces", "home", "pod", "plan", "lock", "again", "vote", "lock2"].includes(stage)) {
    // Off the top-right edge, waiting.
    const r = me.r * 0.9;
    return [0, 1, 2].map((i) => ({ x: W + r * (1.2 + i * 0.4), y: -r * (0.6 + i * 0.3), r, opacity: 0 }));
  }
  const rp = me.r * 0.9;
  return HOME_ANGLES.map((deg, i) => {
    const lensW = me.r * (i === 0 ? 0.74 - apart * 0.6 : 0.62);
    const d = me.r + rp - lensW;
    const a = (deg * Math.PI) / 180;
    return { x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d, r: rp, opacity: stage === "faces" ? 0 : 1 };
  });
}

/** Centre and size of the lens between you and a pod (along the line of centres). */
export function lensOf(me: C, p: C) {
  const dx = p.x - me.x;
  const dy = p.y - me.y;
  const d = Math.hypot(dx, dy) || 1;
  const m = (d - p.r + me.r) / 2;
  const w = Math.max(0, me.r + p.r - d);
  const a = Math.max(0, (d * d + me.r * me.r - p.r * p.r) / (2 * d));
  const h = 2 * Math.sqrt(Math.max(0, me.r * me.r - a * a));
  return { x: me.x + (dx / d) * m, y: me.y + (dy / d) * m, w, h, angle: Math.atan2(dy, dx) };
}

/** Paper × ink at a density, as a flat colour (for floods that must match the printed lens). */
export function inked(hue: Hue, density: number, paper = [242, 234, 219]) {
  const h = HUE[hue];
  const rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const out = paper.map((p, i) => Math.round(p * (1 - density) + ((p * rgb[i]) / 255) * density));
  return `rgb(${out.join(",")})`;
}

/** Lens density per round: each repeat reprints one tint deeper (max 5). */
export const lensDensity = (rounds: number) => Math.min(0.5 + rounds * 0.11, 0.94);
