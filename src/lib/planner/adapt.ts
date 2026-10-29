// [U4] Adapters between the local DB and the planner. This is the privacy boundary (D11): everything that leaves the
// device is built here, from COUNTS. No member ids, names, heritage, faith or blocked_days; community pods travel as a
// neutral activity ("picnic"), never by name. tests: src/lib/planner/planner.test.ts asserts the payload shape.
import { addDays, dateOf, timeOf } from "@/data/time";
import { TOPICS } from "@/data/plans";
import { podMembers } from "@/lib/db/selectors";
import { effectiveSlots } from "@/lib/availability/exceptions";
import type { DbState, HangoutSuggestion, ID, PlannerStep, Slot, Venue } from "@/lib/types";
import { SLOTS, THEMES, type AvoidPref, type NextOption, type Plan, type PlannerInput, type PlannerSource, type PlannerVenue, type RoundContext, type Theme } from "./types";

export function toPlannerVenue(v: Venue): PlannerVenue {
  return {
    id: v.id, name: v.name, shortName: v.short_name, address: v.address, type: v.type, isPublic: v.is_public, indoor: v.indoor,
    costPerPerson: v.cost_per_person, costUnconfirmed: v.cost_unconfirmed, alcoholCentered: v.alcohol_centered, goodFor: v.good_for,
    parking: v.parking, lat: v.lat, lng: v.lng,
  };
}

/** Neutral template + venue-fit keys per pod. Community topics map to an activity alias, never to their name. */
const COMMUNITY_ACTIVITY: Record<string, { templateKey: string; fitKey: string; activity: string }> = {
  southern_african: { templateKey: "picnic", fitKey: "any", activity: "picnic" },
  west_african: { templateKey: "picnic_alt", fitKey: "any", activity: "picnic" },
  sda: { templateKey: "trail_walk", fitKey: "hiking", activity: "trail walk" },
  muslim: { templateKey: "coffee", fitKey: "any", activity: "coffee meetup" },
};

export function podActivity(db: DbState, podId: ID): PlannerInput["pod"] {
  const pod = db.pods[podId];
  const size = podMembers(db, podId).length;
  if (pod.type === "community") {
    const a = COMMUNITY_ACTIVITY[pod.topic_key] ?? { templateKey: "coffee", fitKey: "any", activity: "coffee meetup" };
    return { kind: "community", ...a, size, city: "Huntsville" };
  }
  const key = TOPICS[pod.topic_key] ? pod.topic_key : "generic";
  const label = db.interests[pod.topic_key]?.label?.toLowerCase() ?? pod.topic;
  return { kind: "interest", templateKey: key, fitKey: pod.topic_key, activity: label.slice(0, 40), size, city: "Huntsville" };
}

/** Per-slot counts of members who shared times. A member's kept-free days just remove those slots (never labelled). */
export function slotCounts(db: DbState, podId: ID): { availability: { slot: Slot; free: number }[]; sharers: number } {
  const counts = new Map<Slot, number>(SLOTS.map((s) => [s, 0]));
  let sharers = 0;
  for (const m of podMembers(db, podId)) {
    const u = db.users[m.user_id];
    if (!u || (!u.availability.length && !u.availability_exceptions?.length)) continue;
    sharers++;
    // the usual week with this person's week-specific busy/free marks applied (still only counted, never labelled)
    for (const s of effectiveSlots(u)) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return { availability: SLOTS.map((slot) => ({ slot, free: counts.get(slot) ?? 0 })).filter((x) => x.free > 0), sharers };
}

const THEME_WORDS: Record<Theme, RegExp> = {
  food: /\b(food|eat|tacos?|pizza|lunch|dinner|brunch|coffee|wings|snack|bbq|grab a bite|hungry)\b/i,
  music: /\b(music|song|playlist|guitar|jam|band|concert)\b/i,
  games: /\b(game|games|cards|board|trivia|bracket|tournament)\b/i,
  outdoors: /\b(outside|outdoors|park|trail|walk|hike|sun|weather)\b/i,
  time: /\b(earlier|later|morning|evening|time|weeknight|weekend)\b/i,
  place: /\b(court|place|spot|venue|location|downtown|closer|far)\b/i,
};

/** Up to 3 fixed themes from the pod's recent member chat, counted on the device. Text never leaves the device. */
export function chatThemes(db: DbState, podId: ID, sinceISO?: string): Theme[] {
  const msgs = (db.messages[podId] ?? []).filter((m) => m.kind === "text" && m.user_id && (!sinceISO || m.created_at >= sinceISO));
  const score = new Map<Theme, number>();
  for (const m of msgs) for (const t of THEMES) if (THEME_WORDS[t].test(m.text)) score.set(t, (score.get(t) ?? 0) + 1);
  return [...score.entries()].filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1] || THEMES.indexOf(a[0]) - THEMES.indexOf(b[0])).slice(0, 3).map(([t]) => t);
}

