// [U3] Placement engine tests. Self-contained fixture (no dependency on the seed, so U2 edits cannot break these).
import { describe, expect, it } from "vitest";
import { defaultConfig, DEMO } from "@/config";
import type { DbState, Hangout, Interest, Membership, Pod, User, UserIdentity } from "@/lib/types";
import {
  applyPlacementPlan,
  explainResult,
  findOffers,
  placeDetailed,
  place,
  placeUser,
  placingChecklist,
  previewCards,
  previewPlacement,
  rematch,
  sweepWaitlist,
  widenFacts,
  widenSentence,
  widenTemplateBody,
  waitlistNote,
} from "./index";

const NOW = DEMO.anchor!; // Wed Nov 4 2026 09:00 CT

function mkUser(id: string, age: number, over: Partial<User> = {}): User {
  const year = 2026 - age; // born Jan 15, so already this age on Nov 4, 2026
  return {
    id,
    first_name: id,
    nickname: null,
    pronouns: null,
    bio: null,
    prompts: [],
    photo_urls: [],
    date_of_birth: `${year}-01-15`,
    city: "Huntsville",
    phone: "+12565550100",
    verified: true,
    verified_at: NOW,
    availability: [],
    blocked_days: [],
    created_at: NOW,
    status: "active",
    onboarding_step: "done",
    pledge_accepted_at: NOW,
    is_demo_bot: true,
    notification_prefs: { email: false, sms: false, push: false },
    ...over,
  } as User;
}

function emptyDb(): DbState {
  return {
    rev: 0,
    me: null,
    users: {},
    identities: {},
    interests: {},
    userInterests: [],
    pods: {},
    memberships: [],
    hangouts: {},
    suggestions: {},
    rsvps: [],
    votes: {},
    runItBack: {},
    messages: {},
    reports: {},
    blocks: [],
    adminActions: [],
    banned: [],
    venues: {},
    verifications: {},
    waitlist: [],
    placementRuns: [],
    notifications: [],
    plannerCache: {},
    clock: { virtual_at: NOW, real_at: 0 },
    config: defaultConfig(),
  } as DbState;
}

const INTERESTS = ["basketball", "guitar", "chess", "running"];

function addInterests(db: DbState) {
  for (const id of INTERESTS) {
    db.interests[id] = { id, label: id[0].toUpperCase() + id.slice(1), icon: "", category: "sport", section: "move", active: true } as Interest;
  }
}

function addUser(db: DbState, u: User, interests: string[] = [], identity?: Partial<UserIdentity>) {
  db.users[u.id] = u;
  for (const i of interests) db.userInterests.push({ user_id: u.id, interest_id: i });
  if (identity) db.identities[u.id] = { user_id: u.id, heritage: null, faith: null, consent_given_at: NOW, ...identity };
}

function addPod(db: DbState, p: Partial<Pod> & { id: string; topic_key: string; type: Pod["type"] }, members: string[], upcoming = false) {
  db.pods[p.id] = {
    name: p.id,
    photo_url: "",
    community_kind: null,
    topic: p.topic_key,
    city: "Huntsville metro",
    age_min: 19,
    age_max: 25,
    widened_from: null,
    status: "active",
    created_at: NOW,
    hue: "ember",
    ...p,
  } as Pod;
  for (const m of members) {
    db.memberships.push({
      pod_id: p.id, user_id: m, role: "member", muted: false, card_dismissed: false, card_dismissed_for: null,
      activation: "active", joined_at: NOW, left_at: null,
    } as Membership);
  }
  if (upcoming) {
    db.hangouts[`h_${p.id}`] = { id: `h_${p.id}`, pod_id: p.id, status: "upcoming" } as Hangout;
  }
}

