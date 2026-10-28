// [U4] Browser side of the planner (ARCHITECTURE §8.5).
//   usePlanner()       → { run(job, input), steps, plan, options, status, source, error, cancel, elapsedMs }
//   fetchLine(job, …)  → jobs 2 and 4 ("why this fits", widened explainer) with the template as the floor.
// Reads the NDJSON stream from /api/plan with a minimum dwell per step so even instant runs are legible (M10). If the
// fetch fails, times out or the device is offline, it runs the SAME pipeline in the browser (weather skipped) and labels
// the result "on-device rule-based plan". Never logs or stores the payload.
"use client";

import { useCallback, useRef, useState } from "react";
import { runLineJob, runPlanner } from "./run";
import { fallbackWhyFits, fallbackWiden } from "./fallback";
import type {
  Analysis, Forecast, NextOption, Plan, PlannerEvent, PlannerInput, PlannerSource, PlannerStepId, PlannerVenue, Widen, WidenInput, WhyFits, WhyFitsInput,
} from "./types";

export interface TraceStep {
  id: PlannerStepId;
  label: string;
  detail?: string;
  status: "running" | "done" | "warn";
  /** ms since run start when this row appeared */
  at: number;
}

export type PlannerStatus = "idle" | "running" | "done" | "no_venue" | "error";

export interface PlannerResult {
  plan?: { plan: Plan; venue: PlannerVenue; source: PlannerSource; analysis: Analysis; forecast: Forecast | null };
  options?: { options: NextOption[]; analysis: Analysis; forecast: Forecast | null };
  steps: TraceStep[];
  status: PlannerStatus;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function* streamFromApi(job: "plan" | "next_options", input: PlannerInput, signal: AbortSignal): AsyncGenerator<PlannerEvent> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
  const res = await fetch(`/api/plan?job=${job}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw new Error(`http ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) yield JSON.parse(line) as PlannerEvent;
    }
  }
  if (buf.trim()) yield JSON.parse(buf) as PlannerEvent;
}

export interface RunOptions {
  /** Shown in the "Reading the pod" row (the name never leaves the device). */
  podLabel?: string;
  dwellMs?: number;
  /** Force the on-device pipeline (tests, Director "offline"). */
  local?: boolean;
  /** Mirror rows to a shared store (so every mounted card shows the same live trace). */
  onSteps?: (steps: TraceStep[]) => void;
}

