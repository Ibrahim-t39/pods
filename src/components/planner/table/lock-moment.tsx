// planner_loop · LockMoment (wireframes D05, E06; anatomy E; DESIGN §7 "Lock").
// The 4th "I'm in" (or the 4th vote for #2): the room goes dark, one lamp falls on the table, the people sit with
// their names, the day word slides in, sized to fill the width (never cropped: "Saturday" must read whole on a 390
// phone, COLOR_LIFE §13). No chrome, no confetti, no tick. It stays until "See you there" (CM 173, 175; AW 42).
// Props are a superset of core's local LockMoment in pods/table-stage.tsx (seats may hold null, n and worn optional),
// so core can switch to this one by import.
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { GENTLE, TableRing, type PodHueKey, type Seat } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/components/ui/use-media-query";

export interface LockMomentProps {
  /** 1 = "It's on.", 2+ = "#2 is on." */
  round?: number;
  day: string;
  when: string;
  seats: (Seat | null)[];
  /** ring segments; default max(4, seats) */
  n?: number;
  hue: PodHueKey;
  /** worn rings (hangouts held), passed through to the table */
  worn?: number;
  onDone: () => void;
}

export function LockMoment({ round = 1, day, when, seats, n, hue, worn, onDone }: LockMomentProps) {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = setTimeout(() => btn.current?.focus(), reduce ? 0 : 1500);
    return () => clearTimeout(t);
  }, [reduce]);
  const S = desktop ? 300 : 196;
  const fade = (delay: number) =>
    reduce
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.16 },
        }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.5 },
        };
  return (
    <section
      className="pt-lock"
      aria-label={round > 1 ? `#${round} is on` : "It's on"}
      role="dialog"
      aria-modal="true"
    >
      <motion.p className="pt-lock-over" {...fade(0.2)}>
        {round > 1 ? `#${round} is on.` : "It's on."}
      </motion.p>
      <div className="pt-lock-table">
        <motion.span
          aria-hidden
          className="pt-lock-pool"
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.9 }}
          style={{
            width: S * 2.1,
            height: S * 2.1,
            left: "50%",
            top: "50%",
            marginLeft: -S * 1.05,
            marginTop: -S * 1.05,
          }}
        />
          <motion.div
            initial={reduce ? false : { scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...GENTLE, delay: 0.15 }}
          >
            <TableRing size={S} seats={seats} n={n ?? Math.max(4, seats.length)} hue={hue} worn={worn} night youWaiting={false} />
          </motion.div>
      </div>
      <motion.h1
        className="line pt-lock-day"
        style={{ ["--chars" as string]: Math.max(5, day.length) }}
        initial={reduce ? { opacity: 0 } : { x: 120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={reduce ? { duration: 0.16 } : { ...GENTLE, delay: 0.7 }}
      >
        {day}
      </motion.h1>
      <div className="pt-lock-foot">
        <motion.span className="pt-lock-when" {...fade(1.1)}>
          {when}
        </motion.span>
        <motion.div {...fade(1.3)}>
          <Button ref={btn} variant="glass" size="xl" onClick={onDone}>
            See you there
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
