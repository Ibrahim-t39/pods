// [U2] Pre-written plan templates and the plan/trace builder for seeded suggestions.
// Everything here is counts-only (BLUEPRINT D11): no names, heritage, faith or per-person availability in a reason or a trace,
// and no forecast numbers (the seed never invents weather). Venue claims come only from venues.ts.
import type { HangoutSuggestion, ID, ISODateTime, PlannerStep, PlanJson, Slot, Venue } from "@/lib/types";
import { VENUES } from "./venues";
import { addMinutes, at, dayLabel } from "./time";
import { lockRule, type LockRule } from "@/lib/planner/lock";

export const VENUE_BY_ID: Record<ID, Venue> = Object.fromEntries(VENUES.map((v) => [v.id, v]));

export interface Topic {
  /** card title stem, e.g. "pickup run" */
  noun: string;
  event: string;
  venue: ID;
  rainVenue: ID | null;
  bring: string[];
  /** schedule rows: minutes after start, item */
  sched: [number, string][];
  icebreaker: string;
  /** minutes */
  dur: number;
  /** shown in the pod-name stem of the venues trace line */
  fits: string;
}

export const TOPICS: Record<string, Topic> = {
  basketball: {
    noun: "pickup", event: "Pickup basketball, rotating 5-on-5 games", venue: "venue_brahan_spring_park", rainVenue: "venue_brahan_rec",
    bring: ["Water", "Court shoes", "A ball if you have one"], dur: 120, fits: "basketball",
    sched: [[0, "Meet at the courts"], [15, "Shootaround, pick teams"], [30, "Games, winners stay on"], [105, "Cool down, plan the next run"]],
    icebreaker: "What's your go-to position, and the worst shot you're weirdly proud of?",
  },
  pickleball: {
    noun: "open play", event: "Open play, rotating doubles", venue: "venue_john_hunt_rec", rainVenue: "venue_showers_rec",
    bring: ["A paddle if you have one", "Water", "Sunscreen or a hat"], dur: 120, fits: "pickleball",
    sched: [[0, "Meet by the courts"], [15, "Warm up, trade paddles"], [30, "Rotating doubles, everyone plays everyone"], [105, "Cool down, plan the next one"]],
    icebreaker: "Dinker or banger, and be honest?",
  },
  running: {
    noun: "easy loop", event: "Easy run or walk, every pace welcome", venue: "venue_big_spring_park", rainVenue: "venue_hmcpl_main",
    bring: ["Water", "Shoes you can walk in after"], dur: 90, fits: "running and walking",
    sched: [[0, "Meet by the footbridge"], [10, "Easy loop together, groups by pace"], [60, "Stretch and talk"], [75, "Coffee if people want it"]],
    icebreaker: "What's the one song that gets you moving, no judgment?",
  },
  hiking: {
    noun: "trail walk", event: "Moderate hike, we turn around when the group says", venue: "venue_monte_sano_bankhead", rainVenue: null,
    bring: ["Water", "Shoes with grip", "A snack to share"], dur: 150, fits: "hiking",
    sched: [[0, "Meet at the trailhead lot"], [10, "Start walking"], [75, "Snack at the turnaround"], [140, "Back at the cars"]],
    icebreaker: "Best trail you have ever done, and the worst snack you brought on it?",
  },
  climbing: {
    noun: "coffee and gym plan", event: "Coffee first, then pick a gym day together", venue: "venue_honest_coffee", rainVenue: null,
    bring: ["Something you can sip", "Your calendar"], dur: 90, fits: "climbing",
    sched: [[0, "Meet inside"], [10, "Swap climbing stories"], [40, "Pick a gym day that works for the pod"], [80, "Wrap up"]],
    icebreaker: "Boulder or rope, and what is the scariest thing you have ever climbed?",
  },
  climbing_gym: {
    noun: "intro climb", event: "Intro session: day passes, first-timers welcome", venue: "venue_high_point_climbing", rainVenue: null,
    bring: ["Comfortable clothes", "Water", "Ask the front desk about gear"], dur: 120, fits: "climbing",
    sched: [[0, "Meet at the front desk"], [15, "Day passes and gear"], [30, "Easy routes, everyone tries a few"], [105, "Chalk off, plan the next one"]],
    icebreaker: "What is the scariest thing you have ever climbed, or want to?",
  },
  soccer: {
    noun: "kickabout", event: "Casual pickup soccer, no set sides", venue: "venue_dublin_park", rainVenue: null,
    bring: ["Water", "Cleats or flat shoes", "A ball if you have one"], dur: 120, fits: "soccer",
    sched: [[0, "Meet at the park building lot"], [15, "Warm up, split into sides"], [30, "Games, swap sides every 20 minutes"], [105, "Cool down"]],
    icebreaker: "What position will you be playing, and what position do you actually play?",
  },
  disc_golf: {
    noun: "round", event: "A casual round, throw whatever you own", venue: "venue_dublin_park", rainVenue: null,
    bring: ["Discs if you have them", "Water", "Layers"], dur: 120, fits: "disc golf",
    sched: [[0, "Meet at the park building lot"], [15, "Walk to the first tee"], [30, "Play through, beginners throw first"], [105, "Finish and compare scores"]],
    icebreaker: "What's your best throw and your most embarrassing one?",
  },
  guitar: {
    noun: "acoustic hang", event: "Low-key acoustic hang: swap songs, no pressure to perform", venue: "venue_lowe_mill", rainVenue: null,
    bring: ["Your guitar (or just your ears)", "A capo if you have one"], dur: 90, fits: "guitar and jam",
    sched: [[0, "Meet at the main entrance"], [15, "Find a spot and tune up"], [30, "Round of songs, everyone gets a turn"], [80, "Plan the next one"]],
    icebreaker: "What's the first song you ever learned all the way through?",
  },
  music_making: {
    noun: "beat swap", event: "Listening round: bring a track you're working on", venue: "venue_hmcpl_main", rainVenue: null,
    bring: ["Headphones", "A track or loop to share", "A laptop if you have one"], dur: 120, fits: "music making",
    sched: [[0, "Meet in the lobby"], [15, "Find a table"], [30, "Listening round: 3 minutes each"], [100, "Feedback and next steps"]],
    icebreaker: "What is the weirdest sound you have ever turned into music?",
  },
  board_games: {
    noun: "game afternoon", event: "Game afternoon: one new game, one old favorite", venue: "venue_lucky_dice", rainVenue: null,
    bring: ["A game you love, if you have one", "Snack money"], dur: 150, fits: "board games",
    sched: [[0, "Meet inside the front door"], [15, "Pick two games"], [30, "Round one"], [120, "Round two"]],
    icebreaker: "What game do you always lose at and keep playing anyway?",
  },
  books: {
    noun: "book swap", event: "Book swap: bring one you loved and say why", venue: "venue_hmcpl_main", rainVenue: null,
    bring: ["One book you loved", "A pen if you take notes"], dur: 90, fits: "books",
    sched: [[0, "Meet in the lobby"], [10, "Find a table"], [20, "Each person pitches their book in a minute"], [70, "Swap and pick the next read"]],
    icebreaker: "What book did you finish most recently, and would you press it on a stranger?",
  },
  art: {
    noun: "studio walk", event: "Wander the studios, then sketch or talk about what we saw", venue: "venue_lowe_mill", rainVenue: null,
    bring: ["A sketchbook or notes app", "Something to draw with"], dur: 90, fits: "art and making",
    sched: [[0, "Meet at the main entrance"], [10, "Wander on your own"], [50, "Regroup and compare favorites"], [75, "Plan a make-it hangout"]],
    icebreaker: "What's the last thing you made that you were proud of?",
  },
  photography: {
    noun: "photo walk", event: "Slow photo walk, phone or camera, no experience needed", venue: "venue_big_spring_park", rainVenue: "venue_hmcpl_main",
    bring: ["A phone or camera", "Layers"], dur: 120, fits: "photography",
    sched: [[0, "Meet by the footbridge"], [10, "Walk the loop, shoot what you like"], [80, "Share a favorite each"], [105, "Wrap up"]],
    icebreaker: "What's one photo you took that you would frame?",
  },
  volunteering: {
    noun: "trail walk and plan", event: "Easy trail walk, then pick a way to help together", venue: "venue_monte_sano_cold_springs", rainVenue: null,
    bring: ["Water", "Shoes with grip", "An idea for where to help"], dur: 120, fits: "volunteering",
    sched: [[0, "Meet at the trailhead"], [10, "Easy walk"], [70, "Sit down and pick a project"], [110, "Wrap up"]],
    icebreaker: "What's one thing you would fix around here if you had a free Saturday?",
  },
  // Community pods plan like any pod: public places only, never a place of worship.
  southern_african: {
    noun: "picnic", event: "Picnic and a slow loop around the park", venue: "venue_big_spring_park", rainVenue: null,
    bring: ["A dish or snack to share", "A blanket"], dur: 120, fits: "a group picnic",
    sched: [[0, "Meet by the footbridge"], [15, "Spread out the food"], [45, "Slow loop around the park"], [105, "Plan the next one"]],
    icebreaker: "What's a dish from home you wish someone here made?",
  },
  west_african: {
    noun: "picnic", event: "Picnic and a slow loop around the park", venue: "venue_big_spring_park", rainVenue: null,
    bring: ["A snack to share", "A blanket"], dur: 120, fits: "a group picnic",
    sched: [[0, "Meet by the footbridge"], [15, "Spread out the food"], [45, "Slow loop around the park"], [105, "Plan the next one"]],
    icebreaker: "What's one place you have found here that you would recommend?",
  },
  sda: {
    noun: "trail walk", event: "Easy trail walk with a snack stop", venue: "venue_monte_sano_bankhead", rainVenue: null,
    bring: ["Water", "Shoes with grip", "A snack to share"], dur: 150, fits: "a trail walk",
    sched: [[0, "Meet at the trailhead lot"], [10, "Start walking"], [75, "Snack at the turnaround"], [140, "Back at the cars"]],
    icebreaker: "What's the best trail snack, and what's the worst?",
  },
  muslim: {
    noun: "coffee", event: "Coffee and an easy conversation", venue: "venue_honest_coffee", rainVenue: null,
    bring: ["Something to sip (or not)", "Your calendar"], dur: 90, fits: "a coffee meetup",
    sched: [[0, "Meet inside"], [10, "Order and find a table"], [30, "Share how you ended up here"], [75, "Plan the next one"]],
    icebreaker: "What's the best thing you've eaten here so far?",
  },
};

