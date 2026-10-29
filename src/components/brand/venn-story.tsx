// <VennStory progress={p} />: the logo told as a story, driven by scroll (COLOR_LIFE §12.1; the thesis in one object).
// Three circles are three people, each with their own world. As you scroll:
//   0.00  apart        three worlds, drifting (a slow quarter-turn as they come in)
//   0.30  fit          they drift together and overlap; glass orbs, so where they meet is brighter (COLOR_LIFE §15)
//   0.55  the plan     a blue ring closes around them and four seats fill (the lock, the signature moment)
//   0.85  repeat       the overlaps deepen, the centre fills (the pod), a second worn ring is drawn one step out
// `progress` is a 0..1 MotionValue (useScroll on the story section). Transform and opacity only, no layout.
// Reduced motion: the circles rest in the logo position; only the rings and depth follow scroll (no travel).
// Colours are the logo's own tokens; each circle is a glass orb with its person (the white dot) inside.
"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { useId } from "react";

const C = 300; // viewBox centre
const R = 120; // circle radius
// logo arrangement: ember on top, blue bottom-left, green bottom-right
const CIRCLES = [
  { key: "ember", hue: "var(--pods-ember)", angle: -90 },
  { key: "signal", hue: "var(--pods-signal)", angle: 150 },
  { key: "grove", hue: "var(--pods-grove)", angle: 30 },
] as const;
// the four seats on the ring: you at 6 o'clock, then the three others
const SEATS = [
  { angle: 90, fill: "var(--spark)", at: 0.5 },
  { angle: 200, fill: "var(--color-signal-text)", at: 0.52 },
  { angle: 270, fill: "var(--color-grove)", at: 0.54 },
  { angle: 340, fill: "var(--teal)", at: 0.56 },
] as const;

const P = [0, 0.3, 0.55, 0.85, 1];
// the person inside each world: the logo's white dots (mark.svg: circle r 97, dot r 24 at (0,-38), (-32,15), (32,15)),
// scaled to R
const K = R / 97;
const DOTS = [
  { dx: 0, dy: -38 * K },
  { dx: -32 * K, dy: 15 * K },
  { dx: 32 * K, dy: 15 * K },
] as const;
const DOT_R = 24 * K;

function Person({ x, y, dx, dy }: { x: MotionValue<number>; y: MotionValue<number>; dx: number; dy: number }) {
  const cx = useTransform(x, (v) => v + dx);
  const cy = useTransform(y, (v) => v + dy);
  return <motion.circle cx={cx} cy={cy} r={DOT_R} fill="white" style={{ filter: "drop-shadow(0 2px 3px rgb(14 26 34 / .16))" }} />;
}

function useCircle(progress: MotionValue<number>, angle: number, reduced: boolean) {
  // distance of each circle's centre from the middle, then a drift rotation that settles to 0
  const dist = useTransform(progress, P, reduced ? [76, 76, 74, 60, 60] : [205, 80, 74, 60, 60]);
  const turn = useTransform(progress, [0, 0.3], reduced ? [0, 0] : [-28, 0]);
  const x = useTransform([dist, turn] as MotionValue<number>[], ([d, t]: number[]) => C + d * Math.cos(((angle + t) * Math.PI) / 180));
  const y = useTransform([dist, turn] as MotionValue<number>[], ([d, t]: number[]) => C + d * Math.sin(((angle + t) * Math.PI) / 180));
  return { x, y };
}

