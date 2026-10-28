// [U1] Animated Pods logo (BLUEPRINT M20, BRAND §6, ARCHITECTURE §7 signature moment 1).
//   intro    lockup, 2.1s once: circles fly in on a spring and blend where they overlap, the solid overlaps resolve,
//            the dots pop like people joining, the wordmark slides out from behind the mark, the blue period drops
//            and squashes into place.
//   assemble the same gather for the mark alone (reveal, empty states).
//   loader   mark, loops: circles breathe apart and back, the group turns a third (M12, any wait over 1s).
//   splash   lockup on ink, 2.9s once: dots arrive with ripples, circles bloom, the wordmark wipes in.
//   typeon   lockup, 3s once: the period is the cursor that types "pods".
//   breathe  mark, loops gently (idle).
//   orbit    mark, loops: circles spread and orbit the centre (put an avatar in `children`).
// Reduced motion: the static logo (loader keeps a soft dot pulse). Change `replayKey` to replay a one-shot.
"use client";

import "./logo-motion.css";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/cn";
import { MarkShapes, WordmarkShapes } from "./logo";
import { CIRCLES, DOTS, DOT_R, FILL, HUES, LETTERS, MARK_CENTER, OVERLAP, PERIOD, R, VIEWBOX, type Hue } from "./logo-geometry";

export type LogoMotion = "intro" | "assemble" | "loader" | "splash" | "typeon" | "breathe" | "orbit";

export interface LogoAnimatedProps {
  variant?: LogoMotion;
  onDark?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Change to replay a one-shot variant. */
  replayKey?: string | number;
  /** One-shot variants: called once the motion has settled. */
  onComplete?: () => void;
  /** Orbit / loader: content centred over the mark (e.g. the user's avatar). */
  children?: ReactNode;
}

const DURATION: Partial<Record<LogoMotion, number>> = { intro: 2250, assemble: 1500, splash: 2900, typeon: 3000 };

export function LogoAnimated({ variant = "intro", replayKey, ...props }: LogoAnimatedProps) {
  return <LogoAnimatedInner key={`${variant}-${replayKey ?? ""}`} variant={variant} {...props} />;
}

function LogoAnimatedInner({ variant = "intro", onDark, className, style, title = "Pods", onComplete, children }: LogoAnimatedProps) {
  const reduce = useReducedMotion();
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    const ms = DURATION[variant];
    if (!ms) return;
    const t = setTimeout(() => done.current?.(), reduce ? 0 : ms);
    return () => clearTimeout(t);
  }, [variant, reduce]);

  if (variant === "intro" || variant === "assemble") {
    return (
      <Gather lockup={variant === "intro"} onDark={onDark} className={className} style={style} title={title} reduce={!!reduce} />
    );
  }
  return (
    <CssLogo variant={variant} onDark={onDark} className={className} style={style} title={title}>
      {children}
    </CssLogo>
  );
}

/* ── intro / assemble: motion/react ──────────────────────────────────────── */

const FROM: Record<Hue, { x: number; y: number; rotate: number }> = {
  ember: { x: 40, y: -230, rotate: -40 },
  signal: { x: -230, y: 120, rotate: 30 },
  grove: { x: 230, y: 140, rotate: -25 },
};
const bouncy: Transition = { type: "spring", stiffness: 260, damping: 18, mass: 1 };
const snap: Transition = { type: "spring", stiffness: 520, damping: 14 };
/** Lockup centre minus mark centre (viewBox 187..1585 → centre 886; mark centre 404). */
const SHIFT = 482;
const slide: Transition = { type: "spring", stiffness: 140, damping: 22, delay: 0.98 };

