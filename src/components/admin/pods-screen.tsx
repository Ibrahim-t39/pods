// Pods (wireframe K03). Each pod is its ring in the pod's hue, with one worn ring per held hangout (Repeat is
// visible, V3_SPEC §1), its name in bold, seated count and round state. Hours together live here only (library
// H #2). Community names stay masked; tapping one asks for a reason and logs the reveal.
// Every stat is labelled (QA admin r1): phone rows read "7 seated · #3 Sun · 5h together"; laptop is a table with a sticky
// header (Pod · Seated · Hangout · Together) so long lists keep their columns named while scrolling.
"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDb, useHydrated } from "@/lib/db/hooks";
import type { Pod } from "@/lib/types";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { cn } from "@/lib/cn";
import { ARRIVE } from "@/components/brand/motion";
import { AdminPage, AdminRow, FilterLink, PodPair } from "./admin-shell";
import { AdminLoading, Quiet } from "./states";
import { HELD_MIN, hereCount, hoursTogether, hueOf, roundState, seated } from "./facts";
import { RevealSheet, hidePod, usePodLabel, useRevealed } from "./reveal";
import { useAdminNow } from "./use-admin-now";

export function PodsScreen() {
  const hydrated = useHydrated();
  const db = useDb((d) => d);
  const { date: now, iso } = useAdminNow();
  const t = now.getTime();
  const label = usePodLabel(db);
  const revealed = useRevealed();
  const [closedView, setClosedView] = useState(false);
  const [asking, setAsking] = useState<Pod | null>(null);
  const wide = useMediaQuery("(min-width: 1024px)");

  const rows = useMemo(() => {
    if (!hydrated) return [];
    return Object.values(db.pods).map((p) => ({
      p,
      seated: seated(db, p.id),
      state: roundState(db, p, t),
      hours: hoursTogether(db, p.id, t),
      held: Object.values(db.hangouts).filter((h) => h.pod_id === p.id && h.status !== "cancelled" && Date.parse(h.ends_at) <= t && hereCount(db, h.id) >= HELD_MIN).length,
    })).sort((a, b) => b.hours - a.hours || b.seated - a.seated || a.p.name.localeCompare(b.p.name));
  }, [db, t, hydrated]);

  if (!hydrated) return <AdminLoading />;

  const live = rows.filter((r) => r.p.status !== "closed");
  const closed = rows.filter((r) => r.p.status === "closed");
  const shown = closedView ? closed : live;
  const total = live.reduce((n, r) => n + r.seated, 0);

  return (
    <AdminPage
      title="Pods"
      sub={closedView ? `${closed.length} closed` : `${live.length} pods · ${total} seated`}
      link={closed.length > 0 ? (
        <FilterLink on={closedView} onClick={() => setClosedView((v) => !v)}>{closedView ? "Back to open" : `Closed (${closed.length})`}</FilterLink>
      ) : undefined}
    >
      {shown.length === 0 ? (
        <Quiet>No pods yet.</Quiet>
      ) : wide ? (
        <div role="table" aria-label="Pods" className="-mx-s6">
          <div role="row" className="sticky top-[96px] z-sticky grid grid-cols-[minmax(0,1fr)_96px_168px_112px] items-center gap-s4 rounded-t-[28px] border-b border-line bg-lit px-s6 pt-s2 pb-s3 text-[13px] font-semibold text-ink-2">
            <span role="columnheader" className="pl-14">Pod</span>
            <span role="columnheader" className="text-right">Seated</span>
            <span role="columnheader">Hangout</span>
            <span role="columnheader" className="text-right">Together</span>
          </div>
          <div role="rowgroup">
            {shown.map(({ p, seated: n, state, hours, held }, i) => {
              const community = p.type === "community";
              const onClick = community ? () => (revealed[p.id] ? hidePod(p.id) : setAsking(p)) : undefined;
              const cells = (
                <>
                  <span role="cell" className="flex min-w-0 items-center gap-s4">
                    <PodPair hue={hueOf(p)} held={held} />
                    <span className="truncate text-[22px] leading-[1.15] font-semibold tracking-[-0.02em]">{label(p)}</span>
                  </span>
                  <span role="cell" className="tabular text-right text-[16px] text-ink">{n}</span>
                  <span role="cell" className="tabular truncate text-[16px] text-ink">{state}</span>
                  <span role="cell" className="tabular text-right text-[16px] text-ink-2">{hours ? `${hours}h` : "–"}</span>
                </>
              );
              const cls = "grid min-h-16 w-full grid-cols-[minmax(0,1fr)_96px_168px_112px] items-center gap-s4 border-b border-line px-s6 py-s2 text-left last:border-0";
              return (
                <motion.div key={p.id} role="row" data-data initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...ARRIVE, delay: Math.min(i, 8) * 0.03 }}>
                  {onClick ? (
                    <button type="button" onClick={onClick} className={cn(cls, "pressable hover:bg-primary-soft/40")}>{cells}</button>
                  ) : (
                    <div className={cls}>{cells}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <motion.ul layout>
          <AnimatePresence initial={false}>
            {shown.map(({ p, seated: n, state, hours, held }, i) => {
              const community = p.type === "community";
              return (
                <AdminRow
                  key={p.id}
                  index={i}
                  mark="ring"
                  rings={1 + held}
                  hue={hueOf(p)}
                  title={label(p)}
                  meta={`${n} seated · ${hangoutLabel(state)}`}
                  under={hours ? `${hours}h together` : undefined}
                  onClick={community ? () => (revealed[p.id] ? hidePod(p.id) : setAsking(p)) : undefined}
                />
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
      <RevealSheet pod={asking} open={!!asking} onOpenChange={(o) => !o && setAsking(null)} nowISO={iso} />
    </AdminPage>
  );
}

/** roundState for the phone line: "#3 Sun" stays short (the row also says "seated" and "together"), words get a capital. */
function hangoutLabel(state: string): string {
  return state.startsWith("#") ? state : state[0].toUpperCase() + state.slice(1);
}
