// The one object of first run: the table you are taking a seat at (DESIGN §1, §6; PB 2.1, 2.7, 6.4; IL 41).
// Every step draws the same table at the same centre and size (useTableSize), so the step change reads as the
// table changing state:
//   SeatTable    B01, B05, B06, B07: three people already seated, your seat at 6 o'clock (dashed, then yours)
//   RingTable    B02, B04: the same table, with the choices sitting around its rim (likes, the days of the week)
//   CheckSeat    Check it's you: your seat, large, with a blue ring that sweeps once, closes green, then fills your ember
//   SplitTables  B10 failed / B09 filling: the table splits into tables that drift to overlap (the logo as a place)
//   FoundPods    B08 placed: the loader's three circles become your pods, named, each a Shared element into Your pods
"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TableRing, tableBox, type Seat } from "@/components/brand/table-ring";
import { HUE_VAR, POD_WASH, YOU_COLOR, type PodHueKey } from "@/components/brand/disc";
import { Shared, sharedName } from "@/components/brand/shared";
import { cn } from "@/lib/cn";

const THEM: Seat = { in: true, initial: "" };

/** Three people already at the table; your seat at 6 o'clock. `taken` = you sat down (the ring closes). */
export function SeatTable({ size, initial, taken, waiting = true }: { size: number; initial?: string; taken?: boolean; waiting?: boolean }) {
  const you: Seat = taken ? { in: true, initial: initial || "" } : initial && waiting ? { initial } : { open: true };
  return <TableRing size={size} seats={[you, THEM, THEM, THEM]} names={false} youWaiting={!!initial && waiting} fill={taken} />;
}

export interface RingItem {
  key: string;
  node: ReactNode;
}

/**
 * The table with choices around its rim. Items are placed evenly from `start` degrees (−90 = 12 o'clock),
 * clockwise. `on` strokes the rim in the pod hue (something chosen); `center` sits on the table top.
 */
export function RingTable({
  size,
  items,
  start = -90,
  on,
  hue = "ember",
  center,
  below,
  label,
}: {
  size: number;
  items: RingItem[];
  start?: number;
  on?: boolean;
  hue?: PodHueKey;
  center?: ReactNode;
  below?: ReactNode;
  label?: string;
}) {
  const W = tableBox(size);
  const c = W / 2;
  const R = size / 2;
  const n = items.length;
  return (
    <div className="flex flex-col items-center gap-s6" role="group" aria-label={label}>
      <div className="pods-ob-ring" style={{ width: W, height: W }}>
        <span className="pods-ob-shadow" style={{ left: c - R + 6, top: c - R + 10, width: size, height: size }} aria-hidden />
        <span
          className="pods-ob-top"
          data-on={on ? "" : undefined}
          style={{ left: c - R, top: c - R, width: size, height: size, ["--rim" as string]: `${Math.round(size * 0.04)}px`, ["--wash" as string]: POD_WASH[hue] }}
          aria-hidden
        />
        <svg width={W} height={W} className="absolute inset-0 overflow-visible" aria-hidden>
          <circle
            cx={c}
            cy={c}
            r={R}
            fill="none"
            stroke={on ? HUE_VAR[hue] : "var(--ink-3)"}
            strokeWidth={on ? 2.5 : 1.5}
            strokeDasharray={on ? undefined : "3 6"}
            style={{ transition: "stroke 300ms ease" }}
          />
        </svg>
        {center && (
          <div className="pods-ob-at grid place-items-center" style={{ left: c, top: c, width: size * 0.7 }}>
            {center}
          </div>
        )}
        {items.map((it, k) => {
          const a = ((start + (360 / n) * k) * Math.PI) / 180;
          return (
            <div key={it.key} className="pods-ob-at" style={{ left: c + Math.cos(a) * R, top: c + Math.sin(a) * R }}>
              {it.node}
            </div>
          );
        })}
      </div>
      {below}
    </div>
  );
}

/** Your seat, large: the check. `state`: idle (dashed), checking (a blue arc sweeps), done (the ring closes green, the seat
 *  fills your ember, your initial). */
