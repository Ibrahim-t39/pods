// <TableRing>: a pod is a round table seen from above (DESIGN.md §1; concept "table", approved wireframes D03/D05/E02).
// Promoted from src/concepts/table/ui.tsx (TableTop, Disc) and the wireframe kit's table() so the app draws exactly
// what the PDFs show.
//
// Rules carried from the wireframes:
// - Seat 0 is always yours, at 6 o'clock over the thumb (PB 2.1, 6.4). You are the ink bead (--you); everyone else wears
//   their own logo colour (blue, green or teal, stable per person; COLOR_LIFE §4).
// - Until it locks a table has exactly `n` seats (default 4), and its ring is n segments: a segment turns solid in
//   that person's colour when they say yes, so a full ring is the logo's colours closing. The count IS the form.
// - The table top is a glass orb (COLOR_LIFE §15) carrying the pod's two-circle wash (tide, grove or dusk). It deepens with every hangout held
//   (data-depth from `worn`: what they share grows; COLOR_LIFE §5.3) and is tinted when locked.
// - First names sit inside the table, facing each seat (place cards). Initials are data, not copy.
// - The whole table is ONE target (onClick = what it opens, e.g. Talk); seats are not separate buttons (designer R1 #1).
// - States are silhouettes: fill = locked (table tinted), dim = did not lock (faded, dashed), worn = one extra ring per
//   hangout held (repeat made visible), roof = rain plan (dashed canopy arc; roofOn = moved under it), night = lock.
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { POD_SOLID, POD_WASH, YOU_COLOR, personColor, type PodHueKey } from "./disc";
import { Icon } from "@/components/icons";

export const SNAPPY = { type: "spring", stiffness: 420, damping: 32 } as const;
export const GENTLE = { type: "spring", stiffness: 170, damping: 26 } as const;

export interface Seat {
  initial?: string;
  name?: string;
  /** said yes: the disc sits at the table and its ring segment fills */
  in?: boolean;
  /** an empty seat (dashed) */
  open?: boolean;
  /** checked in at the hangout: a ring around the disc */
  here?: boolean;
  /** force ink (you, or someone outside this pod's colour) */
  ink?: boolean;
}

export interface TableRingProps {
  /** diameter of the table top in px */
  size?: number;
  seats: (Seat | null)[];
  /** segments in the ring; default max(seats, 4) */
  n?: number;
  hue?: PodHueKey;
  fill?: boolean;
  dim?: boolean;
  worn?: number;
  night?: boolean;
  roof?: { label: string; on?: boolean };
  names?: boolean;
  /** your disc waits outside your seat until you say yes (default true) */
  youWaiting?: boolean;
  center?: ReactNode;
  onClick?: () => void;
  /** accessible name for the whole table (what tapping it does) */
  label?: string;
  className?: string;
  /** larger name chips (the lock moment) */
  big?: boolean;
}

