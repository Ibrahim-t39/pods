// B04 Free (3 of 4). "Free weekends, afternoons." The week sits around the table's rim (PB 6.2 clock arc; IL 40;
// E #7 tapped availability): tap a day and it takes the pod hue. Weekdays move together (Pods plans weeknights as
// one slot, BLUEPRINT D3). When a weekend day is on, the parts of the day appear on the table top. The line writes
// itself. At least one (D3).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { useDb, useRepo } from "@/lib/db/hooks";
import type { User } from "@/lib/types";
import { FlowStep, Sub, useTableSize } from "../flow";
import { RingTable } from "../objects";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, DOT, STEP_ROUTE, commitDraft } from "../steps";
import { PARTS, freeWords, fromSlots, toSlots, type Free as FreeValue, type Part } from "../words";

const WEEK = [
  { k: "mon", l: "M", d: "weeknights", name: "Monday" },
  { k: "tue", l: "T", d: "weeknights", name: "Tuesday" },
  { k: "wed", l: "W", d: "weeknights", name: "Wednesday" },
  { k: "thu", l: "T", d: "weeknights", name: "Thursday" },
  { k: "fri", l: "F", d: "weeknights", name: "Friday" },
  { k: "sat", l: "S", d: "saturday", name: "Saturday" },
  { k: "sun", l: "S", d: "sunday", name: "Sunday" },
] as const;

export function FreeScreen() {
  return <Guarded need="none">{(me) => <Free me={me} />}</Guarded>;
}

function Free({ me }: { me: User | null }) {
  const router = useRouter();
  const repo = useRepo();
  const { size } = useTableSize();
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
        <RingTable
          size={size}
          on={slots.length > 0}
          label="Days"
          items={WEEK.map((d) => ({
            key: d.k,
            node: (
              <button
                type="button"
                aria-label={d.name}
                aria-pressed={v[d.d]}
                onClick={() => setV((x) => ({ ...x, [d.d]: !x[d.d] }))}
                className="pods-ob-day pressable"
              >
                <span aria-hidden>{d.l}</span>
              </button>
            ),
          }))}
          center={
            <AnimatePresence>
              {weekend && (
                <motion.div
                  role="group"
                  aria-label="Weekend times"
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.24 }}
                >
                  {PARTS.map((p) => (
                    <button key={p} type="button" aria-pressed={v.parts.includes(p)} onClick={() => togglePart(p)} className="pods-ob-part pressable">
                      {p}s
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          }
        />
      }
      dot={DOT.free}
      action={
        <Button size="xl" disabled={!slots.length} loading={busy} onClick={next}>
          Next
        </Button>
      }
    />
  );
}
