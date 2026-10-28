// + Interests (continuous placement): likes and communities added after sign-up propose pods; Join adds the pod with
// its first plan; Not now stays quiet; the spec's rules (6-10 people, blocks, the interest-pod cap) still hold.
import { beforeEach, describe, expect, it } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { activeSuggestion } from "@/lib/db/selectors";
import { findPodMatches, openMatches } from "@/lib/placement";
import type { AppMode } from "@/lib/types";

const db = () => useStore.getState().db;
const me = () => db().me!;
const live = (podId: string, userId = me()) => db().memberships.some((m) => m.pod_id === podId && m.user_id === userId && !m.left_at);
const podSize = (podId: string) => db().memberships.filter((m) => m.pod_id === podId && !m.left_at).length;

async function onboard(interests = ["basketball", "guitar"]) {
  const r = localRepo();
  const ch = await r.startPhoneAuth("(256) 555-0142");
  if (!ch.ok) throw new Error("no challenge");
  await r.verifyPhoneCode(ch.data.challengeId, "123456");
  await r.updateAbout({ first_name: "Chanda", nickname: null, date_of_birth: "2004-03-14", city: "Huntsville" });
  await r.setInterests(interests);
  await r.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "sda" }, consent: true });
  await r.setAvailability(["weekday-evening", "saturday-morning", "sunday-afternoon"], []);
  await r.acceptPledge();
  await r.submitVerification({});
  const run = await r.runPlacement();
  if (!run.ok) throw new Error(run.error.code);
  return r;
}

