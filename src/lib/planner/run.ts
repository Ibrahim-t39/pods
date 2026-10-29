// [U4] The hangout planner pipeline (ARCHITECTURE §8.2). An async generator so the UI can show the AI's work step by
// step. Isomorphic: the server passes the Claude jobs + live forecast; the browser (offline / /api/plan unreachable)
// passes neither and gets the same pipeline with the weather step skipped, labelled "on-device rule-based plan".
// Budget: input.rules.budgetMs total, including the one validation retry. Any exception becomes the template plan.
import { addDays, dateOf, timeOf } from "@/data/time";
import { bestSlot, candidateVenues, dateForSlot, SLOT_HOURS, topTwoText, venueLabel } from "./analyze";
import type { ClaudeJobs } from "./claude";
import { fallbackOption3, fallbackPlan, fallbackWhyFits, fallbackWiden, ruleBasedOptions, template } from "./fallback";
import { errorTag, validatePlan } from "./validate";
import { lockRule, resolveLock } from "./lock";
import {
  SLOT_LABEL, type Analysis, type Forecast, type NextOption, type Plan, type PlannerEvent, type PlannerInput, type PlannerSource,
  type PlannerVenue, type WhyFitsInput, type WidenInput,
} from "./types";

export interface PlannerDeps {
  /** Server only. Absent in the browser. */
  claude?: ClaudeJobs | null;
  forecast?: ((date: string, venue: PlannerVenue | undefined, signal: AbortSignal) => Promise<Forecast | null>) | null;
  /** "local" when the browser runs the pipeline itself. */
  mode: "server" | "local";
  signal?: AbortSignal;
  now?: () => number;
}

const pretty = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][t.getUTCDay()]}, ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
};

function deadlineSignal(deps: PlannerDeps, deadline: number): AbortSignal {
  const now = deps.now ?? Date.now;
  const left = Math.max(1, deadline - now());
  const t = AbortSignal.timeout(left);
  return deps.signal ? AbortSignal.any([t, deps.signal]) : t;
}

function claudeBrief(input: PlannerInput, a: Analysis, ordered: PlannerVenue[], indoor: PlannerVenue[]) {
  const { start, end } = SLOT_HOURS[a.bestSlot];
  return {
    activity: input.pod.activity,
    pod_kind: input.pod.kind,
    members: input.pod.size,
    hangout_number: input.hangoutNumber,
    chosen_time: { date: a.date, start, end, slot: SLOT_LABEL[a.bestSlot], free: `${a.freeCount} of ${a.memberCount}` },
    availability_counts: input.availability.filter((x) => x.free > 0).map((x) => ({ slot: SLOT_LABEL[x.slot], free: x.free })),
    forecast: a.forecast ? { high_f: a.forecast.highF, rain_chance: a.forecast.precipChance, summary: a.forecast.summary } : null,
    budget_max_per_person_usd: input.budgetMax,
    candidate_venues: ordered.map((v) => ({ id: v.id, name: v.name, short_name: v.shortName ?? null, type: v.type, indoor: v.indoor, cost: v.costPerPerson, cost_unconfirmed: !!v.costUnconfirmed, parking: v.parking ?? null })),
    indoor_backups: indoor.map((v) => ({ id: v.id, name: v.name })),
    past_hangouts: input.pastHangouts.map((h) => h.title),
    avoid: input.avoid ? { title: input.avoid.title, prefs: input.avoid.prefs ?? [] } : null,
    last_hangout: input.context ? { checked_in: input.context.checkedIn, want_again: input.context.runItBackYes, answered: input.context.answered, chat_themes: input.context.themes } : null,
  };
}

/** The AI's lock number when it gave a sane one, else the rule for this activity and pod size. */
function withLock(plan: Plan, input: PlannerInput, venue: PlannerVenue | undefined): Plan {
  const size = input.pod.size;
  const rule = lockRule({ key: input.pod.templateKey, size, text: `${plan.summary} ${plan.event}`, format: plan.summary, venue: venue ? { type: venue.type, costPerPerson: venue.costPerPerson } : null });
  const r = resolveLock(plan, rule, size);
  const { max_seats: _drop, ...rest } = plan;
  void _drop;
  return { ...rest, min_to_lock: r.min_to_lock, lock_reason: r.lock_reason, ...(r.max_seats ? { max_seats: r.max_seats } : {}) };
}

