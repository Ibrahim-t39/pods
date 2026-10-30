// [U4] Plan validation (ARCHITECTURE §8.2 step 6). Pure. Every rule returns a plain-language error that is fed back
// to Claude on the single retry ("Your previous plan failed: …"), and summarized in the trace.
import { at, dateOf } from "@/data/time";
import { hhmmToMin } from "./analyze";
import type { Plan, PlannerVenue } from "./types";

export const ALCOHOL_TERMS = ["bar crawl", "happy hour", "brewery", "brewing", "shots", "drinks special", "pub crawl", "beer", "cocktail", "wine"];
export const LIMITS = { summary: 70, event: 120, bring: 5, bringItem: 40, scheduleMin: 2, scheduleMax: 5, item: 90, rain: 220, icebreaker: 160, reason: 160, cost: 40 };

export interface ValidateCtx {
  candidates: PlannerVenue[];
  allVenues: PlannerVenue[];
  date: string; // expected YYYY-MM-DD
  budgetMax: number;
  starter: boolean;
  window: { startMin: string; startMax: string; endMax: string };
  /** Allow any start time inside the day (e.g. a fixed weeknight option). */
  expectedStart?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** Normalized plan (times with the Seattle offset) when ok. */
  plan?: Plan;
  venue?: PlannerVenue;
}

/** "2026-11-08T13:00:00" or with offset → { date, hhmm }. */
export function splitLocal(s: string): { date: string; hhmm: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(s ?? "");
  return m ? { date: m[1], hhmm: `${m[2]}:${m[3]}` } : null;
}

/** Parse "$8 per person" → 8, "Free" → 0, "Cost to confirm" → null (unknown is allowed only when the venue says so). */
export function parseCost(cost: string): number | null {
  const c = cost.trim().toLowerCase();
  if (/^free\b/.test(c)) return 0;
  const m = /\$\s?(\d+(?:\.\d+)?)/.exec(c);
  return m ? Number(m[1]) : null;
}

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export function validatePlan(raw: Plan, ctx: ValidateCtx): ValidationResult {
  const errors: string[] = [];
  const venue = ctx.candidates.find((v) => v.id === raw.venue_id);
  if (!venue) errors.push(`venue_id ${JSON.stringify(raw.venue_id)} is not in the list. Choose from: ${ctx.candidates.map((v) => v.id).join(", ")}`);
  else {
    if (!venue.isPublic) errors.push("the venue must be public");
    if (venue.alcoholCentered) errors.push("the venue must not be centered on alcohol");
  }

  const s = splitLocal(raw.starts_at);
  const e = splitLocal(raw.ends_at);
  if (!s || !e) errors.push("starts_at and ends_at must be local ISO datetimes like 2026-11-08T13:00:00");
  else {
    if (s.date !== ctx.date) errors.push(`starts_at must be on ${ctx.date}`);
    if (ctx.expectedStart && s.hhmm !== ctx.expectedStart) errors.push(`starts_at must be at ${ctx.expectedStart}`);
    const dur = hhmmToMin(e.hhmm) - hhmmToMin(s.hhmm) + (e.date !== s.date ? 1440 : 0);
    if (dur < 60 || dur > 240) errors.push("the hangout must last between 60 and 240 minutes");
    if (ctx.starter && !ctx.expectedStart) {
      if (hhmmToMin(s.hhmm) < hhmmToMin(ctx.window.startMin) || hhmmToMin(s.hhmm) > hhmmToMin(ctx.window.startMax))
        errors.push(`a first hangout must start between ${ctx.window.startMin} and ${ctx.window.startMax}`);
      if (e.date !== s.date || hhmmToMin(e.hhmm) > hhmmToMin(ctx.window.endMax)) errors.push(`a first hangout must end by ${ctx.window.endMax}`);
    }
  }

  const cost = parseCost(clean(raw.cost));
  if (cost !== null && cost > ctx.budgetMax) errors.push(`cost must be at most $${ctx.budgetMax} per person`);
  if (cost === null && venue && !venue.costUnconfirmed && !/confirm/i.test(raw.cost)) errors.push("cost must read 'Free' or '$N per person'");

  const text = [raw.summary, raw.event, raw.rain_plan, raw.icebreaker, ...(raw.schedule ?? []).map((x) => x.item), ...(raw.bring ?? [])].join(" ").toLowerCase();
  const hit = ALCOHOL_TERMS.find((t) => text.includes(t));
  if (hit && ctx.starter) errors.push(`no alcohol-centered plans ("${hit}")`);

  if (!Array.isArray(raw.schedule) || raw.schedule.length < LIMITS.scheduleMin || raw.schedule.length > LIMITS.scheduleMax) errors.push("schedule must have 2-5 items");
  if (!Array.isArray(raw.bring) || raw.bring.length < 1 || raw.bring.length > LIMITS.bring) errors.push("bring must have 1-5 items");
  for (const k of ["summary", "event", "cost", "rain_plan", "icebreaker", "reason"] as const) if (!clean(raw[k])) errors.push(`${k} must not be empty`);
  if (clean(raw.summary).length > LIMITS.summary) errors.push(`summary must be at most ${LIMITS.summary} characters`);
  if (clean(raw.reason).length > LIMITS.reason) errors.push(`reason must be at most ${LIMITS.reason} characters`);
  if ((raw.schedule ?? []).some((x) => !clean(x.time) || !clean(x.item))) errors.push("every schedule row needs a time and an item");

  // A rain plan that names a venue must name one from the list.
  const named = ctx.allVenues.filter((v) => !ctx.candidates.includes(v) && raw.rain_plan?.includes(v.name));
  for (const v of named) if (!v.indoor || !v.isPublic) errors.push(`rain plan venue ${v.name} must be an indoor public venue`);

  if (errors.length || !s || !e || !venue) return { ok: false, errors };
  const plan: Plan = {
    ...raw,
    summary: clean(raw.summary),
    starts_at: at(s.date, s.hhmm),
    ends_at: at(e.date, e.hhmm),
    bring: raw.bring.map((b) => clean(b).slice(0, LIMITS.bringItem)).filter(Boolean),
    schedule: raw.schedule.map((x) => ({ time: clean(x.time), item: clean(x.item).slice(0, LIMITS.item) })),
  };
  if (dateOf(plan.starts_at) !== ctx.date) return { ok: false, errors: [`starts_at must be on ${ctx.date}`] };
  return { ok: true, errors: [], plan, venue };
}

/** Short trace label for the first error ("venue not on the list"). */
export function errorTag(errors: string[]): string {
  const e = errors[0] ?? "";
  if (e.startsWith("venue_id")) return "venue not on the list";
  if (e.includes("cost")) return "over budget";
  if (e.includes("alcohol")) return "alcohol-centered";
  if (e.includes("start") || e.includes("end") || e.includes("minutes")) return "wrong time";
  return "missing details";
}
