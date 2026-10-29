// [U4] Planner types. Isomorphic: imported by the browser (usePlanner, on-device fallback) and by /api/plan.
// D11 / ARCHITECTURE §8.1: the input carries COUNTS ONLY. No member ids, names, heritage, faith or blocked_days, and
// no pod name or community label (community pods travel as a neutral activity, e.g. "picnic").
import { z } from "zod/v4";

/** Free-time buckets members can share during onboarding (spec: Availability; BLUEPRINT D3).
 *  Single source is src/lib/types.ts; re-exported here so the planner stays self-contained. */
import { SLOTS, type Slot } from "@/lib/types";
export { SLOTS, type Slot };

const DAY_FULL: Record<string, string> = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
const slotKey = (s: Slot) => s.split("-") as [string, string];
/** "Tuesday evenings" */
export const SLOT_LABEL = Object.fromEntries(SLOTS.map((s) => [s, `${DAY_FULL[slotKey(s)[0]]} ${slotKey(s)[1]}s`])) as Record<Slot, string>;
/** "Tue evening" */
export const SLOT_SHORT = Object.fromEntries(SLOTS.map((s) => [s, `${DAY_FULL[slotKey(s)[0]].slice(0, 3)} ${slotKey(s)[1]}`])) as Record<Slot, string>;

export interface PlannerVenue {
  id: string;
  name: string;
  shortName?: string;
  address: string;
  type: string; // park, library, cafe, court, studio...
  isPublic: boolean;
  indoor: boolean;
  costPerPerson: number; // USD, 0 = free
  costUnconfirmed?: boolean;
  alcoholCentered: boolean;
  goodFor: string[]; // interest ids, or "any"
  parking?: string | null;
  lat?: number;
  lng?: number;
}

export interface SlotCount {
  slot: Slot;
  free: number;
}

/** Fixed themes the planner may read from a pod's chat (computed on the device, never message text). */
export const THEMES = ["food", "music", "games", "outdoors", "time", "place"] as const;
export type Theme = (typeof THEMES)[number];

/** Round 2+ context: how the last hangout went, as counts and fixed themes only. */
export interface RoundContext {
  checkedIn: number;
  runItBackYes: number;
  answered: number;
  themes: Theme[];
}

export type AvoidPref = "different_time" | "different_place" | "chill" | "surprise";

export interface PlannerInput {
  pod: {
    kind: "interest" | "community";
    /** Neutral activity label shown in copy and sent to Claude ("basketball", "picnic"). Never a community name. */
    activity: string;
    /** Template key (interest id or neutral alias). */
    templateKey: string;
    /** Venue-fit key (interest id, or "any"). */
    fitKey: string;
    size: number;
    city: string;
  };
  availability: SlotCount[];
  /** How many members shared any times (count only). */
  sharers: number;
  venues: PlannerVenue[];
  pastHangouts: { title: string; venueId: string; date?: string; startHHMM?: string }[];
  hangoutNumber: number; // 1 = starter hangout
  budgetMax: number;
  /** YYYY-MM-DD the plan should be on or after. */
  earliestDate: string;
  avoid?: { title: string; venueId: string; startsAt?: string; prefs?: AvoidPref[] };
  context?: RoundContext;
  rules: {
    budgetMs: number;
    rainThreshold: number;
    minSharers: number;
    starterWindow: { startMin: string; startMax: string; endMax: string };
    model: string;
  };
  /** Director "No AI": every job uses its template. */
  noAI?: boolean;
  /** A cached Claude draft (recording rule, ARCHITECTURE §8.3) used when a live call is unavailable. */
  cachedDraft?: Plan | null;
}