/** Job 1 (plan) and job 3 (next_options). */
export async function* runPlanner(input: PlannerInput, deps: PlannerDeps, job: "plan" | "next_options" = "plan"): AsyncGenerator<PlannerEvent> {
  const now = deps.now ?? Date.now;
  const deadline = now() + input.rules.budgetMs;
  const useClaude = !!deps.claude && !input.noAI;
  const tpl = template(input.pod.templateKey);
  const size = input.pod.size;

  yield { type: "step", id: "pod", status: "done", label: "Reading the pod", detail: `${size} members · ${tpl.fits === "a meetup" ? input.pod.activity : tpl.fits}` };

  const last = input.pastHangouts[input.pastHangouts.length - 1];
  if (job === "next_options" && (!last?.date || !last.startHHMM)) {
    yield { type: "error", code: "BAD_INPUT", message: "No past hangout to plan from." };
    return;
  }

  // Round 2+: how the last one went (counts + fixed themes only).
  if (input.context) {
    const c = input.context;
    const enough = c.checkedIn >= 2;
    yield {
      type: "step", id: "context", status: enough ? "done" : "warn", label: "Reading how the last hangout went",
      detail: enough
        ? [`${c.checkedIn} checked in`, c.runItBackYes >= 4 ? `${c.runItBackYes} want to run it back` : null, c.themes.length ? `chat theme: ${c.themes.slice(0, 3).join(", ")}` : null].filter(Boolean).join(" · ")
        : "Not enough check-ins to read, so we kept what worked.",
    };
  }

  // Time.
  const slot = bestSlot(input);
  let date: string;
  if (job === "next_options") date = addDays(last!.date!, 14);
  else {
    const earliest = input.avoid?.prefs?.includes("different_time") && input.avoid.startsAt ? addDays(dateOf(input.avoid.startsAt), 1) : input.earliestDate;
    date = dateForSlot(slot.slot, earliest > input.earliestDate ? earliest : input.earliestDate);
  }
  yield {
    type: "step", id: "time", status: slot.fewShared ? "warn" : "done", label: "Finding a time that works",
    detail: job === "next_options"
      ? `Same day and time, two weeks out → ${pretty(date)}`
      : slot.fewShared ? "Few people shared times, so we picked weekend daytime." : `${topTwoText(slot.ranked, size)} → ${pretty(date)}`,
  };

  // Venues.
  const venues = candidateVenues(input);
  if (!venues.candidates.length) {
    yield { type: "step", id: "venues", status: "warn", label: "Checking the venue list", detail: "No venue fits yet. Our team is choosing a spot." };
    yield { type: "error", code: "NO_VENUE", message: "No venue on the list fits this pod yet. Our team is choosing a spot." };
    return;
  }
  const n = venues.suitedCount;
  yield {
    type: "step", id: "venues", status: "done", label: "Checking the venue list",
    detail: `${n} public place${n === 1 ? " fits" : "s fit"} ${tpl.fits === "a meetup" ? input.pod.activity : tpl.fits} · under $${input.budgetMax} · not alcohol-centered`,
  };

  // Weather (live values only; skipped on-device).
  const primary = venues.candidates.find((v) => v.id === tpl.venue) ?? venues.candidates[0];
  let forecast: Forecast | null = null;
  if (deps.mode === "local" || !deps.forecast) {
    yield { type: "step", id: "weather", status: "warn", label: "Checking the forecast", detail: "Offline, so we skipped the forecast and kept a rain plan." };
  } else {
    yield { type: "step", id: "weather", status: "running", label: "Checking the forecast" };
    try {
      forecast = await deps.forecast(date, primary, deadlineSignal(deps, Math.min(deadline, now() + 2600)));
    } catch {
      forecast = null;
    }
    yield {
      type: "step", id: "weather", status: forecast ? "done" : "warn", label: "Checking the forecast",
      detail: forecast
        ? `${pretty(date)} · ${forecast.highF}°F · ${forecast.precipChance}% rain · ${forecast.provider}`
        : "Forecast unavailable, so we added a rain plan anyway.",
    };
  }

  if (input.pastHangouts.length || input.avoid) {
    const prev = input.avoid ?? last!;
    yield {
      type: "step", id: "repeat", status: "done", label: "Keeping it fresh",
      detail: job === "next_options" ? `Building on "${prev.title}"` : `Not repeating "${prev.title}"`,
    };
  }

  const rainy = (forecast?.precipChance ?? 0) >= input.rules.rainThreshold;
  const ordered = rainy
    ? [...venues.candidates].sort((x, y) => Number(y.indoor) - Number(x.indoor))
    : [...venues.candidates].sort((x, y) => Number(y.id === tpl.venue) - Number(x.id === tpl.venue));
  const indoorBackup = venues.indoor.find((v) => v.id !== ordered[0].id && (v.goodFor.includes(input.pod.fitKey) || v.goodFor.includes("any")));
  const analysis: Analysis = {
    bestSlot: slot.slot, freeCount: slot.free, sharedCount: slot.shared, memberCount: size, date, candidates: ordered, forecast,
  };

  // ── Draft ─────────────────────────────────────────────────────────
  const model = input.rules.model;
  const draftLabel = useClaude ? "Drafting the plan with AI" : "Drafting the plan";
  yield { type: "step", id: "draft", status: "running", label: draftLabel, detail: useClaude ? "Written by AI" : input.cachedDraft ? "Planned ahead" : "Planned from free times" };

  const vctx = {
    candidates: ordered, allVenues: input.venues, date, budgetMax: input.budgetMax, starter: input.hangoutNumber === 1,
    window: input.rules.starterWindow, expectedStart: job === "next_options" ? last!.startHHMM : undefined,
  };

  let rejected = 0;
  let firstErrors: string[] = [];
  let claudeFailure: string | null = null;
  let accepted: { plan: Plan; venue: PlannerVenue; reason?: string } | null = null;
  let source: PlannerSource = "fallback";

  if (useClaude) {
    const brief = claudeBrief(input, analysis, ordered, venues.indoor);
    let previous: unknown;
    let errors: string[] | undefined;
    for (let attempt = 0; attempt < 2 && !accepted && now() < deadline - 250; attempt++) {
      const signal = deadlineSignal(deps, deadline);
      if (job === "plan") {
        const r = await deps.claude!.plan(brief, { signal, model, previous, errors });
        if (!r.ok) { claudeFailure = r.errorClass; break; }
        const v = validatePlan(r.data, vctx);
        if (v.ok) accepted = { plan: v.plan!, venue: v.venue! };
        else { rejected++; firstErrors = firstErrors.length ? firstErrors : v.errors; previous = r.data; errors = v.errors; }
      } else {
        const r = await deps.claude!.nextOption(brief, { signal, model, previous, errors });
        if (!r.ok) { claudeFailure = r.errorClass; break; }
        const v = validatePlan(r.data.option, vctx);
        const reasonOk = r.data.reason.trim().length > 0 && r.data.reason.length <= 90;
        if (v.ok && reasonOk) accepted = { plan: v.plan!, venue: v.venue!, reason: r.data.reason.trim() };
        else {
          rejected++;
          const errs = [...v.errors, ...(reasonOk ? [] : ["reason must be one line of at most 90 characters"])];
          firstErrors = firstErrors.length ? firstErrors : errs;
          previous = r.data; errors = errs;
        }
      }
      if (!accepted && attempt === 0 && rejected === 1) {
        yield { type: "step", id: "retry", status: "warn", label: "Checking it against the rules", detail: `Rejected 1 plan that broke the rules (${errorTag(firstErrors)}). Asked again.` };
      }
    }
    if (accepted) source = "claude";
    else if (!claudeFailure && now() >= deadline - 250) claudeFailure = "Timeout";
  }

  // Cached Claude draft (recording rule) when no live call happened or it failed.
  if (!accepted && input.cachedDraft && !input.noAI) {
    const v = validatePlan(input.cachedDraft, { ...vctx, expectedStart: undefined, date: dateOf(input.cachedDraft.starts_at) });
    if (v.ok) { accepted = { plan: v.plan!, venue: v.venue!, reason: undefined }; source = "seed"; }
  }

  if (useClaude && source !== "claude") {
    yield {
      type: "step", id: "draft", status: "warn", label: "Drafting the plan",
      detail: "Planned from free times.",
    };
  } else {
    yield {
      type: "step", id: "draft", status: "done", label: draftLabel,
      detail: source === "claude" ? "Written by AI" : source === "seed" ? "Planned ahead" : "Planned from free times",
    };
  }

  const finalSource: PlannerSource = source === "fallback" && deps.mode === "local" ? "local" : source;

  if (job === "plan") {
    const draft = accepted?.plan ?? fallbackPlan(input, analysis, ordered, indoorBackup, slot.fewShared);
    const venue = accepted?.venue ?? ordered.find((v) => v.id === draft.venue_id)!;
    const plan = withLock(draft, input, venue);
    yield validateStep(venue, input, rejected, firstErrors);
    yield { type: "plan", plan, venue, source: finalSource, analysis, forecast };
    return;
  }

  // next_options: 1-2 rule-based, 3 from Claude (or its cached draft, or the template).
  const base = ruleBasedOptions(input, { venueId: last!.venueId, date: last!.date!, startHHMM: last!.startHHMM! }, ordered, venues.indoor);
  let third: NextOption;
  if (accepted) {
    third = {
      label: shortLabel(accepted.plan.summary),
      plan: accepted.plan, venue: accepted.venue,
      reason: accepted.reason ?? accepted.plan.reason.replace(/^Chosen because /, "").replace(/^./, (c) => c.toUpperCase()),
      source, isDefault: false,
    };
  } else {
    third = fallbackOption3(input, { venueId: last!.venueId, date: last!.date!, startHHMM: last!.startHHMM! }, input.context, ordered);
    third.source = finalSource;
  }
  for (const o of base) o.source = deps.mode === "local" ? "local" : "fallback";
  for (const o of [...base, third]) o.plan = withLock(o.plan, input, o.venue);
  yield validateStep(third.venue, input, rejected, firstErrors);
  yield { type: "options", options: [...base, third], analysis, forecast };
}