export const SLOT_PHRASE: Record<Slot, string> = {
  "weekday-evening": "weekday evenings",
  "saturday-morning": "Saturday mornings", "saturday-afternoon": "Saturday afternoons", "saturday-evening": "Saturday evenings",
  "sunday-morning": "Sunday mornings", "sunday-afternoon": "Sunday afternoons", "sunday-evening": "Sunday evenings",
};
const SLOT_SHORT: Record<Slot, string> = {
  "weekday-evening": "Weekday evening", "saturday-morning": "Sat morning", "saturday-afternoon": "Sat afternoon", "saturday-evening": "Sat evening",
  "sunday-morning": "Sun morning", "sunday-afternoon": "Sun afternoon", "sunday-evening": "Sun evening",
};
export const SLOT_START: Record<Slot, string> = {
  "weekday-evening": "17:30", "saturday-morning": "10:00", "saturday-afternoon": "13:00", "saturday-evening": "17:00",
  "sunday-morning": "10:00", "sunday-afternoon": "13:00", "sunday-evening": "16:30",
};
export const SLOT_WEEKDAY: Record<Slot, number> = {
  "weekday-evening": 4, "saturday-morning": 6, "saturday-afternoon": 6, "saturday-evening": 6,
  "sunday-morning": 0, "sunday-afternoon": 0, "sunday-evening": 0,
};

