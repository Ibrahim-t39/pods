// Per-plan lock number: the helper, the rule table, the stepper bounds, and the lock transaction at a custom number.
import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { freshDb } from "@/lib/db/store";
import { applyLockMin, applyRsvp, ensureLock } from "@/lib/db/local/hangouts";
import { goingUserIds, hangoutForSuggestion, podMembers } from "@/lib/db/selectors";
import { DEMO } from "@/config/demo";
import type { DbState, HangoutSuggestion } from "@/lib/types";
import { clampLock, lockBounds, lockMinFor, lockMinForTarget, lockRule, resolveLock } from "./lock";

const NOW = "2026-11-04T09:00:00-06:00";
const hoopers = (db: DbState) => db.suggestions[DEMO.hoopers.suggestionId];
const notGoing = (db: DbState, s: HangoutSuggestion) =>
  podMembers(db, s.pod_id).map((m) => m.user_id).filter((u) => !goingUserIds(db, s.id).includes(u));

describe("lockMinFor", () => {
  it("reads the plan's own number", () => {
    const db = freshDb();
    expect(lockMinFor(db, { min_to_lock: 3 })).toBe(3);
    expect(lockMinFor(db, { min_to_lock: 6 })).toBe(6);
  });
  it("falls back to the global threshold for old plans", () => {
    const db = freshDb();
    expect(lockMinFor(db, {})).toBe(db.config.planner.lockThreshold);
    expect(lockMinFor(db, null)).toBe(4);
    expect(lockMinForTarget(db, null)).toBe(4);
  });
  it("finds the number through a hangout id", () => {
    const db = freshDb();
    const s = Object.values(db.suggestions).find((x) => x.status === "accepted" && x.min_to_lock)!;
    const h = hangoutForSuggestion(db, s.id)!;
    expect(lockMinForTarget(db, h.id)).toBe(s.min_to_lock);
  });
});

describe("lockRule (AI fallback)", () => {
  it("picks per activity", () => {
    expect(lockRule({ key: "basketball", size: 8 })).toEqual({ min_to_lock: 4, lock_reason: "2v2 half-court works with 4; more can join" });
    expect(lockRule({ key: "picnic", size: 8 }).min_to_lock).toBe(3);
    expect(lockRule({ key: "board_games", size: 8 }).min_to_lock).toBe(3);
    expect(lockRule({ key: "running", size: 8 }).min_to_lock).toBe(2);
    expect(lockRule({ key: "hiking", size: 8 }).min_to_lock).toBe(3);
  });
  it("a class books seats", () => {
    const r = lockRule({ key: "art", size: 9, text: "Paint and sip at the studio" });
    expect(r).toEqual({ min_to_lock: 3, max_seats: 8, lock_reason: "Booking needs a headcount" });
  });
  it("never above pod size; a 5v5 in a small pod drops to a format that fits", () => {
    expect(lockRule({ key: "basketball", size: 3 }).min_to_lock).toBe(3);
    const r = lockRule({ key: "basketball", size: 7, format: "5v5 at Brahan" });
    expect(r.min_to_lock).toBe(6);
    expect(r.lock_reason).toMatch(/3v3/);
    expect(lockRule({ key: "basketball", size: 10, format: "5v5 full run" }).min_to_lock).toBe(10);
    expect(lockRule({ key: "basketball", size: 8, text: "Pickup basketball, rotating 5-on-5 games" }).min_to_lock).toBe(4);
  });
  it("clamps the AI's number to 2..size", () => {
    const rule = lockRule({ key: "basketball", size: 6 });
    expect(resolveLock({ min_to_lock: 10, lock_reason: "5v5" }, rule, 6).min_to_lock).toBe(6);
    expect(resolveLock({ min_to_lock: 1 }, rule, 6).min_to_lock).toBe(2);
    expect(resolveLock({ min_to_lock: 5, lock_reason: "Five for a run" }, rule, 6)).toEqual({ min_to_lock: 5, lock_reason: "Five for a run" });
    expect(resolveLock(undefined, rule, 6)).toEqual(rule);
    expect(clampLock(9, 8)).toBe(8);
  });
});

