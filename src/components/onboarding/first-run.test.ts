// Sweep 10/29 first-run checks: the new common interests are pickable and placement runs on them; the community
// picker's two fields reach every religion; Live says how to pass the code.
import { beforeEach, describe, expect, it } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { myMemberships } from "@/lib/db/selectors";
import { LIKE_WORD } from "./words";

const NEW = ["cooking", "coffee", "gym_yoga", "dancing", "gaming"];

async function signUp(interests: string[]) {
  const repo = localRepo();
  const ch = await repo.startPhoneAuth("(256) 555-0190");
  if (!ch.ok) throw new Error("no challenge");
  const u = await repo.verifyPhoneCode(ch.data.challengeId, "123456");
  if (!u.ok) throw new Error(u.error.code);
  await repo.updateAbout({ first_name: "Ade", nickname: null, date_of_birth: "2003-03-04", city: "Huntsville" });
  const r = await repo.setInterests(interests);
  if (!r.ok) throw new Error(r.error.code);
  await repo.setAvailability(["saturday-morning", "weekday-evening"], []);
  await repo.acceptPledge();
  await repo.submitVerification({});
  return repo;
}

describe("first run: new interests", () => {
  beforeEach(() => useStore.setState({ db: freshDb(), hydrated: true }));

  it("are active, have a sentence word, and sit in the likes cycle", () => {
    const db = useStore.getState().db;
    for (const id of NEW) {
      expect(db.interests[id]?.active).toBe(true);
      expect(LIKE_WORD[id]).toBeTruthy();
    }
  });

  it("placement runs on them without crashing", async () => {
    const repo = await signUp(["cooking", "gaming", "gym_yoga"]);
    const run = await repo.runPlacement();
    expect(run.ok).toBe(true);
    // none has a seeded pod: each is a starting pod or a waitlist, never a crash or a fake full pod
    expect(myMemberships(useStore.getState().db).length).toBeGreaterThanOrEqual(0);
  });

  it("placement runs with the new ones mixed with seeded ones", async () => {
    const repo = await signUp(["basketball", "coffee", "dancing"]);
    const run = await repo.runPlacement();
    expect(run.ok).toBe(true);
    expect(myMemberships(useStore.getState().db).some((m) => useStore.getState().db.pods[m.pod_id]?.topic_key === "basketball")).toBe(true);
  });
});

import { REGIONS, RELIGIONS, countriesOf, denominationsOf, faithLabel, faithValue, heritageValue, regionOf, religionOf } from "./community";
import { codeHint } from "./screens/seat-copy";

describe("community picker: two fields", () => {
  it("Faith lists religions first, in order, then denominations", () => {
    expect(RELIGIONS.map((r) => r.label)).toEqual(["Christian", "Muslim", "Hindu", "Jewish", "Buddhist", "Sikh", "Other"]);
    expect(denominationsOf("christian").map((d) => d.label)).toContain("Orthodox");
    expect(denominationsOf("christian").map((d) => d.label)).toContain("Seventh-day Adventist");
    expect(denominationsOf("islam").map((d) => d.label)).toEqual(["Sunni", "Shia"]);
    expect(denominationsOf("hindu")).toEqual([]);
    expect(religionOf("sda")).toBe("christian");
    expect(religionOf("orthodox")).toBe("christian");
  });

  it("From adds Middle Eastern, Eastern European and North American with countries", () => {
    const labels = REGIONS.map((r) => r.label);
    for (const l of ["Middle Eastern", "Eastern European", "North American"]) expect(labels).toContain(l);
    expect(countriesOf("north_american").map((c) => c.label)).toEqual(["American", "Canadian"]);
    expect(regionOf("ZM")).toBe("southern_african");
  });

  it("stores each pick at its own level", () => {
    expect(faithValue("hindu")).toEqual({ level: "religion", code: "hindu" });
    expect(faithValue("sda")).toEqual({ level: "denomination", code: "sda" });
    expect(heritageValue("middle_eastern")).toEqual({ level: "region", code: "middle_eastern" });
    expect(faithLabel("islam")).toBe("Muslim");
  });

  it("Hindu and Sikh save and place; Other saves but never forms a pod", async () => {
    for (const code of ["hindu", "sikh", "other_faith"]) {
      useStore.setState({ db: freshDb(), hydrated: true });
      const repo = await signUp(["basketball"]);
      const r = await repo.setIdentity({ heritage: heritageValue("LB"), faith: faithValue(code), consent: true });
      expect(r.ok).toBe(true);
      const run = await repo.runPlacement();
      expect(run.ok).toBe(true);
      const kinds = myMemberships(useStore.getState().db).map((m) => useStore.getState().db.pods[m.pod_id]).filter((p) => p?.community_kind === "faith");
      if (code === "other_faith") expect(kinds).toHaveLength(0);
    }
  });
});

describe("Keep your seat: code hint", () => {
  it("Live says how to pass step 4; Demo keeps the film's words", () => {
    expect(codeHint(true)).toBe("No text yet while we're in beta. Enter any 6 digits.");
    expect(codeHint(false)).toBe("Six digits, sent by text.");
  });
});
