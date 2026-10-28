// [U8] Report, block, export, delete.
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { newId } from "@/lib/ids";
import type { Report } from "@/lib/types";
import { REPORT_DAILY_LIMIT } from "@/lib/safety/selectors";

const DAY = 24 * 3600_000;

export function safetyRepo(ctx: RepoCtx): RepoPart<"report" | "block" | "unblock" | "exportMyData" | "deleteAccount"> {
  return {
    async report(input) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      const nowISO = ctx.now();
      const nowMs = Date.parse(nowISO);
      const recent = Object.values(db.reports).filter((r) => r.reporter_id === me && nowMs - Date.parse(r.created_at) < DAY);
      if (recent.length >= REPORT_DAILY_LIMIT)
        return err({ code: "CONFLICT", message: "You've sent several reports today. We're reviewing them." });
      const dupe = Object.values(db.reports).some(
        (r) =>
          r.reporter_id === me &&
          r.status === "open" &&
          (input.messageId
            ? r.message_id === input.messageId
            : !r.message_id && (r.reported_id ?? null) === (input.reportedUserId ?? null) && (r.pod_id ?? null) === (input.podId ?? null) && r.reason === input.reason),
      );
      if (dupe) return err({ code: "CONFLICT", message: "You already reported this. We're on it." });
      if (input.details && input.details.length > 700) return err({ code: "VALIDATION", field: "details", message: "Keep it to 500 characters." });

      const urgent = input.reason === "unsafe" || input.reason === "harassment";
      const r: Report = {
        id: newId("rep"),
        reporter_id: me,
        reported_id: input.reportedUserId ?? null,
        pod_id: input.podId ?? null,
        reason: input.reason,
        details: input.details ?? null,
        message_id: input.messageId ?? null,
        status: "open",
        urgent,
        due_by: new Date(nowMs + (urgent ? 3600_000 : DAY)).toISOString(), // internal target; never shown to members
        created_at: nowISO,
      };
      ctx.commit((d) => {
        d.reports[r.id] = r;
      });
      return ok(r);
    },
    async block(userId) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (userId === me) return err({ code: "VALIDATION", message: "You can't block yourself." });
      ctx.commit((d) => {
        if (!d.blocks.some((b) => b.blocker_id === me && b.blocked_id === userId))
          d.blocks.push({ blocker_id: me, blocked_id: userId, created_at: ctx.now() });
      });
      return ok(undefined);
    },
    async unblock(userId) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        d.blocks = d.blocks.filter((b) => !(b.blocker_id === me && b.blocked_id === userId));
      });
      return ok(undefined);
    },
    /** JSON of the signed-in user's own data only: never other members' data. */
    async exportMyData() {
      await ctx.latency();
      const me = ctx.me();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      const podName = (id: string) => db.pods[id]?.name ?? id;
      const data = {
        exported_at: ctx.now(),
        note: "This file has your data only. It never includes other members' data.",
        profile: {
          first_name: me.first_name,
          nickname: me.nickname,
          pronouns: me.pronouns,
          bio: me.bio,
          prompts: me.prompts,
          photo_urls: me.photo_urls,
          date_of_birth: me.date_of_birth,
          city: me.city,
          phone: me.phone,
          availability: me.availability,
          blocked_days: me.blocked_days,
          notification_prefs: me.notification_prefs,
          created_at: me.created_at,
        },
        heritage_and_faith: db.identities[me.id]
          ? { heritage: db.identities[me.id].heritage, faith: db.identities[me.id].faith, consent_given_at: db.identities[me.id].consent_given_at }
          : null,
        interests: db.userInterests.filter((u) => u.user_id === me.id).map((u) => u.interest_id),
        pods: db.memberships.filter((m) => m.user_id === me.id).map((m) => ({ pod: podName(m.pod_id), joined_at: m.joined_at, left_at: m.left_at })),
        rsvps: db.rsvps.filter((r) => r.user_id === me.id),
        messages_you_sent: Object.entries(db.messages).flatMap(([podId, ms]) =>
          ms.filter((m) => m.user_id === me.id).map((m) => ({ pod: podName(podId), text: m.text, sent_at: m.created_at })),
        ),
        reports_you_filed: Object.values(db.reports)
          .filter((r) => r.reporter_id === me.id)
          .map((r) => ({ reason: r.reason, details: r.details, status: r.status, created_at: r.created_at })),
        people_you_blocked: db.blocks.filter((b) => b.blocker_id === me.id).length,
      };
      return ok(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    },
    async deleteAccount() {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        for (const m of d.memberships) if (m.user_id === me && !m.left_at) m.left_at = ctx.now(); // silent leave
        delete d.identities[me]; // heritage + faith deleted right away
        delete d.verifications[me];
        d.userInterests = d.userInterests.filter((u) => u.user_id !== me);
        d.rsvps = d.rsvps.filter((r) => r.user_id !== me);
        d.waitlist = d.waitlist.filter((w) => w.user_id !== me);
        d.notifications = d.notifications.filter((n) => n.user_id !== me);
        const u = d.users[me];
        u.status = "deleted";
        u.photo_urls = [];
        u.bio = null;
        u.prompts = [];
        u.nickname = null;
        u.pronouns = null;
        d.me = null; // reports filed or involving this user are kept (policy)
      });
      return ok(undefined);
    },
  };
}