const SLOT_ORDER: Slot[] = ["sunday-afternoon", "saturday-morning", "saturday-afternoon", "weekday-evening", "sunday-morning", "saturday-evening", "sunday-evening"];

/** Per-slot counts of free members (counts only; the planner never sees who). */
export function slotCounts(avail: Slot[][]): Record<Slot, number> {
  const out = Object.fromEntries(SLOT_ORDER.map((s) => [s, 0])) as Record<Slot, number>;
  for (const a of avail) for (const s of a) out[s]++;
  return out;
}

/** Slots by count desc, then the stable preference order above. */
export function rankSlots(avail: Slot[][]): { slot: Slot; free: number }[] {
  const c = slotCounts(avail);
  return SLOT_ORDER.map((slot, i) => ({ slot, free: c[slot], i })).filter((x) => x.free > 0)
    .sort((a, b) => b.free - a.free || a.i - b.i).map(({ slot, free }) => ({ slot, free }));
}

/** Venues that could host a topic under the usual rules (public, active, under budget, not alcohol-centered). */
export function candidateVenues(topic: string, budget = 15): Venue[] {
  return VENUES.filter((v) => v.active && v.is_public && !v.alcohol_centered && v.cost_per_person <= budget && v.good_for.includes(topic));
}

export interface PlanInput {
  podId: ID;
  podName: string;
  topicKey: string; // key into TOPICS
  interestTopic: string; // interest id used for the venue count ("basketball") or the community key
  members: number;
  slot: Slot;
  free: number;
  topTwo: { slot: Slot; free: number }[];
  date: string; // YYYY-MM-DD
  startHHMM?: string;
  venueId?: ID;
  title?: string;
  costText?: string;
  reasonOverride?: string;
  overBudget?: boolean;
}