/** The Chanda scenario (ARCHITECTURE §11): 3 Zambians in the metro, SA pod of 7, Hoopers of 7, etc. */
function chandaDb() {
  const db = emptyDb();
  addInterests(db);
  const hoop = ["malik", "ama", "tobi", "jordan", "kezia", "dre", "simone"];
  hoop.forEach((id, i) => addUser(db, mkUser(id, 20 + (i % 5)), ["basketball"]));
  addPod(db, { id: "pod_hoopers", topic_key: "basketball", type: "interest" }, hoop, true);

  // 3 Zambians + 4 others from Southern Africa, all in the SA pod.
  const zm = ["zm1", "zm2", "zm3"];
  zm.forEach((id, i) => addUser(db, mkUser(id, 21 + i), [], { heritage: { level: "country", code: "ZM" } }));
  const other = ["zw1", "zw2", "za1", "bw1"];
  const codes = ["ZW", "ZW", "ZA", "BW"];
  other.forEach((id, i) => addUser(db, mkUser(id, 20 + i), [], { heritage: { level: "country", code: codes[i] } }));
  addPod(
    db,
    {
      id: "pod_southern_african", topic_key: "southern_african", type: "community", community_kind: "heritage",
      topic: "Southern African", age_min: 19, age_max: 26, hue: "grove",
      widened_from: { kind: "group", from: "Zambian", to: "Southern African" },
    },
    [...zm, ...other],
    true,
  );
  // Adventists: plenty, pod exists, no planned hangout (on deck in the demo).
  const sda = ["a1", "a2", "a3", "a4", "a5", "a6"];
  sda.forEach((id, i) => addUser(db, mkUser(id, 20 + i), [], { faith: { level: "denomination", code: "sda" } }));
  addPod(db, { id: "pod_sda", topic_key: "sda", type: "community", community_kind: "faith", topic: "Seventh-day Adventist", hue: "grove" }, sda);
  // Guitar pod, no hangout.
  const gt = ["g1", "g2", "g3", "g4", "g5", "g6"];
  gt.forEach((id, i) => addUser(db, mkUser(id, 19 + i), ["guitar"]));
  addPod(db, { id: "pod_strings", topic_key: "guitar", type: "interest" }, gt);

  const chanda = mkUser("chanda", 22, { is_demo_bot: false, status: "active" });
  addUser(db, chanda, ["basketball", "guitar"], {
    heritage: { level: "country", code: "ZM" },
    faith: { level: "denomination", code: "sda" },
  });
  return { db, chanda };
}

describe("Chanda scenario", () => {
  const { db, chanda } = chandaDb();
  const out = placeDetailed(chanda, db.identities.chanda, ["basketball", "guitar"], db, db.config.placement);
  if (!out.ok) throw new Error(out.code);
  const [hoop, strings, sa, sda] = out.results;

  it("joins existing pods for interests", () => {
    expect(hoop.pod_id).toBe("pod_hoopers");
    expect(strings.pod_id).toBe("pod_strings");
    expect(hoop.outcome).toBe("joined_existing");
  });

  it("widens Zambian to Southern African with the exact spec sentence", () => {
    expect(sa.pod_id).toBe("pod_southern_african");
    expect(sa.user_note).toBe("Only 3 Zambians nearby, so we widened to Southern African.");
    expect(sa.steps.map((s) => s.rule)).toEqual([
      "metro", "age_band", "widen_age", "widen_group", "open_spots",
    ]);
    expect(explainResult(sa).headline).toBe("Only 3 Zambians nearby, so we widened to Southern African.");
    expect(explainResult(sa).widened).toBe("group");
  });

  it("faith pod forms without widening", () => {
    expect(sda.pod_id).toBe("pod_sda");
    expect(sda.user_note).toBeNull();
  });

  it("podsAtStart=2: Hoopers + Southern African active, Guitar + Adventist on deck", () => {
    expect(hoop.outcome).toBe("joined_existing");
    expect(sa.outcome).toBe("joined_existing");
    expect(strings.outcome).toBe("deferred");
    expect(sda.outcome).toBe("deferred");
    expect(strings.steps.at(-1)?.rule).toBe("pods_at_start");
  });

  it("podsAtStart=all activates everything", () => {
    const all = place(chanda, db.identities.chanda, ["basketball", "guitar"], db, db.config.placement, { podsAtStart: "all" });
    expect(all.every((r) => r.outcome === "joined_existing")).toBe(true);
  });

  it("is deterministic", () => {
    const again = placeDetailed(chanda, db.identities.chanda, ["basketball", "guitar"], db, db.config.placement);
    expect(again).toEqual(out);
  });

  it("explain helpers: facts, template body (<=160), checklist", () => {
    const f = widenFacts(sa, 7, db.config.placement)!;
    expect(f).toMatchObject({ fromLabel: "Zambian", toLabel: "Southern African", fromCount: 3, toCount: 7, needed: 6 });
    const body = widenTemplateBody(f);
    expect(body).toBe("Your pod brings together 7 people with roots across Southern Africa. We'll offer you a Zambian pod as soon as 6 people join.");
    expect(body.length).toBeLessThanOrEqual(160);
    const list = placingChecklist({ results: out.results }, { city: "Huntsville", age: 22 }, db.config.placement);
    expect(list.map((i) => i.id)).toEqual(["interests", "nearby", "ages", "communities", "widen", "plan"]);
    expect(list[2].label).toBe("Checking ages 19-25");
  });

  it("apply writes memberships with on_deck for deferred", () => {
    const d = structuredClone(db);
    applyPlacementPlan(d, out, "chanda", NOW);
    const mine = d.memberships.filter((m) => m.user_id === "chanda");
    expect(mine).toHaveLength(4);
    expect(mine.filter((m) => m.activation === "on_deck").map((m) => m.pod_id).sort()).toEqual(["pod_sda", "pod_strings"]);
    // idempotent
    applyPlacementPlan(d, out, "chanda", NOW);
    expect(d.memberships.filter((m) => m.user_id === "chanda")).toHaveLength(4);
  });
});

