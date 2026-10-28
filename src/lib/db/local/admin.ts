// [U9] Admin (unguarded in the demo, "Admin (demo)" banner). U0 wrote a minimal working version; U9 owns it.
// Every config change and moderation action writes an AdminAction (audit trail).
import type { RepoCtx } from "./context";
import { ok, err, type Repo } from "@/lib/db/repo";
import { newId } from "@/lib/ids";
import { AppConfigSchema } from "@/config";
import { useStore } from "@/lib/db/store";
import { applyPlacementPlan, makeRun, placeUser } from "@/lib/placement";
import type { AdminAction } from "@/lib/types";

export function adminRepo(ctx: RepoCtx): Repo["admin"] {
  const audit = (a: Omit<AdminAction, "id" | "created_at" | "admin">): AdminAction => ({
    ...a,
    id: newId("act"),
    admin: "admin@demo",
    created_at: ctx.now(),
  });
  return {
    async upsertVenue(v) {
      await ctx.latency();
      ctx.commit((d) => {
        d.venues[v.id] = v;
        d.adminActions.push(audit({ action: "venue_edit", target_user_id: null, report_id: null, note: v.name }));
      });
      return ok(v);
    },
    async upsertInterest(i) {
      await ctx.latency();
      ctx.commit((d) => {
        d.interests[i.id] = i;
      });
      return ok(i);
    },
    async upsertHangout(h) {
      await ctx.latency();
      ctx.commit((d) => {
        d.hangouts[h.id] = h;
        d.adminActions.push(audit({ action: "hangout_edit", target_user_id: null, report_id: null, note: h.title }));
      });
      return ok(h);
    },
    async actOnReport(id, action, note) {
      await ctx.latency();
      const r = ctx.get().reports[id];
      if (!r) return err({ code: "NOT_FOUND" });
      // every moderation action needs a note (BLUEPRINT §5.6 AC)
      if (!note || note.trim().length < 5) return err({ code: "VALIDATION", message: "A note is required." });
      if (r.status !== "open") return err({ code: "VALIDATION", message: "Already handled." });
      ctx.commit((d) => {
        const rep = d.reports[id];
        rep.status = action === "dismiss" ? "dismissed" : "actioned";
        if (action === "ban" && rep.reported_id) {
          const u = d.users[rep.reported_id];
          if (u) u.status = "banned";
          for (const m of d.memberships) if (m.user_id === rep.reported_id && !m.left_at) m.left_at = ctx.now();
        }
        if (action === "suspend" && rep.reported_id && d.users[rep.reported_id]) d.users[rep.reported_id].status = "suspended";
        d.adminActions.push(audit({ action, target_user_id: rep.reported_id, report_id: id, note: note ?? null }));
      });
      return ok(ctx.get().reports[id]);
    },
    async setConfig(c) {
      await ctx.latency();
      const next = { ...ctx.config(), ...c };
      const parsed = AppConfigSchema.safeParse(next);
      if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.message });
      ctx.commit((d) => {
        d.config = parsed.data;
        d.adminActions.push(audit({ action: "config_change", target_user_id: null, report_id: null, note: Object.keys(c).join(", ") }));
      });
      return ok(ctx.config());
    },
    async rerunPlacement(userId) {
      await ctx.latency();
      const target = userId ?? ctx.meId();
      if (!target || !ctx.get().users[target]) return err({ code: "NOT_FOUND" });
      const now = ctx.now();
      const out = placeUser(ctx.get(), target, { now });
      if (!out.ok) return err({ code: "VALIDATION", message: out.code });
      const run = makeRun(newId("prun"), target, now, out.results);
      ctx.commit((d) => {
        applyPlacementPlan(d, out, target, now);
        d.placementRuns.push(run);
      });
      return ok(run);
    },
    async resetDemo() {
      useStore.getState().resetDemo();
      return ok(undefined);
    },
  };
}
