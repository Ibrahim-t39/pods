// planner_loop · <PlanCard>: hangout #N, already planned, at the top of the pod (video Scene 5 beats 4 and 6;
// COLOR_LIFE §13; MOTION_SYSTEM §5.4, §5.6). One card, one hero motion (the three-hue halo), one filled primary.
//
//   ◐ Planned by AI                           #1
//   Saturday pickup run                         (the activity + the day, display 700)
//   10am · Brahan Spring Park · Free            (time, a public place, the cost)
//   ● ● ● ○ │ ○ ○ ○ ○        3 of 8 in          (8 seats; the first 4 are the lock arc, it closes blue)
//   [ I'm in ]                                  (spark; after the lock: the blue "Locked" pill, Add to calendar)
//
// The whole card opens the plan's details (/app/pods/[podId]/plan/[id]); the button sits above that link. No
// view-transition name: the pod stays mounted under the details and the lock, so a `plan-<id>` pair would be two live
// elements with one name (React aborts the transition). Continuity comes from the sheet rising off the card instead.
// Data only from the store: no fact is written here (the seed and the planner decide day, time, place and cost).
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Disc,
  InCount,
  PlanHalo,
  POP,
  STAGGER,
  useCalmMotion,
} from "@/components/brand";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { planTitle as planTitleOf } from "../plan-display";
import { hm, placeWord, sourceLine, type TableModel } from "./model";

/** "Saturday pickup" from the plan, the same title as every other surface (plan-display). */
export function planTitle(m: TableModel, iso: string | null): string {
  return planTitleOf(
    m.view.hangout?.title ?? m.plan?.summary ?? m.plan?.plan_json.summary ?? "",
    iso,
    m.pod.topic,
  );
}

/** "Free" / "$5" as one word or two. An unknown cost is left out, never shown as "to confirm" (QA planner_loop). */
export function costWord(m: TableModel): string {
  const c = m.plan?.plan_json.cost?.trim();
  if (!c || /to confirm|unconfirmed|tbd/i.test(c)) return "";
  return /^free\b/i.test(c) ? "Free" : c.replace(/\.$/, "");
}

export interface SeatDot {
  key: string;
  initial: string;
  seed?: string;
  me?: boolean;
  open?: boolean;
}

/** All the pod's seats (8 for a full pod): who is in (in order), then you if you are in, then open seats. */
export function seatDots(
  m: TableModel,
  opts: { all?: boolean } = {},
): SeatDot[] {
  const going = new Set(m.view.going);
  const others = m.people.filter((p) => !p.me && (opts.all || going.has(p.id)));
  const meIn = !!m.me && (opts.all || going.has(m.me.id));
  const dots: SeatDot[] = others.map((p) => ({
    key: p.id,
    initial: p.initial,
    seed: p.id,
  }));
  if (meIn && m.me) dots.push({ key: "me", initial: m.me.initial, me: true });
  const of = Math.max(m.people.length, m.view.threshold);
  for (let i = dots.length; i < of; i++)
    dots.push({ key: `open-${i}`, initial: "", open: true });
  return dots;
}

/** The seat row: 8 discs overlapping like the logo; the first `lockAt` sit over a short arc that turns solid blue at
 *  the lock (the count is the form). Discs pop in one after another (POP + STAGGER). */
