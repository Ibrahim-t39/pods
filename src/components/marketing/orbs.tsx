// <Orbs p={mv} />: the logo's three circles as glossy spheres, each with its white dot (the person).
// p: 0 = apart, 1 = the logo (the pod), up to 1.3 = closer still. Driven by scroll or by a timed animation.
// Pointer: the stage tilts a few degrees and each sphere shifts by its own depth, so the group feels physical.
// Transform and opacity only (positions are translate % of each sphere's own size). Reduced motion: p is what the
// caller sets, pointer and idle float are off.
"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useCalmMotion } from "@/components/brand/motion";
import { cn } from "@/lib/cn";

// angle (deg, y-down) and distance (in sphere diameters) of each sphere from the group centre: brand/mark.svg
const P = {
  ember: { a: -90, d: 0.392, depth: 1, dot: ["0%", "-19.5%"] },
  signal: { a: 152.2, d: 0.42, depth: 0.55, dot: ["-16.5%", "7.7%"] },
  grove: { a: 27.8, d: 0.42, depth: 0.8, dot: ["16.5%", "7.7%"] },
} as const;
type K = keyof typeof P;
const ORDER: K[] = ["signal", "grove", "ember"];

function at(k: K, p: number) {
  const spread = p <= 1 ? 2.2 - 1.2 * p : Math.max(0.6, 1 - (p - 1) * 0.8);
  const rot = p < 1 ? (1 - p) * 40 : 0;
  const a = ((P[k].a + rot) * Math.PI) / 180;
  return { x: Math.cos(a) * P[k].d * spread * 100, y: Math.sin(a) * P[k].d * spread * 100 };
}

function Sphere({ k, p, mx, my, settle, calm }: { k: K; p: MotionValue<number>; mx: MotionValue<number>; my: MotionValue<number>; settle: number; calm: boolean }) {
  const d = P[k].depth * 7;
  const x = useTransform(() => `${at(k, p.get()).x + mx.get() * d}%`);
  const y = useTransform(() => `${at(k, p.get()).y + my.get() * d}%`);
  return (
    <motion.span className="ho-pos" style={{ x, y }}>
      <span className="ho-float" data-k={k} data-calm={calm ? "" : undefined}>
        <motion.span
          key={settle}
          className="ho-orb"
          data-hue={k}
          initial={false}
          animate={settle && !calm ? { scaleX: [1, 1.07, 0.97, 1], scaleY: [1, 0.93, 1.03, 1] } : { scaleX: 1, scaleY: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: k === "ember" ? 0 : k === "signal" ? 0.06 : 0.12 }}
        >
          <i className="ho-dot" style={{ left: `calc(50% + ${P[k].dot[0]})`, top: `calc(50% + ${P[k].dot[1]})` }} />
        </motion.span>
      </span>
    </motion.span>
  );
}

export interface OrbsProps {
  p: MotionValue<number>;
  /** bump to play the lock squash */
  settle?: number;
  /** element whose pointer moves tilt the group (defaults to the orbs box) */
  pointerTarget?: React.RefObject<HTMLElement | null>;
  center?: React.ReactNode;
  className?: string;
}

export function Orbs({ p, settle = 0, pointerTarget, center, className }: OrbsProps) {
  const calm = useCalmMotion();
  const box = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mx = useSpring(rx, { stiffness: 90, damping: 18, mass: 0.6 });
  const my = useSpring(ry, { stiffness: 90, damping: 18, mass: 0.6 });
  const rotY = useTransform(mx, (v) => v * 9);
  const rotX = useTransform(my, (v) => v * -9);
  const core = useTransform(p, [0.82, 1], [0, 1]);
  const lab = useTransform(p, [0.9, 1], [0, 1]);

  useEffect(() => {
    if (calm) return;
    const el = pointerTarget?.current ?? box.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      rx.set(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)));
      ry.set(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)));
    };
    const leave = () => {
      rx.set(0);
      ry.set(0);
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [calm, pointerTarget, rx, ry]);

  return (
    <div ref={box} className={cn("ho", className)} aria-hidden>
      <motion.div className="ho-tilt" style={{ rotateX: rotX, rotateY: rotY }}>
        <motion.span className="ho-core" style={{ opacity: core }} />
        {ORDER.map((k) => (
          <Sphere key={k} k={k} p={p} mx={mx} my={my} settle={settle} calm={calm} />
        ))}
        {center && (
          <motion.span className="ho-label" style={{ opacity: lab }}>
            {center}
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
