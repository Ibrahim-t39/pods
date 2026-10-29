// WeekGrid: any day of the week x Morning / Afternoon / Evening. One component for sign-up and for editing later.
//   tap a cell            toggle it
//   tap a day / a column  toggle the whole day / that part of every day
//   press and drag        paint: the first cell decides whether the stroke turns cells on or off
// Keyboard: every cell, day and column is a button (Space / Enter). Touch-action is off on the grid only, so the
// rest of the page still scrolls.
"use client";

import { useRef } from "react";
import { WEEK_DAYS, DAY_PART_KEYS, normalizeSlots, type Slot, type WeekDay } from "@/lib/types";
import "./week-grid.css";

const DAY: Record<WeekDay, { long: string; short: string }> = {
  monday: { long: "Monday", short: "Mon" },
  tuesday: { long: "Tuesday", short: "Tue" },
  wednesday: { long: "Wednesday", short: "Wed" },
  thursday: { long: "Thursday", short: "Thu" },
  friday: { long: "Friday", short: "Fri" },
  saturday: { long: "Saturday", short: "Sat" },
  sunday: { long: "Sunday", short: "Sun" },
};
const PART: Record<(typeof DAY_PART_KEYS)[number], string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

const slotOf = (d: WeekDay, p: (typeof DAY_PART_KEYS)[number]) => `${d}-${p}` as Slot;

export function WeekGrid({ slots, onChange, label = "Your usual week" }: { slots: readonly Slot[]; onChange: (next: Slot[]) => void; label?: string }) {
  const live = useRef<Slot[]>([...slots]);
  live.current = [...slots];
  const paint = useRef<boolean | null>(null);

  const set = (targets: Slot[], on: boolean) => {
    const cur = live.current;
    const next = on ? [...cur, ...targets.filter((t) => !cur.includes(t))] : cur.filter((s) => !targets.includes(s));
    if (next.length === cur.length) return;
    live.current = normalizeSlots(next);
    onChange(live.current);
  };
  const toggleMany = (targets: Slot[]) => set(targets, !targets.every((t) => live.current.includes(t)));

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const slot = (e.target as HTMLElement).closest<HTMLElement>("[data-slot]")?.dataset.slot as Slot | undefined;
    if (!slot) return;
    paint.current = !live.current.includes(slot);
    e.currentTarget.setPointerCapture(e.pointerId);
    set([slot], paint.current);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (paint.current === null) return;
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-slot]")?.dataset.slot as Slot | undefined;
    if (slot) set([slot], paint.current);
  };
  const up = () => {
    paint.current = null;
  };

  return (
    <div className="pods-ob-grid" role="group" aria-label={label} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <span />
      {DAY_PART_KEYS.map((p) => {
        const col = WEEK_DAYS.map((d) => slotOf(d, p));
        return (
          <button key={p} type="button" className="pods-ob-grid-col pressable" aria-label={`${PART[p]}, every day`} aria-pressed={col.every((s) => slots.includes(s))} onClick={() => toggleMany(col)}>
            {PART[p]}
          </button>
        );
      })}
      {WEEK_DAYS.map((d) => {
        const row = DAY_PART_KEYS.map((p) => slotOf(d, p));
        return (
          <div key={d} className="contents">
            <button type="button" className="pods-ob-grid-row pressable" aria-label={`${DAY[d].long}, all day`} aria-pressed={row.every((s) => slots.includes(s))} onClick={() => toggleMany(row)}>
              <span className="pods-ob-grid-long">{DAY[d].long}</span>
              <span className="pods-ob-grid-short">{DAY[d].short}</span>
            </button>
            {DAY_PART_KEYS.map((p) => {
              const s = slotOf(d, p);
              return (
                <button
                  key={p}
                  type="button"
                  data-slot={s}
                  aria-label={`${DAY[d].long} ${p}`}
                  aria-pressed={slots.includes(s)}
                  onClick={(e) => e.detail === 0 && toggleMany([s])}
                  className="pods-ob-cell pressable"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12.5 10 17.5 19 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Quick starts that fill the grid (replace, not add). */
export const WEEK_PRESETS: { key: string; label: string; slots: Slot[] }[] = [
  { key: "evenings", label: "Evenings", slots: WEEK_DAYS.map((d) => slotOf(d, "evening")) },
  { key: "weekends", label: "Weekends", slots: (["saturday", "sunday"] as const).flatMap((d) => DAY_PART_KEYS.map((p) => slotOf(d, p))) },
  { key: "daytime", label: "Daytime", slots: WEEK_DAYS.flatMap((d) => (["morning", "afternoon"] as const).map((p) => slotOf(d, p))) },
];

export const sameSlots = (a: readonly Slot[], b: readonly Slot[]) => a.length === b.length && a.every((s) => b.includes(s));