export function roundContext(db: DbState, hangoutId: ID): RoundContext {
  const h = db.hangouts[hangoutId];
  const rib = db.runItBack[hangoutId];
  const answers = Object.values(rib?.responses ?? {});
  return {
    checkedIn: db.rsvps.filter((r) => r.hangout_id === hangoutId && r.checked_in).length,
    runItBackYes: answers.filter((a) => a === "yes").length,
    answered: answers.length,
    themes: h ? chatThemes(db, h.pod_id, addDays(dateOf(h.starts_at), -10) + "T00:00:00-06:00") : [],
  };
}

export interface BuildOpts {
  nowISO: string;
  avoid?: { suggestion: HangoutSuggestion; prefs?: AvoidPref[] };
  afterHangoutId?: ID;
}

/** The whole planner input for a pod. */
export function buildPlannerInput(db: DbState, podId: ID, opts: BuildOpts): PlannerInput {
  const pod = podActivity(db, podId);
  const { availability, sharers } = slotCounts(db, podId);
  const past = Object.values(db.hangouts)
    .filter((h) => h.pod_id === podId && h.status !== "cancelled")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const cfg = db.config.planner;
  const cacheKey = `${podId}:next_options`;
  const cached = opts.afterHangoutId ? (db.plannerCache[cacheKey]?.output as { options?: Plan[] } | undefined)?.options?.[0] ?? null : null;
  return {
    pod,
    availability,
    sharers,
    venues: Object.values(db.venues).filter((v) => v.active).map(toPlannerVenue),
    pastHangouts: past.map((h) => ({ title: h.title.slice(0, 120), venueId: h.venue_id, date: dateOf(h.starts_at), startHHMM: timeOf(h.starts_at) })),
    hangoutNumber: past.length + 1,
    budgetMax: cfg.budgetMax,
    earliestDate: addDays(dateOf(opts.nowISO), cfg.earliestOffsetDays),
    avoid: opts.avoid
      ? { title: opts.avoid.suggestion.summary.slice(0, 120), venueId: opts.avoid.suggestion.venue_id, startsAt: opts.avoid.suggestion.starts_at, prefs: opts.avoid.prefs }
      : undefined,
    context: opts.afterHangoutId ? roundContext(db, opts.afterHangoutId) : undefined,
    rules: { budgetMs: cfg.claudeBudgetMs, rainThreshold: cfg.rainThreshold, minSharers: cfg.minAvailabilitySharers, starterWindow: cfg.starterWindow, model: cfg.model },
    noAI: db.config.demo.noAI,
    cachedDraft: cached,
  };
}

const SOURCE_TO_DB: Record<PlannerSource, HangoutSuggestion["source"]> = { claude: "claude", fallback: "fallback", local: "fallback", seed: "seed" };

/** A planner plan → a suggestion ready for repo.saveSuggestion. */
export function planToSuggestion(
  podId: ID, plan: Plan, source: PlannerSource, trace: PlannerStep[], round: number, optionIndex: 0 | 1 | 2,
  extras: { rainVenueId?: string | null } = {},
): Omit<HangoutSuggestion, "id" | "created_at"> {
  return {
    pod_id: podId,
    summary: plan.summary,
    plan_json: { ...plan, rain_venue_id: extras.rainVenueId ?? null },
    venue_id: plan.venue_id,
    starts_at: plan.starts_at,
    status: "suggested",
    source: SOURCE_TO_DB[source],
    round,
    option_index: optionIndex,
    trace,
  };
}

export function optionToSuggestion(podId: ID, o: NextOption, trace: PlannerStep[], round: number, i: 0 | 1 | 2) {
  const s = planToSuggestion(podId, o.plan, o.source, trace, round, i);
  return { ...s, plan_json: { ...s.plan_json, reason: o.reason } };
}

// ── Jobs 2 and 4 helpers (for U6 reveal cards / OB-11 widened note, AP-04 hero) ──────────────────────────────────
/** Cached Claude line from the seed / a pre-run (recording rule). */
export function cachedLine(db: DbState, podId: ID, job: "why_fits" | "widen_explainer"): { text: string; source: "seed" | "claude" | "fallback" } | null {
  const c = db.plannerCache[`${podId}:${job}`];
  if (!c) return null;
  const o = c.output as { line?: string; body?: string } | null;
  const text = o?.line ?? o?.body;
  return text ? { text, source: c.source } : null;
}

/** Counts-only input for "Why this fits" (job 2). */
export function whyFitsInput(db: DbState, podId: ID, nowISO: string): import("./types").WhyFitsInput {
  const act = podActivity(db, podId);
  const { availability } = slotCounts(db, podId);
  const top = [...availability].sort((a, b) => b.free - a.free)[0];
  const pod = db.pods[podId];
  const ages = podMembers(db, podId).map((m) => db.users[m.user_id]).filter(Boolean).map((u) => Math.floor((Date.parse(nowISO) - Date.parse(u.date_of_birth)) / 31_557_600_000));
  return {
    activity: act.activity,
    kind: act.kind,
    size: act.size,
    topSlot: top ? { label: top.slot.replace("-", " ").replace(/^(\w)/, (c) => c.toUpperCase()) + "s", free: top.free } : null,
    ageBand: ages.length ? [Math.min(...ages), Math.max(...ages)] : [pod?.age_min ?? 18, pod?.age_max ?? 29],
    metro: "Huntsville",
  };
}
