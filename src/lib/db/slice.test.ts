// [U0] Contract smoke test: the Tue-night vertical slice through the Repo (no UI).
import { describe, expect, it, beforeEach } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { activeSuggestion, goingUserIds, myMemberships } from "@/lib/db/selectors";
import { DEMO } from "@/config/demo";
import { SLOTS } from "@/lib/types";
import { nowISO } from "@/lib/time/clock";

describe("U0 slice", () => {
  beforeEach(() => useStore.setState({ db: freshDb(), hydrated: true }));

  it("seed matches BLUEPRINT §0 canon", () => {
    const db = useStore.getState().db;
    expect(db.config.demo.anchor).toBe("2026-11-04T09:00:00-08:00");
    expect(nowISO()).toBe("2026-11-04T09:00:00-08:00");
    expect(db.config.flags.podsAtStart).toBe(2);
    expect(db.config.planner.claudeBudgetMs).toBe(8000);
    expect(db.config.planner.lockThreshold).toBe(4);
    expect(Object.keys(db.interests)).toHaveLength(19);
    expect(SLOTS).toContain("sunday-afternoon");
    const s = db.suggestions[DEMO.hoopers.suggestionId];
    expect(s.plan_json.starts_at).toBe("2026-11-07T10:00:00-08:00");
    expect(goingUserIds(db, s.id)).toHaveLength(3);
  });

  it("onboarding stub → placed (2 active, 2 on deck) → I'm in → Locked", async () => {
    const repo = localRepo();
    const ch = await repo.startPhoneAuth("(206) 555-0142");
    expect(ch.ok).toBe(true);
    if (!ch.ok) return;
    expect((await repo.verifyPhoneCode(ch.data.challengeId, "000000")).ok).toBe(false);
    expect((await repo.verifyPhoneCode(ch.data.challengeId, "123456")).ok).toBe(true);
    expect((await repo.updateAbout({ first_name: "Chanda", nickname: null, date_of_birth: "2004-03-14", city: "Seattle" })).ok).toBe(true);
    await repo.setInterests(["basketball", "guitar"]);
    await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "sda" }, consent: true });
    await repo.setAvailability(["weekday-evening", "sunday-afternoon"], ["saturday"]);
    await repo.acceptPledge();
    expect((await repo.runPlacement()).ok).toBe(false); // no placement before verification
    await repo.submitVerification({});
    const run = await repo.runPlacement();
    expect(run.ok).toBe(true);
    const mine = myMemberships(useStore.getState().db);
    expect(mine).toHaveLength(4);
    expect(mine.filter((m) => m.activation === "active").map((m) => m.pod_id).sort()).toEqual([DEMO.hoopers.podId, DEMO.southernAfrican.podId].sort());

    const s = activeSuggestion(useStore.getState().db, DEMO.hoopers.podId)!;
    const r = await repo.rsvp(s.id, "going");
    expect(r.ok && r.data).toEqual({ goingCount: 4, locked: true });
    const db = useStore.getState().db;
    expect(db.suggestions[s.id].status).toBe("accepted");
    const hangout = Object.values(db.hangouts).find((h) => h.suggestion_id === s.id)!;
    expect(hangout.is_starter).toBe(true);
    expect(goingUserIds(db, hangout.id)).toHaveLength(4);
    expect(db.messages[DEMO.hoopers.podId].some((m) => m.text === "Plan locked: 4 of 8 in")).toBe(true);
    // RSVP is a set, not a toggle; can't-make-it after lock never unlocks.
    await repo.rsvp(hangout.id, "not_going");
    expect(useStore.getState().db.suggestions[s.id].status).toBe("accepted");
  });
});
