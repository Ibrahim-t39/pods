// B04 Free (3 of 6). "Free weeknights, Saturdays." The week reads as a line of named days (QA round 1: a ring of
// single letters had two Ts and two Ss). Mon to Fri are one joined pill because Pods plans weeknights as one slot
// (BLUEPRINT D3): tapping any of them lights all five, so what you see is what is saved. Sat and Sun stand alone.
// The parts of the day are real chips, always shown, live once a weekend day is on. The line writes itself from the
// same value. At least one day (D3); the hint says so while Next is off.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { useDb, useRepo } from "@/lib/db/hooks";
import type { User } from "@/lib/types";
import { FlowStep, Sub } from "../flow";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, DOT, STEP_ROUTE, commitDraft } from "../steps";
import { PARTS, freeWords, fromSlots, toSlots, type Free as FreeValue, type Part } from "../words";

const WEEKNIGHTS = [
  { k: "mon", l: "Mon", name: "Monday" },
  { k: "tue", l: "Tue", name: "Tuesday" },
  { k: "wed", l: "Wed", name: "Wednesday" },
  { k: "thu", l: "Thu", name: "Thursday" },
  { k: "fri", l: "Fri", name: "Friday" },
] as const;
const WEEKEND = [
  { k: "saturday", l: "Sat", name: "Saturday" },
  { k: "sunday", l: "Sun", name: "Sunday" },
] as const;
const PART_LABEL: Record<Part, string> = { morning: "Mornings", afternoon: "Afternoons", evening: "Evenings" };

export function FreeScreen() {
  return <Guarded need="none">{(me) => <Free me={me} />}</Guarded>;
}

function Free({ me }: { me: User | null }) {
  const router = useRouter();
  const repo = useRepo();
  const draft = useDraft();
  const metro = useDb((db) => db.config.placement.metro);
  const [v, setV] = useState<FreeValue>(() => fromSlots(draft.free.length ? draft.free : (me?.availability ?? [])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const words = freeWords(v);
  const weekend = v.saturday || v.sunday;
  const slots = toSlots(v);

  const next = async () => {
    if (!slots.length) return;
    draft.set({ free: slots });
    if (!me) return router.push(STEP_ROUTE.seat);
    // Already holding a seat (came back on another device): save straight away.
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

  const togglePart = (p: Part) => setV((x) => ({ ...x, parts: x.parts.includes(p) ? x.parts.filter((y) => y !== p) : [...x.parts, p] }));

  return (
    <FlowStep
      screen="free"
      back={BACK.free}
      label="Free"
      head={
        <>
          <Line size={words.join(", ").length > 20 ? "md" : "lg"} className="max-w-[12ch]">
            Free{" "}
            {words.length ? (
              words.map((w, i) => (
                <span key={w}>
                  <span className="u">{w}</span>
                  {i < words.length - 1 ? ", " : ""}
                </span>
              ))
            ) : (
              <span aria-label="when" className="inline-block w-[2.2ch] translate-y-[-0.12em] border-b-2 border-line-2 align-baseline">
                &nbsp;
              </span>
            )}
            .
          </Line>
          <Sub live className="min-h-6">
            {err ? "Not saved. Try again." : ""}
          </Sub>
        </>
      }
      object={
        <div className="pods-ob-week">
          <div className="pods-ob-week-group" role="group" aria-label="Days">
            <p>Days</p>
            <div className="pods-ob-week-row" data-days="">
              <span className="pods-ob-joined" data-on={v.weeknights ? "" : undefined} title="Weeknights">
                {WEEKNIGHTS.map((d) => (
                  <button
                    key={d.k}
                    type="button"
                    aria-label={d.name}
                    aria-pressed={v.weeknights}
                    onClick={() => setV((x) => ({ ...x, weeknights: !x.weeknights }))}
                    className="pressable"
                  >
                    {d.l}
                  </button>
                ))}
              </span>
              {WEEKEND.map((d) => (
                <button
                  key={d.k}
                  type="button"
                  aria-label={d.name}
                  aria-pressed={v[d.k]}
                  onClick={() => setV((x) => ({ ...x, [d.k]: !x[d.k] }))}
                  className="pods-ob-like pressable"
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>
          <div className="pods-ob-week-group" role="group" aria-label="Weekend times">
            <p>Weekend times</p>
            <div className="pods-ob-week-row">
              {PARTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!weekend}
                  aria-pressed={weekend && v.parts.includes(p)}
                  onClick={() => togglePart(p)}
                  className="pods-ob-like pressable"
                >
                  {PART_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      dot={DOT.free}
      hint={slots.length ? undefined : "Pick at least one day."}
      action={
        <Button size="xl" disabled={!slots.length} loading={busy} onClick={next}>
          Next
        </Button>
      }
    />
  );
}
