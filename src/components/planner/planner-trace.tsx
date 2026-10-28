// [U4] PlannerTrace (BLUEPRINT §6, M10): a vertical step list with a 1px connector. Each row: status icon
// (spinner / drawn check / warn), label (body-sm 600), value (13 medium, tabular, muted), elapsed (caption). Running rows carry a
// shimmer bar. Footer: source label + "Why we show this". `replay` re-plays a stored trace at 2x speed.
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { cn } from "@/lib/cn";
import { sourceCaption, type TraceStep } from "@/lib/planner/client";
import type { PlannerSource } from "@/lib/planner/types";
import type { PlannerStep } from "@/lib/types";
import "./planner.css";

type Row = Pick<TraceStep, "id" | "label" | "detail" | "status"> & { at?: number };

export interface PlannerTraceProps {
  steps: Row[];
  running?: boolean;
  source?: PlannerSource | "admin" | null;
  /** Replay a stored trace (2x speed) with a Replay button. */
  replay?: boolean;
  compact?: boolean;
  className?: string;
  title?: string;
}

function CheckDraw() {
  return (
    <svg viewBox="0 0 24 24" className="pl-check size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

function StatusDot({ status }: { status: Row["status"] }) {
  if (status === "running")
    return (
      <span className="relative grid size-6 place-items-center rounded-full bg-surface">
        <span className="absolute inset-0 rounded-full border-2 border-sunken" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary motion-reduce:animate-none" />
      </span>
    );
  if (status === "warn")
    return (
      <span className="grid size-6 place-items-center rounded-full border border-warning-border bg-warning-soft text-warning-text">
        <Icon name="flag" size={14} aria-hidden />
      </span>
    );
  return (
    <span className="grid size-6 place-items-center rounded-full bg-success text-on-primary shadow-[var(--shadow-inset-gloss)]">
      <CheckDraw />
    </span>
  );
}

export function PlannerTrace({ steps, running, source, replay, compact, className, title }: PlannerTraceProps) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<Row[]>(replay ? [] : steps);
  const [tick, setTick] = useState(0);

  // Replay: stream the stored rows at 2x (225ms dwell), each "running" then done.
  useEffect(() => {
    if (!replay) return;
    let live = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => live && setShown([]), 0));
    const dwell = reduce ? 0 : 225;
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => live && setShown((p) => [...p, { ...s, status: "running" }]), i * dwell * 2));
      timers.push(setTimeout(() => live && setShown((p) => p.map((x, j) => (j === i ? s : x))), i * dwell * 2 + dwell));
    });
    return () => { live = false; timers.forEach(clearTimeout); };
  }, [replay, steps, tick, reduce]);

  const rows = replay ? shown : steps;
  const done = !running && rows.length > 0 && rows.every((r) => r.status !== "running");

  return (
    <div className={cn("relative", className)}>
      {title && (
        <p className="mb-3 flex items-center gap-1.5 text-overline text-primary-soft-text">
          <Icon name="why" size={14} aria-hidden /> {title}
        </p>
      )}
      <ol className="relative">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.li
              key={`${r.id}-${i}`}
              role="status"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0, 0, 0, 1] }}
              className={cn("relative flex gap-3", compact ? "pb-3" : "pb-4")}
            >
              {i < rows.length - 1 && <span aria-hidden className="absolute top-7 bottom-0.5 left-[11.5px] w-px bg-border" />}
              <span className="relative z-[1] mt-px shrink-0">
                <StatusDot status={r.status} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className={cn("text-body-sm font-semibold", r.status === "running" ? "text-fg" : "text-fg")}>{r.label}</p>
                  {r.at != null && r.status !== "running" && <span className="ml-auto shrink-0 text-caption text-fg-subtle tabular">{(r.at / 1000).toFixed(1)}s</span>}
                </div>
                {r.status === "running" ? (
                  <div className="mt-1.5 space-y-1.5">
                    {r.detail && <p className="text-[13px] font-medium tabular leading-snug text-fg-muted">{r.detail}</p>}
                    <span className="pl-shimmer block h-2 w-3/5 rounded-pill" aria-hidden />
                  </div>
                ) : (
                  r.detail && (
                    <motion.p
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.22 }}
                      className={cn("mt-0.5 text-[13px] font-medium tabular leading-snug break-words", r.status === "warn" ? "text-warning-text" : "text-fg-muted")}
                    >
                      {r.detail}
                    </motion.p>
                  )
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {(done || source) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-caption text-fg-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-fg">
            <Icon name="why" size={14} aria-hidden />
            {source === "seed" ? "Planned ahead" : sourceCaption(source ?? null)}
          </span>
          <span className="hidden sm:inline">Venues come only from our checked list.</span>
          <span className="ml-auto flex items-center gap-1">
            {replay && done && (
              <button type="button" onClick={() => setTick((t) => t + 1)} className="pressable inline-flex h-8 items-center gap-1 rounded-pill px-2.5 font-medium text-link hover:bg-sunken">
                <Icon name="turn" size={14} aria-hidden /> Replay
              </button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="pressable inline-flex h-8 items-center gap-1 rounded-pill px-2.5 font-medium text-link hover:bg-sunken">
                  <Icon name="why" size={14} aria-hidden /> Why we show this
                </button>
              </PopoverTrigger>
              <PopoverContent className="max-w-[300px] text-body-sm">
                Pods shows its work so you can check it. The planner only sees counts, like how many of you are free each day. It never sees names,
                and it can only pick places from a list our team checked by hand.
              </PopoverContent>
            </Popover>
          </span>
        </div>
      )}
    </div>
  );
}

/** Stored PlannerStep[] → rows (for replay). */
export const traceRows = (t: PlannerStep[]): Row[] => t.map((s) => ({ id: s.id, label: s.label, detail: s.detail, status: s.status === "running" ? "done" : s.status }));
