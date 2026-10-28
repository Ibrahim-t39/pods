// Pods (wireframe K03). Each pod is its ring in the pod's hue, with one worn ring per held hangout (Repeat is
// visible, V3_SPEC §1), its name in bold, seated count and round state. Hours together live here only (library
// H #2). Community names stay masked; tapping one asks for a reason and logs the reveal.
"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDb, useHydrated } from "@/lib/db/hooks";
import type { Pod } from "@/lib/types";
import { AdminPage, AdminRow, FilterLink } from "./admin-shell";
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
                  meta={`${n} seated · ${state}`}
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
