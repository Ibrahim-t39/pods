// Your usual week (3 of 6). A one-tap grid: rows are the days Pods plans (weeknights as one slot, Saturday, Sunday),
// columns are the parts of the day. It starts on a sensible guess (weeknight evenings and weekend afternoons), so most
// people only adjust. The sub-line says plainly that this is a rhythm, not a promise: any single week can be marked
// busy or free later from Home or the calendar, and the AI plans around that week instead.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { useDb, useRepo } from "@/lib/db/hooks";
import type { Slot, User } from "@/lib/types";
import { FlowStep, Sub } from "../flow";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, DOT, STEP_ROUTE, commitDraft } from "../steps";
import { PARTS, type Part } from "../words";

const ROWS = [
  { k: "weekday", l: "Weeknights", short: "Mon–Fri", parts: ["evening"] as Part[] },
  { k: "saturday", l: "Saturday", short: "Sat", parts: PARTS },
  { k: "sunday", l: "Sunday", short: "Sun", parts: PARTS },
] as const;
const PART_LABEL: Record<Part, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const DEFAULT: Slot[] = ["weekday-evening", "saturday-afternoon", "sunday-afternoon"];

export function FreeScreen() {
  return <Guarded need="none">{(me) => <Free me={me} />}</Guarded>;
}

function Free({ me }: { me: User | null }) {
  const router = useRouter();
  const repo = useRepo();
  const draft = useDraft();
  const metro = useDb((db) => db.config.placement.metro);
  const [slots, setSlots] = useState<Slot[]>(() => (draft.free.length ? draft.free : me?.availability.length ? me.availability : DEFAULT));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  const toggle = (s: Slot) => setSlots((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  const count = slots.length;

  const next = async () => {
    if (!count) return;
    draft.set({ free: slots });
    if (!me) return router.push(STEP_ROUTE.seat);
    setBusy(true);
    setErr(false);
    const r = me.first_name
      ? await (async () => {
          if (draft.interests.length) await repo.setInterests(draft.interests);
          const a = await repo.setAvailability(slots, []);
          return a.ok ? { ok: true as const } : { ok: false as const, code: a.error.code };
        })()
      : await commitDraft(repo, metro);
    setBusy(false);
    if (!r.ok) return setErr(true);
    router.push(STEP_ROUTE.promise);
  };

  return (
    <FlowStep
      screen="free"
      back={BACK.free}
      label="Your week"
      head={
        <>
          <Line size="lg" className="max-w-[12ch]">
            Your usual week.
          </Line>
          <Sub live className="max-w-[34ch]">
            {err ? "Not saved. Try again." : "Tap when you're usually free. Weeks change, so you can mark any day busy or free later."}
          </Sub>
        </>
      }
      object={
        <div className="pods-ob-grid" role="group" aria-label="Your usual week">
          <span />
          {PARTS.map((p) => (
            <span key={p} className="pods-ob-grid-col">
              {PART_LABEL[p]}
            </span>
          ))}
          {ROWS.map((row) => (
            <div key={row.k} className="contents">
              <span className="pods-ob-grid-row">
                <span className="pods-ob-grid-long">{row.l}</span>
                <span className="pods-ob-grid-short">{row.short}</span>
              </span>
              {row.k === "weekday" ? (
                <>
                  <span className="pods-ob-grid-off">
                    work hours
                  </span>
                  <Cell slot="weekday-evening" on={slots.includes("weekday-evening")} label="Weeknight evenings" onToggle={toggle} />
                </>
              ) : (
                PARTS.map((p) => {
                  const s = `${row.k}-${p}` as Slot;
                  return <Cell key={p} slot={s} on={slots.includes(s)} label={`${row.l} ${p}`} onToggle={toggle} />;
                })
              )}
            </div>
          ))}
        </div>
      }
      dot={DOT.free}
      hint={count ? undefined : "Tap at least one time."}
      action={
        <Button size="xl" disabled={!count} loading={busy} onClick={next}>
          Next
        </Button>
      }
    />
  );
}

function Cell({ slot, on, label, onToggle }: { slot: Slot; on: boolean; label: string; onToggle: (s: Slot) => void }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={() => onToggle(slot)} className="pods-ob-cell pressable">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
    </button>
  );
}
