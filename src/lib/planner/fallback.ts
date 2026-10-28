// [U4] Rule-based planner: the template fallback for every Claude job (BLUEPRINT §6.6). Pure and isomorphic.
// Quality bar (tests): every template fills every field, keeps to the length caps, names a real venue from the list,
// and has a non-generic, counts-only reason line.
import { TOPICS, type Topic } from "@/data/plans";
import { addDays, addMinutes, at, clock12, dateOf, nextWeekday, timeOf, weekday } from "@/data/time";
import { SLOT_HOURS, venueLabel } from "./analyze";
import {
  SLOT_LABEL, type Analysis, type Forecast, type NextOption, type Plan, type PlannerInput, type PlannerVenue, type RoundContext,
  type Widen, type WidenInput, type WhyFits, type WhyFitsInput,
} from "./types";

/** Community pods travel as a neutral activity; these aliases map to the pre-written community templates. */
export const TEMPLATE_ALIAS: Record<string, string> = { picnic: "southern_african", trail_walk: "sda", coffee: "muslim", picnic_alt: "west_african" };

const GENERIC: Topic = {
  noun: "meetup", event: "Meet up for an easy shared activity", venue: "", rainVenue: null,
  bring: ["Water", "Something to share if you like"], dur: 120, fits: "a meetup",
  sched: [[0, "Meet and grab a spot"], [15, "Quick round of intros"], [30, "Main activity"], [105, "Pick the next hangout"]],
  icebreaker: "What brought you here, and what do you miss from home?",
};

export function template(key: string): Topic {
  return TOPICS[key] ?? TOPICS[TEMPLATE_ALIAS[key] ?? ""] ?? GENERIC;
}

const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function costText(v: PlannerVenue): string {
  if (v.costUnconfirmed) return "Cost to confirm";
  return v.costPerPerson === 0 ? "Free" : `$${v.costPerPerson} per person`;
}

function rainPlanText(v: PlannerVenue, indoor: PlannerVenue | undefined): string {
  if (v.indoor) return "Indoors already, so rain won't cancel this one.";
  if (indoor) return `If rain is likely, Pods moves it to ${venueLabel(indoor)} and tells everyone.`;
  return "If rain is likely, Pods picks a new time the same week and asks you to confirm.";
}

function buildFromTemplate(
  t: Topic, venue: PlannerVenue, date: string, startHHMM: string, reason: string, indoor: PlannerVenue | undefined, opts: { summary?: string; extra?: string } = {},
): Plan {
  const start = at(date, startHHMM);
  const end = addMinutes(start, t.dur);
  const rows = t.sched.map(([off, item]) => ({ time: clock12(timeOf(addMinutes(start, off))), item }));
  if (opts.extra && rows.length < 5) rows.push({ time: clock12(timeOf(end)), item: opts.extra });
  const summary = opts.summary ?? `${DAY_NAME[weekday(date)]} ${t.noun} at ${venueLabel(venue)}`;
  return {
    summary: summary.length > 70 ? `${DAY_NAME[weekday(date)]} ${t.noun}` : summary,
    event: t.event,
    starts_at: start,
    ends_at: end,
    venue_id: venue.id,
    cost: costText(venue),
    bring: t.bring.slice(0, 5),
    schedule: rows.slice(0, 5),
    rain_plan: rainPlanText(venue, indoor),
    icebreaker: t.icebreaker,
    reason,
  };
}

export function reasonLine(a: Pick<Analysis, "freeCount" | "memberCount" | "bestSlot">, fewShared: boolean): string {
  if (fewShared) return "Few people shared times, so we picked weekend daytime.";
  return `Chosen because ${a.freeCount} of ${a.memberCount} of you are free ${SLOT_LABEL[a.bestSlot]}.`;
}

/** Job 1 template. Prefers the template's own venue when it is a candidate. */
export function fallbackPlan(input: PlannerInput, a: Analysis, ordered: PlannerVenue[], indoor: PlannerVenue | undefined, fewShared: boolean): Plan {
  const t = template(input.pod.templateKey);
  const avoidPlace = input.avoid?.prefs?.includes("different_place") || input.avoid?.prefs?.includes("surprise");
  const venue = (!avoidPlace && ordered.find((v) => v.id === t.venue)) || ordered.find((v) => v.id !== input.avoid?.venueId) || ordered[0];
  const backup = indoor && indoor.id !== venue.id ? indoor : undefined;
  return buildFromTemplate(t, venue, a.date, SLOT_HOURS[a.bestSlot].start, reasonLine(a, fewShared), backup);
}

