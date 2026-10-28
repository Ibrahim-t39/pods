// TABLE concept primitives: the paper surface, the logo (long-press = Director), the table ring, discs and the seat
// you hold to sit in. Geometry is in % of a square so one component serves 390 and 1440.
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { onCircle } from "./model";

export const SNAPPY = { type: "spring", stiffness: 420, damping: 32 } as const;
export const GENTLE = { type: "spring", stiffness: 170, damping: 26 } as const;

export type Mood = "day" | "night" | "dusk";

export function Paper({ mood = "day", lamp, children, label }: { mood?: Mood; lamp?: { x: string; y: string }; children: ReactNode; label?: string }) {
  const style = lamp ? ({ "--lamp-x": lamp.x, "--lamp-y": lamp.y } as CSSProperties) : undefined;
  return (
    <main className="tb" data-mood={mood} style={style} aria-label={label}>
      {children}
    </main>
  );
}

/** Wide layout switch (client only; first paint is the phone layout). */
export function useWide(min = 1024): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${min}px)`);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [min]);
  return wide;
}

/** The logo is the only fixed asset. A 700 ms press opens the Director (hidden trigger). */
export function Logo({ height = 26, invert = false }: { height?: number; invert?: boolean }) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    t.current = setTimeout(() => window.dispatchEvent(new Event("pods:director")), 700);
  };
  const stop = () => {
    if (t.current) clearTimeout(t.current);
  };
  return (
    <span
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={{ display: "inline-flex", userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
      data-logo
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={invert ? "/brand/logo-on-dark-transparent.svg" : "/brand/logo-horizontal.svg"}
        alt="Pods"
        height={height}
        style={{ height, width: "auto", pointerEvents: "none" }}
        draggable={false}
      />
    </span>
  );
}

/** The table seen from above: a printed shadow, the top, one ring and a notch per seat (PB 6.1; IL 40). */
export function TableTop({
  size,
  seats = [],
  hue = "var(--tb-ink)",
  night = false,
  ringR = 34,
  children,
  className,
  style,
}: {
  size: number | string;
  seats?: number[];
  hue?: string;
  night?: boolean;
  ringR?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={{ position: "relative", width: size, height: size, flex: "none", ...style }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} aria-hidden>
        <circle cx="51.2" cy="52.4" r={ringR} fill={night ? "rgba(0,0,0,.45)" : "rgba(29,26,23,.07)"} style={{ transition: "fill .7s" }} />
        <circle cx="50" cy="50" r={ringR} fill={night ? "#2a231c" : "var(--tb-table)"} style={{ transition: "fill .7s" }} />
        <circle cx="50" cy="50" r={ringR} fill="none" stroke={hue} strokeWidth="0.55" opacity={night ? 0.9 : 0.85} />
        <circle cx="50" cy="50" r={ringR - 3} fill="none" stroke={night ? "rgba(247,230,196,.14)" : "var(--tb-line)"} strokeWidth="0.3" />
        {seats.map((deg, i) => {
          const a = (deg * Math.PI) / 180;
          const x = 50 + (ringR + 0.1) * Math.cos(a);
          const y = 50 + (ringR + 0.1) * Math.sin(a);
          const x2 = 50 + (ringR - 1.6) * Math.cos(a);
          const y2 = 50 + (ringR - 1.6) * Math.sin(a);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="1.5" fill={night ? "#17130f" : "var(--tb-paper)"} />
              <line x1={x} y1={y} x2={x2} y2={y2} stroke={hue} strokeWidth="0.5" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      {children}
    </div>
  );
}

/** A person as a flat disc with an initial (PB 6.4; IL 41, 24). Positioned on the table by angle and radius. */
export function Disc({
  deg,
  r,
  d,
  color,
  initial,
  dashed,
  label,
  z = 1,
  delay = 0,
  from,
  children,
  pulse,
}: {
  deg: number;
  r: number;
  d: number;
  color?: string;
  initial?: string;
  dashed?: boolean;
  label?: string;
  z?: number;
  delay?: number;
  from?: { deg: number; r: number };
  children?: ReactNode;
  pulse?: boolean;
}) {
  const reduce = useReducedMotion();
  const to = onCircle(deg, r);
  const init = from ? { ...onCircle(from.deg, from.r), opacity: 0 } : false;
  return (
    <motion.div
      role={label ? "img" : undefined}
      aria-label={label}
      initial={reduce ? { opacity: 0 } : init}
      animate={{ ...to, opacity: 1 }}
      transition={reduce ? { duration: 0.16 } : { ...SNAPPY, delay }}
      style={{
        position: "absolute",
        width: d,
        height: d,
        marginLeft: -d / 2,
        marginTop: -d / 2,
        borderRadius: "50%",
        zIndex: z,
        display: "grid",
        placeItems: "center",
        background: dashed ? "transparent" : color,
        border: dashed ? "1.5px dashed var(--tb-line-2)" : "none",
        color: "#fff",
        fontFamily: "var(--tb-serif), Georgia, serif",
        fontSize: d * 0.5,
        lineHeight: 1,
      }}
      className={pulse ? "tb-pulse" : undefined}
    >
      {initial}
      {children}
    </motion.div>
  );
}

/**
 * Hold to sit in: a ring draws round your seat in 600 ms (hands in). Release early and nothing happens.
 * Fallbacks: Enter/Space, or two taps within 2 s.
 */
export function useHold(onDone: () => void, ms = 600) {
  const [p, setP] = useState(0);
  const [armed, setArmed] = useState(false);
  const raf = useRef(0);
  const t0 = useRef(0);
  const lastTap = useRef(0);
  const fired = useRef(false);
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (!fired.current) setP(0);
  }, []);
  const start = useCallback(() => {
    fired.current = false;
    t0.current = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0.current) / ms);
      setP(k);
      if (k >= 1) {
        fired.current = true;
        onDone();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [ms, onDone]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const bind = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      start();
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (fired.current) return;
      const now = performance.now();
      if (now - lastTap.current < 2000) {
        fired.current = true;
        onDone();
      } else {
        lastTap.current = now;
        setArmed(true);
        setTimeout(() => setArmed(false), 2000);
      }
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fired.current = true;
        onDone();
      }
    },
  };
  return { progress: p, armed, bind };
}

/** The ring drawn by a hold, around a disc of diameter d. */
export function HoldRing({ d, progress, color = "var(--tb-ember)" }: { d: number; progress: number; color?: string }) {
  const R = 48;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 100 100" width={d + 16} height={d + 16} style={{ position: "absolute", left: -8, top: -8, pointerEvents: "none", transform: "rotate(-90deg)" }} aria-hidden>
      <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="3" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} strokeLinecap="round" opacity={progress > 0 ? 1 : 0} />
    </svg>
  );
}

/** Your seat's own progress ring: one arc per answered step (PB 2.7). */
export function SeatArcs({ d, total, done }: { d: number; total: number; done: number }) {
  const R = 46;
  const gap = 10;
  const span = 360 / total - gap;
  return (
    <svg viewBox="0 0 100 100" width={d + 20} height={d + 20} style={{ position: "absolute", left: -10, top: -10, pointerEvents: "none" }} aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const a0 = ((-90 + i * (360 / total) + gap / 2) * Math.PI) / 180;
        const a1 = ((-90 + i * (360 / total) + gap / 2 + span) * Math.PI) / 180;
        const p0 = [50 + R * Math.cos(a0), 50 + R * Math.sin(a0)];
        const p1 = [50 + R * Math.cos(a1), 50 + R * Math.sin(a1)];
        return (
          <path
            key={i}
            d={`M${p0[0]} ${p0[1]}A${R} ${R} 0 0 1 ${p1[0]} ${p1[1]}`}
            fill="none"
            stroke={i < done ? "var(--tb-ember)" : "var(--tb-line-2)"}
            strokeWidth={i < done ? 3.2 : 1.6}
            strokeLinecap="round"
            style={{ transition: "stroke .4s, stroke-width .4s" }}
          />
        );
      })}
    </svg>
  );
}
