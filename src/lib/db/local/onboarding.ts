// [U6] Onboarding + verification + placement entry points (BLUEPRINT §5.2, D14).
// Order: (City, Interests on the device) → Account → About → Communities → Availability → Photo → Pledge →
// previewPlacement (dry run, nothing written) → Verify → runPlacement (real) → Reveal.
// `onboarding_step` always names the NEXT thing to do, so /app can resume (see components/onboarding/steps.ts).
// Placement itself is U3's pure engine (src/lib/placement); this module only gates, applies and records it.
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart, type AppError } from "@/lib/db/repo";
import { ageOn } from "@/lib/utils";
import { newId } from "@/lib/ids";
import { applyPlacementPlan, makeRun, placeUser, previewPlacement as previewDryRun, type PlacementErrorCode } from "@/lib/placement";
import { heritageNode, faithNode } from "@/data/taxonomy";
import type { OnboardingStep, PlacementRun, Slot, Verification } from "@/lib/types";
import { SLOTS, BLOCKABLE_DAYS } from "@/lib/types";
import { recordMinorBlock } from "./auth";
import { ensureStarterPlans } from "./starter";

const ORDER: OnboardingStep[] = ["account", "about", "communities", "availability", "photo", "pledge", "placing", "verify", "done"];

function placementError(code: PlacementErrorCode): AppError {
  if (code === "NOT_ACTIVE") return { code: "FORBIDDEN", message: "Account not active" };
  return { code };
}

export function onboardingRepo(
  ctx: RepoCtx,
): RepoPart<
  | "updateAbout"
  | "setInterests"
  | "setIdentity"
  | "setAvailability"
  | "setPhotos"
  | "acceptPledge"
  | "submitVerification"
  | "previewPlacement"
  | "runPlacement"
