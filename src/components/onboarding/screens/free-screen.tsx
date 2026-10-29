// Your usual week (3 of 6). A compact Mon-Sun grid by Morning / Afternoon / Evening. It starts on a sensible guess
// (weeknight evenings and weekend afternoons), so most people only adjust. Tap a cell, a day, or a column, or drag
// to paint. Three quick starts fill the grid. "Changes week to week" is a promise that the AI checks the week
// (Home's "Your time" check-in) before it plans; any single week can be marked busy or free later either way.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { WEEK_PRESETS, WeekGrid, sameSlots } from "@/components/availability/week-grid";
import { RhythmChoice } from "@/components/availability/rhythm-choice";
import { useDb, useRepo } from "@/lib/db/hooks";
import { normalizeSlots, type Rhythm, type Slot, type User } from "@/lib/types";
import { FlowStep, Sub } from "../flow";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, DOT, STEP_ROUTE, commitDraft } from "../steps";

const DEFAULT: Slot[] = [
  "monday-evening", "tuesday-evening", "wednesday-evening", "thursday-evening", "friday-evening",
  "saturday-afternoon", "sunday-afternoon",
];

export function FreeScreen() {
  return <Guarded need="none">{(me) => <Free me={me} />}</Guarded>;
}

function Free({ me }: { me: User | null }) {
  const router = useRouter();
  const repo = useRepo();
  const draft = useDraft();
  const metro = useDb((db) => db.config.placement.metro);
  const [slots, setSlots] = useState<Slot[]>(() => {
    const saved = normalizeSlots(draft.free.length ? draft.free : me?.availability);
    return saved.length ? saved : DEFAULT;
  });
  const [rhythm, setRhythm] = useState<Rhythm>(() => draft.rhythm ?? me?.rhythm ?? "steady");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const count = slots.length;

  const next = async () => {
    if (!count) return;
    draft.set({ free: slots, rhythm });
    if (!me) return router.push(STEP_ROUTE.seat);
    setBusy(true);
    setErr(false);
    const r = me.first_name
      ? await (async () => {
          if (draft.interests.length) await repo.setInterests(draft.interests);
          const a = await repo.setAvailability(slots, [], rhythm);
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
            {err
              ? "Not saved. Try again."
              : rhythm === "changes"
                ? "The AI checks your week before it plans. Mark it from Home."
                : "Tap or drag when you're usually free. You can change any week later."}
          </Sub>
        </>
      }
      object={
        <div className="flex w-full flex-col items-center gap-s4">
          <div className="pods-ob-presets" role="group" aria-label="Quick start">
            {WEEK_PRESETS.map((p) => (
              <button key={p.key} type="button" aria-pressed={sameSlots(slots, p.slots)} onClick={() => setSlots(p.slots)} className="pods-ob-preset pressable">
                {p.label}
              </button>
            ))}
          </div>
          <WeekGrid slots={slots} onChange={setSlots} />
          <RhythmChoice value={rhythm} onChange={setRhythm} />
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
