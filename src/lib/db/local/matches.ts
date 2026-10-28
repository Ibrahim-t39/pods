// + Interests (continuous placement): find, join and set aside the pods that find you after sign-up.
// Placement proposes (lib/placement/matches.ts); this module writes the rows, the one notification per match, and on
// Join the membership plus the pod's first plan (Platform §F3: every pod opens with its first hangout planned).
import type { Draft } from "immer";
import type { RepoCtx } from "./context";
import { ensureStarterPlans } from "./starter";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { newId } from "@/lib/ids";
import { applyPlacementPlan, findPodMatches, makeRun, planForMatch, toMatch } from "@/lib/placement";
import type { DbState, PodMatch } from "@/lib/types";

/** "Striders · running · 9 people". Community matches stay discreet in notification text (D10). */
export function matchBody(m: Pick<PodMatch, "kind" | "pod_name" | "label" | "size">, discreet: boolean): string {
  const people = `${m.size} people`;
  if (m.kind !== "interest") return discreet ? `Your community pod · ${people}` : `${m.pod_name} · ${people}`;
  return `${m.pod_name} · ${m.label.split(/ & | and /)[0].toLowerCase()} · ${people}`;
}

/** Placement has run for this person (sign-up finished): only then do later changes look for new pods. */
export function placedAlready(db: DbState, userId: string): boolean {
  return db.users[userId]?.onboarding_step === "done";
}

/** Drop open or set-aside matches that no longer stand (the like or community was removed or changed). */
export function dropMatches(d: Draft<DbState>, userId: string, keep: (m: PodMatch) => boolean): void {
  if (!d.podMatches) return;
  d.podMatches = d.podMatches.filter((m) => m.user_id !== userId || m.status === "joined" || keep(m as PodMatch));
}

/** Scan and store new matches with one notification each. Returns the matches created. Never throws. */
export function refreshMatches(ctx: RepoCtx): PodMatch[] {
  const me = ctx.meId();
  if (!me || !placedAlready(ctx.get(), me)) return [];
  const now = ctx.now();
  const scan = findPodMatches(ctx.get(), me, { now });
  if (!scan.proposals.length) return [];
  const made = scan.proposals.map((p) => toMatch(p, newId("pmatch"), me, now));
  ctx.commit((d) => {
    d.podMatches = [...(d.podMatches ?? []), ...made];
    for (const m of made)
      d.notifications.push({
        id: newId("ntf"),
        user_id: me,
        pod_id: d.pods[m.pod_id] ? m.pod_id : null, // the pod it points at (its colour and initial in Inbox)
        trigger: "new_match",
        title: "New pod for you",
        body: matchBody(m, d.config.flags.discreetCommunityNames),
        href: `/app/home?match=${m.id}`,
        channels: ["inapp", "push"],
        created_at: now,
        read_at: null,
      });
  });
  return made;
}

export function matchesRepo(ctx: RepoCtx): RepoPart<"findPodMatches" | "joinPodMatch" | "skipPodMatch"> {
  return {
    async findPodMatches() {
      await ctx.latency();
      if (!ctx.meId()) return err({ code: "FORBIDDEN" });
      return ok(refreshMatches(ctx));
    },
    async joinPodMatch(matchId) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const m = (ctx.get().podMatches ?? []).find((x) => x.id === matchId && x.user_id === me);
      if (!m) return err({ code: "NOT_FOUND" });
      if (m.status === "joined") return ok({ podId: m.pod_id });
      const now = ctx.now();
      const plan = planForMatch(ctx.get(), me, m, { now });
      if (!plan) {
        // Filled up or no longer fits: set it aside quietly and look again (another pod may fit now).
        ctx.commit((d) => dropMatches(d, me, (x) => x.id !== matchId));
        refreshMatches(ctx);
        return err({ code: "CONFLICT", message: "That pod just filled. We’ll keep looking." });
      }
      const podId = plan.results[0].pod_id!;
      ctx.commit((d) => {
        applyPlacementPlan(d, plan, me, now);
        d.placementRuns.push(makeRun(newId("prun"), me, now, plan.results));
        const row = d.podMatches?.find((x) => x.id === matchId);
        if (row) Object.assign(row, { status: "joined", pod_id: podId, pod_name: d.pods[podId]?.name ?? row.pod_name, decided_at: now });
        for (const n of d.notifications) if (n.user_id === me && n.href.endsWith(`match=${matchId}`) && !n.read_at) n.read_at = now;
      });
      await ensureStarterPlans(ctx, [podId]);
      return ok({ podId });
    },
    async skipPodMatch(matchId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const now = ctx.now();
      ctx.commit((d) => {
        const row = d.podMatches?.find((x) => x.id === matchId && x.user_id === me);
        if (row && row.status === "new") Object.assign(row, { status: "skipped", decided_at: now });
        for (const n of d.notifications) if (n.user_id === me && n.href.endsWith(`match=${matchId}`) && !n.read_at) n.read_at = now;
      });
      return ok(undefined);
    },
  };
}