> {
  /** Move the user forward to `step` (never backwards: editing an earlier answer keeps your place). */
  const advance = (userId: string, step: OnboardingStep) => {
    ctx.commit((d) => {
      const u = d.users[userId];
      if (!u) return;
      if (ORDER.indexOf(step) > ORDER.indexOf(u.onboarding_step)) u.onboarding_step = step;
    });
  };

  return {
    async updateAbout(input) {
      await ctx.latency();
      const me = ctx.me();
      if (!me) return err({ code: "FORBIDDEN" });
      const first = input.first_name.trim();
      if (!first) return err({ code: "VALIDATION", field: "first_name", message: "Add your first name." });
      if (first.length > 40) return err({ code: "VALIDATION", field: "first_name", message: "Keep it under 40 characters." });
      if ((input.nickname ?? "").length > 30) return err({ code: "VALIDATION", field: "nickname", message: "Keep it under 30 characters." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date_of_birth) || Number.isNaN(Date.parse(input.date_of_birth)))
        return err({ code: "VALIDATION", field: "date_of_birth", message: "Enter a real date." });
      const { minAge, maxAge, metro } = ctx.config().placement;
      const age = ageOn(input.date_of_birth, ctx.now());
      if (age < minAge) {
        // Edge case 1: hard stop, no account is created, and the phone is remembered (30 days).
        recordMinorBlock(me.phone, Date.parse(ctx.now()));
        ctx.commit((d) => {
          delete d.users[me.id];
          delete d.identities[me.id];
          d.userInterests = d.userInterests.filter((u) => u.user_id !== me.id);
          d.me = null;
        });
        return err({ code: "UNDERAGE" });
      }
      if (age > maxAge) return err({ code: "OVER_AGE" });
      if (!metro.includes(input.city)) return err({ code: "OUT_OF_METRO" });
      ctx.commit((d) => {
        Object.assign(d.users[me.id], {
          first_name: first,
          nickname: input.nickname?.trim() || null,
          date_of_birth: input.date_of_birth,
          city: input.city,
        });
      });
      advance(me.id, "communities");
      return ok(ctx.me()!);
    },
    async setInterests(ids) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const max = ctx.config().placement.maxInterestPods;
      const known = ctx.get().interests;
      const clean = [...new Set(ids)].filter((id) => known[id]?.active);
      if (clean.length < 1 || clean.length > max)
        return err({ code: "VALIDATION", field: "interests", message: `Pick 1 to ${max}.` });
      ctx.commit((d) => {
        d.userInterests = d.userInterests.filter((u) => u.user_id !== me).concat(clean.map((interest_id) => ({ user_id: me, interest_id })));
      });
      return ok(undefined);
    },
    async setIdentity({ heritage = null, faith = null, consent }) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      // Custom faith ("Add your own") is stored as free text, 40 chars, and waits for ops to map it.
      if (heritage && !heritageNode(heritage.code))
        return err({ code: "VALIDATION", field: "heritage", message: "Pick from the list." });
      if (faith && !faithNode(faith.code) && !faith.code.startsWith("custom:"))
        return err({ code: "VALIDATION", field: "faith", message: "Pick from the list." });
      if (faith?.code.startsWith("custom:") && faith.code.length > 47)
        return err({ code: "VALIDATION", field: "faith", message: "Keep it under 40 characters." });
      ctx.commit((d) => {
        // Edge case 5: skipped or no consent → nothing stored (and anything stored before is removed).
        if (!consent || (!heritage && !faith)) delete d.identities[me];
        else d.identities[me] = { user_id: me, heritage, faith, consent_given_at: ctx.now() };
      });
      advance(me, "availability");
      return ok(undefined);
    },
    async setAvailability(slots, blockedDays = []) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const days = [...new Set(blockedDays)].filter((b) => (BLOCKABLE_DAYS as readonly string[]).includes(b));
      // "Keep this day free" wins over any slot on that day.
      const clean = [...new Set(slots)].filter(
        (s): s is Slot => (SLOTS as readonly string[]).includes(s) && !days.some((day) => s.startsWith(day)),
      );
      ctx.commit((d) => {
        d.users[me].availability = clean;
        d.users[me].blocked_days = days;
      });
      advance(me, "photo");
      return ok(undefined);
    },
    async setPhotos(urls) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const clean = urls.filter((u) => /^(data:image\/(png|jpeg|webp);base64,|\/avatars\/[a-z0-9_-]+\.svg$)/.test(u));
      if (clean.some((u) => u.length > 2_000_000))
        return err({ code: "VALIDATION", field: "photo", message: "Use a JPG or PNG under 10 MB." });
      ctx.commit((d) => {
        d.users[me].photo_urls = clean.slice(0, 3);
      });
      advance(me, "pledge");
      return ok(undefined);
    },
    async acceptPledge() {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        d.users[me].pledge_accepted_at = ctx.now();
        if (d.users[me].status === "onboarding") d.users[me].status = "pending_verification";
      });
      advance(me, "placing");
      return ok(undefined);
    },
    async submitVerification() {
      // DEMO ONLY (D12): sample images; nothing is persisted beyond the result. Production hands capture to the
      // vendor SDK and Pods keeps only { status, age, verified_at } (ARCHITECTURE §9.3).
      await ctx.latency();
      const me = ctx.me();
      if (!me) return err({ code: "FORBIDDEN" });
      if (!me.pledge_accepted_at) return err({ code: "VALIDATION", field: "pledge", message: "Agree to the pledge first." });
      const now = ctx.now();
      const v: Verification = { user_id: me.id, vendor: "simulated", status: "approved", reason: null, created_at: now, decided_at: now };
      ctx.commit((d) => {
        d.verifications[me.id] = v;
        Object.assign(d.users[me.id], { verified: true, verified_at: now, status: "active" });
      });
      advance(me.id, "verify");
      return ok(v);
    },
    async previewPlacement() {
      // D14 dry run: pod types and counts only. Nothing is written and nobody is added to any pod.
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      const out = previewDryRun(db, me, db.config.placement, { now: ctx.now() });
      if (!out.ok) return err(placementError(out.code));
      return ok(out.run);
    },
    async runPlacement() {
      await ctx.latency();
      const me = ctx.me();
      if (!me) return err({ code: "FORBIDDEN" });
      // Spec safety rule: no placement (no membership at all) before verification is approved.
      if (!me.verified || ctx.get().verifications[me.id]?.status !== "approved") return err({ code: "NOT_VERIFIED" });
      const now = ctx.now();
      const out = placeUser(ctx.get(), me.id, { now });
      if (!out.ok) return err(placementError(out.code));
      const run: PlacementRun = makeRun(newId("prun"), me.id, now, out.results);
      ctx.commit((d) => {
        applyPlacementPlan(d, out, me.id, now);
        d.placementRuns.push(run);
        d.users[me.id].onboarding_step = "done";
      });
      // Platform §F3: every pod opens with its first hangout planned (no-op for pods that already have one).
      await ensureStarterPlans(ctx);
      return ok(run);
    },
  };
}
