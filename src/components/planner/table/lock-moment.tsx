// planner_loop · LockMoment (wireframes D05, E06; anatomy E; DESIGN §7 "Lock"). Core QA r1: the lock stays luminous.
// The 4th "I'm in" (or the 4th vote for #2): the page stays in the light system. The logo's three circles drift in
// as clear glass and meet behind the table (soft tinted overlaps, normal blending at low alpha, never a dark field),
// the people sit at the table with their names on glass chips, and the day word arrives. No confetti, no tick. It
// stays until "See you there" (CM 173, 175; AW 42). Used by the pod page (pods/table-stage) and by #2 (pod-table).
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { GENTLE, Stage, TableRing, type PodHueKey, type Seat } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/components/ui/use-media-query";

export interface LockMomentProps {
  /** 1 = "It's on.", 2+ = "#2 is on." */
  round?: number;
  day: string;
  /** time and the full place, e.g. "10am · Miller Playfield" */
  when: string;
  seats: (Seat | null)[];
  /** ring segments; default max(4, seats) */
  n?: number;
  hue: PodHueKey;
  worn?: number;
  onDone: () => void;
}

/** The logo's three circles as clear glass (ember top, blue bottom-left, green bottom-right; brand/mark.svg). */
const ORBS = [
  { rgb: "253 97 35", x: 0, y: -0.29, from: [0, -0.5] },
  { rgb: "27 120 254", x: -0.25, y: 0.145, from: [-0.45, 0.3] },
  { rgb: "25 193 133", x: 0.25, y: 0.145, from: [0.45, 0.3] },
] as const;

export function LockMoment({ round = 1, day, when, seats, n, hue, worn, onDone }: LockMomentProps) {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = setTimeout(() => btn.current?.focus(), reduce ? 0 : 1200);
    return () => clearTimeout(t);
  }, [reduce]);
  const S = desktop ? 320 : 200;
  const orb = S * 1.32;
  const fade = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.16 } }
      : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const } };
  const line = round > 1 ? `#${round} is on.` : "It's on.";
  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-label={round > 1 ? `#${round} is on` : "It's on"}
      className="fixed inset-0 z-overlay overflow-hidden bg-paper text-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.16 : 0.5 }}
    >
      <Stage light="clear" />
      <div className="mx-auto grid h-full max-w-[1440px] grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto_auto] px-gutter pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+32px)] md:grid-cols-[minmax(0,520px)_minmax(0,1fr)] md:grid-rows-[1fr_auto_auto_auto_1fr] md:gap-x-s16 md:px-s16 md:py-s16">
        <motion.p
          className="font-display text-[32px] leading-none font-semibold tracking-[-0.03em] md:col-start-1 md:row-start-2 md:text-[40px]"
          {...fade(0.15)}
        >
          {line}
        </motion.p>

        {/* the table where the three circles meet */}
        <div className="relative grid min-w-0 place-items-center overflow-visible md:col-start-2 md:row-span-5 md:row-start-1">
          <div className="relative grid place-items-center" style={{ width: `min(${orb * 1.6}px, 100%)`, height: orb * 1.5 }}>
            {ORBS.map((o, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: orb,
                  height: orb,
                  left: "50%",
                  top: "50%",
                  marginLeft: -orb / 2 + o.x * orb,
                  marginTop: -orb / 2 + o.y * orb,
                  background: `radial-gradient(ellipse 34% 20% at 34% 22%, rgb(255 255 255 / .85) 0, rgb(255 255 255 / 0) 70%), radial-gradient(closest-side, rgb(${o.rgb} / .07) 0, rgb(${o.rgb} / .13) 70%, rgb(${o.rgb} / .26) 95%, rgb(255 255 255 / .9) 99%, rgb(255 255 255 / 0) 100%)`,
                  boxShadow: `inset 0 0 0 1px rgb(255 255 255 / .8), 0 30px 60px -36px rgb(${o.rgb} / .55)`,
                }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: o.from[0] * orb, y: o.from[1] * orb, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                transition={reduce ? { duration: 0.16 } : { ...GENTLE, delay: 0.1 + i * 0.08 }}
              />
            ))}
            <motion.div
              className="relative"
              initial={reduce ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...GENTLE, delay: reduce ? 0 : 0.35 }}
            >
              <TableRing size={S} seats={seats} n={n ?? Math.max(4, seats.length)} hue={hue} worn={worn} fill youWaiting={false} big />
            </motion.div>
          </div>
        </div>

        <motion.p
          aria-hidden
          className="font-display text-[clamp(64px,19vw,96px)] leading-[0.92] font-semibold tracking-[-0.035em] whitespace-nowrap md:col-start-1 md:row-start-3 md:mt-s8 md:text-[min(7vw,112px)]"
          initial={reduce ? { opacity: 0 } : { x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={reduce ? { duration: 0.16 } : { ...GENTLE, delay: 0.6 }}
        >
          {day}
        </motion.p>
        <div className="mt-s3 flex flex-col gap-s6 md:col-start-1 md:row-start-4 md:mt-s4 md:gap-s8">
          <motion.p className="text-[20px] leading-[1.3] font-semibold tabular md:text-[24px]" {...fade(0.9)}>
            {when}
          </motion.p>
          <motion.div {...fade(1.05)} className="self-end md:self-start">
            <Button ref={btn} size="xl" onClick={onDone}>
              See you there
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