describe("eligibility gates", () => {
  it("no placement before verification", () => {
    const { db } = chandaDb();
    const u = mkUser("new", 22, { verified: false, status: "pending_verification" });
    addUser(db, u, ["basketball"]);
    const r = placeDetailed(u, undefined, ["basketball"], db, db.config.placement);
    expect(r).toEqual({ ok: false, code: "NOT_VERIFIED" });
    expect(place(u, undefined, ["basketball"], db, db.config.placement)).toEqual([]);
  });
  it("out of metro, underage, over age", () => {
    const { db } = chandaDb();
    const cfg = db.config.placement;
    expect(placeDetailed(mkUser("x", 22, { city: "Madison" }), undefined, [], db, { ...cfg, metro: ["Huntsville"] })).toEqual({ ok: false, code: "OUT_OF_METRO" });
    expect(placeDetailed(mkUser("y", 17), undefined, [], db, cfg)).toEqual({ ok: false, code: "UNDERAGE" });
    expect(placeDetailed(mkUser("z", 31), undefined, [], db, cfg)).toEqual({ ok: false, code: "OVER_AGE" });
    expect(placeDetailed(mkUser("b", 22, { status: "banned" }), undefined, [], db, cfg)).toEqual({ ok: false, code: "NOT_ACTIVE" });
  });
});

