// [U7] Chat: send (idempotent on clientId), pin (admins only).
// Rules: members only; forming pods are read-only (BLUEPRINT AP-02 "forming pod"); a member whose access is paused
// pending a safety review can't post (OV-01); 1-1000 chars; whitespace-only is rejected; no "X left" lines ever.
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { newId } from "@/lib/ids";
import type { Message } from "@/lib/types";

export const MAX_MESSAGE = 1000;

export function chatRepo(ctx: RepoCtx): RepoPart<"sendMessage" | "pinMessage"> {
  return {
    async sendMessage(podId, text, clientId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      if (!db.memberships.some((m) => m.pod_id === podId && m.user_id === me && !m.left_at)) return err({ code: "FORBIDDEN" });
      if (db.pods[podId]?.status === "forming") return err({ code: "FORBIDDEN", message: "This pod opens when 6 join." });
      if (db.pods[podId]?.status === "closed") return err({ code: "FORBIDDEN", message: "This pod is archived." });
      const body = text.replace(/\r\n/g, "\n").trim();
      if (!body || body.length > MAX_MESSAGE) return err({ code: "VALIDATION", field: "text", message: "Messages are 1 to 1000 characters." });
      const dupe = (db.messages[podId] ?? []).find((m) => m.client_id === clientId);
      if (dupe) return ok(dupe);
      await ctx.latency();
      if (typeof navigator !== "undefined" && navigator.onLine === false) return err({ code: "OFFLINE" });
      const again = (ctx.get().messages[podId] ?? []).find((m) => m.client_id === clientId);
      if (again) return ok(again);
      const msg: Message = {
        id: newId("msg"),
        pod_id: podId,
        user_id: me,
        text: body,
        created_at: ctx.now(),
        kind: "text",
        ref_id: null,
        client_id: clientId,
        pinned: false,
        delivery: "sent",
      };
      ctx.commit((d) => {
        (d.messages[podId] ??= []).push(msg);
      });
      return ok(msg);
    },

    async pinMessage(podId, messageId) {
      const me = ctx.meId();
      const m = ctx.get().memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
      if (!m || m.role !== "admin") return err({ code: "FORBIDDEN" });
      if (!ctx.get().messages[podId]?.some((x) => x.id === messageId)) return err({ code: "NOT_FOUND" });
      ctx.commit((d) => {
        const msg = d.messages[podId]?.find((x) => x.id === messageId);
        if (!msg) return;
        msg.pinned = true;
        (d.messages[podId] ??= []).push({
          id: newId("msg"),
          pod_id: podId,
          user_id: null,
          text: "Pinned by an admin",
          created_at: ctx.now(),
          kind: "system",
          ref_id: messageId,
          client_id: null,
          pinned: false,
          delivery: "sent",
        });
      });
      return ok(undefined);
    },
  };
}