export function CheckSeat({ size, initial, state, children }: { size: number; initial: string; state: "idle" | "checking" | "done"; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const D = Math.round(size * 0.78);
  const ring = D + 28;
  return (
    <div className="relative grid place-items-center" style={{ width: ring + 8, height: ring + 8 }} aria-hidden>
      {/* the sweep: one blue arc riding the dashed rim; it closes green (verified) */}
      <svg width={ring} height={ring} className={cn("absolute", state === "checking" && !reduce && "pods-ob-sweep")} style={{ overflow: "visible" }}>
        <circle cx={ring / 2} cy={ring / 2} r={ring / 2 - 2} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray="3 6" />
        {state !== "idle" && (
          <motion.circle
            cx={ring / 2}
            cy={ring / 2}
            r={ring / 2 - 2}
            fill="none"
            stroke={state === "done" ? "var(--color-grove)" : "var(--select)"}
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0.12 }}
            animate={{ pathLength: state === "done" ? 1 : 0.22 }}
            transition={{ duration: state === "done" ? 0.6 : 0.3, ease: [0.2, 0, 0, 1] }}
            style={{ rotate: -90, transformOrigin: "50% 50%" }}
          />
        )}
      </svg>
      {/* soft shadow (DESIGN S3) */}
      <span className="absolute rounded-full" style={{ width: D, height: D, transform: "translate(6px, 10px)", background: "rgba(14,26,34,.06)" }} />
      <motion.span
        className="relative grid place-items-center overflow-hidden rounded-full"
        style={{ width: D, height: D, boxShadow: `inset 0 0 0 ${Math.round(D * 0.04)}px rgba(255,255,255,.55)` }}
        initial={false}
        animate={{ backgroundColor: state === "done" ? YOU_COLOR.bg : "var(--table)" }}
        transition={{ duration: 0.5 }}
      >
        {children}
        {state === "done" ? (
          <motion.span
            data-nc
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute inset-0 grid place-items-center font-display font-bold leading-none tracking-[-0.03em]"
            style={{ fontSize: Math.round(D * 0.42), color: YOU_COLOR.fg }}
          >
            {initial}
          </motion.span>
        ) : (
          !children && (
            <span
              data-nc
              className={cn("grid place-items-center rounded-full font-display font-bold leading-none text-ink-2", state === "checking" && "pods-ob-breathe")}
              style={{ width: D * 0.42, height: D * 0.42, border: "1.5px dashed var(--line-2)", fontSize: Math.round(D * 0.2) }}
            >
              {initial}
            </span>
          )
        )}
      </motion.span>
    </div>
  );
}

/** Each table's rim blends the two logo circles of its pod family (COLOR_LIFE §6.3, "a pod is two circles meeting"):
 *  tide blue into green, grove green into ember, dusk ember into blue. Two stops, solid hues, so the rims stay crisp. */
const RIM: Record<PodHueKey, string[]> = {
  ember: ["var(--color-signal)", "var(--color-grove)"],
  grove: ["var(--color-grove)", "var(--spark)"],
  signal: ["var(--spark)", "var(--color-signal)"],
};

const SPLIT: { hue: PodHueKey; x: number; y: number }[] = [
  { hue: "ember", x: 0, y: -0.36 },
  { hue: "signal", x: -0.34, y: 0.22 },
  { hue: "grove", x: 0.34, y: 0.22 },
];

/**
 * The empty table splits into `n` tables that drift apart to overlap like the logo, your disc at the centre.
 * `settled` = placed: the rims turn solid and each table takes its pod's soft wash, so the three read as the logo.
 */
export function SplitTables({ size, n = 3, initial, settled, failed }: { size: number; n?: number; initial: string; settled?: boolean; failed?: boolean }) {
  const reduce = useReducedMotion();
  const W = Math.round(size * 1.9);
  const d = Math.round(size * 0.92);
  const hues = SPLIT.slice(0, Math.max(1, Math.min(3, n)));
  return (
    <div className="relative" style={{ width: W, height: W }} aria-hidden>
      {hues.map((h, i) => (
        <motion.span
          key={h.hue}
          className="absolute rounded-full"
          style={{ left: W / 2 - d / 2, top: W / 2 - d / 2, width: d, height: d }}
          initial={reduce ? false : { x: 0, y: 0, opacity: 0.5 }}
          animate={failed ? { x: 0, y: 0, opacity: 0.6 } : { x: h.x * size, y: h.y * size, opacity: 1 }}
          transition={reduce ? { duration: 0.16 } : { type: "spring", stiffness: 60, damping: 16, delay: 0.25 + i * 0.18 }}
        >
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: POD_WASH[h.hue] }}
            initial={false}
            animate={{ opacity: settled ? 1 : failed ? 0 : 0.35 }}
            transition={{ duration: reduce ? 0.16 : 0.7, delay: settled && !reduce ? i * 0.12 : 0 }}
          />
          <svg width={d} height={d} className={cn("relative", !settled && !failed && !reduce && "pods-ob-sweep")} style={{ animationDuration: `${14 + i * 3}s`, overflow: "visible" }}>
            <defs>
              <linearGradient id={`ob-rim-${h.hue}`} x1="0" y1="0" x2="1" y2="1">
                {RIM[h.hue].map((c, k, all) => (
                  <stop key={k} offset={k / (all.length - 1)} style={{ stopColor: c }} />
                ))}
              </linearGradient>
            </defs>
            <circle
              cx={d / 2}
              cy={d / 2}
              r={d / 2 - 1.5}
              fill="none"
              stroke={failed ? "var(--ink-3)" : `url(#ob-rim-${h.hue})`}
              strokeWidth={settled ? 2.5 : 1.5}
              strokeDasharray={settled ? undefined : "4 6"}
            />
          </svg>
        </motion.span>
      ))}
      <motion.span
        data-nc
        className="absolute grid place-items-center rounded-full font-display font-bold leading-none"
        style={{
          left: W / 2 - 18,
          top: W / 2 - 18 + (hues.length > 1 ? size * 0.02 : 0),
          width: 36,
          height: 36,
          fontSize: 17,
          background: YOU_COLOR.bg,
          color: YOU_COLOR.fg,
          boxShadow: "0 0 0 3px var(--lit), var(--shadow-spark)",
        }}
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 32, delay: 0.1 }}
      >
        {initial}
      </motion.span>
    </div>
  );
}