describe("join / create / ladder", () => {
  it("skips pods that are full", () => {
    const db = emptyDb();
    addInterests(db);
    const ids = Array.from({ length: 10 }, (_, i) => `m${i}`);
    ids.forEach((id) => addUser(db, mkUser(id, 22), ["chess"]));
    addPod(db, { id: "pod_full", topic_key: "chess", type: "interest" }, ids);
    const u = mkUser("me", 22);
    addUser(db, u, ["chess"]);
    const [r] = place(u, undefined, ["chess"], db, db.config.placement);
    expect(r.pod_id).not.toBe("pod_full");
    expect(r.outcome).toBe("waitlisted"); // everyone else is already in the full pod
  });

  it("prefers a pod with an upcoming hangout, then open spots", () => {
    const db = emptyDb();
    addInterests(db);
    const a = ["a1", "a2", "a3", "a4", "a5"];
    const b = ["b1", "b2", "b3", "b4", "b5", "b6", "b7"];
    [...a, ...b].forEach((id) => addUser(db, mkUser(id, 22), ["chess"]));
    addPod(db, { id: "pod_a", topic_key: "chess", type: "interest" }, a, false);
    addPod(db, { id: "pod_b", topic_key: "chess", type: "interest" }, b, true);
    const u = mkUser("me", 22);
    addUser(db, u, ["chess"]);
    expect(place(u, undefined, ["chess"], db, db.config.placement)[0].pod_id).toBe("pod_b");
    db.hangouts = {};
    expect(place(u, undefined, ["chess"], db, db.config.placement)[0].pod_id).toBe("pod_a"); // more open spots
  });

  it("respects the pod age range, and widens age by two years at rung 2", () => {
    const db = emptyDb();
    addInterests(db);
    const ids = ["a", "b", "c", "d", "e", "f"];
    ids.forEach((id) => addUser(db, mkUser(id, 21), ["chess"]));
    addPod(db, { id: "pod_c", topic_key: "chess", type: "interest", age_min: 19, age_max: 25 }, ids);
    const ok26 = mkUser("m26", 26);
    addUser(db, ok26, ["chess"]);
    // 26 is outside 19-25 but inside the +2 slack: joins at the widen_age rung.
    const [r] = place(ok26, undefined, ["chess"], db, db.config.placement);
    expect(r.pod_id).toBe("pod_c");
    expect(r.steps.some((s) => s.rule === "widen_age")).toBe(true);
    expect(r.user_note).toMatch(/widened ages/);
    const far = mkUser("m29", 29);
    addUser(db, far, ["chess"]);
    expect(place(far, undefined, ["chess"], db, db.config.placement)[0].outcome).toBe("waitlisted");
  });

  it("creates a new pod from the closest in age when the pool reaches podMin", () => {
    const db = emptyDb();
    addInterests(db);
    const ages = [22, 22, 23, 21, 24, 20, 25, 19, 22, 23, 21, 22];
    ages.forEach((age, i) => addUser(db, mkUser(`p${i}`, age), ["running"]));
    const u = mkUser("me", 22);
    addUser(db, u, ["running"]);
    const out = placeDetailed(u, undefined, ["running"], db, db.config.placement);
    if (!out.ok) throw new Error();
    const r = out.results[0];
    expect(r.outcome).toBe("created_new");
    expect(out.newPods).toHaveLength(1);
    const np = out.newPods[0];
    expect(np.member_ids).toHaveLength(db.config.placement.podTarget - 1);
    expect(r.pod_id).toBe(np.pod.id);
    // closest in age: nobody 19 or 25 (ages 22/21/23/24/20 are nearer)
    const agesChosen = np.member_ids.map((id) => ages[Number(id.slice(1))]);
    expect(agesChosen.every((a) => Math.abs(a - 22) <= 2)).toBe(true);
    const d = structuredClone(db);
    applyPlacementPlan(d, out, "me", NOW);
    expect(d.pods[np.pod.id]).toBeTruthy();
    expect(d.memberships.filter((m) => m.pod_id === np.pod.id && !m.left_at)).toHaveLength(8);
  });

  it("waitlists with the spec note and a count", () => {
    const db = emptyDb();
    addInterests(db);
    ["a", "b"].forEach((id) => addUser(db, mkUser(id, 22), ["chess"]));
    const u = mkUser("me", 22);
    addUser(db, u, ["chess"]);
    const [r] = place(u, undefined, ["chess"], db, db.config.placement);
    expect(r.outcome).toBe("waitlisted");
    expect(r.pod_id).toBeNull();
    expect(r.user_note).toBe("We'll place you as soon as 3 more people join."); // 6 - (2 + 1)
    expect(waitlistNote(1)).toBe("We'll place you as soon as 1 more person joins.");
    const d = structuredClone(db);
    applyPlacementPlan(d, { results: [r], newPods: [] }, "me", NOW);
    expect(d.waitlist).toHaveLength(1);
    expect(d.waitlist[0]).toMatchObject({ user_id: "me", topic_key: "chess", reason: "under_min" });
  });

  it("widens through the whole group ladder, then waitlists", () => {
    const db = emptyDb();
    addInterests(db);
    addUser(db, mkUser("z", 22), [], { heritage: { level: "country", code: "ZM" } });
    const u = mkUser("me", 22);
    addUser(db, u, [], { heritage: { level: "country", code: "ZM" } });
    const [r] = place(u, db.identities.me, [], db, db.config.placement);
    expect(r.outcome).toBe("waitlisted");
    expect(r.steps.filter((s) => s.rule === "widen_group")).toHaveLength(2); // region, continent
  });

  it("widens to a created community pod when the wider group is big enough", () => {
    const db = emptyDb();
    addInterests(db);
    const codes = ["ZW", "ZW", "BW", "ZA", "MW", "MZ"];
    codes.forEach((c, i) => addUser(db, mkUser(`s${i}`, 22), [], { heritage: { level: "country", code: c } }));
    const u = mkUser("me", 22);
    addUser(db, u, [], { heritage: { level: "country", code: "ZM" } });
    const out = placeDetailed(u, db.identities.me, [], db, db.config.placement);
    if (!out.ok) throw new Error();
    expect(out.results[0].outcome).toBe("created_new");
    expect(out.results[0].user_note).toBe("Only 0 Zambians nearby, so we widened to Southern African.");
    expect(out.newPods[0].pod.widened_from).toEqual({ kind: "group", from: "Zambian", to: "Southern African" });
    expect(out.newPods[0].pod.topic_key).toBe("southern_african");
  });
});

