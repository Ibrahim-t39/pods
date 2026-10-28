// The adaptive front (MOTION_SYSTEM §6). Pods has no tabs: the front of the app is whatever matters NOW. This is the
// one pure function that decides it, so the Room, the pod page and the shell agree. It takes the pod statuses the
// model already computes (components/pods/model.ts `podRows` -> `status`, priority BLUEPRINT §8.2) plus counts and
// the hour, and returns the moment, what leads, the stage light and how much else may be shown.
//   Pure, no clock reads: pass nowHour from the virtual clock (useClock), never Date.now() during prerender.
import type { StageLight } from "@/components/brand/stage";
import type { PodStatus } from "@/components/pods/model";

export type Moment =
  | "first_run" // no pods yet: onboarding / placing
  | "filling" // placed, pod not active yet ("Your pod is filling.")
  | "after" // a hangout just ended: check-in, then "Run it back?"
  | "vote" // round two: pick a time
  | "now" // happening now / today: directions, who's coming, check in
  | "deciding" // a plan is waiting on "I'm in"
  | "locked" // locked, days away: the settled table
  | "planning" // Claude is planning / review
  | "quiet"; // nothing planned: surface the next fit

export interface MomentInput {
  /** statuses of the pods you are in (active or not) */
  statuses: PodStatus[];
  /** hangouts held across your pods (ended, not cancelled) */
  held: number;
  /** local hour 0-23 from the virtual clock */
  hour: number;
  /** a pod id per status, same order, so the lead can be named */
  podIds?: string[];
}

export interface MomentOut {
  moment: Moment;
  /** the pod that leads (opens first / sits forward), if any */
  leadPodId: string | null;
  /** the page light (brand/stage.tsx) */
  light: StageLight;
  /** "table": open straight on the lead pod's table (one pod, or an urgent one); "room": the overlapping tables */
  layout: "table" | "room";
  /** regulars (2+ held) get fewer words: labels only, no hint lines */
  regular: boolean;
  /** evening (18-23h) warms the paper light; set by <Daypart>, reported here for components that care */
  evening: boolean;
}

// order of urgency, most urgent first (BLUEPRINT §8.2 with the repeat loop leading after a hangout)
const ORDER: [Moment, PodStatus[]][] = [
  ["after", ["checkin_due", "run_it_back"]],
  ["now", ["happening_now", "today"]],
  ["vote", ["vote_open"]],
  ["deciding", ["needs_rsvp", "youre_in"]],
  ["locked", ["locked"]],
  ["planning", ["generating", "pending_review"]],
  ["filling", ["forming", "waitlisted", "on_deck"]],
];

const LIGHT: Record<Moment, StageLight> = {
  first_run: "dawn",
  filling: "dawn",
  after: "dusk",
  vote: "dawn",
  now: "clear",
  deciding: "dawn",
  locked: "clear",
  planning: "dawn",
  quiet: "paper",
};

/** The moments that take the whole front: open on that pod's table even when you have several pods. */
const URGENT: Moment[] = ["after", "now"];

export function momentOf({ statuses, held, hour, podIds = [] }: MomentInput): MomentOut {
  const live = statuses.filter((s) => s !== "archived");
  const evening = hour >= 18 && hour < 23;
  const regular = held >= 2;
  if (!live.length) return { moment: "first_run", leadPodId: null, light: LIGHT.first_run, layout: "room", regular, evening };
  for (const [moment, set] of ORDER) {
    const i = statuses.findIndex((s) => set.includes(s));
    if (i >= 0) {
      const several = live.length > 1;
      return {
        moment,
        leadPodId: podIds[i] ?? null,
        light: LIGHT[moment],
        layout: !several || URGENT.includes(moment) ? "table" : "room",
        regular,
        evening,
      };
    }
  }
  const i = statuses.findIndex((s) => s !== "archived");
  return { moment: "quiet", leadPodId: podIds[i] ?? null, light: LIGHT.quiet, layout: live.length > 1 ? "room" : "table", regular, evening };
}
