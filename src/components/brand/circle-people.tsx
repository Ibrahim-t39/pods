// [U1] "Circle people" illustrations (BRAND §8): a circle is a person's world, the white dot is the person.
// No faces, no bodies. A dashed circle = an open seat. Overlaps multiply, as in the logo.
//   seat      two circles + a dashed one ("a seat for you"), empty states
//   ring      a ring of 6-10 circles = a pod
//   repeat    two circles that overlap more each time (hangout #1 → #3), the Repeat illustration
//   waitlist  a ring with `filled` of `total` seats taken
"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export type CirclePeopleVariant = "seat" | "ring" | "repeat" | "waitlist";

export interface CirclePeopleProps {
  variant?: CirclePeopleVariant;
  size?: number;
  className?: string;
  /** ring / waitlist */
  total?: number;
  filled?: number;
  /** repeat: 1-3 (how far the circles have come together) */
  step?: 1 | 2 | 3;
  animate?: boolean;
  title?: string;
}

const HUE = ["var(--pods-ember)", "var(--pods-signal)", "var(--pods-grove)"];
const bouncy = { type: "spring", stiffness: 260, damping: 18 } as const;

export function CirclePeople({ variant = "seat", size = 160, className, total = 8, filled = 5, step = 2, animate = true, title }: CirclePeopleProps) {
  const reduce = useReducedMotion();
  const anim = animate && !reduce;
  const enter = (i: number, from?: { x?: number; y?: number }) =>
    anim
      ? {
          initial: { opacity: 0, scale: 0.4, x: from?.x ?? 0, y: from?.y ?? 0 },
          animate: { opacity: 1, scale: 1, x: 0, y: 0 },
          transition: { ...bouncy, delay: 0.08 + i * 0.09 },
        }
      : {};
  const fillBox = { transformBox: "fill-box", transformOrigin: "center" } as const;

  let body: React.ReactNode = null;

  if (variant === "seat") {
    body = (
      <>
        <g style={{ isolation: "isolate" }}>
          <motion.circle cx={70} cy={92} r={38} fill={HUE[0]} style={{ ...fillBox, mixBlendMode: "multiply" }} {...enter(0, { x: -30 })} />
          <motion.circle cx={118} cy={92} r={38} fill={HUE[2]} style={{ ...fillBox, mixBlendMode: "multiply" }} {...enter(1, { x: 30 })} />
        </g>
        <motion.circle
          cx={94}
          cy={48}
          r={36}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth={3}
          strokeDasharray="7 7"
          style={fillBox}
          {...(anim ? { initial: { opacity: 0, rotate: -40 }, animate: { opacity: 1, rotate: 0 }, transition: { delay: 0.4, duration: 0.8 } } : {})}
        />
        <motion.circle cx={58} cy={100} r={8} fill="var(--neutral-0)" style={fillBox} {...enter(2)} />
        <motion.circle cx={130} cy={100} r={8} fill="var(--neutral-0)" style={fillBox} {...enter(3)} />
        <motion.circle
          cx={94}
          cy={42}
          r={8}
          fill="var(--color-primary)"
          style={fillBox}
          {...(anim
            ? { initial: { scale: 0 }, animate: { scale: [0, 1.3, 1] }, transition: { delay: 0.8, duration: 0.5 } }
            : {})}
        />
      </>
    );
  } else if (variant === "ring" || variant === "waitlist") {
    const n = Math.max(3, Math.min(10, total));
    const on = variant === "ring" ? n : Math.max(0, Math.min(n, filled));
    body = (
      <g style={{ isolation: "isolate" }}>
        {Array.from({ length: n }, (_, i) => {
          const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
          const x = 94 + Math.cos(a) * 52;
          const y = 80 + Math.sin(a) * 52;
          const taken = i < on;
          return (
            <motion.g key={i} style={fillBox} {...enter(i, { x: (94 - x) * 0.6, y: (80 - y) * 0.6 })}>
              {taken ? (
                <>
                  <circle cx={x} cy={y} r={20} fill={HUE[i % 3]} style={{ mixBlendMode: "multiply" }} opacity={0.92} />
                  <circle cx={x} cy={y} r={5.5} fill="var(--neutral-0)" />
                </>
              ) : (
                <circle cx={x} cy={y} r={19} fill="none" stroke="var(--color-border-strong)" strokeWidth={2.5} strokeDasharray="5 5" />
              )}
            </motion.g>
          );
        })}
        {variant === "waitlist" && (
          <text x={94} y={88} textAnchor="middle" className="tabular" style={{ font: "800 24px var(--font-display)", fill: "var(--color-text)" }}>
            {on}/{n}
          </text>
        )}
      </g>
    );
  } else {
    // repeat: offsets for hangout #1 → #3
    const gap = step === 1 ? 62 : step === 2 ? 44 : 28;
    body = (
      <g style={{ isolation: "isolate" }}>
        <motion.circle
          cy={80}
          r={44}
          fill={HUE[0]}
          style={{ ...fillBox, mixBlendMode: "multiply" }}
          initial={anim ? { cx: 94 - 80 } : false}
          animate={{ cx: 94 - gap }}
          transition={{ type: "spring", stiffness: 170, damping: 26, delay: 0.15 }}
        />
        <motion.circle
          cy={80}
          r={44}
          fill={HUE[1]}
          style={{ ...fillBox, mixBlendMode: "multiply" }}
          initial={anim ? { cx: 94 + 80 } : false}
          animate={{ cx: 94 + gap }}
          transition={{ type: "spring", stiffness: 170, damping: 26, delay: 0.15 }}
        />
        <motion.circle cy={88} r={8} fill="var(--neutral-0)" initial={anim ? { cx: 94 - 92 } : false} animate={{ cx: 94 - gap - 12 }} transition={{ type: "spring", stiffness: 170, damping: 26, delay: 0.15 }} />
        <motion.circle cy={88} r={8} fill="var(--neutral-0)" initial={anim ? { cx: 94 + 92 } : false} animate={{ cx: 94 + gap + 12 }} transition={{ type: "spring", stiffness: 170, damping: 26, delay: 0.15 }} />
      </g>
    );
  }

  return (
    <svg
      viewBox="0 0 188 160"
      width={size}
      height={(size * 160) / 188}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("block overflow-visible", className)}
    >
      {body}
    </svg>
  );
}