describe("safety rules", () => {
  it("never joins a pod containing someone blocked in either direction", () => {
    for (const dir of ["mine", "theirs"] as const) {
      const { db, chanda } = chandaDb();
      db.blocks.push(
        dir === "mine"
          ? { blocker_id: "chanda", blocked_id: "malik", created_at: NOW }
          : { blocker_id: "malik", blocked_id: "chanda", created_at: NOW },
      );
      const r = place(chanda, db.identities.chanda, ["basketball"], db, db.config.placement, { podsAtStart: "all" });
      const hoop = r.find((x) => x.candidate.topic_key === "basketball")!;
      expect(hoop.pod_id).not.toBe("pod_hoopers");
      expect(hoop.steps.some((s) => s.rule === "blocks")).toBe(true);
      // blocks are never part of the person-facing explanation
      expect(explainResult(hoop).lines.join(" ")).not.toMatch(/block/i);
    }
  });

  it("excludes banned, suspended, unverified and out-of-metro people from pools", () => {
    const db = emptyDb();
    addInterests(db);
    const bad = [
      mkUser("b1", 22, { status: "banned" }),
      mkUser("b2", 22, { status: "suspended" }),
      mkUser("b3", 22, { verified: false }),
      mkUser("b4", 22, { city: "Madison" }),
    ];
    bad.forEach((b) => addUser(db, b, ["chess"]));
    ["g1", "g2", "g3", "g4"].forEach((id) => addUser(db, mkUser(id, 22), ["chess"]));
    const u = mkUser("me", 22);
    addUser(db, u, ["chess"]);
    const cfg = { ...db.config.placement, metro: ["Huntsville" as const] };
    const [r] = place(u, undefined, ["chess"], db, cfg);
    expect(r.outcome).toBe("waitlisted"); // 4 good people + me = 5 < 6; had the bad ones counted it would create
  });

  it("identity data only through steps' group-level counts (no user ids in steps)", () => {
    const { db, chanda } = chandaDb();
    const r = place(chanda, db.identities.chanda, ["basketball"], db, db.config.placement);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/zm1|zm2|zm3|malik/);
  });
});

