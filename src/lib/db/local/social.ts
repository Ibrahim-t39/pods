// Platform foundation (PLATFORM_SPEC §D): reactions, polls, memories, member-proposed hangouts, starter plans,
// Discover requests, invites, trusted contact, mark-all-read. Same rules as every module: latency, auth inside the
// repo, writes through ctx.commit, member data never leaves except as public views. Community pods stay discreet (D10).
import type { Draft } from "immer";
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { newId } from "@/lib/ids";
import { nanoid } from "nanoid";
import { ageOn, displayName } from "@/lib/utils";
import { addMinutesISO } from "@/lib/platform/time";
import { REACTIONS, type AppNotification, type DbState, type HangoutSuggestion, type ID, type Invite, type Memory, type Poll, type PodRequest } from "@/lib/types";
import { hangoutsRepo } from "./hangouts";
import { ensureStarterPlans } from "./starter";

type D = Draft<DbState>;

export const POLL_LIMITS = { question: 120, option: 40, min: 2, max: 4 } as const;
export const MEMORY_CAPTION_MAX = 200;
export const PROPOSAL_TITLE_MAX = 80;
const PHOTO_RE = /^data:image\/(png|jpeg|webp);base64,/;

const isMember = (db: DbState, podId: ID, userId: ID) => db.memberships.some((m) => m.pod_id === podId && m.user_id === userId && !m.left_at);
const isAdmin = (db: DbState, podId: ID, userId: ID) => db.memberships.some((m) => m.pod_id === podId && m.user_id === userId && !m.left_at && m.role === "admin");

/** D10: notification text never names a community pod. */
export function podNoticeLabel(db: DbState, podId: ID): string {
  const p = db.pods[podId];
  return !p ? "Your pod" : p.type === "community" && db.config.flags.discreetCommunityNames ? "Your community pod" : p.name;
}

function notify(d: D, userId: ID, podId: ID | null, trigger: AppNotification["trigger"], title: string, body: string, href: string, now: string) {
  d.notifications.push({ id: newId("ntf"), user_id: userId, pod_id: podId, trigger, title, body, href, channels: ["inapp", "push"], created_at: now, read_at: null });
}

/** Either side blocked the other. */
export function blockedBetween(db: DbState, a: ID, b: ID): boolean {
  return db.blocks.some((x) => (x.blocker_id === a && x.blocked_id === b) || (x.blocker_id === b && x.blocked_id === a));
}

export type JoinVerdict = "join" | "waitlist" | "already" | "blocked" | "community" | "closed" | "cap" | "missing";

/** Can `userId` join `podId` from Discover or an invite? Pure. */
export function joinVerdict(db: DbState, podId: ID, userId: ID, nowISO: string): JoinVerdict {
  const pod = db.pods[podId];
  const me = db.users[userId];
  if (!pod || !me) return "missing";
  if (pod.status === "closed") return "closed";
  if (pod.type === "community") return "community";
  if (isMember(db, podId, userId)) return "already";
  const members = db.memberships.filter((m) => m.pod_id === podId && !m.left_at);
  if (members.some((m) => blockedBetween(db, userId, m.user_id))) return "blocked";
  const cfg = db.config.placement;
  const myInterestPods = db.memberships.filter((m) => m.user_id === userId && !m.left_at && db.pods[m.pod_id]?.type === "interest").length;
  if (myInterestPods >= cfg.maxInterestPods) return "cap";
  const age = ageOn(me.date_of_birth, nowISO);
  const fitsAge = age >= pod.age_min - cfg.ageBand && age <= pod.age_max + cfg.ageBand;
  return members.length < cfg.podMax && fitsAge ? "join" : "waitlist";
}

/** Before your first hangout a pod you pick in Discover waits on deck (it opens after that hangout, like placement's). */
function joinNow(d: D, podId: ID, userId: ID, now: string, queue = false) {
  const onDeck = queue && !d.rsvps.some((r) => r.user_id === userId && r.checked_in);
  d.memberships.push({ pod_id: podId, user_id: userId, role: "member", muted: false, card_dismissed: false, card_dismissed_for: null, activation: onDeck ? "on_deck" : "active", joined_at: now, left_at: null });
  const key = d.pods[podId].topic_key;
  if (d.interests[key] && !d.userInterests.some((u) => u.user_id === userId && u.interest_id === key)) d.userInterests.push({ user_id: userId, interest_id: key });
}

export function socialRepo(
  ctx: RepoCtx,
): RepoPart<
  | "react" | "createPoll" | "votePoll" | "closePoll" | "addMemory" | "removeMemory" | "proposeHangout" | "planStarters"
  | "requestPod" | "cancelPodRequest" | "createInvite" | "redeemInvite" | "setTrustedContact" | "markAllNotificationsRead"
