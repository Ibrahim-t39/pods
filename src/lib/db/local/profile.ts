// [U8] Profile edits, interests, identity field deletion. U0 wrote a minimal working version; U8 owns it.
import type { RepoCtx } from "./context";
import { dropMatches, refreshMatches } from "./matches";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { newId } from "@/lib/ids";
import { makeRun } from "@/lib/placement";

export function profileRepo(ctx: RepoCtx): RepoPart<"updateProfile" | "addInterest" | "removeInterest" | "deleteIdentityField"> {
  return {
    async updateProfile(patch) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (patch.bio && patch.bio.length > 150) return err({ code: "VALIDATION", field: "bio", message: "Keep it to 150 characters." });
      if (patch.nickname && patch.nickname.length > 24) return err({ code: "VALIDATION", field: "nickname", message: "Keep it to 24 characters." });
      if (patch.prompts) {
        if (patch.prompts.length > 3) return err({ code: "VALIDATION", field: "prompts", message: "Pick up to 3 prompts." });
        if (patch.prompts.some((p) => p.answer.length > 120)) return err({ code: "VALIDATION", field: "prompts", message: "Keep each answer to 120 characters." });
      }
      if (patch.photo_urls && (patch.photo_urls.length < 1 || patch.photo_urls.length > 3)) return err({ code: "VALIDATION", field: "photo_urls", message: "Keep 1 to 3 photos." });
      ctx.commit((d) => {
        Object.assign(d.users[me], patch);
      });
      return ok(ctx.me()!);
    },
    async addInterest(id) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (!ctx.get().interests[id]?.active) return err({ code: "VALIDATION", field: "interests", message: "Pick from the list." });
      ctx.commit((d) => {
        if (!d.userInterests.some((u) => u.user_id === me && u.interest_id === id)) d.userInterests.push({ user_id: me, interest_id: id });
      });
      // Likes are never final: a like added after sign-up proposes a pod ("New pod for you", Join / Not now).
      // Nothing is joined here; the run returned is the dry run of what was found.
      const now = ctx.now();
      const made = refreshMatches(ctx);
      const results = makeRun(newId("prun"), me, now, [], true);
      results.results = made.map((m) => ({
        candidate: { type: "interest", community_kind: null, topic_key: m.topic_key, label: m.label },
        outcome: ctx.get().pods[m.pod_id] ? "joined_existing" : "created_new",
        pod_id: m.pod_id,
        steps: [],
        user_note: m.note,
      }));
      return ok(results);
    },
    async removeInterest(id) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        d.userInterests = d.userInterests.filter((u) => !(u.user_id === me && u.interest_id === id));
        // Leave the matching interest pod, no rematch (edge case 27).
        for (const m of d.memberships)
          if (m.user_id === me && !m.left_at && d.pods[m.pod_id]?.type === "interest" && d.pods[m.pod_id].topic_key === id) m.left_at = ctx.now();
        // An open or set-aside match for this like goes too, so adding it again looks again.
        dropMatches(d, me, (m) => !(m.kind === "interest" && m.topic_key === id));
      });
      return ok(undefined);
    },
    async deleteIdentityField(field) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        const ident = d.identities[me];
        if (ident) ident[field] = null;
        if (ident && !ident.heritage && !ident.faith) delete d.identities[me];
        for (const m of d.memberships)
          if (m.user_id === me && !m.left_at && d.pods[m.pod_id]?.community_kind === field) m.left_at = ctx.now();
        dropMatches(d, me, (m) => m.kind !== field);
      });
      return ok(undefined);
    },
  };
}

/** Sign out (ST-05). Not part of the Repo contract: the demo has no server session, so this just clears `me`. */
export function signOutLocal(ctx: RepoCtx): void {
  ctx.commit((d) => {
    d.me = null;
  });
}
