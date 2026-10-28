// The signature motion (founder note 9c): people moving together.
//   <Converge />  the logo's three circles, each with its white dot (the person), drift from apart into the logo's
//                 overlap. Overlaps are mixed in OKLCH (pink, gold, teal) and the centre where all three meet turns
//                 light: the pod. Geometry = brand/mark.svg (r 97, dots r 24). Used by the hero and "Finding your pod".
//   <Huddle />    four people of one pod: solid discs in a light tint of the pod's hue (founder note 11: never washed-out
//                 glass), multiplied on paper so each overlap deepens in the same hue (two people = mid blue, all four =
//                 deep blue), never mud. Names sit with each person while apart.
//                 Apart while the plan waits, together at the lock, closer still after round two.
// Transform-free: only SVG geometry attributes and opacity animate. Reduced motion renders the end state.
"use client";

import { useEffect, useId } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useCalmMotion } from "@/components/brand/motion";
import { cn } from "@/lib/cn";

const C = { x: 404, y: 431 };
const R = 97;
const DOT_R = 24;
// angle (deg, svg y-down) and distance of each circle from the mark centre, and its dot offset (mark.svg)
const P = {
  ember: { a: -90, d: 76, dot: [0, -38] },
  signal: { a: 152.2, d: 81.4, dot: [-32, 15] },
  grove: { a: 27.8, d: 81.4, dot: [32, 15] },
} as const;
type K = keyof typeof P;

/** p: 0 = apart, 1 = the logo, >1 = closer than the logo (repeat). */
function at(k: K, p: number) {
  const spread = p <= 1 ? 2.15 - 1.15 * p : Math.max(0.6, 1 - (p - 1) * 0.8);
  const rot = p < 1 ? (1 - p) * 34 : 0;
  const a = ((P[k].a + rot) * Math.PI) / 180;
  return { x: C.x + Math.cos(a) * P[k].d * spread, y: C.y + Math.sin(a) * P[k].d * spread };
}

function usePos(p: MotionValue<number>, k: K) {
  const cx = useTransform(p, (v) => at(k, v).x);
  const cy = useTransform(p, (v) => at(k, v).y);
  const dx = useTransform(p, (v) => at(k, v).x + P[k].dot[0]);
  const dy = useTransform(p, (v) => at(k, v).y + P[k].dot[1]);
  return { cx, cy, dx, dy };
}

export interface ConvergeProps {
  /** where the circles settle: 0 apart, 1 the logo, up to 1.4 closer */
  to?: number;
  /** where they start (first paint) */
  from?: number;
  /** seconds */
  duration?: number;
  delay?: number;
  /** label that lands in the centre (the pod) */
  center?: React.ReactNode;
  className?: string;
  /** replays when this changes */
  playKey?: string | number;
}

export function Converge({ to = 1, from = 0, duration = 1.8, delay = 0.2, center, className, playKey }: ConvergeProps) {
  const calm = useCalmMotion();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const p = useMotionValue(from);
  useEffect(() => {
    if (calm) {
      p.set(to);
      return;
    }
    const c = animate(p, to, { duration, delay, ease: [0.33, 0, 0.15, 1] });
    return () => c.stop();
  }, [calm, to, duration, delay, p, playKey]);

  const e = usePos(p, "ember");
  const s = usePos(p, "signal");
  const g = usePos(p, "grove");
  const ov = useTransform(p, [0.35, 0.9], [0, 1]);
  const lab = useTransform(p, [0.85, 1], [0, 1]);

  return (
    <div className={cn("cv", className)}>
      <svg viewBox={`${C.x - 290} ${C.y - 290} 580 580`} className="cv-svg" aria-hidden>
        <defs>
          <clipPath id={`${id}e`}>
            <motion.circle cx={e.cx} cy={e.cy} r={R} />
          </clipPath>
          <clipPath id={`${id}s`}>
            <motion.circle cx={s.cx} cy={s.cy} r={R} />
          </clipPath>
          <clipPath id={`${id}es`} clipPath={`url(#${id}e)`}>
            <motion.circle cx={s.cx} cy={s.cy} r={R} />
          </clipPath>
        </defs>
        <motion.circle cx={e.cx} cy={e.cy} r={R} className="cv-c cv-ember" />
        <motion.circle cx={s.cx} cy={s.cy} r={R} className="cv-c cv-signal" />
        <motion.circle cx={g.cx} cy={g.cy} r={R} className="cv-c cv-grove" />
        <motion.g style={{ opacity: ov }}>
          <g clipPath={`url(#${id}e)`}>
            <motion.circle cx={s.cx} cy={s.cy} r={R} className="cv-es" />
            <motion.circle cx={g.cx} cy={g.cy} r={R} className="cv-eg" />
          </g>
          <g clipPath={`url(#${id}s)`}>
            <motion.circle cx={g.cx} cy={g.cy} r={R} className="cv-sg" />
          </g>
          <g clipPath={`url(#${id}es)`}>
            <motion.circle cx={g.cx} cy={g.cy} r={R} className="cv-all" />
          </g>
        </motion.g>
        <motion.circle cx={e.dx} cy={e.dy} r={DOT_R} className="cv-dot" />
        <motion.circle cx={s.dx} cy={s.dy} r={DOT_R} className="cv-dot" />
        <motion.circle cx={g.dx} cy={g.dy} r={DOT_R} className="cv-dot" />
      </svg>
      {center && (
        <motion.span className="cv-center" style={{ opacity: lab }}>
          {center}
        </motion.span>
      )}
    </div>
  );
}