function Gather({
  lockup,
  onDark,
  className,
  style,
  title,
  reduce,
}: {
  lockup: boolean;
  onDark?: boolean;
  className?: string;
  style?: CSSProperties;
  title: string;
  reduce: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ink = onDark ? "var(--neutral-0)" : "var(--color-text)";
  const viewBox = lockup ? VIEWBOX.horizontal : VIEWBOX.markRoomy;

  if (reduce) {
    return (
      <motion.svg
        viewBox={viewBox}
        role="img"
        aria-label={title}
        className={cn("block overflow-visible", className)}
        style={style}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <MarkShapes id={id} />
        {lockup && <WordmarkShapes ink={ink} />}
      </motion.svg>
    );
  }

  const c = (k: Hue) => <circle cx={CIRCLES[k].x} cy={CIRCLES[k].y} r={R} />;
  const fillBox: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

  return (
    <svg viewBox={viewBox} role="img" aria-label={title} className={cn("block overflow-visible", className)} style={style}>
      <defs>
        <clipPath id={`${id}-o`}>{c("ember")}</clipPath>
        <clipPath id={`${id}-s`}>{c("signal")}</clipPath>
        <clipPath id={`${id}-os`} clipPath={`url(#${id}-o)`}>
          {c("signal")}
        </clipPath>
        {/* The wordmark slides out from behind the mark: everything left of the reveal edge is hidden. */}
        <clipPath id={`${id}-wm`}>
          <motion.rect x={470} y={150} width={1100} height={520} initial={{ x: SHIFT }} animate={{ x: 0 }} transition={slide} />
        </clipPath>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--neutral-0)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--neutral-0)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Wordmark first, so it slides out from underneath the mark. */}
      {lockup && (
        <>
          <g clipPath={`url(#${id}-wm)`} fill={ink}>
            {/* The word slides out as one piece; each letter adds a small staggered rise so it lands with life. */}
            <motion.g initial={{ x: -260 }} animate={{ x: 0 }} transition={slide}>
              {LETTERS.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  style={fillBox}
                  initial={{ y: 46, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    y: { type: "spring", stiffness: 260, damping: 18, delay: 1.04 + i * 0.06 },
                    opacity: { duration: 0.22, delay: 1.04 + i * 0.06 },
                  }}
                />
              ))}
            </motion.g>
          </g>
          {/* The period drops in and squashes on the baseline, then settles. */}
          <motion.rect
            x={PERIOD.x}
            y={PERIOD.y}
            width={PERIOD.w}
            height={PERIOD.h}
            rx={PERIOD.rx}
            fill="var(--pods-signal)"
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
            initial={{ y: -320, scaleX: 0.86, scaleY: 1.2, opacity: 0 }}
            animate={{
              y: [-320, 0, -26, 0, 0],
              scaleX: [0.86, 1.34, 0.92, 1.05, 1],
              scaleY: [1.2, 0.66, 1.1, 0.97, 1],
              opacity: [0, 1, 1, 1, 1],
            }}
            transition={{ delay: 1.5, duration: 0.72, times: [0, 0.42, 0.66, 0.84, 1], ease: ["easeIn", "easeOut", "easeIn", "easeOut"] }}
          />
        </>
      )}

      {/* Lockup: the mark gathers at the centre of the lockup, then steps left as the word slides out from under it. */}
      <motion.g
        initial={lockup ? { x: SHIFT, scale: 1.14 } : false}
        animate={{ x: 0, scale: 1 }}
        transition={slide}
        style={{ transformBox: "view-box", transformOrigin: `${MARK_CENTER.x}px ${MARK_CENTER.y}px` }}
      >
      {/* A soft flash where the three circles meet, as they land. */}
      <motion.circle
        cx={MARK_CENTER.x}
        cy={MARK_CENTER.y - 6}
        r={150}
        fill={`url(#${id}-glow)`}
        style={fillBox}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.25, 1.6] }}
        transition={{ delay: 0.62, duration: 0.7, ease: "easeOut" }}
      />

      {/* Circles: translucent with multiply while they travel, so the overlaps read as light mixing. */}
      <g style={{ isolation: "isolate" }}>
        {HUES.map((k, i) => (
          <motion.circle
            key={k}
            cx={CIRCLES[k].x}
            cy={CIRCLES[k].y}
            r={R}
            fill={FILL[k]}
            style={{ ...fillBox, mixBlendMode: onDark ? "normal" : "multiply" }}
            initial={{ x: FROM[k].x, y: FROM[k].y, scale: 0.3, rotate: FROM[k].rotate, opacity: 0 }}
            animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: onDark ? [0, 0.88, 1] : [0, 0.9, 1] }}
            transition={{
              x: { ...bouncy, delay: 0.04 + i * 0.09 },
              y: { ...bouncy, delay: 0.04 + i * 0.09 },
              rotate: { ...bouncy, delay: 0.04 + i * 0.09 },
              scale: { ...bouncy, delay: 0.04 + i * 0.09 },
              opacity: { duration: 0.9, times: [0, 0.35, 1], delay: 0.04 + i * 0.09 },
            }}
          />
        ))}
      </g>

      {/* The exact solid overlaps resolve on top, so the final frame is the brand mark pixel for pixel. */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72, duration: 0.32, ease: "easeOut" }}>
        <g clipPath={`url(#${id}-o)`}>
          <circle cx={CIRCLES.signal.x} cy={CIRCLES.signal.y} r={R} fill={OVERLAP.emberSignal} />
          <circle cx={CIRCLES.grove.x} cy={CIRCLES.grove.y} r={R} fill={OVERLAP.emberGrove} />
        </g>
        <g clipPath={`url(#${id}-s)`}>
          <circle cx={CIRCLES.grove.x} cy={CIRCLES.grove.y} r={R} fill={OVERLAP.signalGrove} />
        </g>
        <g clipPath={`url(#${id}-os)`}>
          <circle cx={CIRCLES.grove.x} cy={CIRCLES.grove.y} r={R} fill={OVERLAP.all} />
        </g>
      </motion.g>

      {/* Dots pop like people arriving, each with a ring that fades out. */}
      {HUES.map((k, i) => (
        <g key={k}>
          <motion.circle
            cx={DOTS[k].x}
            cy={DOTS[k].y}
            r={DOT_R}
            fill="none"
            stroke="var(--neutral-0)"
            strokeWidth={5}
            style={fillBox}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.85, 0], scale: [1, 2.6, 3.2] }}
            transition={{ delay: 0.84 + i * 0.1, duration: 0.7, ease: "easeOut" }}
          />
          <motion.circle
            cx={DOTS[k].x}
            cy={DOTS[k].y}
            r={DOT_R}
            fill="var(--neutral-0)"
            style={fillBox}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ scale: { ...snap, delay: 0.82 + i * 0.1 }, opacity: { duration: 0.08, delay: 0.82 + i * 0.1 } }}
          />
        </g>
      ))}

      </motion.g>

    </svg>
  );
}