export function SeatRow({
  dots,
  lockAt,
  locked,
  size = 24,
}: {
  dots: SeatDot[];
  lockAt: number;
  locked: boolean;
  size?: number;
}) {
  const calm = useCalmMotion();
  const ov = Math.round(size * 0.22);
  const filled = dots.filter((d) => !d.open).length;
  return (
    <span className="pc-seats" aria-hidden data-nc>
      <span
        className="pc-arc"
        data-on={locked ? "" : undefined}
        style={{
          width: lockAt * (size - ov) + ov,
          ["--fill" as string]: Math.min(1, filled / lockAt),
        }}
      />
      <AnimatePresence initial={false}>
        {dots.map((d, i) => (
          <motion.span
            key={d.key}
            className="pc-seat"
            style={{
              marginLeft: i === 0 ? 0 : -ov,
              zIndex: dots.length - i,
              marginRight: i === lockAt - 1 && dots.length > lockAt ? 6 : 0,
            }}
            initial={calm ? false : POP.initial}
            animate={POP.animate}
            transition={{ ...POP.transition, delay: calm ? 0 : i * STAGGER }}
          >
            {d.open ? (
              <Disc tone="open" size={size} />
            ) : (
              <Disc
                tone={d.me ? "you" : "signal"}
                seed={d.seed}
                initial={d.initial}
                size={size}
                ring
              />
            )}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

export interface PlanCardProps {
  m: TableModel;
  /** where the card opens: the plan's details */
  href?: string;
  onImIn?: () => void;
  onCalendar?: () => void;
  busy?: boolean;
  /** hangout #2 voted in: the halo runs its arrival lap once, then settles blue (MOTION_SYSTEM §10 planner_loop 5) */
  lap?: boolean;
  className?: string;
}

export function PlanCard({
  m,
  href,
  onImIn,
  onCalendar,
  busy,
  lap,
  className,
}: PlanCardProps) {
  const [lapping, setLapping] = useState(!!lap);
  useEffect(() => {
    if (!lapping) return;
    const t = setTimeout(() => setLapping(false), 1800);
    return () => clearTimeout(t);
  }, [lapping]);
  const v = m.view;
  const iso = m.iso;
  const locked = v.locked;
  const going = v.going.length;
  const of = Math.max(m.people.length, v.threshold);
  const place = placeWord(m.venue);
  const cost = costWord(m);
  const facts = [iso ? hm(iso) : null, place].filter(Boolean) as string[];
  const title = planTitle(m, iso);
  return (
    <PlanHalo
      state={locked && !lapping ? "locked" : "waiting"}
      radius={28}
      className={className}
    >
      <article
        className="pc"
        data-locked={locked ? "" : undefined}
        data-pod-hue={m.hue}
      >
        {href && (
          <Link
            href={href}
            scroll={false}
            className="pc-link"
            aria-label={`${title}, ${[...facts, cost].filter(Boolean).join(", ")}. Open the plan`}
          >
            <span className="sr-only">Open the plan</span>
          </Link>
        )}
        <p className="pc-over">
          <Icon name="why" size={16} className="pc-why" />
          <span>{sourceLine(m.plan)}</span>
          {cost && (
            <span
              className="pc-cost"
              data-free={cost === "Free" ? "" : undefined}
            >
              {cost}
            </span>
          )}
        </p>
        <h2 className="pc-title">{title}</h2>
        <p className="pc-facts tabular">
          {facts.map((f, i) => (
            <span key={f + i}>
              {i > 0 && (
                <span className="pc-dot" aria-hidden>
                  ·
                </span>
              )}
              {f}
            </span>
          ))}
        </p>
        <div className="pc-row">
          <SeatRow dots={seatDots(m)} lockAt={v.threshold} locked={locked} />
          <InCount n={going} of={of} locked={locked} className="pc-count" />
        </div>
        <div className="pc-act">
          {locked ? (
            v.imIn ? (
              <Button variant="secondary" size="lg" block onClick={onCalendar}>
                Add to calendar
              </Button>
            ) : going < Math.max(6, v.threshold) ? (
              <Button
                variant="spark"
                size="lg"
                block
                onClick={onImIn}
                loading={busy}
              >
                I&apos;m in
              </Button>
            ) : null
          ) : v.imIn ? (
            href ? (
              <Link href={href} scroll={false} className="pc-go pressable">
                You&apos;re in · {Math.max(0, v.threshold - going)} more locks
                it
                <Icon name="arrow" size={18} />
              </Link>
            ) : null
          ) : (
            <Button
              variant="spark"
              size="lg"
              block
              onClick={onImIn}
              loading={busy}
            >
              I&apos;m in
            </Button>
          )}
        </div>
      </article>
    </PlanHalo>
  );
}