function shortLabel(summary: string): string {
  const s = summary.replace(/^(Sunday|Saturday|Monday|Tuesday|Wednesday|Thursday|Friday)\s+/i, "");
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 40);
}

function validateStep(venue: PlannerVenue, input: PlannerInput, rejected: number, errs: string[]): PlannerEvent {
  const checks = `${venueLabel(venue)} ✓ public ✓ under $${input.budgetMax} ✓ ${input.hangoutNumber === 1 ? "daytime ✓ " : ""}on the list`;
  return rejected > 0
    ? { type: "step", id: "validate", status: "warn", label: "Checking it against the rules", detail: `Rejected ${rejected} plan${rejected > 1 ? "s" : ""} (${errorTag(errs)}) · ${checks}` }
    : { type: "step", id: "validate", status: "done", label: "Checking it against the rules", detail: checks };
}

// ── Jobs 2 and 4: one line each, same budget / validation / retry / template fallback ──
const DIGITS = /\d+/g;
/** Validator: any digit must appear in the input; any capitalized word must be a known word (no invented proper nouns). */
export function lineIsGrounded(line: string, inputText: string, max: number): string[] {
  const errs: string[] = [];
  if (!line.trim()) errs.push("the line must not be empty");
  if (line.length > max) errs.push(`at most ${max} characters`);
  for (const d of line.match(DIGITS) ?? []) if (!inputText.includes(d)) errs.push(`the number ${d} is not in the input`);
  const words = line.split(/\s+/).slice(1).map((w) => w.replace(/[^A-Za-z-]/g, "")).filter((w) => /^[A-Z][a-z]/.test(w));
  for (const w of words) if (!inputText.toLowerCase().includes(w.toLowerCase())) errs.push(`"${w}" is not in the input`);
  return errs;
}

