// First-run order (V3_SPEC §6.2; wireframes B01-B08):
//   You (1 of 4) → Likes (2) → Free (3) → Keep your seat (number + code: the first check) → Promise (4 of 4)
//   → Check it's you (/app/verify) → Finding your pods (/app/placing) → Your pods.
// The first three live in the draft (this browser); the code commits them. Placement never runs before both the
// code and the check pass (the repo enforces it too).
import type { Repo } from "@/lib/db/repo";
import type { MetroCity, User } from "@/lib/types";
import { nowISO } from "@/lib/time/clock";
import { heritageNode } from "@/data/taxonomy";
import { dobForAge, useDraft, type Draft } from "./draft";

export type StepId = "you" | "likes" | "free" | "seat" | "promise" | "verify" | "placing";

export const STEP_ROUTE: Record<StepId, string> = {
  you: "/app/onboarding/about",
  likes: "/app/onboarding/interests",
  free: "/app/onboarding/availability",
  seat: "/app/onboarding/account",
  promise: "/app/onboarding/pledge",
  verify: "/app/verify",
  placing: "/app/placing",
};

/** Six dots, one per step a person acts on, so the count never stops or lies (QA round 1): You, Likes, Free, Keep your seat (number and code), Promise, Check. */
export const DOT: Partial<Record<StepId, number>> = { you: 1, likes: 2, free: 3, seat: 4, promise: 5, verify: 6 };

export const BACK: Partial<Record<StepId, string>> = {
  you: "/",
  likes: STEP_ROUTE.you,
  free: STEP_ROUTE.likes,
  seat: STEP_ROUTE.free,
};

/** The first draft step that still needs an answer (null = all answered). */
export function firstOpenDraftStep(d: Pick<Draft, "firstName" | "age" | "interests" | "free">): StepId | null {
  if (!d.firstName.trim() || d.age === null || d.age < 18) return "you";
  if (!d.interests.length) return "likes";
  if (!d.free.length) return "free";
  return null;
}

/** Where a person belongs right now (signed in or not). Used by /app and by every step's guard. */
export function resumeRoute(me: User | null, d: Draft = useDraft.getState()): string {
  if (!me || me.status === "deleted") {
    const open = firstOpenDraftStep(d);
    return STEP_ROUTE[open ?? "seat"];
  }
  switch (me.onboarding_step) {
    case "done":
      return "/app/home";
    case "verify": // verified, not placed yet
      return STEP_ROUTE.placing;
    case "placing": // promised, not checked yet
      return STEP_ROUTE.verify;
    case "pledge":
    case "photo":
      return STEP_ROUTE.promise;
    default: {
      // Signed in but the answers were not committed (another device, a cleared browser): ask what is missing.
      const open = me.first_name ? (me.availability.length ? null : "free") : firstOpenDraftStep(d);
      // Answers in the draft but not committed yet: Free commits them on Next.
      return STEP_ROUTE[open ?? (me.first_name ? "promise" : "free")];
    }
  }
}

/**
 * Commit the draft once a number exists. Order matters: About sets name, age and city; then likes, the community
 * opt-in (nothing stored when nothing was chosen) and free times. Returns the repo error code on failure.
 */
export async function commitDraft(repo: Repo, metro: readonly string[]): Promise<{ ok: true } | { ok: false; code: string }> {
  const d = useDraft.getState();
  const city = (d.city && metro.includes(d.city) ? d.city : metro[0]) as MetroCity;
  const r1 = await repo.updateAbout({ first_name: d.firstName.trim(), nickname: null, date_of_birth: dobForAge(d.age ?? 0, nowISO()), city });
  if (!r1.ok) return { ok: false, code: r1.error.code };
  const r2 = await repo.setInterests(d.interests);
  if (!r2.ok) return { ok: false, code: r2.error.code };
  const r3 = await repo.setIdentity({
    heritage: d.heritage ? { level: heritageNode(d.heritage)?.level ?? "region", code: d.heritage } : null,
    faith: d.faith ? { level: "denomination", code: d.faith } : null,
    consent: !!(d.heritage || d.faith),
  });
  if (!r3.ok) return { ok: false, code: r3.error.code };
  const r4 = await repo.setAvailability(d.free, []);
  if (!r4.ok) return { ok: false, code: r4.error.code };
  return { ok: true };
}