export function buildPlan(inp: PlanInput): { plan: PlanJson; trace: PlannerStep[]; venue: Venue; startsAt: ISODateTime; endsAt: ISODateTime; lock: LockRule } {
  const t = TOPICS[inp.topicKey];
  const venue = VENUE_BY_ID[inp.venueId ?? t.venue];
  const start = at(inp.date, inp.startHHMM ?? SLOT_START[inp.slot]);
  const end = addMinutes(start, t.dur);
  const hhmm = (offset: number) => {
    const iso = addMinutes(start, offset);
    const h = Number(iso.slice(11, 13));
    const m = iso.slice(14, 16);
    return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? "AM" : "PM"}`;
  };
  const dow = dayLabel(inp.date).split(",")[0];
  const dayName = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" }[dow]!;
  const summary = inp.title ?? `${dayName} ${t.noun} at ${venue.short_name ?? venue.name}`;
  const cost = inp.costText ?? (venue.cost_per_person === 0 ? (venue.cost_unconfirmed ? "Cost to confirm" : "Free") : "Cost to confirm");
  const rainVenue = t.rainVenue && t.rainVenue !== venue.id ? VENUE_BY_ID[t.rainVenue] : null;
  const rain_plan = venue.indoor
    ? "Indoors already, so rain won't cancel this one."
    : rainVenue
      ? `If rain is likely, Pods moves it to ${rainVenue.short_name ?? rainVenue.name} and tells everyone.`
      : "If rain is likely, Pods picks a new time the same week and asks you to confirm.";
  const reason = inp.reasonOverride ?? `Chosen because ${inp.free} of ${inp.members} of you are free ${SLOT_PHRASE[inp.slot]}.`;
  const plan: PlanJson = {
    summary,
    event: t.event,
    starts_at: start,
    ends_at: end,
    venue_id: venue.id,
    cost,
    bring: t.bring,
    schedule: t.sched.map(([off, item], i) => ({ time: hhmm(off), item: i === 0 && venue.id !== t.venue && venue.meet_note ? venue.meet_note.replace(/\.$/, "") : item })),
    rain_plan,
    icebreaker: t.icebreaker,
    reason,
    rain_venue_id: venue.indoor ? null : rainVenue?.id ?? null,
  };
  const n = candidateVenues(inp.interestTopic).length;
  const topTwoText = inp.topTwo.map((x) => `${SLOT_SHORT[x.slot]}: ${x.free} of ${inp.members} free`).join(" · ");
  const trace: PlannerStep[] = [
    { id: "pod", label: "Reading the pod", detail: `${inp.podName} · ${inp.members} members · ${t.fits}`, status: "done" },
    { id: "time", label: "Finding a time that works", detail: topTwoText, status: "done" },
    { id: "venues", label: "Checking the venue list", detail: n === 0 ? `No ${t.fits} venue fits under $15, so the first meetup is coffee` : `${n} public place${n === 1 ? " fits" : "s fit"} ${t.fits} · under $15 · not alcohol-centered`, status: n === 0 ? "warn" : "done" },
    { id: "weather", label: "Checking the forecast", detail: venue.indoor ? "Indoor venue, so the forecast doesn't change the plan" : "Rain plan included; the forecast is checked live", status: "done" },
    { id: "draft", label: "Drafting the plan", detail: "Planned ahead", status: "done" },
    inp.overBudget
      ? { id: "validate", label: "Checking it against the rules", detail: `${venue.short_name ?? venue.name} ✓ public ✓ daytime ✓ on the list · over the usual $15, so a person reviews it first`, status: "warn" }
      : { id: "validate", label: "Checking it against the rules", detail: `${venue.short_name ?? venue.name} ✓ public ✓ under $15 ✓ ${inp.slot === "weekday-evening" ? "evening" : "daytime"} ✓ on the list`, status: "done" },
  ];
  // Per-plan lock number from the activity and pod size (Hoopers: basketball, 8 members → 4, the video script).
  const lock = lockRule({ key: inp.topicKey, size: inp.members, text: `${summary} ${t.event}`, format: inp.title, venue: { type: venue.type, costPerPerson: venue.cost_per_person } });
  return { plan, trace, venue, startsAt: start, endsAt: end, lock };
}

export function suggestionFrom(
  id: ID, podId: ID, built: ReturnType<typeof buildPlan>, createdAt: ISODateTime,
  extra: Partial<HangoutSuggestion> = {},
): HangoutSuggestion {
  return {
    id, pod_id: podId, summary: built.plan.summary, plan_json: built.plan, venue_id: built.venue.id,
    starts_at: built.startsAt, status: "suggested", created_at: createdAt, source: "seed", round: 1, option_index: 0,
    trace: built.trace, ...built.lock, ...extra,
  };
}