/** Spec: event, starts_at, ends_at, venue_id, cost, bring, schedule, rain_plan, icebreaker, reason. */
export const PlanSchema = z.object({
  summary: z.string().describe("One line for the pinned card, at most 70 characters, e.g. 'Sunday pickup run at Brahan Spring'"),
  event: z.string().describe("What the hangout is, e.g. 'Pickup basketball, rotating 5-on-5 games'"),
  starts_at: z.string().describe("Local ISO datetime without offset, e.g. 2026-11-08T13:00:00"),
  ends_at: z.string().describe("Local ISO datetime without offset"),
  venue_id: z.string().describe("MUST be one of the provided venue ids"),
  cost: z.string().describe("e.g. 'Free' or '$8 per person'. Use 'Cost to confirm' when the venue cost is unconfirmed."),
  bring: z.array(z.string()).describe("1-5 short items to bring"),
  schedule: z.array(z.object({ time: z.string(), item: z.string() })).describe("2-5 timeline steps, times like '1:15 PM'"),
  rain_plan: z.string().describe("Backup if weather is bad; any indoor venue must come from the list"),
  icebreaker: z.string().describe("A question the host posts in chat the day before"),
  reason: z.string().describe("Why this plan, counts only: 'Chosen because 7 of 8 of you are free Sunday afternoons.'"),
  min_to_lock: z.number().int().optional().describe("How many 'I'm in' make it happen: from the activity and members, at least 2, never above members. e.g. pickup basketball 4, picnic 3, a run 2"),
  max_seats: z.number().int().optional().describe("Only when the venue books a fixed number of seats (a class, a paint and sip)"),
  lock_reason: z.string().optional().describe("One short plain line on why that number, e.g. '2v2 half-court works with 4; more can join'"),
});
export type Plan = z.infer<typeof PlanSchema>;

// ── Claude jobs 2-4 (BLUEPRINT §6.6) ──────────────────────────────────
export const WhyFitsSchema = z.object({ line: z.string().describe("At most 90 characters, plain, counts only") });
export const WidenSchema = z.object({ body: z.string().describe("At most 160 characters, group-level counts only") });
export const NextOptionSchema = z.object({
  option: PlanSchema,
  reason: z.string().describe("One line, at most 90 characters, why this option fits how the last hangout went"),
});
export type WhyFits = z.infer<typeof WhyFitsSchema>;
export type Widen = z.infer<typeof WidenSchema>;

export interface WhyFitsInput {
  activity: string;
  kind: "interest" | "community";
  size: number;
  topSlot: { label: string; free: number } | null;
  ageBand: [number, number];
  metro: string;
}
export interface WidenInput {
  steps: { label: string; nearby: number }[]; // group-level counts only
  minSize: number;
}

export type PlannerSource = "claude" | "fallback" | "local" | "seed";
export type JobName = "plan" | "next_options" | "why_fits" | "widen_explainer";

export interface NextOption {
  label: string;
  plan: Plan;
  venue: PlannerVenue;
  reason: string;
  source: PlannerSource;
  isDefault: boolean;
}

/** Events streamed to the client so the AI's work is visible step by step. */
export type PlannerStepId = "pod" | "time" | "venues" | "weather" | "context" | "repeat" | "draft" | "validate" | "retry";
export type PlannerEvent =
  | { type: "step"; id: PlannerStepId; label: string; detail?: string; status: "running" | "done" | "warn" }
  | { type: "plan"; plan: Plan; venue: PlannerVenue; source: PlannerSource; analysis: Analysis; forecast: Forecast | null }
  | { type: "options"; options: NextOption[]; analysis: Analysis; forecast: Forecast | null }
  | { type: "result"; job: "why_fits" | "widen_explainer"; output: WhyFits | Widen; source: PlannerSource }
  | { type: "error"; code: "NO_VENUE" | "BAD_INPUT" | "UNKNOWN"; message: string };

export interface Analysis {
  bestSlot: Slot;
  freeCount: number;
  sharedCount: number;
  memberCount: number;
  date: string; // YYYY-MM-DD
  candidates: PlannerVenue[];
  forecast: Forecast | null;
}

export interface Forecast {
  date: string;
  highF: number;
  lowF: number;
  precipChance: number; // 0-100
  summary: string;
  /** e.g. "Open-Meteo" */
  provider: string;
  fetchedAt: string; // ISO
}