/* ── Huddle: four people of one pod ─────────────────────────────────────────────────────────────────────────── */
const HR = 62;
const SEATS = [
  { a: 225, name: 0 },
  { a: 315, name: 1 },
  { a: 45, name: 2 },
  { a: 135, name: 3 },
];

export interface HuddleProps {
  /** people present (3 before you, 4 with you) */
  n: 3 | 4;
  /** 0 apart, 1 locked together, 1.4 after round two */
  close: number;
  names: [string, string, string, string];
  className?: string;
}

function hpos(a: number, close: number) {
  const d = close <= 1 ? 128 - 78 * close : Math.max(30, 50 - (close - 1) * 70);
  const r = (a * Math.PI) / 180;
  return { x: 200 + Math.cos(r) * d, y: 200 + Math.sin(r) * d };
}

function Person({ a, close, you, present, name, calm }: { a: number; close: number; you: boolean; present: boolean; name: string; calm: boolean }) {
  const c = useMotionValue(close);
  useEffect(() => {
    if (calm) {
      c.set(close);
      return;
    }
    const ctl = animate(c, close, { type: "spring", stiffness: 70, damping: 18 });
    return () => ctl.stop();
  }, [close, calm, c]);
  const cx = useTransform(c, (v) => hpos(a, v).x);
  const cy = useTransform(c, (v) => hpos(a, v).y);
  // the dot sits toward the outside, like the logo: the person, in their own world
  const dx = useTransform(c, (v) => hpos(a, v).x + Math.cos((a * Math.PI) / 180) * 22);
  const dy = useTransform(c, (v) => hpos(a, v).y + Math.sin((a * Math.PI) / 180) * 22);
  const ty = useTransform(c, (v) => hpos(a, v).y + (Math.sin((a * Math.PI) / 180) > 0 ? HR + 26 : -HR - 14));
  const tOp = useTransform(c, [0, 0.5], [1, 0]);
  return (
    <motion.g
      initial={false}
      animate={present ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: calm ? 0 : 0.4 }}
    >
      <motion.circle cx={cx} cy={cy} r={HR} className="hd-c" />
      <motion.circle cx={dx} cy={dy} r={14} className={you ? "hd-dot hd-you-dot" : "hd-dot"} />
      <motion.text x={cx} y={ty} textAnchor="middle" className="hd-name" style={{ opacity: tOp }}>
        {name}
      </motion.text>
    </motion.g>
  );
}

export function Huddle({ n, close, names, className }: HuddleProps) {
  const calm = useCalmMotion();
  return (
    <svg viewBox="0 0 400 400" className={cn("hd", className)} aria-hidden>
      {SEATS.map((s, i) => (
        <g key={i}>
          {i === 3 && n < 4 && <circle cx={hpos(s.a, close).x} cy={hpos(s.a, close).y} r={HR - 1} className="hd-open" />}
          <Person a={s.a} close={close} you={i === 3} present={i < 3 || n === 4} name={names[i]} calm={calm} />
        </g>
      ))}
    </svg>
  );
}
