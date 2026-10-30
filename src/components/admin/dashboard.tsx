// Overview (V3_SPEC 6.6; QA admin r1). Work first: "Needs you" is the queue of what an operator acts on today (open
// reports, urgent first; plans waiting for review; plans short of the lock that start within 3 days), each row a way
// into its screen. Below it, three labelled numbers in equal columns and the repeat line with its dot key. Every
// figure comes from facts.ts / metricsAt on the same store, so Overview, Pods and Hangouts always agree.
// No hero number, no KPI cards, no sparklines, no deltas.
"use client";

import { lockMinForTarget } from "@/lib/planner/lock";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { motion } from "motion/react";
import { formatInTimeZone } from "date-fns-tz";
import { useDb, useHydrated } from "@/lib/db/hooks";
import { metricsAt } from "@/lib/metrics/compute";
import { DUR, EASE as EASES, SNAPPY } from "@/components/brand/motion";
import { AdminPage, AdminRow, PodPair, StatusChip } from "./admin-shell";
import { AdminLoading, Quiet } from "./states";
import { REASON, age, goingCount, hueOf, openPlan, seated, weekday } from "./facts";
import { usePodLabel } from "./reveal";
import { useAdminNow } from "./use-admin-now";

const EASE = EASES.out;
const SOON_MS = 3 * 24 * 3_600_000;

type Item = { id: string; hue: ReturnType<typeof hueOf>; title: string; meta: string; chip?: "urgent" | "review"; href: string; mark: "dot" | "ring"; waiting?: boolean };