export function VennStory({ progress, reduced = false, className }: { progress: MotionValue<number>; reduced?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const a = useCircle(progress, CIRCLES[0].angle, reduced);
  const b = useCircle(progress, CIRCLES[1].angle, reduced);
  const c = useCircle(progress, CIRCLES[2].angle, reduced);
  const pos = [a, b, c];
  // depth: what they share grows (fill strength), and the whole cluster breathes up slightly when it fits
  const fillOpacity = useTransform(progress, P, [1, 0.92, 0.96, 1, 1]);
  // the pod: where all three meet lights up warm (a saved seat, the lamp on) as the repeat scene settles
  const core = useTransform(progress, [0.82, 0.9], [0, 1]);
  const coreScale = useTransform(progress, [0.82, 0.9], reduced ? [1, 1] : [0.7, 1]);
  const scale = useTransform(progress, P, reduced ? [1, 1, 1, 1, 1] : [0.86, 1, 1, 1.04, 1.04]);
  // ring #1 (the lock) and ring #2 (repeat, worn, one step out)
  const ring1 = useTransform(progress, [0.44, 0.58], [0, 1]);
  const ring1Opacity = useTransform(progress, [0.42, 0.46, 0.8, 0.9], [0, 1, 1, 0.35]);
  const ring2 = useTransform(progress, [0.72, 0.88], [0, 1]);
  const ring2Opacity = useTransform(progress, [0.7, 0.74], [0, 1]);
  const ringR = 74 + R + 34;

  return (
    <motion.svg viewBox="0 0 600 600" className={className} style={{ scale, overflow: "visible" }} aria-hidden focusable="false">
      <defs>
        {CIRCLES.map((k) => (
          <radialGradient key={k.key} id={`${uid}-${k.key}`} cx="50%" cy="50%" r="50%">
            {/* flat and solid, like the landing (founder: fewer bubbles; bubbles were "too transparent") */}
            <stop offset="0%" style={{ stopColor: k.hue, stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: k.hue, stopOpacity: 0.9 }} />
          </radialGradient>
        ))}
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        {/* the clip for the centre: the intersection of all three circles (nested clips) */}
        {CIRCLES.map((k, i) => (
          <clipPath key={k.key} id={`${uid}-clip-${k.key}`}>
            <motion.circle r={R} cx={pos[i].x} cy={pos[i].y} />
          </clipPath>
        ))}
        <radialGradient id={`${uid}-core`} cx="50%" cy="46%" r="62%">
          <stop offset="0%" style={{ stopColor: "var(--lamp)" }} />
          <stop offset="38%" style={{ stopColor: "color-mix(in oklch, var(--pods-ember) 34%, var(--lamp))" }} />
          <stop offset="100%" style={{ stopColor: "color-mix(in oklch, var(--pods-ember) 78%, var(--pods-signal))" }} />
        </radialGradient>
      </defs>

      {/* ring #2: repeat, one step out, worn */}
      <motion.circle
        cx={C}
        cy={C}
        r={ringR + 22}
        fill="none"
        stroke="var(--ink-3)"
        strokeWidth={2}
        strokeDasharray="1 0"
        style={{ pathLength: ring2, opacity: ring2Opacity, rotate: -90, transformOrigin: "300px 300px" }}
      />
      {/* ring #1: the plan closing, in the blue of the period */}
      <motion.circle
        cx={C}
        cy={C}
        r={ringR}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={4}
        strokeLinecap="round"
        style={{ pathLength: ring1, opacity: ring1Opacity, rotate: 90, transformOrigin: "300px 300px" }}
      />

      {/* the three worlds as flat, solid circles, each with its person (the logo's white dot, same placement as mark.svg) */}
      <g style={{ isolation: "isolate" }}>
        {CIRCLES.map((k, i) => (
          <motion.circle key={k.key} r={R} cx={pos[i].x} cy={pos[i].y} fill={`url(#${uid}-${k.key})`} style={{ opacity: fillOpacity }} />
        ))}
        {CIRCLES.map((k, i) => (
          <Person key={k.key} x={pos[i].x} y={pos[i].y} dx={DOTS[i].dx} dy={DOTS[i].dy} />
        ))}
      </g>

      {/* the pod: the shared centre, lit (scene 4). Clipped to exactly where all three overlap. */}
      <g clipPath={`url(#${uid}-clip-ember)`}>
        <g clipPath={`url(#${uid}-clip-signal)`}>
          <g clipPath={`url(#${uid}-clip-grove)`}>
            <motion.circle cx={C} cy={C + 14} r={R} fill={`url(#${uid}-core)`} style={{ opacity: core, scale: coreScale, transformOrigin: "300px 314px" }} />
          </g>
        </g>
      </g>

      {/* the four seats fill as the ring closes: four "I'm in" */}
      {SEATS.map((s) => (
        <Seat key={s.angle} progress={progress} angle={s.angle} fill={s.fill} at={s.at} r={ringR} />
      ))}
    </motion.svg>
  );
}

function Seat({ progress, angle, fill, at, r }: { progress: MotionValue<number>; angle: number; fill: string; at: number; r: number }) {
  const s = useTransform(progress, [at, at + 0.03], [0, 1]);
  const cx = C + r * Math.cos((angle * Math.PI) / 180);
  const cy = C + r * Math.sin((angle * Math.PI) / 180);
  return (
    <motion.g style={{ scale: s, opacity: s, transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={17} fill={fill} stroke="var(--stage)" strokeWidth={4} />
      <circle cx={cx - 5} cy={cy - 6} r={7} fill="white" opacity={0.32} />
    </motion.g>
  );
}