export function TableRing({
  size = 248,
  seats,
  n: nProp,
  hue = "ember",
  fill,
  dim,
  worn = 1,
  night,
  roof,
  names = true,
  youWaiting = true,
  center,
  onClick,
  label,
  className,
  big,
}: TableRingProps) {
  const reduce = useReducedMotion();
  const S = size;
  const ds = Math.round(S * 0.17);
  const pad = ds + 20;
  const W = S + pad * 2;
  const c = W / 2;
  const R = S / 2;
  const n = nProp ?? Math.max(seats.length, 4);
  const seg = (2 * Math.PI) / n;
  const gap = 0.16;
  const H = POD_SOLID[hue];
  // the table top is a glass orb (COLOR_LIFE §15): the pod's wash in a clear body, a rim in the pod's hue, one window.
  // On the moment it is dark glass so the names keep lamp contrast.
  // (images only: a bare colour may only be the last background layer)
  const orbWash = fill ? `${POD_WASH[hue]}, linear-gradient(color-mix(in srgb, ${H} 9%, transparent), color-mix(in srgb, ${H} 9%, transparent))` : POD_WASH[hue];
  const dashed = night ? "rgba(242,255,250,.34)" : "var(--ink-3)";
  /** each seat's colour: you = ink (--you); others = their own logo colour */
  const seatColor = (k: number) => {
    const st = seats[k];
    if (k === 0 || st?.ink) return YOU_COLOR;
    return personColor(st?.name ?? st?.initial, k);
  };

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={label}
      data-table
      data-depth={Math.min(3, Math.max(1, worn))}
      className={className}
      style={{
        position: "relative",
        width: W,
        height: W,
        flex: "none",
        padding: 0,
        border: 0,
        background: "none",
        color: "inherit",
        marginTop: roof ? ds + 24 : undefined,
        cursor: onClick ? "pointer" : undefined,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {roof && (
        <>
          <svg width={W + 40} height={W} style={{ position: "absolute", left: -20, top: -ds * 0.2, overflow: "visible" }} aria-hidden>
            <path
              d={`M ${c + 20 - (R + ds + 26)} ${c} A ${R + ds + 26} ${R + ds + 26} 0 0 1 ${c + 20 + R + ds + 26} ${c}`}
              fill="none"
              stroke={roof.on ? "var(--ink)" : "var(--ink-2)"}
              strokeWidth={roof.on ? 3 : 1.5}
              strokeDasharray={roof.on ? undefined : "6 6"}
              strokeLinecap="round"
            />
          </svg>
          <span
            className="text-label text-ink"
            style={{ position: "absolute", left: 0, right: 0, top: -ds * 0.2 - 30, display: "flex", justifyContent: "center", gap: 4, alignItems: "center" }}
          >
            <Icon name="rain" size={18} />
            {roof.label}
          </span>
        </>
      )}
      {/* printed shadow + the top */}
      <span
        aria-hidden
        style={{ position: "absolute", left: pad + 4, top: pad + 12, width: S, height: S, borderRadius: "50%", background: night ? "transparent" : "rgba(14,26,34,.06)", filter: "blur(6px)", opacity: dim ? 0.4 : 1 }}
      />
      <span
        aria-hidden
        className={night ? "orb-night" : "orb-solid"}
        style={{
          position: "absolute",
          left: pad,
          top: pad,
          width: S,
          height: S,
          ["--orb" as string]: H,
          ["--orb-wash" as string]: orbWash,
          transition: "background var(--dur-light) var(--ease-paper)",
        }}
      />
      {/* worn rings: one per hangout held */}
      {Array.from({ length: Math.max(0, worn - 1) }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{ position: "absolute", left: pad - (i + 1) * 9, top: pad - (i + 1) * 9, width: S + (i + 1) * 18, height: S + (i + 1) * 18, borderRadius: "50%", border: `1.5px solid ${H}`, opacity: 0.5 }}
        />
      ))}
      {/* the ring: n segments, one per seat */}
      <svg width={W} height={W} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} aria-hidden>
        {Array.from({ length: n }, (_, k) => {
          const a = Math.PI / 2 + k * seg;
          const a0 = a - seg / 2 + gap / 2;
          const a1 = a + seg / 2 - gap / 2;
          const st = seats[k];
          const on = !!(st && st.in) || (fill && !(st && st.open));
          const solid = on && !dim;
          const segColor = st && !st.open && (st.in || fill) ? seatColor(k).bg : H;
          return (
            <motion.path
              key={k}
              d={`M${c + Math.cos(a0) * R} ${c + Math.sin(a0) * R} A${R} ${R} 0 0 1 ${c + Math.cos(a1) * R} ${c + Math.sin(a1) * R}`}
              fill="none"
              stroke={solid ? segColor : dashed}
              strokeWidth={solid ? 5 : 1.5}
              strokeDasharray={solid ? undefined : "3 6"}
              strokeLinecap="round"
              opacity={dim ? 0.6 : 1}
              initial={false}
              animate={{ pathLength: 1 }}
            />
          );
        })}
      </svg>
      {seats.map((st, k) => {
        if (!st) return null;
        const a = Math.PI / 2 + k * seg;
        const x = c + Math.cos(a) * R - ds / 2;
        const y = c + Math.sin(a) * R - ds / 2;
        const you = k === 0;
        const col = seatColor(k);
        const discBg = col.bg;
        const discFg = col.fg;
        const nm = st.name ?? (you ? "you" : "");
        // QA r1 (core): every name sits on a glass chip directly under its own disc, the same offset for every seat,
        // so names never drift from their disc or collide with the ring. Yours sits under your waiting disc until you
        // are in. Only people who are in (or you) are named.
        const waitingYou = you && !st.in && youWaiting && !st.open;
        const chipTop = waitingYou ? y + ds + 10 + ds + 4 : y + ds + 4;
        return (
          <span key={k} aria-hidden>
            {st.here && (
              <span style={{ position: "absolute", left: x - 7, top: y - 7, width: ds + 14, height: ds + 14, borderRadius: "50%", border: `2px solid ${night ? "var(--lamp)" : "var(--teal)"}` }} />
            )}
            <span style={{ position: "absolute", left: x, top: y, width: ds, height: ds, display: "grid", placeItems: "center" }}>
              {st.in ? (
                <motion.span
                  data-nc
                  layoutId={you ? "you-disc" : undefined}
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: dim ? 0.55 : 1 }}
                  transition={reduce ? { duration: 0.16 } : { ...SNAPPY, delay: k * 0.06 }}
                  className="grid place-items-center rounded-full font-serif leading-none"
                  style={{ width: ds, height: ds, backgroundColor: discBg, backgroundImage: "var(--bead)", color: discFg, fontSize: Math.round(ds * 0.5), boxShadow: you && night ? "0 0 0 2px var(--lamp), var(--shadow-bead)" : "var(--shadow-bead)" }}
                >
                  {st.initial}
                </motion.span>
              ) : (
                <span className="rounded-full" style={{ width: ds, height: ds, border: `1.5px dashed ${night ? "rgba(242,255,250,.38)" : "var(--line-2)"}` }} />
              )}
            </span>
            {/* you, not in yet: your disc waits just outside your seat (the chair pushed back) */}
            {you && !st.in && youWaiting && !st.open && (
              <motion.span
                data-nc
                layoutId="you-disc"
                className="grid place-items-center rounded-full font-serif leading-none"
                style={{ position: "absolute", left: x, top: y + ds + 10, width: ds, height: ds, backgroundColor: YOU_COLOR.bg, backgroundImage: "var(--bead)", color: YOU_COLOR.fg, fontSize: Math.round(ds * 0.5), boxShadow: "var(--shadow-bead)" }}
              >
                {st.initial ?? ""}
              </motion.span>
            )}
            {names && nm && (st.in || you) && (
              <span
                data-nc
                style={{
                  position: "absolute",
                  left: x + ds / 2 - 48,
                  top: chipTop,
                  width: 96,
                  display: "flex",
                  justifyContent: "center",
                  pointerEvents: "none",
                  opacity: dim ? 0.6 : 1,
                }}
              >
                <span
                  style={{
                    maxWidth: 96,
                    padding: big ? "3px 10px" : "1px 8px",
                    borderRadius: 999,
                    background: "rgb(255 255 255 / .86)",
                    boxShadow: "inset 0 0 0 1px rgb(255 255 255 / .9), 0 1px 2px rgb(14 26 34 / .08), 0 4px 12px -6px rgb(14 26 34 / .18)",
                    WebkitBackdropFilter: "blur(8px)",
                    backdropFilter: "blur(8px)",
                    color: st.in ? "var(--ink)" : "var(--ink-2)",
                    fontSize: big ? 15 : 13,
                    lineHeight: big ? "20px" : "18px",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nm}
                </span>
              </span>
            )}
          </span>
        );
      })}
      {center && (
        <span style={{ position: "absolute", left: pad, top: pad, width: S, height: S, display: "grid", placeItems: "center", textAlign: "center" }}>{center}</span>
      )}
    </Tag>
  );
}

/** Outer box of a TableRing of table size `size` (for layout maths). */
export function tableBox(size: number) {
  const ds = Math.round(size * 0.17);
  return size + (ds + 20) * 2;
}
