// [U7] Pods: leave (quiet, with rematch), mute, rename.
// Leaving posts NO message naming the person (ARCHITECTURE §9.2, BLUEPRINT OV-03 AC). The leaver's RSVPs on the pod's
// open plan are released ("Your spot on Sunday will be released"). Rematch runs U3's engine for the same candidate.
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { applyPlacementPlan, rematch } from "@/lib/placement";
import type { Pod } from "@/lib/types";

export function podsRepo(ctx: RepoCtx): RepoPart<"leavePod" | "setMuted" | "renamePod"> {
  return {
    async leavePod(podId) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      const mine = db.memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
      if (!mine) return err({ code: "NOT_FOUND", message: "You're not in this pod." });
      const now = ctx.now();

      // Open targets on this pod: un-locked suggestions and upcoming hangouts.
      const openTargets = new Set<string>([
        ...Object.values(db.suggestions).filter((s) => s.pod_id === podId && s.status !== "replaced").map((s) => s.id),
        ...Object.values(db.hangouts).filter((h) => h.pod_id === podId && h.status === "upcoming").map((h) => h.id),
      ]);

      ctx.commit((d) => {
        const m = d.memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
        if (m) m.left_at = now;
        // Release my spot. Count drops; a locked plan never un-locks (ARCHITECTURE §8.7).
        for (const r of d.rsvps) if (r.user_id === me && openTargets.has(r.hangout_id) && !r.checked_in) r.status = "not_going";
        for (const v of Object.values(d.votes)) if (v.pod_id === podId && v.status === "open") delete v.votes[me];
      });

      // Rematch (U3). Any failure keeps the quiet leave and simply reports "no new pod yet".
      let rematchedInto: Pod | null = null;
      let waitlisted = false;
      try {
        const out = rematch(ctx.get(), me, podId, ctx.config().placement, { now });
        if (out) {
          ctx.commit((d) => applyPlacementPlan(d, { results: [out.result], newPods: out.newPod ? [out.newPod] : [] }, me, now));
          waitlisted = out.waitlisted;
          rematchedInto = out.rematchedInto ? (ctx.get().pods[out.rematchedInto] ?? null) : null;
        } else {
          waitlisted = true;
        }
      } catch {
        waitlisted = true;
      }
      return ok({ rematchedInto, waitlisted });
    },

    async setMuted(podId, muted) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (!ctx.get().memberships.some((x) => x.pod_id === podId && x.user_id === me && !x.left_at)) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        const m = d.memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
        if (m) m.muted = muted;
      });
      return ok(undefined);
    },

    async renamePod(podId, name, photoUrl) {
      await ctx.latency();
      const me = ctx.meId();
      const db = ctx.get();
      const m = db.memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
      if (!m || m.role !== "admin") return err({ code: "FORBIDDEN", message: "Only pod admins can rename the pod." });
      const trimmed = name.trim().replace(/\s+/g, " ");
      if (!trimmed || trimmed.length > 40) return err({ code: "VALIDATION", field: "name", message: "1 to 40 characters." });
      ctx.commit((d) => {
        d.pods[podId].name = trimmed;
        if (photoUrl) d.pods[podId].photo_url = photoUrl;
      });
      return ok(ctx.get().pods[podId]);
    },
  };
}