> {
  const hangouts = hangoutsRepo(ctx);
  return {
    async react(podId, messageId, key) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (!(REACTIONS as readonly string[]).includes(key)) return err({ code: "VALIDATION", field: "key", message: "Unknown reaction." });
      const db = ctx.get();
      if (!isMember(db, podId, me)) return err({ code: "FORBIDDEN" });
      if (!db.messages[podId]?.some((m) => m.id === messageId)) return err({ code: "NOT_FOUND" });
      ctx.commit((d) => {
        const m = d.messages[podId]!.find((x) => x.id === messageId)!;
        const r = (m.reactions ??= {});
        const list = (r[key] ??= []);
        const i = list.indexOf(me);
        if (i >= 0) list.splice(i, 1);
        else list.push(me);
        if (!list.length) delete r[key];
      });
      return ok({ ...(ctx.get().messages[podId]!.find((x) => x.id === messageId)!.reactions ?? {}) });
    },

    async createPoll(podId, question, options, clientId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      if (!isMember(db, podId, me)) return err({ code: "FORBIDDEN" });
      if (db.pods[podId]?.status !== "active") return err({ code: "FORBIDDEN", message: "This pod isn't open yet." });
      const dupe = (db.messages[podId] ?? []).find((m) => m.client_id === clientId && m.kind === "poll");
      if (dupe?.ref_id && db.polls[dupe.ref_id]) return ok(db.polls[dupe.ref_id]);
      const q = question.trim().replace(/\s+/g, " ");
      if (!q || q.length > POLL_LIMITS.question) return err({ code: "VALIDATION", field: "question", message: "Ask in 1 to 120 characters." });
      const opts = [...new Set(options.map((o) => o.trim().replace(/\s+/g, " ")).filter(Boolean))];
      if (opts.length < POLL_LIMITS.min || opts.length > POLL_LIMITS.max) return err({ code: "VALIDATION", field: "options", message: "Give 2 to 4 options." });
      if (opts.some((o) => o.length > POLL_LIMITS.option)) return err({ code: "VALIDATION", field: "options", message: "Keep options under 40 characters." });
      await ctx.latency();
      const now = ctx.now();
      const poll: Poll = {
        id: newId("poll"), pod_id: podId, created_by: me, question: q,
        options: opts.map((label) => ({ id: newId("opt"), label })), votes: {}, created_at: now, closes_at: null, status: "open",
        message_id: newId("msg"),
      };
      ctx.commit((d) => {
        d.polls[poll.id] = poll;
        (d.messages[podId] ??= []).push({
          id: poll.message_id, pod_id: podId, user_id: me, text: q, created_at: now, kind: "poll", ref_id: poll.id,
          client_id: clientId, pinned: false, delivery: "sent",
        });
        for (const m of d.memberships) {
          if (m.pod_id === podId && !m.left_at && m.user_id !== me && !m.muted) notify(d, m.user_id, podId, "poll_opened", podNoticeLabel(d as DbState, podId), q, `/app/pods/${podId}/chat`, now);
        }
      });
      return ok(ctx.get().polls[poll.id]);
    },

    async votePoll(pollId, optionId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const p = ctx.get().polls[pollId];
      if (!p) return err({ code: "NOT_FOUND" });
      if (!isMember(ctx.get(), p.pod_id, me)) return err({ code: "FORBIDDEN" });
      if (p.status !== "open" || (p.closes_at && p.closes_at <= ctx.now())) return err({ code: "CONFLICT", message: "This poll is closed." });
      if (!p.options.some((o) => o.id === optionId)) return err({ code: "VALIDATION", field: "option", message: "Pick one of the options." });
      ctx.commit((d) => {
        d.polls[pollId].votes[me] = optionId;
      });
      return ok(ctx.get().polls[pollId]);
    },

    async closePoll(pollId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const p = ctx.get().polls[pollId];
      if (!p) return err({ code: "NOT_FOUND" });
      if (p.created_by !== me && !isAdmin(ctx.get(), p.pod_id, me)) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        d.polls[pollId].status = "closed";
        d.polls[pollId].closes_at ??= ctx.now();
      });
      return ok(ctx.get().polls[pollId]);
    },

    async addMemory(podId, { caption, photoUrl = null, hangoutId = null }) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      if (!isMember(db, podId, me)) return err({ code: "FORBIDDEN" });
      const text = caption.trim();
      if (text.length > MEMORY_CAPTION_MAX) return err({ code: "VALIDATION", field: "caption", message: "Keep it to 200 characters." });
      if (photoUrl && (!PHOTO_RE.test(photoUrl) || photoUrl.length > 2_000_000)) return err({ code: "VALIDATION", field: "photo", message: "Use a JPG or PNG under 10 MB." });
      if (!text && !photoUrl) return err({ code: "VALIDATION", field: "caption", message: "Add a line or a photo." });
      if (hangoutId && db.hangouts[hangoutId]?.pod_id !== podId) return err({ code: "VALIDATION", field: "hangout", message: "Not this pod's hangout." });
      await ctx.latency();
      const m: Memory = { id: newId("mem"), pod_id: podId, hangout_id: hangoutId, user_id: me, caption: text, photo_url: photoUrl, created_at: ctx.now(), removed_at: null };
      ctx.commit((d) => {
        d.memories[m.id] = m;
      });
      return ok(m);
    },

    async removeMemory(memoryId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const m = ctx.get().memories[memoryId];
      if (!m || m.removed_at) return err({ code: "NOT_FOUND" });
      if (m.user_id !== me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        d.memories[memoryId].removed_at = ctx.now();
        d.memories[memoryId].photo_url = null; // nothing kept after removal
      });
      return ok(undefined);
    },

    async proposeHangout(podId, input) {
      const me = ctx.me();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      if (!isMember(db, podId, me.id)) return err({ code: "FORBIDDEN" });
      if (db.pods[podId]?.status !== "active") return err({ code: "FORBIDDEN", message: "This pod isn't open yet." });
      const title = input.title.trim().replace(/\s+/g, " ");
      if (!title || title.length > PROPOSAL_TITLE_MAX) return err({ code: "VALIDATION", field: "title", message: "Name it in 1 to 80 characters." });
      const start = Date.parse(input.starts_at);
      const now = Date.parse(ctx.now());
      if (Number.isNaN(start) || start < now + 2 * 3_600_000) return err({ code: "VALIDATION", field: "starts_at", message: "Pick a time at least 2 hours out." });
      if (start > now + 60 * 86_400_000) return err({ code: "VALIDATION", field: "starts_at", message: "Pick a time in the next 60 days." });
      const endsAt = input.ends_at ?? addMinutesISO(input.starts_at, 120);
      const span = Date.parse(endsAt) - start;
      if (!(span > 0 && span <= 6 * 3_600_000)) return err({ code: "VALIDATION", field: "ends_at", message: "Keep it under 6 hours." });
      const v = db.venues[input.venue_id];
      const budget = db.config.planner.budgetMax;
      if (!v?.active || !v.is_public || v.alcohol_centered || v.cost_per_person > budget)
        return err({ code: "VALIDATION", field: "venue_id", message: "Pick a public place from the list." });

      // Same round as an open, unlocked plan (it becomes an option to vote on), else a new round.
      const live = Object.values(db.suggestions).filter((s) => s.pod_id === podId && s.status !== "replaced");
      const topRound = live.reduce((r, s) => Math.max(r, s.round), 0);
      const current = live.filter((s) => s.round === topRound);
      const lockedTop = current.some((s) => s.status === "accepted");
      const round = !current.length || lockedTop ? topRound + 1 : topRound;
      const optionIndex = (round === topRound ? current.length : 0) as 0 | 1 | 2;
      if (optionIndex >= db.config.planner.maxOptions) return err({ code: "CONFLICT", message: "3 options max. Vote on these." });

      const who = displayName(me);
      const s: Omit<HangoutSuggestion, "id" | "created_at"> = {
        pod_id: podId, summary: title, venue_id: v.id, starts_at: input.starts_at, status: "suggested", source: "member", proposed_by: me.id,
        round, option_index: optionIndex, trace: [],
        plan_json: {
          event: title, starts_at: input.starts_at, ends_at: endsAt, venue_id: v.id,
          cost: v.cost_unconfirmed ? "Cost to confirm" : v.cost_per_person === 0 ? "Free" : `$${v.cost_per_person}`,
          bring: [], schedule: [{ time: input.starts_at.slice(11, 16), item: "Meet up" }],
          rain_plan: v.indoor ? "Indoors already, so rain won't cancel this one." : "If rain is likely, the pod picks a new time.",
          icebreaker: "", reason: `Proposed by ${who}`, summary: title, rain_venue_id: null,
        },
      };
      return hangouts.saveSuggestion(s);
    },

    async planStarters() {
      if (!ctx.meId()) return err({ code: "FORBIDDEN" });
      return ok(await ensureStarterPlans(ctx));
    },

    async requestPod(podId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      const pending = db.podRequests.find((r) => r.user_id === me && r.pod_id === podId && r.status === "pending");
      if (pending) return ok(pending);
      const v = joinVerdict(db, podId, me, ctx.now());
      if (v === "missing") return err({ code: "NOT_FOUND" });
      if (v === "already") return err({ code: "CONFLICT", message: "You're already in this pod." });
      if (v === "blocked") return err({ code: "BLOCKED" });
      if (v === "community") return err({ code: "FORBIDDEN", message: "Community pods come from your likes." });
      if (v === "closed") return err({ code: "FORBIDDEN", message: "This pod is archived." });
      if (v === "cap") return err({ code: "VALIDATION", field: "pods", message: `You're in ${db.config.placement.maxInterestPods} interest pods already.` });
      await ctx.latency();
      const now = ctx.now();
      const req: PodRequest = { id: newId("preq"), user_id: me, pod_id: podId, created_at: now, status: v === "join" ? "joined" : "waitlisted" };
      ctx.commit((d) => {
        d.podRequests.push(req);
        const pod = d.pods[podId];
        if (v === "join") {
          joinNow(d, podId, me, now, true);
          const queued = d.memberships.some((m) => m.pod_id === podId && m.user_id === me && !m.left_at && m.activation === "on_deck");
          notify(d, me, podId, "pod_request", pod.name, queued ? "Seat saved." : "You're in.", `/app/pods/${podId}`, now);
        } else if (!d.waitlist.some((w) => w.user_id === me && w.topic_key === pod.topic_key)) {
          d.waitlist.push({ user_id: me, pod_kind: pod.type, topic_key: pod.topic_key, reason: "under_min", created_at: now });
        }
      });
      if (v === "join") await ensureStarterPlans(ctx, [podId]);
      return ok(req);
    },

    async cancelPodRequest(requestId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const r = ctx.get().podRequests.find((x) => x.id === requestId);
      if (!r || r.user_id !== me) return err({ code: "NOT_FOUND" });
      if (r.status === "joined") return err({ code: "CONFLICT", message: "Leave the pod instead." });
      ctx.commit((d) => {
        const x = d.podRequests.find((y) => y.id === requestId)!;
        x.status = "cancelled";
        const topic = d.pods[x.pod_id]?.topic_key;
        d.waitlist = d.waitlist.filter((w) => !(w.user_id === me && w.topic_key === topic));
      });
      return ok(undefined);
    },

    async createInvite(podId = null) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (podId && !isMember(ctx.get(), podId, me)) return err({ code: "FORBIDDEN" });
      const existing = Object.values(ctx.get().invites).find((i) => i.inviter_id === me && i.pod_id === podId);
      if (existing) return ok(existing);
      const inv: Invite = { id: newId("inv"), code: nanoid(8).replace(/[-_]/g, "x"), inviter_id: me, pod_id: podId, created_at: ctx.now(), redeemed_by: [] };
      ctx.commit((d) => {
        d.invites[inv.id] = inv;
      });
      return ok(inv);
    },

    async redeemInvite(code) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      const inv = Object.values(db.invites).find((i) => i.code === code);
      if (!inv) return err({ code: "NOT_FOUND", message: "That link has expired." });
      if (inv.inviter_id === me) return ok({ invite: inv, joinedPodId: null });
      if (blockedBetween(db, me, inv.inviter_id)) return ok({ invite: inv, joinedPodId: null });
      const now = ctx.now();
      const canJoin = inv.pod_id ? joinVerdict(db, inv.pod_id, me, now) === "join" : false;
      ctx.commit((d) => {
        const x = d.invites[inv.id];
        if (!x.redeemed_by.includes(me)) x.redeemed_by.push(me);
        if (canJoin && inv.pod_id) joinNow(d, inv.pod_id, me, now);
      });
      if (canJoin && inv.pod_id) await ensureStarterPlans(ctx, [inv.pod_id]);
      return ok({ invite: ctx.get().invites[inv.id], joinedPodId: canJoin ? inv.pod_id : null });
    },

    async setTrustedContact(input) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (input === null) {
        ctx.commit((d) => {
          delete d.trustedContacts[me];
        });
        return ok(null);
      }
      const name = input.name.trim();
      const digits = input.phone.replace(/\D/g, "");
      if (!name || name.length > 40) return err({ code: "VALIDATION", field: "name", message: "Add their name." });
      if (digits.length < 10 || digits.length > 15) return err({ code: "VALIDATION", field: "phone", message: "Enter a full phone number." });
      const c = { user_id: me, name, phone: digits.length === 10 ? `+1${digits}` : `+${digits}`, updated_at: ctx.now() };
      ctx.commit((d) => {
        d.trustedContacts[me] = c;
      });
      return ok(c);
    },

    async markAllNotificationsRead() {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const now = ctx.now();
      let n = 0;
      ctx.commit((d) => {
        for (const x of d.notifications) if (x.user_id === me && !x.read_at) { x.read_at = now; n++; }
      });
      return ok(n);
    },
  };
}
