// [U2] buildSeed(anchor): the whole demo database, deterministic for the anchor. No Date.now, no Math.random.
// Owns: users (70 simulated members), identities, pods (14 interest + 4 community), venues, starter plans with planner traces,
// chat, 6 weeks of SYNTHETIC history for the 14 non-demo pods, reports/admin history, cached Claude outputs.
// BUMP SEED_VERSION ON EVERY CHANGE: it feeds the store's seedHash, so a stale persisted blob resets cleanly.
// Chanda (the demo persona) is NOT seeded: onboarding (or the Director's "Skip to placed") creates her.
import type { DbState, Interest, Membership, UserInterest } from "@/lib/types";
import { DEMO } from "@/config/demo";
import { INTERESTS } from "@/config/interests";
import { defaultConfig } from "@/config";
import { byKey } from "@/lib/utils";
import { buildUsers } from "./users";
import { buildIdentities } from "./identities";
import { VENUES, assertVenues } from "./venues";
import { buildPodWorld } from "./hangouts";
import { buildExtras } from "./extras";
import { POD_DEFS } from "./pods";
import { addDays, dateOf } from "./time";

export const SEED_VERSION = "u2-2";

export function buildSeed(anchor: string): DbState {
  assertVenues(VENUES);
  // Pilot opened 43 days before the anchor (Sep 22 for the canonical anchor).
  const users = buildUsers(addDays(dateOf(anchor), -43));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const world = buildPodWorld(userMap, anchor);
  const extras = buildExtras(users);

  // splice in the messages that reports point at
  for (const f of extras.flagged) {
    const list = world.messages[f.pod_id];
    list.push(f.message);
    list.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  }

  // three people have left a pod (rematch + retention metrics); nobody is told who
  const left: [string, string, string][] = [
    ["user_wesley", "pod_board_games", "2026-10-20"], ["user_simone", "pod_running", "2026-10-28"], ["user_layla", "pod_pickleball", "2026-10-24"],
  ];
  const memberships: Membership[] = world.memberships.map((m) => {
    const hit = left.find(([u, p]) => u === m.user_id && p === m.pod_id);
    return hit ? { ...m, left_at: `${hit[2]}T18:00:00-05:00` } : m;
  });

  const interestIds = new Set(INTERESTS.map((i: Interest) => i.id));
  const userInterests: UserInterest[] = [];
  for (const def of POD_DEFS) {
    if (def.type !== "interest" || !interestIds.has(def.topic_key)) continue;
    for (const n of def.members) userInterests.push({ user_id: `user_${n.toLowerCase()}`, interest_id: def.topic_key });
  }

  const config = defaultConfig();
  config.demo.anchor = anchor;

  return {
    rev: 0,
    me: null,
    users: byKey(users, (u) => u.id),
    identities: buildIdentities(),
    interests: byKey(INTERESTS, (i) => i.id),
    userInterests,
    pods: byKey(world.pods, (p) => p.id),
    memberships,
    hangouts: byKey(world.hangouts, (h) => h.id),
    suggestions: byKey(world.suggestions, (s) => s.id),
    rsvps: world.rsvps,
    votes: byKey(world.votes, (v) => v.id),
    runItBack: byKey(world.runItBack, (r) => r.hangout_id),
    messages: world.messages,
    reports: byKey(extras.reports, (r) => r.id),
    blocks: extras.blocks,
    adminActions: extras.adminActions,
    banned: [],
    venues: byKey(VENUES, (v) => v.id),
    verifications: byKey(extras.verifications, (v) => v.user_id),
    waitlist: extras.waitlist,
    placementRuns: [],
    notifications: [],
    plannerCache: Object.fromEntries(world.plannerCache.map((c) => [`${c.pod_id}:${c.job}`, c])),
    clock: { virtual_at: anchor, real_at: 0 },
    config,
  };
}

/**
 * BLUEPRINT D2 opt-in variant (`config.demo.venueVariant === "park_courts"`): Hoopers meet at Brahan Spring Park's outdoor
 * courts with the Rec Center as the rain plan. ONLY valid after the phone check (owner Zizwe) confirms the courts. Mutates a
 * draft (call inside repo.commit) or a fresh buildSeed result. Idempotent.
 */
export function applyVenueVariant(d: DbState, variant: "rec_center" | "park_courts"): void {
  const park = d.venues["venue_brahan_spring_park"];
  const rec = d.venues["venue_brahan_rec"];
  const s = d.suggestions[DEMO.hoopers.suggestionId];
  if (!park || !rec || !s) return;
  d.config.demo.venueVariant = variant;
  if (variant === "park_courts") {
    park.active = true;
    park.good_for = ["basketball"];
    park.verified_at = park.verified_at ?? dateOf(d.clock.virtual_at);
    park.meet_note = "Meet at the courts.";
    s.venue_id = park.id;
    s.summary = "Sunday pickup run at Brahan Spring Park";
    s.plan_json.summary = s.summary;
    s.plan_json.venue_id = park.id;
    s.plan_json.rain_venue_id = rec.id;
    s.plan_json.cost = "Free";
    s.plan_json.rain_plan = "If rain is likely, Pods moves it to Brahan Spring Recreation Center and tells everyone.";
    s.plan_json.schedule[0] = { ...s.plan_json.schedule[0], item: "Meet at the courts" };
    s.trace = s.trace.map((x) =>
      x.id === "weather" ? { ...x, detail: "Rain plan included; the forecast is checked live" }
      : x.id === "validate" ? { ...x, detail: "Brahan Spring Park ✓ public ✓ under $15 ✓ daytime ✓ on the list" } : x);
  } else {
    park.active = false;
    s.venue_id = rec.id;
    s.summary = DEMO.hoopers.title;
    s.plan_json.summary = s.summary;
    s.plan_json.venue_id = rec.id;
    s.plan_json.rain_venue_id = null;
    s.plan_json.cost = "Cost to confirm";
    s.plan_json.rain_plan = "Indoors already, so rain won't cancel this one.";
    s.plan_json.schedule[0] = { ...s.plan_json.schedule[0], item: "Meet at the entrance" };
    s.trace = s.trace.map((x) =>
      x.id === "weather" ? { ...x, detail: "Indoor venue, so the forecast doesn't change the plan" }
      : x.id === "validate" ? { ...x, detail: "Brahan Spring Rec Center ✓ public ✓ under $15 ✓ daytime ✓ on the list" } : x);
  }
}
