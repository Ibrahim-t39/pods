// Platform §M2: the Live world. Same nearby people, pods, venues and interests as the demo (so placement produces
// real pods for whoever signs up), with every scripted moment removed: no plans, no RSVPs, no chat, no history, no
// reports, no waitlist. Pods you are placed into get their first plan from the planner at placement time
// (lib/db/local/starter.ts), on the real clock. Deterministic for a given `nowISO`.
import type { DbState } from "@/lib/types";
import { DEMO } from "@/config/demo";
import { buildSeed } from "./seed";

export const LIVE_SEED_VERSION = "live-2-sat10";

export function buildLiveSeed(nowISO: string): DbState {
  const base = buildSeed(DEMO.anchor);
  const config = { ...base.config, demo: { ...base.config.demo, anchor: null, venueVariant: "park_courts" as const } };
  return {
    ...base,
    me: null,
    // people + places stay
    hangouts: {},
    suggestions: {},
    rsvps: [],
    votes: {},
    runItBack: {},
    messages: Object.fromEntries(Object.keys(base.pods).map((id) => [id, []])),
    reports: {},
    blocks: [],
    adminActions: [],
    banned: [],
    waitlist: [],
    placementRuns: [],
    notifications: [],
    plannerCache: {},
    polls: {},
    memories: {},
    invites: {},
    podRequests: [],
    trustedContacts: {},
    clock: { virtual_at: nowISO, real_at: 0 },
    config,
  };
}
