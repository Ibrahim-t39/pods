// Overview (V3_SPEC 6.6): four numbers from the store, each with its definition as one label. No KPI cards, no
// sparklines, no deltas. Numbers are Plus Jakarta Sans Bold, tabular. The headline count carries the calm logo
// gradient (tide: blue into teal, AA as large text); each pod is its two logo circles meeting (PodPair): filled once it
// met again, dashed while it waits. The open-reports number is the one way out: it goes to the queue.
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { formatInTimeZone } from "date-fns-tz";
import { useDb, useHydrated } from "@/lib/db/hooks";
import { cn } from "@/lib/cn";
import { metricsAt } from "@/lib/metrics/compute";
import { Icon } from "@/components/icons";
import { DUR, EASE as EASES, SNAPPY } from "@/components/brand/motion";
import { AdminPage, PodPair } from "./admin-shell";
import { AdminLoading } from "./states";
import { goingCount, hueOf, seated } from "./facts";
import { useAdminNow } from "./use-admin-now";

const EASE = EASES.out;


export function Dashboard() {
  const hydrated = useHydrated();
  const db = useDb((d) => d);
  const { date: now } = useAdminNow();
  const t = now.getTime();

  const n = useMemo(() => {
    if (!hydrated) return null;
    const live = Object.values(db.pods).filter((p) => p.status !== "closed");
    const lock = db.config.planner.lockThreshold;
    const locked = Object.values(db.hangouts).filter((h) => h.status !== "cancelled" && Date.parse(h.ends_at) > t && goingCount(db, h.id) >= lock).length;
    const repeat = metricsAt(db, t).repeat;
    // the same definition as metricsAt.repeat, kept per pod so each ring can take its pod's hue
    const done = (h: { status: string; ends_at: string }) => h.status !== "cancelled" && Date.parse(h.ends_at) <= t;
    const hs = Object.values(db.hangouts);
    const starters = [...new Set(hs.filter((h) => h.sequence === 1 && done(h)).map((h) => h.pod_id))];
    const again = new Set(hs.filter((h) => h.sequence >= 2 && done(h) && db.rsvps.some((x) => x.hangout_id === h.id && x.checked_in)).map((h) => h.pod_id));
    const rings = starters.map((id) => ({ id, hue: hueOf(db.pods[id]), again: again.has(id) })).sort((a, b) => Number(b.again) - Number(a.again));
    return {
      seated: live.reduce((s, p) => s + seated(db, p.id), 0),
      locked,
      repeat,
      rings,
      reports: Object.values(db.reports).filter((r) => r.status === "open").length,
    };
  }, [db, t, hydrated]);

  if (!n) return <AdminLoading />;

  const r = n.repeat;
  const small = [
    { k: "seated", v: n.seated, label: "seated" },
    { k: "locked", v: n.locked, label: "locked ahead" },
    { k: "reports", v: n.reports, label: "open reports", href: "/admin/reports" },
  ];

  return (
    <AdminPage title="Overview" sub={formatInTimeZone(now, "America/Chicago", "EEEE, MMM d")}>
      <section aria-label="Pods that met again">
        <p className="flex items-baseline gap-s2">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.light, ease: EASE }}
            className="tabular bg-[image:var(--grad-tide)] bg-clip-text pb-[0.06em] text-[88px] leading-[0.9] font-bold tracking-[-0.05em] text-transparent lg:text-[128px]"
          >
            {r.num}
          </motion.span>
          <span className="tabular text-[22px] font-semibold text-ink-2 lg:text-[28px]">of {r.den}</span>
        </p>
        <p className="mt-s3 text-[16px] font-medium text-ink-2">pods met again after #1</p>
        <ul aria-hidden className="mt-s6 flex flex-wrap gap-s2">
          {n.rings.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SNAPPY, delay: 0.15 + i * 0.035 }}
            >
              <PodPair hue={p.hue} held={p.again ? 2 : 1} waiting={!p.again} size={32} />
            </motion.li>
          ))}
        </ul>
      </section>

      <ul className="mt-s8 grid grid-cols-3 border-t border-line pt-s6 lg:mt-s12 lg:pt-s8">
        {small.map((it, i) => {
          const body = (
            <>
              <span className="flex items-center gap-s2">
                <span className={cn("tabular text-[40px] leading-none font-bold tracking-[-0.04em] lg:text-[48px]", it.href && it.v > 0 ? "text-info-text" : "text-ink")}>{it.v}</span>
                {it.href && <Icon name="arrow" size={20} className="text-teal transition-transform group-hover:translate-x-1" />}
              </span>
              <span className="mt-s2 text-[14px] font-medium text-ink-2">{it.label}</span>
            </>
          );
          return (
            <motion.li
              key={it.k}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.settle, ease: EASE, delay: 0.3 + i * 0.06 }}
            >
              {it.href ? (
                <Link href={it.href} className="group pressable flex min-h-11 flex-col">{body}</Link>
              ) : (
                <div className="flex flex-col">{body}</div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </AdminPage>
  );
}
