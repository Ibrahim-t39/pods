// Hangouts (wireframe K04). Upcoming: locked hangouts (solid pair, "Locked" in the plan's blue) and the plans still
// short of the lock (dashed pair, no chip). Counts read like the member app's counter: "3 of 8 in" (Scene 5 beat 6).
// Past: held (3 or more checked in, library H #1) or how many came. One filter link (Upcoming / Past). Plans that
// wait for review (config.planner.adminReview) sit above the rows with one quiet Approve each.
"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, notify } from "@/components/ui";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { AdminPage, AdminRow, FilterLink, PodPair, StatusChip } from "./admin-shell";
import { AdminLoading, Quiet } from "./states";
import { HELD_MIN, goingCount, hereCount, hueOf, openPlan, seated, weekday } from "./facts";
import { usePodLabel } from "./reveal";
import { useAdminNow } from "./use-admin-now";

type Row = { id: string; podId: string; seq: number; title: string; meta: string; at: string; rank?: number; waiting?: boolean; chip?: { tone: "open" | "done" | "locked"; text: string } };

export function HangoutsScreen() {
  const hydrated = useHydrated();
  const repo = useRepo();
  const db = useDb((d) => d);
  const { date: now } = useAdminNow();
  const t = now.getTime();
  const label = usePodLabel(db);
  const [past, setPast] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { upcoming, done } = useMemo(() => {
    const up: Row[] = [];
    const dn: Row[] = [];
    if (!hydrated) return { upcoming: up, done: dn };
    const hs = Object.values(db.hangouts);
    for (const h of hs) {
      const pod = db.pods[h.pod_id];
      const title = `${label(pod)} #${h.sequence}`;
      const ended = h.status === "done" || Date.parse(h.ends_at) <= t;
      if (h.status === "cancelled") dn.push({ id: h.id, podId: h.pod_id, seq: h.sequence, title, meta: "called off", at: h.starts_at });
      else if (ended) {
        const here = hereCount(db, h.id);
        dn.push({ id: h.id, podId: h.pod_id, seq: h.sequence, title, meta: `${here} here`, at: h.starts_at, chip: here >= HELD_MIN ? { tone: "done", text: "held" } : undefined });
      } else up.push({ id: h.id, podId: h.pod_id, seq: h.sequence, title, meta: `${goingCount(db, h.id)} of ${seated(db, h.pod_id)} in · ${weekday(h.starts_at)}`, at: h.starts_at, rank: 0, chip: { tone: "locked", text: "Locked" } });
    }
    for (const pod of Object.values(db.pods)) {
      if (pod.status === "closed") continue;
      const plan = openPlan(db, pod.id);
      if (!plan) continue;
      const seq = hs.filter((h) => h.pod_id === pod.id && h.status !== "cancelled").length + 1;
      up.push({ id: plan.s.id, podId: pod.id, seq, title: `${label(pod)} #${seq}`, meta: `${plan.going} of ${seated(db, pod.id)} in · ${weekday(plan.s.starts_at)}`, at: plan.s.starts_at, rank: 1, waiting: true });
    }
    up.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0) || a.at.localeCompare(b.at));
    dn.sort((a, b) => b.at.localeCompare(a.at));
    return { upcoming: up, done: dn };
  }, [db, t, hydrated, label]);
  const review = Object.values(db.suggestions).filter((s) => s.status === "pending_review");

  if (!hydrated) return <AdminLoading />;

  const rows = past ? done : upcoming;
  const approve = async (id: string) => {
    setBusy(id);
    const r = await repo.approveSuggestion(id);
    setBusy(null);
    if (r.ok) notify.success("Approved");
    else notify.error("Not approved. Try again.");
  };

  return (
    <AdminPage
      title="Hangouts"
      sub={past ? `${done.length} past` : `${upcoming.length} upcoming`}
      link={<FilterLink on={past} onClick={() => setPast((v) => !v)}>{past ? "Back to upcoming" : `Past (${done.length})`}</FilterLink>}
    >
      {!past && review.length > 0 && (
        <section aria-label="Waiting for review" className="mb-s8">
          <p className="pt-s2 text-[14px] font-medium text-info-text">Waiting for review</p>
          <ul className="mt-s2">
            {review.map((s) => (
              <li key={s.id} data-data className="flex min-h-[72px] items-center gap-s4 border-b border-line py-s3">
                <PodPair hue={hueOf(db.pods[s.pod_id])} waiting />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] lg:text-[26px]">{label(db.pods[s.pod_id])}</span>
                  <span className="mt-s1 block truncate text-[14px] text-ink-2">{weekday(s.starts_at)} · {db.venues[s.venue_id]?.short_name ?? db.venues[s.venue_id]?.name ?? "No place"}</span>
                </span>
                <Button variant="secondary" size="sm" loading={busy === s.id} onClick={() => approve(s.id)}>Approve</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {rows.length === 0 ? (
        <Quiet>{past ? "Nothing yet." : "Nothing planned."}</Quiet>
      ) : (
        <motion.ul layout key={past ? "past" : "up"}>
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <AdminRow key={r.id} index={i} mark="ring" rings={r.seq} waiting={r.waiting} hue={hueOf(db.pods[r.podId])} title={r.title} meta={r.meta} chip={r.chip && <StatusChip tone={r.chip.tone}>{r.chip.text}</StatusChip>} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </AdminPage>
  );
}