for (const mode of ["demo", "live"] as AppMode[]) {
  describe(`continuous placement (${mode})`, () => {
    beforeEach(() => useStore.setState({ db: freshDb(mode), hydrated: true, mode }));

    it("adding a like after sign-up proposes a pod; nothing is joined until Join", async () => {
      const repo = await onboard();
      const before = db().memberships.filter((m) => m.user_id === me() && !m.left_at).map((m) => m.pod_id).sort();
      const r = await repo.addInterest("running");
      expect(r.ok).toBe(true);
      const open = openMatches(db(), me());
      expect(open).toHaveLength(1);
      const m = open[0];
      expect(m).toMatchObject({ kind: "interest", topic_key: "running", pod_id: "pod_running", status: "new" });
      expect(m.size).toBeGreaterThanOrEqual(db().config.placement.podMin);
      expect(m.size).toBeLessThanOrEqual(db().config.placement.podMax);
      // nothing joined yet; the Scene 5 pods are untouched
      expect(live("pod_running")).toBe(false);
      expect(db().memberships.filter((x) => x.user_id === me() && !x.left_at).map((x) => x.pod_id).sort()).toEqual(before);
      // one notification, deep-linked to the match
      const n = db().notifications.filter((x) => x.user_id === me() && x.trigger === "new_match");
      expect(n).toHaveLength(1);
      expect(n[0].title).toBe("New pod for you");
      expect(n[0].href).toBe(`/app/home?match=${m.id}`);

      const j = await repo.joinPodMatch(m.id);
      expect(j.ok && j.data.podId).toBe("pod_running");
      expect(live("pod_running")).toBe(true);
      expect(db().memberships.find((x) => x.pod_id === "pod_running" && x.user_id === me())?.activation).toBe("active");
      expect(openMatches(db(), me())).toHaveLength(0);
      expect(db().notifications.find((x) => x.id === n[0].id)?.read_at).not.toBeNull();
      // every pod opens with its first hangout planned
      expect(activeSuggestion(db(), "pod_running")).toBeTruthy();
      // joining again is a no-op, not a duplicate membership
      await repo.joinPodMatch(m.id);
      expect(db().memberships.filter((x) => x.pod_id === "pod_running" && x.user_id === me() && !x.left_at)).toHaveLength(1);
    });

    it("Not now stays quiet until the like is removed and added again", async () => {
      const repo = await onboard();
      await repo.addInterest("running");
      const [m] = openMatches(db(), me());
      await repo.skipPodMatch(m.id);
      expect(openMatches(db(), me())).toHaveLength(0);
      expect(live("pod_running")).toBe(false);
      // a later scan (another like added) does not bring it back
      await repo.addInterest("hiking");
      expect(openMatches(db(), me()).map((x) => x.topic_key)).toEqual(["hiking"]);
      await repo.removeInterest("running");
      expect((db().podMatches ?? []).some((x) => x.topic_key === "running")).toBe(false);
      await repo.addInterest("running");
      expect(openMatches(db(), me()).map((x) => x.topic_key).sort()).toEqual(["hiking", "running"]);
    });

    it("removing a like drops its open match", async () => {
      const repo = await onboard();
      await repo.addInterest("books");
      expect(openMatches(db(), me())).toHaveLength(1);
      await repo.removeInterest("books");
      expect(openMatches(db(), me())).toHaveLength(0);
    });

    it("before sign-up finishes, likes and communities propose nothing", async () => {
      const repo = localRepo();
      const ch = await repo.startPhoneAuth("(256) 555-0142");
      if (!ch.ok) throw new Error("no challenge");
      await repo.verifyPhoneCode(ch.data.challengeId, "123456");
      await repo.updateAbout({ first_name: "Chanda", nickname: null, date_of_birth: "2004-03-14", city: "Huntsville" });
      await repo.setInterests(["basketball"]);
      await repo.addInterest("running");
      await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: null, consent: true });
      expect(db().podMatches ?? []).toHaveLength(0);
      expect(db().notifications.some((n) => n.trigger === "new_match")).toBe(false);
    });

    it("a full pod is never proposed: the match goes elsewhere and stays within 6-10", async () => {
      const repo = await onboard();
      const cfg = db().config.placement;
      // fill Striders to the max with other people
      const others = Object.values(db().users).filter((u) => u.id !== me() && !live("pod_running", u.id));
      useStore.getState().commit((d) => {
        for (const u of others.slice(0, cfg.podMax - podSize("pod_running")))
          d.memberships.push({ pod_id: "pod_running", user_id: u.id, role: "member", muted: false, card_dismissed: false, card_dismissed_for: null, activation: "active", joined_at: d.clock.virtual_at, left_at: null });
      });
      expect(podSize("pod_running")).toBe(cfg.podMax);
      await repo.addInterest("running");
      for (const m of openMatches(db(), me())) {
        expect(m.pod_id).not.toBe("pod_running");
        expect(m.size).toBeLessThanOrEqual(cfg.podMax);
      }
    });

    it("blocks hold: a pod with someone you blocked is not proposed", async () => {
      const repo = await onboard();
      const someone = db().memberships.find((m) => m.pod_id === "pod_running" && !m.left_at)!.user_id;
      await repo.block(someone);
      await repo.addInterest("running");
      for (const m of openMatches(db(), me())) {
        expect(m.pod_id).not.toBe("pod_running");
        const ids = db().memberships.filter((x) => x.pod_id === m.pod_id && !x.left_at).map((x) => x.user_id);
        expect(ids).not.toContain(someone);
      }
    });

    it("a pod that filled after the match was made: Join says so and nothing is joined", async () => {
      const repo = await onboard();
      await repo.addInterest("running");
      const [m] = openMatches(db(), me());
      const cfg = db().config.placement;
      const others = Object.values(db().users).filter((u) => u.id !== me() && !live("pod_running", u.id));
      useStore.getState().commit((d) => {
        for (const u of others.slice(0, cfg.podMax - podSize("pod_running")))
          d.memberships.push({ pod_id: "pod_running", user_id: u.id, role: "member", muted: false, card_dismissed: false, card_dismissed_for: null, activation: "active", joined_at: d.clock.virtual_at, left_at: null });
      });
      const j = await repo.joinPodMatch(m.id);
      expect(j.ok).toBe(false);
      if (!j.ok) expect(j.error.code).toBe("CONFLICT");
      expect(live("pod_running")).toBe(false);
      expect((db().podMatches ?? []).find((x) => x.id === m.id)).toBeUndefined();
    });

    it("respects the interest-pod cap", async () => {
      const repo = await onboard();
      const cap = db().config.placement.maxInterestPods;
      const extra = ["running", "hiking", "books", "art", "soccer", "climbing"];
      for (const id of extra) await repo.addInterest(id);
      const interestPods = db().memberships.filter((m) => m.user_id === me() && !m.left_at && db().pods[m.pod_id]?.type === "interest").length;
      expect(interestPods + openMatches(db(), me()).filter((m) => m.kind === "interest").length).toBeLessThanOrEqual(cap);
    });

    it("a community added later proposes its pod, with discreet notification text", async () => {
      const repo = await onboard();
      await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "religion", code: "islam" }, consent: true });
      const m = openMatches(db(), me()).find((x) => x.kind === "faith");
      expect(m).toBeTruthy();
      expect(m!.size).toBeGreaterThanOrEqual(db().config.placement.podMin);
      expect(m!.size).toBeLessThanOrEqual(db().config.placement.podMax);
      const n = db().notifications.find((x) => x.href.endsWith(`match=${m!.id}`))!;
      expect(n.body.startsWith("Your community pod")).toBe(true);
      expect(n.body).not.toMatch(/Muslim/);
      // joining a pod placement starts creates it with its members and a first plan
      const j = await repo.joinPodMatch(m!.id);
      expect(j.ok).toBe(true);
      if (j.ok) {
        expect(live(j.data.podId)).toBe(true);
        expect(podSize(j.data.podId)).toBeLessThanOrEqual(db().config.placement.podMax);
      }
      await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "sda" }, consent: true });
      await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "religion", code: "islam" }, consent: true });
      // already in it: nothing new to propose
      expect(openMatches(db(), me()).some((x) => x.kind === "faith")).toBe(false);
      await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "baptist" }, consent: true });
      // deleting the field drops the open match
      await repo.deleteIdentityField("faith");
      expect(openMatches(db(), me()).some((x) => x.kind === "faith")).toBe(false);
    });

    it("the pure scan writes nothing", async () => {
      await onboard();
      useStore.getState().commit((d) => {
        d.userInterests.push({ user_id: d.me!, interest_id: "running" });
      });
      const snap = JSON.stringify(db());
      const scan = findPodMatches(db(), me());
      expect(scan.proposals.map((p) => p.topic_key)).toEqual(["running"]);
      expect(JSON.stringify(db())).toBe(snap);
    });
  });
}
