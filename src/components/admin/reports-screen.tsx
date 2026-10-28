// Reports, the admin's landing view (wireframes K01, K02; library J #10 "queue first"). Open reports, urgent first
// then oldest first; each row says who it is about and the reporter's words (QA admin r1: the queue carries its
// detail), and the last three closed sit under the queue. One filter link (Open / Closed). Phone: a report replaces the queue. Laptop: the report takes
// the left column and the queue stays beside it, the open row lit. Actions are optimistic with an 8 s Undo before
// the Repo write; leaving the page flushes them (a moderation decision is never dropped). j / k walk the queue.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { notify } from "@/components/ui";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import type { ModerationAction, Report } from "@/lib/types";
import { AdminPage, AdminRow, FilterLink, StatusChip } from "./admin-shell";
import { AdminLoading, Quiet } from "./states";
import { DONE, REASON, age, hueOf } from "./facts";
import { usePodLabel } from "./reveal";
import { ReportDetail } from "./report-detail";
import { useAdminNow } from "./use-admin-now";
import { displayName } from "@/lib/utils";

const UNDO_MS = 8000;

export function ReportsScreen() {
  const hydrated = useHydrated();
  const repo = useRepo();
  const db = useDb((d) => d);
  const { date: now } = useAdminNow();
  const t = now.getTime();
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("r");
  const wide = useMediaQuery("(min-width: 1024px)");
  const [closedView, setClosedView] = useState(false);
  const [pending, setPending] = useState<Record<string, ModerationAction>>({});
  const timers = useRef<Record<string, { t: ReturnType<typeof setTimeout>; run: () => void }>>({});
  const noteRef = useRef<HTMLInputElement | null>(null);
  const label = usePodLabel(db);

  useEffect(() => () => { for (const k of Object.keys(timers.current)) { clearTimeout(timers.current[k].t); timers.current[k].run(); } }, []);

  const eff = useCallback((r: Report): Report["status"] => (pending[r.id] ? (pending[r.id] === "dismiss" ? "dismissed" : "actioned") : r.status), [pending]);

  const { open, closed } = useMemo(() => {
    const all = Object.values(db.reports);
    return {
      open: all.filter((r) => eff(r) === "open").sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.created_at.localeCompare(b.created_at)),
      closed: all.filter((r) => eff(r) !== "open").sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }, [db.reports, eff]);
  const rows = closedView ? closed : open;
  const sel = selected ? db.reports[selected] ?? null : null;

  const select = useCallback((id: string | null) => {
    router.replace(id ? `/admin/reports?r=${id}` : "/admin/reports", { scroll: false });
  }, [router]);

  const act = useCallback((r: Report, action: ModerationAction, note: string) => {
    setPending((p) => ({ ...p, [r.id]: action }));
    const run = async () => {
      delete timers.current[r.id];
      const res = await repo.admin.actOnReport(r.id, action, note);
      setPending((p) => { const { [r.id]: _x, ...rest } = p; return rest; });
      if (!res.ok) notify.error("Not saved. Try again.");
    };
    timers.current[r.id] = { t: setTimeout(run, UNDO_MS), run };
    select(null);
    notify(DONE[action], {
      undo: () => {
        clearTimeout(timers.current[r.id]?.t);
        delete timers.current[r.id];
        setPending((p) => { const { [r.id]: _x, ...rest } = p; return rest; });
      },
    });
  }, [repo, select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input,textarea,select,[contenteditable],[role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === "j" || e.key === "k") && rows.length) {
        const i = rows.findIndex((r) => r.id === selected);
        const n = e.key === "j" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
        select(rows[n].id);
      } else if (e.key === "Escape" && selected) select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, selected, select]);

  if (!hydrated) return <AdminLoading />;

  const detail = sel ? (
    <ReportDetail
      key={sel.id}
      db={db}
      report={sel}
      status={eff(sel)}
      pendingAction={pending[sel.id]}
      now={now}
      podLabel={label(sel.pod_id ? db.pods[sel.pod_id] : undefined)}
      onAct={act}
      onClose={() => select(null)}
      noteRef={noteRef}
    />
  ) : null;

  // phone: the report replaces the queue (depth: it grows in from 0.97)
  if (detail && !wide) return <AnimatePresence mode="wait">{detail}</AnimatePresence>;

  const recent = closed.slice(0, 3);
  /** "About Kei · “made me uneasy…”": who the report is about and the reporter's words, never the reporter. */
  const about = (r: Report) => {
    const who = r.reported_id && db.users[r.reported_id] ? `About ${displayName(db.users[r.reported_id])}` : null;
    const words = r.details?.trim();
    return [who, words ? `“${words.length > 40 ? `${words.slice(0, 40).trimEnd()}…` : words}”` : null].filter(Boolean).join(" · ") || undefined;
  };
  const urgentFirst = !closedView && open.some((r) => r.urgent);
  const sub = closedView ? `${closed.length} closed` : open.length ? `${open.length} open · ${urgentFirst ? "urgent first" : "oldest first"}` : "Nothing open";

  return (
    <AdminPage
      title="Reports"
      sub={sub}
      side={detail ?? undefined}
      link={closed.length > 0 || closedView ? (
        <FilterLink on={closedView} onClick={() => { setClosedView((v) => !v); select(null); }}>
          {closedView ? "Back to open" : `Closed (${closed.length})`}
        </FilterLink>
      ) : undefined}
    >
      {rows.length === 0 ? (
        <Quiet>All quiet.</Quiet>
      ) : (
        <motion.ul layout className="relative">
          <AnimatePresence initial={false}>
            {rows.map((r, i) => {
              const pod = r.pod_id ? db.pods[r.pod_id] : undefined;
              const status = eff(r);
              const done = status === "open" ? undefined : (pending[r.id] ?? db.adminActions.filter((a) => a.report_id === r.id).at(-1)?.action ?? (status === "dismissed" ? "dismiss" : "warn"));
              return (
                <AdminRow
                  key={r.id}
                  data-report-row
                  index={i}
                  hue={status === "open" ? hueOf(pod) : "ink"}
                  title={REASON[r.reason]}
                  meta={`${label(pod)} · ${age(r.created_at, t)}`}
                  under={about(r)}
                  chip={done ? <StatusChip tone={done === "ban" ? "removed" : "done"}>{DONE[done]}</StatusChip> : r.urgent ? <StatusChip tone="open">urgent</StatusChip> : undefined}
                  lit={!sel && i === 0 && !closedView}
                  selected={sel?.id === r.id}
                  onClick={() => select(r.id)}
                />
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
      {!closedView && recent.length > 0 && (
        <section aria-labelledby="rep-recent" className="mt-s4 border-t border-line pt-s4">
          <h2 id="rep-recent" className="text-[13px] font-semibold text-ink-2">Recently closed</h2>
          <ul className="mt-s1">
            {recent.map((r, i) => {
              const pod = r.pod_id ? db.pods[r.pod_id] : undefined;
              const done = pending[r.id] ?? db.adminActions.filter((a) => a.report_id === r.id).at(-1)?.action ?? (eff(r) === "dismissed" ? "dismiss" : "warn");
              return (
                <AdminRow
                  key={r.id}
                  index={rows.length + i}
                  hue="ink"
                  title={REASON[r.reason]}
                  meta={`${label(pod)} · ${age(r.created_at, t)}`}
                  chip={<StatusChip tone={done === "ban" ? "removed" : "done"}>{DONE[done]}</StatusChip>}
                  selected={sel?.id === r.id}
                  onClick={() => select(r.id)}
                />
              );
            })}
          </ul>
        </section>
      )}
    </AdminPage>
  );
}