export function usePlanner() {
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [status, setStatus] = useState<PlannerStatus>("idle");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runId = useRef(0);

  // No abort-on-unmount: StrictMode's simulated unmount would kill a live run. Runs are short and bounded by the budget.

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    runId.current++;
    setStatus("idle");
  }, []);

  const run = useCallback(async (job: "plan" | "next_options", input: PlannerInput, opts: RunOptions = {}): Promise<PlannerResult> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const id = ++runId.current;
    const dwell = opts.dwellMs ?? 450;
    const t0 = performance.now();
    let shown: TraceStep[] = [];
    let lastApplied = 0;
    const live = () => id === runId.current;
    setSteps([]);
    setStatus("running");
    setResult(null);

    const push = (next: TraceStep[]) => {
      shown = next;
      if (live()) {
        setSteps(next);
        opts.onSteps?.(next);
      }
    };
    const pace = async (frac = 1) => {
      const wait = dwell * frac - (performance.now() - lastApplied);
      if (wait > 0) await sleep(wait);
      lastApplied = performance.now();
    };

    const apply = async (e: Extract<PlannerEvent, { type: "step" }>) => {
      const detail = e.id === "pod" && opts.podLabel ? `${opts.podLabel} · ${e.detail ?? ""}` : e.detail;
      const at = Math.round(performance.now() - t0);
      const idx = shown.findIndex((s) => s.id === e.id || (e.id === "retry" && s.id === "retry"));
      if (idx < 0) {
        // Show every row "running" first, so the work reads as work (M10). Min dwell per step = dwellMs.
        await pace(0.45);
        push([...shown, { id: e.id, label: e.label, detail: e.status === "running" ? e.detail : undefined, status: "running", at }]);
        if (e.status === "running") return;
        await pace(0.55);
        push(shown.map((s) => (s.id === e.id ? { ...s, label: e.label, detail, status: e.status } : s)));
      } else {
        await pace(0.55);
        push(shown.map((s) => (s.id === e.id ? { ...s, label: e.label, detail: detail ?? s.detail, status: e.status } : s)));
      }
    };

    const consume = async (events: AsyncGenerator<PlannerEvent>): Promise<PlannerResult | null> => {
      for await (const e of events) {
        if (!live()) return null;
        if (e.type === "step") await apply(e);
        else if (e.type === "plan") {
          await pace();
          return { plan: { plan: e.plan, venue: e.venue, source: e.source, analysis: e.analysis, forecast: e.forecast }, steps: shown, status: "done" };
        } else if (e.type === "options") {
          await pace();
          return { options: { options: e.options, analysis: e.analysis, forecast: e.forecast }, steps: shown, status: "done" };
        } else if (e.type === "error") {
          if (e.code === "NO_VENUE") return { steps: shown, status: "no_venue" };
          throw new Error(e.code);
        }
      }
      throw new Error("stream ended early");
    };

    let out: PlannerResult | null = null;
    const budget = input.rules.budgetMs + 4000;
    if (!opts.local) {
      const timer = setTimeout(() => ac.abort(), budget);
      try {
        out = await consume(streamFromApi(job, input, ac.signal));
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.info("[planner] using the on-device planner:", (e as Error)?.message);
        out = null;
      } finally {
        clearTimeout(timer);
      }
    }
    if (!live()) return { steps: shown, status: "idle" };
    if (!out) {
      // /api/plan unreachable, slow or broken: same pipeline on the device. Keep rows already shown.
      const local = runPlanner(input, { mode: "local", claude: null, forecast: null }, job);
      const keep = new Set(shown.filter((s) => s.status !== "running").map((s) => s.id));
      async function* skipShown() {
        for await (const e of local) {
          if (e.type === "step" && keep.has(e.id) && e.id !== "draft" && e.id !== "weather" && e.id !== "validate") continue;
          yield e;
        }
      }
      try {
        out = await consume(skipShown());
      } catch {
        out = { steps: shown, status: "error" };
      }
    }
    if (!live() || !out) return { steps: shown, status: "idle" };
    setResult(out);
    setStatus(out.status);
    return out;
  }, []);

  return {
    run,
    cancel,
    steps,
    status,
    result,
    plan: result?.plan ?? null,
    options: result?.options ?? null,
    source: result?.plan?.source ?? result?.options?.options[2]?.source ?? null,
  };
}

// ── Jobs 2 and 4 ─────────────────────────────────────────────────────
const lineCache = new Map<string, { text: string; source: PlannerSource }>();

export async function fetchLine(
  job: "why_fits" | "widen_explainer",
  input: WhyFitsInput | WidenInput,
  opts: { cacheKey?: string; noAI?: boolean; budgetMs?: number; model?: string } = {},
): Promise<{ text: string; source: PlannerSource }> {
  const fallback = () => {
    const out = job === "why_fits" ? fallbackWhyFits(input as WhyFitsInput).line : fallbackWiden(input as WidenInput).body;
    return { text: out, source: "fallback" as PlannerSource };
  };
  if (opts.noAI) return fallback();
  if (opts.cacheKey && lineCache.has(opts.cacheKey)) return lineCache.get(opts.cacheKey)!;
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
    const res = await fetch(`/api/plan?job=${job}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, noAI: !!opts.noAI, budgetMs: opts.budgetMs, model: opts.model }),
      signal: AbortSignal.timeout((opts.budgetMs ?? 8000) + 2000),
    });
    const text = await res.text();
    const ev = text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as PlannerEvent).find((e) => e.type === "result");
    if (ev && ev.type === "result") {
      const out = { text: "line" in ev.output ? (ev.output as WhyFits).line : (ev.output as Widen).body, source: ev.source };
      if (opts.cacheKey) lineCache.set(opts.cacheKey, out);
      return out;
    }
  } catch {
    /* fall through */
  }
  for await (const e of runLineJob(job, input, { mode: "local" }, { budgetMs: 1000, model: "" })) {
    if (e.type === "result") return { text: "line" in e.output ? (e.output as WhyFits).line : (e.output as Widen).body, source: "local" };
  }
  return fallback();
}

/** Caption that follows the source (BLUEPRINT §6.6). */
export function sourceCaption(source: PlannerSource | "admin" | "member" | null | undefined, kind: "plan" | "line" = "plan"): string {
  if (source === "member") return "Proposed by a member";
  if (source === "claude" || source === "seed") return kind === "plan" ? "Planned with Claude" : "Written with Claude";
  if (source === "local") return "On-device rule-based plan";
  if (source === "admin") return "Planned by the Pods team";
  return kind === "plan" ? "Planned by the rule-based planner" : "Rule-based";
}
