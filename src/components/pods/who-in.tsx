// "Who's in" (founder review r3): replaces the big glossy table ring on a pod's page. Every seat in the pod as a disc
// with a name under it (open seats dashed), and one line on what the plan still needs. On a laptop the pod's solid mark
// (a white dot per person, lit = said yes) sits on top, so the card matches the plan card beside it in height.
// Flat card, no gloss. Tap opens the members sheet.
"use client";

import { Disc, type PodHueKey, type Seat } from "@/components/brand";
import { cn } from "@/lib/cn";
import { PodOrb } from "./pod-orb";
import { lockCopy } from "@/lib/planner/lock";

export function WhoIn({
  seats,
  hue,
  count,
  need,
  locked,
  onMembers,
  className,
}: {
  seats: (Seat | null)[];
  hue: PodHueKey;
  count: number;
  need: number;
  locked: boolean;
  onMembers?: () => void;
  className?: string;
}) {
  const youIn = !!seats[0]?.in;
  const left = seats.length - count;
  // founder r1029: never "See you there" to someone who is not in. Locked without you: say so, and whether a seat is left.
  const status = locked
    ? youIn
      ? "Locked. See you there."
      : left > 0
        ? `Locked with ${count}. ${left === 1 ? "1 seat" : `${left} seats`} left`
        : `Locked with ${count}. Full`
    : need === 0 ? "Enough to go" : lockCopy(need);
  // you first, then the people who said yes, then the open seats
  const ordered = [...seats.slice(1).filter((s) => s && !s.open), seats[0], ...seats.slice(1).filter((s) => !s || s.open)];
  return (
    <section aria-labelledby="who-in-h" className={cn("pods-card flex flex-col p-s4 lg:p-s5", className)}>
      <div className="flex items-baseline justify-between gap-s3">
        <h2 id="who-in-h" className="text-[15px] font-semibold text-ink">
          Who&apos;s in
        </h2>
        <span className={cn("text-[14px]", locked ? "font-semibold text-select" : "text-ink-2")}>{status}</span>
      </div>
      <div className="pods-who-mark">
        <PodOrb hue={hue} people={seats.length} inCount={count} size={120} />
      </div>
      <button
        type="button"
        onClick={onMembers}
        aria-label={`${count} of ${seats.length} in. See members.`}
        className="pressable mt-s4 grid grid-cols-4 gap-x-s2 gap-y-s3 rounded-[14px] outline-offset-2 sm:grid-cols-5 lg:grid-cols-4"
      >
        {ordered.map((s, i) => {
          const you = s === seats[0];
          const yours = you && !s?.in; // your seat, waiting on your answer: never "You" until you said yes
          const open = !s || s.open || yours;
          const label = yours ? "Your seat" : you ? "You" : s && !s.open ? (s.name ?? "") : "";
          return (
            <span key={i} className="flex min-w-0 flex-col items-center gap-1" aria-label={open && !yours ? "Open seat" : undefined}>
              {open ? (
                <span aria-hidden className={cn("size-9 rounded-full border-[1.5px]", yours ? "border-ember-500" : "border-dashed border-line-2")} />
              ) : (
                <Disc initial={s?.initial} tone={you ? "you" : hue} seed={s?.name} size={36} style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15 }} />
              )}
              <span aria-hidden={!label || undefined} className={cn("min-h-[14px] w-full truncate text-center text-[12px] leading-[1.2]", yours ? "text-ink-2" : you ? "font-semibold text-ink" : "text-ink-2")}>
                {label}
              </span>
            </span>
          );
        })}
      </button>
    </section>
  );
}