export function Dashboard() {
  const hydrated = useHydrated();
  const db = useDb((d) => d);
  const router = useRouter();
  const label = usePodLabel(db);
  const { date: now } = useAdminNow();
  const t = now.getTime();

  const n = useMemo(() => {
    if (!hydrated) return null;
    const live = Object.values(db.pods).filter((p) => p.status !== "closed");
    const locked = Object.values(db.hangouts).filter((h) => h.status !== "cancelled" && Date.parse(h.ends_at) > t && goingCount(db, h.id) >= lockMinForTarget(db, h.id)).length;
    const repeat = metricsAt(db, t).repeat;
    // the same definition as metricsAt.repeat, kept per pod so each pair can take its pod's hue
    const done = (h: { status: string; ends_at: string }) => h.status !== "cancelled" && Date.parse(h.ends_at) <= t;
    const hs = Object.values(db.hangouts);
    const starters = [...new Set(hs.filter((h) => h.sequence === 1 && done(h)).map((h) => h.pod_id))];
    const again = new Set(hs.filter((h) => h.sequence >= 2 && done(h) && db.rsvps.some((x) => x.hangout_id === h.id && x.checked_in)).map((h) => h.pod_id));
    const pairs = starters.map((id) => ({ id, hue: hueOf(db.pods[id]), again: again.has(id) })).sort((a, b) => Number(b.again) - Number(a.again));

    // the work queue
    const queue: Item[] = [];
    const open = Object.values(db.reports)
      .filter((r) => r.status === "open")
      .sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.created_at.localeCompare(b.created_at));
    for (const r of open) {
      const pod = r.pod_id ? db.pods[r.pod_id] : undefined;
      queue.push({ id: r.id, hue: hueOf(pod), title: REASON[r.reason], meta: `Report · ${label(pod)} · ${age(r.created_at, t)}`, chip: r.urgent ? "urgent" : undefined, href: `/admin/reports?r=${r.id}`, mark: "dot" });
    }
    for (const s of Object.values(db.suggestions).filter((x) => x.status === "pending_review")) {
      queue.push({ id: s.id, hue: hueOf(db.pods[s.pod_id]), title: label(db.pods[s.pod_id]), meta: `Plan to review · ${weekday(s.starts_at)}`, chip: "review", href: "/admin/hangouts", mark: "ring", waiting: true });
    }
    for (const pod of live) {
      const plan = openPlan(db, pod.id);
      if (!plan) continue;
      const start = Date.parse(plan.s.starts_at);
      if (start <= t || start - t > SOON_MS || plan.going >= lockMinForTarget(db, plan.s.id)) continue;
      queue.push({ id: plan.s.id, hue: hueOf(pod), title: label(pod), meta: `Not locked · ${plan.going} of ${seated(db, pod.id)} in · locks at ${lockMinForTarget(db, plan.s.id)} · ${weekday(plan.s.starts_at)}`, href: "/admin/hangouts", mark: "ring", waiting: true });
    }

    return {
      pods: live.length,
      seated: live.reduce((s, p) => s + seated(db, p.id), 0),
      locked,
      repeat,
      pairs,
      queue,
    };
  }, [db, t, hydrated, label]);

  if (!n) return <AdminLoading />;

  const r = n.repeat;
  const stats = [
    { k: "pods", v: n.pods, label: "Open pods" },
    { k: "seated", v: n.seated, label: "Members seated" },
    { k: "locked", v: n.locked, label: "Hangouts locked ahead" },
  ];

  return (
    <AdminPage title="Overview" sub={formatInTimeZone(now, "America/Los_Angeles", "EEEE, MMM d")}>
      <section aria-labelledby="ov-needs">
        <h2 id="ov-needs" className="flex items-baseline justify-between pt-s3 text-[15px] font-semibold text-ink">
          Needs you
          <span className="tabular text-[14px] font-medium text-ink-2">{n.queue.length}</span>
        </h2>
        {n.queue.length === 0 ? (
          <Quiet>All quiet.</Quiet>
        ) : (
          <ul className="mt-s1">
            {n.queue.map((it, i) => (
              <AdminRow
                key={it.id}
                index={i}
                hue={it.hue}
                mark={it.mark}
                waiting={it.waiting}
                title={it.title}
                meta={it.meta}
                chip={it.chip === "urgent" ? <StatusChip tone="open">urgent</StatusChip> : it.chip === "review" ? <StatusChip tone="open">review</StatusChip> : undefined}
                onClick={() => router.push(it.href)}
              />
            ))}
          </ul>
        )}
      </section>

      <ul aria-label="This week" className="mt-s6 grid grid-cols-3 gap-s6 border-t border-line pt-s6">
        {stats.map((it, i) => (
          <motion.li
            key={it.k}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.settle, ease: EASE, delay: 0.2 + i * 0.06 }}
            className="flex min-w-0 flex-col"
          >
            <span className="tabular text-[32px] leading-none font-semibold tracking-[-0.03em] text-ink lg:text-[40px]">{it.v}</span>
            <span className="mt-s2 text-[14px] leading-snug font-medium text-ink-2">{it.label}</span>
          </motion.li>
        ))}
      </ul>

      <section aria-labelledby="ov-again" className="mt-s6 border-t border-line pt-s6">
        <h2 id="ov-again" className="flex items-baseline justify-between gap-s4 text-[15px] font-semibold text-ink">
          Met again after hangout #1
          {r.den > 0 && <span className="tabular shrink-0 text-[15px] font-semibold text-ink">{r.num} of {r.den} pods</span>}
        </h2>
        {r.den === 0 ? (
          <p className="mt-s2 text-[14px] text-ink-2">No hangout held yet.</p>
        ) : (
          <>
            <ul aria-hidden className="mt-s4 flex flex-wrap gap-s2">
              {n.pairs.map((p, i) => (
                <motion.li key={p.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SNAPPY, delay: 0.15 + i * 0.03 }}>
                  <PodPair hue={p.hue} held={p.again ? 2 : 1} waiting={!p.again} size={32} />
                </motion.li>
              ))}
            </ul>
            <p className="mt-s3 flex flex-wrap items-center gap-x-s4 gap-y-s1 text-[13px] font-medium text-ink-2">
              <span className="inline-flex items-center gap-s1"><PodPair hue="ember" held={2} size={20} />met again</span>
              <span className="inline-flex items-center gap-s1"><PodPair hue="ember" waiting size={20} />not yet</span>
            </p>
          </>
        )}
      </section>
    </AdminPage>
  );
}
