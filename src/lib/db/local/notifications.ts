// [U8] Notification prefs + inbox read state. U0 wrote a minimal working version; U8 owns it.
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart } from "@/lib/db/repo";

export function notificationsRepo(ctx: RepoCtx): RepoPart<"setNotificationPrefs" | "markNotificationsRead"> {
  return {
    async setNotificationPrefs(p) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        d.users[me].notification_prefs = p;
      });
      return ok(undefined);
    },
    async markNotificationsRead(ids) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const now = ctx.now();
      ctx.commit((d) => {
        for (const n of d.notifications) if (n.user_id === me && ids.includes(n.id) && !n.read_at) n.read_at = now;
      });
      return ok(undefined);
    },
  };
}
