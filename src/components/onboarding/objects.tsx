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
import { PodSphere } from "@/components/brand/pod-sphere";
import { Disc, HUE_VAR, POD_SOLID, POD_WASH, YOU_COLOR, type PodHueKey } from "@/components/brand/disc";
import { ARRIVE, DUR, GENTLE, POP, SNAPPY, STAGGER } from "@/components/brand/motion";
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
  filled,
}: {
  size: number;
  items: RingItem[];
  start?: number;
  on?: boolean;
  hue?: PodHueKey;
  center?: ReactNode;
  below?: ReactNode;
  label?: string;
  /** how many picks fill the sphere (one bead each) */
  filled?: number;
}) {
  const W = tableBox(size);
  const c = W / 2;
  const R = size / 2;
  const n = items.length;
  return (
    <div className="flex flex-col items-center gap-s6" role="group" aria-label={label}>
      <div className="pods-ob-ring" style={{ width: W, height: W }}>
        {/* the pod you are shaping: the glossy sphere (clear glass until you pick, then solid with one bead per pick) */}
        <span className="absolute grid place-items-center" style={{ left: c - R, top: c - R, width: size, height: size }} aria-hidden>
          <PodSphere hue={hue} people={Math.max(1, filled ?? 1)} inCount={filled ?? 0} size={Math.round(size * 0.74)} open={!!on} you={false} />
        </span>
        <svg width={W} height={W} className="absolute inset-0 overflow-visible" aria-hidden>
          <circle cx={c} cy={c} r={R} fill="none" stroke={on ? HUE_VAR[hue] : "var(--line-2)"} strokeWidth={on ? 2 : 1.5} style={{ transition: "stroke 300ms ease" }} />
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
      {/* the seat is a glass orb (COLOR_LIFE §15); it fills your colour when the check closes */}
      <span
        className="orb-solid absolute"
        style={{ width: D, height: D, ["--orb" as string]: state === "idle" ? "var(--ink-3)" : "var(--select)", ["--orb-wash" as string]: "linear-gradient(transparent, transparent)" }}
      />
      <motion.span
        className="relative grid place-items-center overflow-hidden rounded-full"
        style={{ width: D, height: D, backgroundColor: YOU_COLOR.bg, backgroundImage: "var(--bead)" }}
        initial={false}
        animate={{ opacity: state === "done" ? 1 : 0.0001, scale: state === "done" ? 1 : 0.6 }}
        transition={reduce ? { duration: 0.16 } : { type: "spring", stiffness: 170, damping: 26 }}
      />
      <span className="absolute grid place-items-center overflow-hidden rounded-full" style={{ width: D, height: D }}>
        {children}
        {state === "done" ? (
          <motion.span
            data-nc
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute inset-0 grid place-items-center font-display font-semibold leading-none tracking-[-0.03em]"
            style={{ fontSize: Math.round(D * 0.42), color: YOU_COLOR.fg }}
          >
            {initial}
          </motion.span>
        ) : (
          !children && (
            <span
              data-nc
              className={cn("grid place-items-center rounded-full font-display font-semibold leading-none text-ink-2", state === "checking" && "pods-ob-breathe")}
              style={{ width: D * 0.42, height: D * 0.42, border: "1.5px dashed var(--line-2)", fontSize: Math.round(D * 0.2) }}
            >
              {initial}
            </span>
          )
        )}
      </span>
    </div>
  );
}

/** Where the circles sit: the mark's own arrangement (top, lower left, lower right; mark.svg (0,-38), (-32,15), (32,15)). */
const SPLIT: { hue: PodHueKey; x: number; y: number }[] = [
  { hue: "ember", x: 0, y: -0.36 },
  { hue: "signal", x: -0.34, y: 0.22 },
  { hue: "grove", x: 0.34, y: 0.22 },
];

/** You: a bead with a lamp ring, where the circles meet. */
function YouBead({ initial, delay, lift = 0 }: { initial: string; delay: number; lift?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className="absolute"
      style={{ left: "50%", top: "50%", marginLeft: -20, marginTop: -20 + lift }}
      initial={reduce ? { opacity: 0 } : POP.initial}
      animate={POP.animate}
      transition={reduce ? { duration: DUR.tap } : { ...SNAPPY, delay }}
    >
      <Disc tone="you" initial={initial} size={40} style={{ boxShadow: "0 0 0 3px var(--lit), var(--shadow-bead)" }} />
    </motion.span>
  );
}

/**
 * B09 filling / B10 failed: the empty table splits into `n` glass orbs that drift apart to overlap like the logo,
 * your bead at the centre. Ghost orbs until settled; `failed` pulls them back together and greys them.
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
          className={settled ? "orb absolute" : "orb-ghost absolute"}
          style={{
            left: W / 2 - d / 2,
            top: W / 2 - d / 2,
            width: d,
            height: d,
            ["--orb" as string]: failed ? "var(--ink-3)" : POD_SOLID[h.hue],
            ["--orb-wash" as string]: POD_WASH[h.hue],
          }}
          initial={reduce ? false : { x: 0, y: 0, opacity: 0, scale: 0.6 }}
          animate={failed || hues.length === 1 ? { x: 0, y: 0, opacity: failed ? 0.7 : 1, scale: 1 } : { x: h.x * size, y: h.y * size, opacity: 1, scale: 1 }}
          transition={reduce ? { duration: DUR.tap } : { ...GENTLE, delay: 0.15 + i * STAGGER * 3 }}
        />
      ))}
      <YouBead initial={initial} delay={0.1} />
    </div>
  );
}

export interface FoundPod {
  id: string;
  name: string;
  type: "interest" | "community";
  hue: PodHueKey;
  /** beat 3: the widened pod's one line ("Only 3 Zambians nearby.") */
  note?: string;
}

/** Seats for the found pods. Three: the mark's own arrangement. Four: two rows that overlap at the centre, interest
 *  pods on top and community pods below, the same order Your pods uses. lx/ly place the name toward the outer edge. */
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
 * B08 placed (video beat 2): the loader's circles grow into your pods as glass orbs (COLOR_LIFE §15: wash inside,
 * denser rim in the pod's hue, one window; normal blend, so where pods share you the overlap gets brighter). Interest
 * pods first, community pods after (MOTION 5.2), floating in on GENTLE with STAGGER. Each orb is `Shared pod-<id>`
 * so the next screen picks the same circle up. Your bead sits where they all meet. The widened pod carries its
 * one line under its name (beat 3).
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
          transition={reduce ? { duration: DUR.tap } : { ...GENTLE, delay: i * STAGGER * 2 }}
        >
          <Shared name={sharedName.pod(p.id)}>
            <span
              data-pod-type={p.type}
              className="pods-ob-found orb"
              style={{ ["--orb" as string]: POD_SOLID[p.hue], ["--orb-wash" as string]: POD_WASH[p.hue] }}
            />
          </Shared>
          <span className="pods-ob-found-name" style={{ left: `${50 + (at[i].lx / k) * 100}%`, top: `${50 + (at[i].ly / k) * 100}%` }}>
            {p.name}
            {p.note && (
              <motion.span
                data-widened-note
                className="pods-ob-found-note"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: DUR.tap } : { ...ARRIVE, delay: 0.9 }}
              >
                {p.note}
              </motion.span>
            )}
          </span>
        </motion.div>
      ))}
      <YouBead initial={initial} delay={0.3} lift={shown.length === 3 ? Math.round(size * 0.02) : 0} />
    </div>
  );
}