describe("stepper bounds", () => {
  it("2 to pod size, not below who's in, not above seats", () => {
    expect(lockBounds(8, 0)).toEqual({ min: 2, max: 8 });
    expect(lockBounds(8, 3)).toEqual({ min: 3, max: 8 });
    expect(lockBounds(8, 3, 6)).toEqual({ min: 3, max: 6 });
    expect(lockBounds(8, 9)).toEqual({ min: 8, max: 8 });
  });
  it("applyLockMin clamps, posts a quiet line, and locks when already met", () => {
    let db = freshDb();
    const s = hoopers(db);
    const ama = goingUserIds(db, s.id)[0];
    const size = podMembers(db, s.pod_id).length;
    db = produce(db, (d) => { applyLockMin(d, s.id, ama, 99, NOW); });
    expect(hoopers(db).min_to_lock).toBe(size);
    expect(hoopers(db).lock_reason).toBe("Set by the pod · AI picked 4");
    const last = db.messages[s.pod_id].at(-1)!;
    expect(last.kind).toBe("system");
    expect(last.text).toBe(`${last.text.split(" changed")[0]} changed it to lock at ${size}`);
    db = produce(db, (d) => { applyLockMin(d, s.id, ama, 1, NOW); }); // floor: 3 people are in
    expect(hoopers(db).min_to_lock).toBe(3);
    expect(hoopers(db).status).toBe("accepted");
    expect(hangoutForSuggestion(db, s.id)).toBeTruthy();
  });
});

describe("locking at the plan's number", () => {
  it("Hoopers still locks at 4: 3 of 8 → I'm in → 4 of 8 → Locked", () => {
    let db = freshDb();
    const s = hoopers(db);
    expect(s.min_to_lock).toBe(4);
    expect(goingUserIds(db, s.id)).toHaveLength(3);
    expect(podMembers(db, s.pod_id).length).toBeGreaterThanOrEqual(4);
    const next = notGoing(db, s)[0];
    let out = { goingCount: 0, locked: false };
    db = produce(db, (d) => { out = applyRsvp(d, s.id, next, "going", NOW); });
    expect(out).toEqual({ goingCount: 4, locked: true });
  });
  it("a plan set to 5 does not lock at 4, then locks at 5", () => {
    let db = freshDb();
    const s = hoopers(db);
    db = produce(db, (d) => { d.suggestions[s.id].min_to_lock = 5; });
    const [a, b] = notGoing(db, s);
    let out = { goingCount: 0, locked: false };
    db = produce(db, (d) => { out = applyRsvp(d, s.id, a, "going", NOW); });
    expect(out.locked).toBe(false);
    db = produce(db, (d) => { out = applyRsvp(d, s.id, b, "going", NOW); });
    expect(out).toEqual({ goingCount: 5, locked: true });
  });
  it("a plan set to 2 locks on the second person", () => {
    let db = freshDb();
    const s = Object.values(db.suggestions).find((x) => x.status === "suggested" && goingUserIds(db, x.id).length === 0 && x.id !== DEMO.hoopers.suggestionId);
    if (!s) return;
    db = produce(db, (d) => { d.suggestions[s.id].min_to_lock = 2; });
    const [a, b] = notGoing(db, s);
    let out = { goingCount: 0, locked: false };
    db = produce(db, (d) => { out = applyRsvp(d, s.id, a, "going", NOW); });
    expect(out.locked).toBe(false);
    db = produce(db, (d) => { out = applyRsvp(d, s.id, b, "going", NOW); });
    expect(out.locked).toBe(true);
  });
  it("old plans without a number fill one from the pod's activity", () => {
    let db = freshDb();
    const s = hoopers(db);
    db = produce(db, (d) => {
      delete d.suggestions[s.id].min_to_lock;
      delete d.suggestions[s.id].lock_reason;
    });
    expect(lockMinFor(db, hoopers(db))).toBe(4); // global fallback
    db = produce(db, (d) => { ensureLock(d, d.suggestions[s.id]); });
    expect(hoopers(db).min_to_lock).toBe(4);
    expect(hoopers(db).lock_reason).toMatch(/2v2/);
  });
  it("every seeded plan has a sane number", () => {
    const db = freshDb();
    for (const s of Object.values(db.suggestions)) {
      const size = podMembers(db, s.pod_id).length;
      expect(s.min_to_lock, s.id).toBeGreaterThanOrEqual(2);
      expect(s.min_to_lock!, s.id).toBeLessThanOrEqual(Math.max(2, size));
      expect(s.lock_reason, s.id).toBeTruthy();
    }
  });
});
