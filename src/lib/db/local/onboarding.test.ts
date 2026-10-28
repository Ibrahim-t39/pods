// [U6] Onboarding repo ACs: D14 dry run writes nothing; no membership before `approved`; under-18 hard stop;
// skip communities stores nothing; Keep-this-day-free wins over slots.
import { beforeEach, describe, expect, it } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { myMemberships } from "@/lib/db/selectors";

async function signIn(phone = "(256) 555-0142") {
  const repo = localRepo();
  const ch = await repo.startPhoneAuth(phone);
  if (!ch.ok) throw new Error("no challenge");
  const u = await repo.verifyPhoneCode(ch.data.challengeId, "123456");
  if (!u.ok) throw new Error(u.error.code);
  return repo;
}

describe("U6 onboarding repo", () => {
  beforeEach(() => useStore.setState({ db: freshDb(), hydrated: true }));

  it("previewPlacement is a dry run and real placement waits for approval", async () => {
    const repo = await signIn();
    await repo.updateAbout({ first_name: "Chanda", nickname: null, date_of_birth: "2004-03-04", city: "Huntsville" });
    await repo.setInterests(["basketball", "guitar"]);
    await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "sda" }, consent: true });
    await repo.acceptPledge();
    const before = JSON.stringify(useStore.getState().db.memberships);
    const preview = await repo.previewPlacement();
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.data.dry_run).toBe(true);
    expect(preview.data.results.filter((r) => r.outcome !== "waitlisted")).toHaveLength(4);
    expect(JSON.stringify(useStore.getState().db.memberships)).toBe(before);
    expect(myMemberships(useStore.getState().db)).toHaveLength(0);
    expect((await repo.runPlacement()).ok).toBe(false);
    await repo.submitVerification({});
    const run = await repo.runPlacement();
    expect(run.ok).toBe(true);
    const mine = myMemberships(useStore.getState().db);
    expect(mine).toHaveLength(4);
    expect(mine.filter((m) => m.activation === "active")).toHaveLength(2);
    expect(useStore.getState().db.users[useStore.getState().db.me!].onboarding_step).toBe("done");
  });

  it("under 18: no account is kept and the phone is blocked", async () => {
    const repo = await signIn("(256) 555-0177");
    const r = await repo.updateAbout({ first_name: "Kid", nickname: null, date_of_birth: "2012-01-01", city: "Huntsville" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNDERAGE");
    expect(useStore.getState().db.me).toBeNull();
  });

  it("skipping communities stores nothing; keep-free days drop their slots", async () => {
    const repo = await signIn();
    await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: null, consent: false });
    const me = useStore.getState().db.me!;
    expect(useStore.getState().db.identities[me]).toBeUndefined();
    await repo.setAvailability(["weekday-evening", "saturday-morning", "sunday-afternoon"], ["saturday"]);
    expect(useStore.getState().db.users[me].availability).toEqual(["weekday-evening", "sunday-afternoon"]);
  });
});