// ── Job 3: next-hangout options ─────────────────────────────────────
/** Options 1-2 are always rule-based (BLUEPRINT §0): same slot +2 weeks at the same place; a weeknight run indoors. */
export function ruleBasedOptions(input: PlannerInput, last: { venueId: string; date: string; startHHMM: string }, candidates: PlannerVenue[], indoorAll: PlannerVenue[]): NextOption[] {
  const t = template(input.pod.templateKey);
  const byId = new Map(input.venues.map((v) => [v.id, v]));
  const lastVenue = byId.get(last.venueId) ?? candidates[0];
  const indoorBackup = indoorAll.find((v) => v.id !== lastVenue.id && v.goodFor.includes(input.pod.fitKey)) ?? indoorAll.find((v) => v.id !== lastVenue.id);
  const sameDate = addDays(last.date, 14);
  const o1: NextOption = {
    label: "Same time in 2 weeks",
    plan: buildFromTemplate(t, lastVenue, sameDate, last.startHHMM, `Same day and time as last time, two weeks later.`, indoorBackup, {
      summary: `${DAY_NAME[weekday(sameDate)]} ${t.noun} at ${venueLabel(lastVenue)}`,
    }),
    venue: lastVenue,
    reason: "Keeps the time that worked last time.",
    source: "fallback",
    isDefault: true,
  };
  const weeknightVenue = candidates.find((v) => v.indoor && v.id !== lastVenue.id) ?? candidates.find((v) => v.indoor) ?? lastVenue;
  const thu = nextWeekday(addDays(last.date, 7), 4);
  const wt: Topic = { ...t, dur: Math.min(t.dur, 120) };
  const o2: NextOption = {
    label: input.pod.fitKey === "basketball" ? "Weeknight run" : "Weeknight meetup",
    plan: buildFromTemplate(wt, weeknightVenue, thu, "18:30", "A weeknight option for people who are free after work.", undefined, {
      summary: `Thursday ${t.noun} at ${venueLabel(weeknightVenue)}`,
    }),
    venue: weeknightVenue,
    reason: weeknightVenue.indoor ? "After work, indoors, so the weather doesn't matter." : "After work, for the weekday crowd.",
    source: "fallback",
    isDefault: false,
  };
  return [o1, o2];
}

const THEME_EXTRA: Record<string, { extra: string; noun: string; why: (n: number) => string }> = {
  food: { extra: "Optional food nearby after", noun: "plus food after", why: () => "Same place, plus food after, since the chat kept coming back to it." },
  music: { extra: "Swap a song each before you leave", noun: "plus a song swap", why: () => "Same place, plus a song swap, since music kept coming up." },
  games: { extra: "Quick game before you head out", noun: "plus a game after", why: () => "Same place, plus a quick game, since the chat asked for one." },
  outdoors: { extra: "Short walk outside after", noun: "plus a walk after", why: () => "Same place, plus a walk after, since people wanted to be outside." },
  time: { extra: "Plan the next one together", noun: "same plan, earlier start", why: () => "Same place, since timing came up more than anything else." },
  place: { extra: "Pick a new spot together for next time", noun: "then pick a new spot", why: () => "Same place, and the pod picks a new one next, since places came up." },
};

/** Option 3 template (Claude drafts this one when available). Uses the strongest chat theme, counts only. */
export function fallbackOption3(input: PlannerInput, last: { venueId: string; date: string; startHHMM: string }, ctx: RoundContext | undefined, candidates: PlannerVenue[]): NextOption {
  const t = template(input.pod.templateKey);
  const byId = new Map(input.venues.map((v) => [v.id, v]));
  const venue = byId.get(last.venueId) ?? candidates[0];
  const theme = ctx?.themes[0] ?? "food";
  const x = THEME_EXTRA[theme] ?? THEME_EXTRA.food;
  const date = addDays(last.date, 14);
  const short = venueLabel(venue).split(" ").slice(0, 2).join(" ");
  return {
    label: `Same place, ${x.noun.replace(/^plus /, "")}`.slice(0, 40),
    plan: buildFromTemplate(t, venue, date, last.startHHMM, x.why(ctx?.checkedIn ?? 0), undefined, { summary: `${DAY_NAME[weekday(date)]} ${t.noun} at ${short}, ${x.noun}`.slice(0, 70), extra: x.extra }),
    venue,
    reason: x.why(ctx?.checkedIn ?? 0),
    source: "fallback",
    isDefault: false,
  };
}

// ── Job 2: why this fits ─────────────────────────────────────────────
const NUM = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
export function fallbackWhyFits(i: WhyFitsInput): WhyFits {
  const who = `${NUM[i.size] ?? i.size} people`;
  const what = i.kind === "community" ? "from your community" : `into ${i.activity}`;
  const when = i.topSlot && i.topSlot.free >= Math.ceil(i.size / 2) ? `, most free ${i.topSlot.label}` : `, ages ${i.ageBand[0]}-${i.ageBand[1]}`;
  return { line: `${who} ${what} around ${i.metro}${when}`.slice(0, 90) };
}

// ── Job 4: widened-pod explainer ─────────────────────────────────────
export function fallbackWiden(i: WidenInput): Widen {
  const [first, ...rest] = i.steps;
  const final = rest[rest.length - 1];
  if (!first || !final) return { body: `A pod needs at least ${i.minSize} people, so we widen one step at a time instead of leaving you out.` };
  return { body: `Only ${first.nearby} ${first.label} nearby, so we widened to ${final.label}. That gave you a group of ${final.nearby}.`.slice(0, 160) };
}

export const fmtForecast = (f: Forecast) => `${f.highF}°F · ${f.precipChance}% rain`;
export { dateOf };