export async function* runLineJob(
  job: "why_fits" | "widen_explainer", input: WhyFitsInput | WidenInput, deps: PlannerDeps, opts: { budgetMs: number; model: string; noAI?: boolean },
): AsyncGenerator<PlannerEvent> {
  const now = deps.now ?? Date.now;
  const deadline = now() + opts.budgetMs;
  const fallback = job === "why_fits" ? fallbackWhyFits(input as WhyFitsInput) : fallbackWiden(input as WidenInput);
  if (!deps.claude || opts.noAI) {
    yield { type: "result", job, output: fallback, source: deps.mode === "local" ? "local" : "fallback" };
    return;
  }
  const inputText = JSON.stringify(input);
  const max = job === "why_fits" ? 90 : 160;
  let previous: unknown;
  let errors: string[] | undefined;
  for (let attempt = 0; attempt < 2 && now() < deadline - 250; attempt++) {
    const signal = deadlineSignal(deps, deadline);
    const r = job === "why_fits"
      ? await deps.claude.whyFits(input, { signal, model: opts.model, previous, errors })
      : await deps.claude.widen(input, { signal, model: opts.model, previous, errors });
    if (!r.ok) break;
    const text = "line" in r.data ? r.data.line : r.data.body;
    const errs = lineIsGrounded(text, inputText, max);
    if (!errs.length) {
      yield { type: "result", job, output: r.data, source: "claude" };
      return;
    }
    previous = r.data; errors = errs;
  }
  yield { type: "result", job, output: fallback, source: "fallback" };
}

export { timeOf };