describe("rematch after leaving", () => {
  it("excludes the left pod and waitlists when nothing else fits", () => {
    const { db, chanda } = chandaDb();
    db.memberships.push({
      pod_id: "pod_hoopers", user_id: "chanda", role: "member", muted: false, card_dismissed: false,
      card_dismissed_for: null, activation: "active", joined_at: NOW, left_at: NOW,
    });
    const rm = rematch(db, "chanda", "pod_hoopers", db.config.placement)!;
    expect(rm.waitlisted).toBe(true);
    expect(rm.rematchedInto).toBeNull();
    expect(rm.result.outcome).toBe("waitlisted");
    expect(chanda.id).toBe("chanda");
  });

  it("moves to another open pod of the same topic", () => {
    const { db } = chandaDb();
    const ids = ["x1", "x2", "x3", "x4", "x5"];
    ids.forEach((id) => addUser(db, mkUser(id, 22), ["basketball"]));
    addPod(db, { id: "pod_hoopers_2", topic_key: "basketball", type: "interest" }, ids);
    db.memberships.push({
      pod_id: "pod_hoopers", user_id: "chanda", role: "member", muted: false, card_dismissed: false,
      card_dismissed_for: null, activation: "active", joined_at: NOW, left_at: NOW,
    });
    const rm = rematch(db, "chanda", "pod_hoopers", db.config.placement)!;
    expect(rm.rematchedInto).toBe("pod_hoopers_2");
    expect(rm.waitlisted).toBe(false);
    // never re-offers the left pod even without the explicit exclusion
    const again = place(db.users.chanda, undefined, ["basketball"], db, db.config.placement);
    expect(again[0].pod_id).not.toBe("pod_hoopers");
  });

  it("community rematch widens again and carries the sentence", () => {
    const { db } = chandaDb();
    db.memberships.push({
      pod_id: "pod_southern_african", user_id: "chanda", role: "member", muted: false, card_dismissed: false,
      card_dismissed_for: null, activation: "active", joined_at: NOW, left_at: NOW,
    });
    const rm = rematch(db, "chanda", "pod_southern_african", db.config.placement)!;
    expect(rm.waitlisted).toBe(true);
  });

  it("sweepWaitlist places people once enough join", () => {
    const db = emptyDb();
    addInterests(db);
    ["a", "b", "c", "d"].forEach((id) => addUser(db, mkUser(id, 22), ["chess"]));
    const u = mkUser("me", 22);
    addUser(db, u, ["chess"]);
    db.waitlist.push({ user_id: "me", pod_kind: "interest", topic_key: "chess", reason: "under_min", created_at: NOW });
    expect(sweepWaitlist(db, db.config.placement)).toHaveLength(0); // 5 total < 6
    addUser(db, mkUser("e", 22), ["chess"]);
    const got = sweepWaitlist(db, db.config.placement);
    expect(got).toHaveLength(1);
    expect(got[0].result.outcome).toBe("created_new");
  });
});

describe("previewPlacement dry run (D14)", () => {
  it("works before verification, writes nothing, returns counts only", () => {
    const { db } = chandaDb();
    db.users.chanda.verified = false;
    db.users.chanda.status = "pending_verification";
    db.userInterests.push({ user_id: "chanda", interest_id: "basketball" }, { user_id: "chanda", interest_id: "guitar" });
    const before = JSON.stringify(db);
    const pre = previewPlacement(db, "chanda");
    expect(JSON.stringify(db)).toBe(before);
    if (!pre.ok) throw new Error(pre.code);
    expect(pre.run.dry_run).toBe(true);
    const cards = previewCards(pre.run, db, pre.newPods);
    expect(cards.map((c) => [c.type, c.label, c.member_count, c.outcome])).toEqual([
      ["interest", "basketball", 8, "joined_existing"],
      ["interest", "guitar", 7, "deferred"],
      ["community", "Southern African", 8, "joined_existing"],
      ["community", "Seventh-day Adventist", 7, "deferred"],
    ]);
    expect(cards[2].widened).toBe(true);
    expect(JSON.stringify(cards)).not.toMatch(/malik|zm1/);
    // the real thing is still refused until verified
    expect(placeUser(db, "chanda")).toEqual({ ok: false, code: "NOT_VERIFIED" });
  });
});

describe("offers (narrower group reaches 6)", () => {
  it("offers a Zambian pod to widened-pod members once 6 Zambians are nearby (5 + Chanda)", () => {
    const { db } = chandaDb();
    expect(findOffers(db, db.config.placement)).toHaveLength(0); // 3 Zambians
    ["zm4", "zm5"].forEach((id) => addUser(db, mkUser(id, 22), [], { heritage: { level: "country", code: "ZM" } }));
    const offers = findOffers(db, db.config.placement);
    expect(offers.map((o) => o.user_id).sort()).toEqual(["zm1", "zm2", "zm3"]);
    expect(offers[0].message).toBe("There are now 6 Zambians nearby. Want to join a Zambian pod too?");
  });
});

describe("copy", () => {
  it("widenSentence pluralises", () => {
    expect(widenSentence(1, "Zambian", "Zambians", "Southern African")).toBe("Only 1 Zambian nearby, so we widened to Southern African.");
    expect(widenSentence(3, "Zambian", "Zambians", "Southern African")).toBe("Only 3 Zambians nearby, so we widened to Southern African.");
  });
});
