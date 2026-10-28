// [U1] ThreeCircleArt: the procedural pod cover (BLUEPRINT §2.8). Seeded by pod id, so a pod always looks the same.
// Three translucent glossy discs in the pod hue family + one white dot per member on a ring (up to 10).
// At ≤ 36px it draws only the 3 discs + 3 dots, so every cover still reads at avatar size. Squircle crop.
import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { seededRandom } from "@/lib/ids";

export type PodHueName = "ember" | "grove" | "signal";

export interface ThreeCircleArtProps {
  seed: string;
  hue?: PodHueName;
  /** Member count → white dots on the ring (max 10). Omit for 8. */
  members?: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Squircle (default), circle, or none (fill the parent, e.g. a hero banner). */
  shape?: "squircle" | "circle" | "none";
  title?: string;
}

const RAMP: Record<PodHueName, { bg0: string; bg1: string; a: string; b: string; c: string; deep: string }> = {
  // pod families (COLOR_LIFE §4): key "ember" = tide (blue + teal), "grove" = grove (green + teal), "signal" = dusk (ember + plum + blue)
  ember: { bg0: "var(--color-signal-soft)", bg1: "var(--color-signal-soft-border)", a: "var(--signal-500)", b: "var(--teal-300)", c: "var(--teal-500)", deep: "var(--teal-800)" },
  grove: { bg0: "var(--color-grove-soft)", bg1: "var(--color-grove-soft-border)", a: "var(--grove-500)", b: "var(--teal-300)", c: "var(--teal-500)", deep: "var(--teal-900)" },
  signal: { bg0: "var(--color-ember-soft)", bg1: "var(--color-signal-soft-border)", a: "var(--ember-500)", b: "var(--signal-400)", c: "var(--plum)", deep: "var(--plum)" },
};

export function ThreeCircleArt({
  seed,
  hue = "ember",
  members = 8,
  size = 56,
  className,
  style,
  shape = "squircle",
  title,
}: ThreeCircleArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rnd = seededRandom(`${seed}:${hue}`);
  const j = (n: number) => (rnd() - 0.5) * n;
  const small = size <= 36;
  const p = RAMP[hue];

  // Triangle of discs, rotated and jittered per seed so covers differ but keep the mark's family resemblance.
  const rot = rnd() * Math.PI * 2;
  const spread = 16 + rnd() * 4;
  const discR = 23 + rnd() * 3;
  const cx = 50 + j(6);
  const cy = 52 + j(6);
  const discs = [0, 1, 2].map((i) => {
    const a = rot + (i * Math.PI * 2) / 3;
    return { x: cx + Math.cos(a) * spread, y: cy + Math.sin(a) * spread, r: discR + j(4) };
  });
  const fills = [p.a, p.b, p.c];
  // Fixed-count Fisher-Yates (a random comparator in sort() differs between engines → hydration mismatch).
  const order = [0, 1, 2];
  for (let i = order.length - 1; i > 0; i--) {
    const k = Math.floor(rnd() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }

  const n = Math.max(0, Math.min(10, members));
  const ringR = 27 + rnd() * 3;
  const phase = rnd() * Math.PI * 2;
  const dots = small
    ? discs.map((d) => {
        const a = Math.atan2(d.y - cy, d.x - cx);
        return { x: d.x + Math.cos(a) * d.r * 0.38, y: d.y + Math.sin(a) * d.r * 0.38, r: 6.2 };
      })
    : Array.from({ length: n }, (_, i) => {
        const a = phase + (i / Math.max(1, n)) * Math.PI * 2 + j(0.25);
        return { x: cx + Math.cos(a) * ringR, y: cy + Math.sin(a) * ringR, r: 3.4 };
      });

  const r2 = (n: number) => Math.round(n * 100) / 100;
  discs.forEach((d) => {
    d.x = r2(d.x);
    d.y = r2(d.y);
    d.r = r2(d.r);
  });
  dots.forEach((d) => {
    d.x = r2(d.x);
    d.y = r2(d.y);
  });

  const radius = shape === "squircle" ? "22.37%" : shape === "circle" ? "9999px" : undefined;

  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("relative inline-block shrink-0 overflow-hidden", shape === "none" && "size-full", className)}
      style={{
        width: shape === "none" ? undefined : size,
        height: shape === "none" ? undefined : size,
        borderRadius: radius,
        boxShadow: shape === "none" ? undefined : "var(--shadow-inset-gloss), var(--shadow-xs)",
        ...style,
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor={p.bg0} />
            <stop offset="1" stopColor={p.bg1} />
          </linearGradient>
          {discs.map((_, i) => (
            <radialGradient key={i} id={`${uid}-d${i}`} cx="0.35" cy="0.3" r="0.85">
              <stop offset="0" stopColor="var(--neutral-0)" stopOpacity="0.35" />
              <stop offset="0.45" stopColor={fills[i]} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--neutral-0)" stopOpacity="0.38" />
            <stop offset="0.5" stopColor="var(--neutral-0)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${uid}-bg)`} />
        <g style={{ isolation: "isolate" }}>
          {order.map((i) => (
            <g key={i} style={{ mixBlendMode: "multiply" }}>
              <circle cx={discs[i].x} cy={discs[i].y} r={discs[i].r} fill={fills[i]} opacity={0.9} />
            </g>
          ))}
        </g>
        {order.map((i) => (
          <circle key={`h${i}`} cx={discs[i].x} cy={discs[i].y} r={discs[i].r} fill={`url(#${uid}-d${i})`} />
        ))}
        {dots.map((d, i) => (
          <circle key={`m${i}`} cx={d.x} cy={d.y} r={d.r} fill="var(--neutral-0)" opacity={0.96} />
        ))}
        {/* Glass sheen on the top half (the "gloss" in pod covers, BLUEPRINT §2.6). */}
        <rect width="100" height="100" fill={`url(#${uid}-sheen)`} />
      </svg>
    </span>
  );
}