/* ── CSS-driven variants (brand keyframes) ───────────────────────────────── */

function CssLogo({
  variant,
  onDark,
  className,
  style,
  title,
  children,
}: {
  variant: Exclude<LogoMotion, "intro" | "assemble">;
  onDark?: boolean;
  className?: string;
  style?: CSSProperties;
  title: string;
  children?: ReactNode;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ink = onDark ? "var(--neutral-0)" : "var(--color-text)";
  const markOnly = variant === "loader" || variant === "breathe" || variant === "orbit";
  const ripples = variant === "splash";

  const mark = (
    <g transform={`translate(${MARK_CENTER.x} ${MARK_CENTER.y})`}>
      <g className="pods-spin">
        <g transform={`translate(${-MARK_CENTER.x} ${-MARK_CENTER.y})`}>
          <MarkShapes id={id} />
          {ripples &&
            HUES.map((k) => (
              <circle
                key={k}
                className={`pods-rip pods-rip-${k}`}
                cx={DOTS[k].x}
                cy={DOTS[k].y}
                r={DOT_R}
                fill="none"
                stroke="var(--neutral-0)"
                strokeWidth={4}
              />
            ))}
        </g>
      </g>
    </g>
  );

  const svg = markOnly ? (
    <svg
      viewBox={variant === "orbit" ? "150 170 508 520" : VIEWBOX.markRoomy}
      role="img"
      aria-label={title}
      className={cn("pods-logo", `pods-anim-${variant}`, !children && className)}
      style={children ? { width: "100%", height: "100%" } : style}
    >
      {mark}
    </svg>
  ) : (
    <svg viewBox={VIEWBOX.horizontal} role="img" aria-label={title} className={cn("pods-logo", `pods-anim-${variant}`, className)} style={style}>
      <g className="pods-lockup-mark">{mark}</g>
      <WordmarkShapes ink={ink} />
    </svg>
  );

  if (!children) return svg;
  return (
    <div className={cn("relative grid place-items-center", className)} style={style}>
      {svg}
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