export interface FoundPod {
  id: string;
  name: string;
  type: "interest" | "community";
}

/** Seats for the found pods. Three: the mark's own arrangement (top, lower left, lower right). Four: two rows that
 *  overlap at the centre, interest pods on top and community pods below, the same order Your pods uses. */
const FOUND_4 = [
  { x: -0.29, y: -0.29, lx: -0.12, ly: -0.12 },
  { x: 0.29, y: -0.29, lx: 0.12, ly: -0.12 },
  { x: -0.29, y: 0.29, lx: -0.12, ly: 0.12 },
  { x: 0.29, y: 0.29, lx: 0.12, ly: 0.12 },
];
const FOUND_AT = [
  { x: 0, y: -0.34, lx: 0, ly: -0.2 },
  { x: -0.32, y: 0.2, lx: -0.16, ly: 0.14 },
  { x: 0.32, y: 0.2, lx: 0.16, ly: 0.14 },
];

/**
 * B08 placed (beat 2): the loader's three circles grow into your pods. Up to four. Interest pods come first, community pods after
 * (MOTION 5.2). Each circle is the pod's two-circle wash (`data-pod-type`: interest = tide, community = grove;
 * COLOR_LIFE §13) with its name set toward its outer edge, and is wrapped in `Shared pod-<id>` so Your pods picks the
 * same circle up on the hand-off. Your disc sits in the centre, where all of them meet.
 */
export function FoundPods({ size, pods, initial }: { size: number; pods: FoundPod[]; initial: string }) {
  const reduce = useReducedMotion();
  const W = Math.round(size * 1.8);
  const shown = pods.slice(0, 4);
  const four = shown.length === 4;
  const k = four ? 0.8 : 0.9;
  const d = Math.round(size * k);
  const at = shown.length === 1 ? [{ x: 0, y: 0, lx: 0, ly: 0 }] : shown.length === 2 ? [FOUND_AT[1], FOUND_AT[2]].map((a) => ({ ...a, y: 0, ly: 0 })) : four ? FOUND_4 : FOUND_AT;
  return (
    <div className="relative" style={{ width: W, height: W }} role="list" aria-label="Your pods">
      {shown.map((p, i) => (
        <motion.div
          key={p.id}
          role="listitem"
          className="absolute"
          style={{ left: W / 2 - d / 2, top: W / 2 - d / 2, width: d, height: d }}
          initial={reduce ? { opacity: 0 } : { x: 0, y: 0, scale: 0.3, opacity: 0 }}
          animate={{ x: at[i].x * size, y: at[i].y * size, scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0.16 } : { type: "spring", stiffness: 170, damping: 26, delay: i * 0.06 }}
        >
          <Shared name={sharedName.pod(p.id)}>
            <span data-pod-type={p.type} className="pods-ob-found" />
          </Shared>
          <span
            className="pods-ob-found-name"
            style={{ left: `${50 + (at[i].lx / k) * 100}%`, top: `${50 + (at[i].ly / k) * 100}%` }}
          >
            {p.name}
          </span>
        </motion.div>
      ))}
      <motion.span
        data-nc
        aria-hidden
        className="absolute grid place-items-center rounded-full font-display font-bold leading-none"
        style={{ left: W / 2 - 18, top: W / 2 - 18 + (shown.length === 3 ? size * 0.02 : 0), width: 36, height: 36, fontSize: 17, background: YOU_COLOR.bg, color: YOU_COLOR.fg, boxShadow: "0 0 0 3px var(--lit), var(--shadow-spark)" }}
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 32, delay: 0.3 }}
      >
        {initial}
      </motion.span>
    </div>
  );
}
