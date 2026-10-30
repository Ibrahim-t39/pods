// [U4] Hangouts: suggestions, RSVP, lock, check-in, run-it-back, vote (ARCHITECTURE §8.7, BLUEPRINT §6.3, §7, §8.1).
// The repo methods act as the signed-in member. The `apply*` draft helpers below are the same transactions for any
// user id, exported so the Director / crowd simulation (U11) can move simulated members through the exact same rules
// inside one ctx.commit / useStore commit (never re-implement them).
//
// Never-do list (§7.3): no public no-votes, no individual answers, no "X left", no number unless the pod is going again.
import type { Draft } from "immer";
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { newId } from "@/lib/ids";
import type { AppNotification, DbState, HangoutSuggestion, ID, NextHangoutVote, RunItBackAnswer, RunItBackTally, RsvpStatus } from "@/lib/types";
import { podMembers } from "@/lib/db/selectors";
import { displayName } from "@/lib/utils";
import { isFirstHangout, lockBounds, lockMinFor, lockRuleForPod } from "@/lib/planner/lock";
import { ribAgain, ribShouldReveal } from "@/lib/planner/run-it-back";

type D = Draft<DbState>;
const HOUR = 3_600_000;
const plusHours = (iso: string, h: number) => toOffsetISO(Date.parse(iso) + h * HOUR, iso);
/** Keep the offset style of the reference ISO (Chicago). */
function toOffsetISO(ms: number, ref: string): string {
  const off = /([+-]\d{2}):(\d{2})$/.exec(ref);
  const offMin = off ? (off[1].startsWith("-") ? -1 : 1) * (Math.abs(Number(off[1])) * 60 + Number(off[2])) : 0;
  const d = new Date(ms + offMin * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${off ? `${off[1]}:${off[2]}` : "Z"}`;
}

export function hostMessage(d: D, podId: ID, text: string, now: string, kind: "host" | "system" | "run_it_back" | "vote" | "plan_card" | "checkin_prompt" = "host", refId: ID | null = null) {
  (d.messages[podId] ??= []).push({
    id: newId("msg"), pod_id: podId, user_id: null, text, created_at: now, kind, ref_id: refId, client_id: null, pinned: false, delivery: "sent",
  });
}

/** D10: notifications say "Your community pod" for community pods. */
function podLabelForNotice(d: D, podId: ID): string {
  const p = d.pods[podId];
  return !p ? "Your pod" : p.type === "community" && d.config.flags.discreetCommunityNames ? "Your community pod" : p.name;
}

function notifyMembers(d: D, podId: ID, trigger: AppNotification["trigger"], title: string, body: string, href: string, now: string) {
  for (const m of podMembers(d as DbState, podId)) {
    d.notifications.push({ id: newId("ntf"), user_id: m.user_id, pod_id: podId, trigger, title, body, href, channels: ["inapp", "push"], created_at: now, read_at: null });
  }
}

const podSize = (d: D, podId: ID) => d.memberships.filter((m) => m.pod_id === podId && !m.left_at).length;
const goingOn = (d: D, targetId: ID) => d.rsvps.filter((r) => r.hangout_id === targetId && r.status === "going").length;

/** Lock transaction (ARCHITECTURE §8.7). Mutates the draft. Returns the new hangout id. */
export function lockSuggestion(d: D, s: Draft<HangoutSuggestion>, now: string): ID {
  const existing = Object.values(d.hangouts).find((h) => h.suggestion_id === s.id);
  if (existing) return existing.id;
  const hangoutId = newId("hang");
  const prior = Object.values(d.hangouts).filter((h) => h.pod_id === s.pod_id && h.status !== "cancelled").length;
  s.status = "accepted";
  d.hangouts[hangoutId] = {
    id: hangoutId, pod_id: s.pod_id, title: s.summary, starts_at: s.plan_json.starts_at, ends_at: s.plan_json.ends_at, venue_id: s.venue_id,
    plan_text: s.plan_json.event, is_starter: s.round === 1, suggestion_id: s.id, status: "upcoming", sequence: prior + 1,
  };
  for (const r of d.rsvps) if (r.hangout_id === s.id) r.hangout_id = hangoutId;
  // Other options in the round are replaced; their RSVPs are dropped (the vote already moved voters to the winner).
  for (const o of Object.values(d.suggestions)) {
    if (o.pod_id === s.pod_id && o.round === s.round && o.id !== s.id && (o.status === "suggested" || o.status === "pending_review")) {
      o.status = "replaced";
      d.rsvps = d.rsvps.filter((r) => r.hangout_id !== o.id);
    }
  }
  for (const v of Object.values(d.votes)) if (v.status === "open" && v.option_ids.includes(s.id)) { v.status = "closed"; v.winner_id = s.id; }
  const going = goingOn(d, hangoutId);
  const size = podSize(d, s.pod_id);
  hostMessage(d, s.pod_id, `Plan locked: ${going} of ${size} in`, now, "system", hangoutId);
  hostMessage(
    d, s.pod_id,
    // count-free: the live count moves after this line is posted, so the line never states one
    s.round >= 2 ? `Round two. Locked. See you ${shortWhen(s.plan_json.starts_at)}. We'll remind everyone the day before and 2 hours before.` : "It's on. We'll remind everyone the day before and 2 hours before.",
    now, "host", hangoutId,
  );
  notifyMembers(d, s.pod_id, "plan_locked", podLabelForNotice(d, s.pod_id), s.round >= 2 ? "Round two is locked." : `It's on: ${going} people are in.`, `/app/pods/${s.pod_id}`, now);
  // Everyone sees the new plan card again (edge case 14).
  for (const m of d.memberships) if (m.pod_id === s.pod_id) { m.card_dismissed = false; m.card_dismissed_for = null; }
  return hangoutId;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function shortWhen(iso: string): string {
  const [y, m, dd] = iso.slice(0, 10).split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
  const h = Number(iso.slice(11, 13));
  return `${DOW[wd]} ${((h + 11) % 12) + 1}:${iso.slice(14, 16)} ${h < 12 ? "AM" : "PM"}`;
}

// ── Transactions for any user (exported for the Director / crowd) ────
export function applyRsvp(d: D, targetId: ID, userId: ID, status: RsvpStatus, now: string): { goingCount: number; locked: boolean } {
  const hang = d.hangouts[targetId];
  const existing = d.rsvps.find((r) => r.hangout_id === targetId && r.user_id === userId);
  if (existing) existing.status = status; // a set, not a toggle
  else d.rsvps.push({ hangout_id: targetId, user_id: userId, status, checked_in: false, checked_in_at: null });
  const s = d.suggestions[targetId];
  // In an open vote, an RSVP to an option is also that member's vote.
  const vote = s && Object.values(d.votes).find((v) => v.status === "open" && v.option_ids.includes(s.id));
  if (vote && status === "going") return applyVote(d, vote.id, userId, s.id, now);
  if (vote && status === "not_going" && vote.votes[userId] === s.id) delete vote.votes[userId];
  let locked = !!hang;
  if (s && s.status === "suggested" && goingOn(d, targetId) >= lockMinFor(d, s)) {
    const hid = lockSuggestion(d, s, now);
    return { goingCount: goingOn(d, hid), locked: true };
  }
  if (s?.status === "accepted") locked = true;
  return { goingCount: goingOn(d, targetId), locked };
}

/** Check-in (BLUEPRINT §7.1): from the start time to 48h after the end. First two check-ins become admins (D8); the
 *  first check-in anywhere opens on-deck pods (D4). */
export function applyCheckIn(d: D, hangoutId: ID, userId: ID, now: string): boolean {
  const h = d.hangouts[hangoutId];
  if (!h) return false;
  if (Date.parse(now) >= Date.parse(h.ends_at) && h.status === "upcoming") h.status = "done";
  let r = d.rsvps.find((x) => x.hangout_id === hangoutId && x.user_id === userId);
  if (!r) {
    d.rsvps.push({ hangout_id: hangoutId, user_id: userId, status: "going", checked_in: false, checked_in_at: null });
    r = d.rsvps[d.rsvps.length - 1];
  }
  if (r.checked_in) return false;
  const firstAnywhere = !d.rsvps.some((x) => x.user_id === userId && x.checked_in);
  r.checked_in = true;
  r.checked_in_at = now;
  r.status = "going";
  const admins = d.memberships.filter((m) => m.pod_id === h.pod_id && !m.left_at && m.role === "admin").length;
  if (d.config.flags.adminSelection === "first_two_checkins" && admins < 2) {
    const m = d.memberships.find((x) => x.pod_id === h.pod_id && x.user_id === userId && !x.left_at);
    if (m) m.role = "admin";
  }
  if (firstAnywhere) {
    for (const m of d.memberships) {
      if (m.user_id === userId && !m.left_at && m.activation === "on_deck") {
        m.activation = "active";
        if (userId === d.me) {
          const p = d.pods[m.pod_id];
          d.notifications.push({
            id: newId("ntf"), user_id: userId, pod_id: m.pod_id, trigger: "placed", title: podLabelForNotice(d, m.pod_id),
            body: `${p?.type === "community" ? "Your community pod" : (p?.name ?? "A pod")} is open now.`, href: `/app/pods/${m.pod_id}`,
            channels: ["inapp", "push"], created_at: now, read_at: null,
          });
        }
      }
    }
  }
  return true;
}

export function runItBackTally(db: DbState, hangoutId: ID): RunItBackTally {
  const rib = db.runItBack[hangoutId];
  const answers = Object.values(rib?.responses ?? {});
  return {
    yes: answers.filter((a) => a === "yes").length,
    answered: answers.length,
    checkedIn: db.rsvps.filter((r) => r.hangout_id === hangoutId && r.checked_in).length,
    revealed: !!rib?.revealed_at,
  };
}

/** Reveal (lib/planner/run-it-back): once Yes ≥ max(floor, majority of who answered), or once everyone who checked in
 *  has answered. A number only when the pod is going again; otherwise "Not this round". `force` reveals now. */
export function revealRunItBack(d: D, hangoutId: ID, now: string, force = false): boolean {
  const rib = (d.runItBack[hangoutId] ??= { hangout_id: hangoutId, responses: {}, revealed_at: null });
  if (rib.revealed_at) return false;
  const t = runItBackTally(d as DbState, hangoutId);
  const floor = d.config.planner.runItBackRevealMin;
  if (!force && !ribShouldReveal(t, floor)) return false;
  const h = d.hangouts[hangoutId];
  if (!h) return false;
  rib.revealed_at = now;
  const again = ribAgain(t.yes, t.answered, floor);
  hostMessage(d, h.pod_id, again ? `${t.yes} of ${t.answered} want to run it back.` : "Not this round. The pod stays.", now, "run_it_back", hangoutId);
  if (again) notifyMembers(d, h.pod_id, "run_it_back_reveal", podLabelForNotice(d, h.pod_id), "Your pod wants to run it back. Pick the next one.", `/app/pods/${h.pod_id}`, now);
  return true;
}

export function applyRunItBack(d: D, hangoutId: ID, userId: ID, value: RunItBackAnswer, now: string): RunItBackTally {
  const rib = (d.runItBack[hangoutId] ??= { hangout_id: hangoutId, responses: {}, revealed_at: null });
  rib.responses[userId] = value;
  revealRunItBack(d, hangoutId, now);
  return runItBackTally(d as DbState, hangoutId);
}

/** Fill a plan's lock number when it was saved without one (member proposals, old callers). */
export function ensureLock(d: D, s: Draft<HangoutSuggestion>) {
  if (typeof s.min_to_lock === "number") return;
  const v = d.venues[s.venue_id];
  const r = lockRuleForPod(d as DbState, s.pod_id, `${s.summary} ${s.plan_json?.event ?? ""}`, v ?? null, s.summary);
  s.min_to_lock = r.min_to_lock;
  s.lock_reason = r.lock_reason;
  if (r.max_seats) s.max_seats = r.max_seats;
}

/** The pod nudges a plan's lock number (− / +). Bounded to 2..pod size and never below who's already in. If the
 *  new number is already met, the plan locks now. Posts one quiet system line. */
export function applyLockMin(d: D, suggestionId: ID, userId: ID, n: number, now: string): { min: number; locked: boolean } | null {
  const s = d.suggestions[suggestionId];
  if (!s || (s.status !== "suggested" && s.status !== "pending_review")) return null;
  const going = goingOn(d, s.id);
  const b = lockBounds(podSize(d, s.pod_id), going, s.max_seats, isFirstHangout(d as DbState, s.pod_id));
  const next = Math.max(b.min, Math.min(b.max, Math.round(n)));
  if (next === lockMinFor(d, s)) return { min: next, locked: false };
  // Keep the AI's pick visible once the pod has nudged it ("Set by the pod · AI picked 4").
  const ai = /AI picked (\d+)/.exec(s.lock_reason ?? "")?.[1] ?? String(lockMinFor(d, s));
  s.min_to_lock = next;
  s.lock_reason = `Set by the pod · AI picked ${ai}`;
  const u = d.users[userId];
  const who = u ? displayName(u) : "Someone";
  hostMessage(d, s.pod_id, `${who} changed it to lock at ${next}`, now, "system", s.id);
  if (s.status === "suggested" && going >= next) {
    lockSuggestion(d, s, now);
    return { min: next, locked: true };
  }
  return { min: next, locked: false };
}

/** Close a vote: first to the threshold wins; at close, most votes wins, ties go to the earliest start; no votes → the
 *  default (option 0), and the host says so. */
export function closeVote(d: D, voteId: ID, now: string): ID | null {
  const v = d.votes[voteId];
  if (!v || v.status !== "open") return v?.winner_id ?? null;
  const counts = new Map<ID, number>(v.option_ids.map((id) => [id, 0]));
  for (const sid of Object.values(v.votes)) counts.set(sid, (counts.get(sid) ?? 0) + 1);
  const opts = v.option_ids.map((id) => d.suggestions[id]).filter(Boolean);
  if (!opts.length) return null;
  const max = Math.max(...opts.map((o) => counts.get(o.id) ?? 0));
  const top = opts.filter((o) => (counts.get(o.id) ?? 0) === max).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.option_index - b.option_index);
  const winner = max === 0 ? (opts.find((o) => o.option_index === 0) ?? top[0]) : top[0];
  if (max === 0) hostMessage(d, v.pod_id, "Nobody picked yet, so we're going with the first option. You can still tap I'm in.", now, "host", v.id);
  else if (top.length > 1) hostMessage(d, v.pod_id, "Tie. Going with the earliest.", now, "host", v.id);
  moveVotersToWinner(d, v, winner.id);
  lockSuggestion(d, winner, now);
  v.status = "closed";
  v.winner_id = winner.id;
  return winner.id;
}

function moveVotersToWinner(d: D, v: Draft<NextHangoutVote>, winnerId: ID) {
  for (const [uid, sid] of Object.entries(v.votes)) {
    if (sid !== winnerId) continue;
    const r = d.rsvps.find((x) => x.hangout_id === winnerId && x.user_id === uid);
    if (r) r.status = "going";
    else d.rsvps.push({ hangout_id: winnerId, user_id: uid, status: "going", checked_in: false, checked_in_at: null });
  }
}

export function applyVote(d: D, voteId: ID, userId: ID, suggestionId: ID, now: string): { goingCount: number; locked: boolean } {
  const v = d.votes[voteId];
  if (!v) return { goingCount: 0, locked: false };
  if (v.status === "open" && Date.parse(now) >= Date.parse(v.closes_at)) closeVote(d, voteId, now);
  if (v.status !== "open") {
    const w = v.winner_id ? Object.values(d.hangouts).find((h) => h.suggestion_id === v.winner_id) : undefined;
    return { goingCount: w ? goingOn(d, w.id) : 0, locked: true };
  }
  v.votes[userId] = suggestionId;
  const count = Object.values(v.votes).filter((x) => x === suggestionId).length;
  if (count >= lockMinFor(d, d.suggestions[suggestionId])) {
    moveVotersToWinner(d, v, suggestionId);
    const hid = lockSuggestion(d, d.suggestions[suggestionId], now);
    v.status = "closed";
    v.winner_id = suggestionId;
    return { goingCount: goingOn(d, hid), locked: true };
  }
  return { goingCount: count, locked: false };
}

/** Lazily close votes past their window (call from the Director's clock jump, or any repo write). */
export function closeExpiredVotes(d: D, now: string) {
  for (const v of Object.values(d.votes)) if (v.status === "open" && Date.parse(now) >= Date.parse(v.closes_at)) closeVote(d, v.id, now);
}

/** Attach a new option to the round's vote (create the vote when the round reaches 2 options). */
function attachToVote(d: D, s: HangoutSuggestion, now: string) {
  const round = Object.values(d.suggestions).filter((o) => o.pod_id === s.pod_id && o.round === s.round && o.status === "suggested");
  if (round.length < 2) return;
  let v = Object.values(d.votes).find((x) => x.pod_id === s.pod_id && x.status === "open");
  const prevHangout = Object.values(d.hangouts).filter((h) => h.pod_id === s.pod_id && h.status !== "cancelled").sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
  if (!v) {
    const id = newId("vote");
    d.votes[id] = {
      id, pod_id: s.pod_id, after_hangout_id: prevHangout?.id ?? "none", option_ids: round.sort((a, b) => a.option_index - b.option_index).map((o) => o.id),
      votes: {}, closes_at: plusHours(now, 24), status: "open", winner_id: null,
    };
    v = d.votes[id];
    // Members already in for an option keep their place: their RSVP counts as a vote for it.
    for (const o of round) for (const r of d.rsvps) if (r.hangout_id === o.id && r.status === "going") v.votes[r.user_id] = o.id;
    hostMessage(d, s.pod_id, s.round >= 2 ? "Pick the next one. First to 4 votes wins." : "Two options now. Pick one: first to 4 wins.", now, "vote", id);
    if (s.round >= 2) notifyMembers(d, s.pod_id, "next_scheduled", podLabelForNotice(d, s.pod_id), "Pick the next one.", `/app/pods/${s.pod_id}`, now);
  } else if (!v.option_ids.includes(s.id)) v.option_ids.push(s.id);
}

export function hangoutsRepo(
  ctx: RepoCtx,
): RepoPart<"saveSuggestion" | "dismissCard" | "undismissCard" | "rsvp" | "setLockMin" | "approveSuggestion" | "checkIn" | "castRunItBack" | "voteNextOption"> {
  const memberOf = (podId: ID, userId: ID) => podMembers(ctx.get(), podId).some((m) => m.user_id === userId);

  return {
    async saveSuggestion(input) {
      await ctx.latency();
      const db = ctx.get();
      if (!db.pods[input.pod_id]) return err({ code: "NOT_FOUND" });
      if (!db.venues[input.venue_id]?.active) return err({ code: "VALIDATION", field: "venue_id", message: "Venue is not on the checked list" });
      if (input.option_index >= db.config.planner.maxOptions) return err({ code: "CONFLICT", message: "3 options max · vote on these" });
      // Idempotent per (pod, round, option): a second tab or a retry returns the existing option.
      const dupe = Object.values(db.suggestions).find(
        (s) => s.pod_id === input.pod_id && s.round === input.round && s.option_index === input.option_index && s.status !== "replaced",
      );
      if (dupe) return ok(dupe);
      const now = ctx.now();
      const s: HangoutSuggestion = { ...input, id: newId("sug"), created_at: now };
      if (db.config.planner.adminReview && s.source !== "admin") s.status = "pending_review";
      ctx.commit((d) => {
        d.suggestions[s.id] = s;
        ensureLock(d, d.suggestions[s.id]);
        for (const m of d.memberships) if (m.pod_id === s.pod_id) { m.card_dismissed = false; m.card_dismissed_for = null; }
        if (s.option_index === 0) hostMessage(d, s.pod_id, s.summary, now, "plan_card", s.id);
        if (s.status === "suggested") attachToVote(d, s, now);
      });
      return ok(ctx.get().suggestions[s.id]);
    },

    async dismissCard(podId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      if (!memberOf(podId, me)) return err({ code: "FORBIDDEN" });
      const active = Object.values(ctx.get().suggestions)
        .filter((s) => s.pod_id === podId && s.status !== "replaced")
        .sort((a, b) => b.round - a.round || a.option_index - b.option_index)[0];
      ctx.commit((d) => {
        const m = d.memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
        if (m) { m.card_dismissed = true; m.card_dismissed_for = active?.id ?? null; }
      });
      return ok(undefined);
    },

    async undismissCard(podId) {
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      ctx.commit((d) => {
        const m = d.memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
        if (m) { m.card_dismissed = false; m.card_dismissed_for = null; }
      });
      return ok(undefined);
    },

    async rsvp(targetId, status) {
      await ctx.latency();
      const me = ctx.me();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      const sug = db.suggestions[targetId];
      const hang = db.hangouts[targetId];
      const podId = sug?.pod_id ?? hang?.pod_id;
      if (!podId) return err({ code: "NOT_FOUND" });
      if (!memberOf(podId, me.id)) return err({ code: "FORBIDDEN" });
      if (!me.verified) return err({ code: "NOT_VERIFIED" });
      if (sug?.status === "replaced") return err({ code: "CONFLICT", message: "Replaced by a newer plan" });
      if (sug?.status === "pending_review") return err({ code: "CONFLICT", message: "Your pod's plan is being finalized" });
      if (hang && (hang.status === "cancelled" || (hang.status === "done" && status === "going"))) return err({ code: "CONFLICT" });
      // "I couldn't make it" after the hangout is private and only stops the check-in prompt.
      // An accepted suggestion's RSVPs live on its hangout.
      const target = sug?.status === "accepted" ? (Object.values(db.hangouts).find((h) => h.suggestion_id === sug.id)?.id ?? targetId) : targetId;
      const now = ctx.now();
      let out = { goingCount: 0, locked: false };
      ctx.commit((d) => { out = applyRsvp(d, target, me.id, status, now); });
      return ok(out);
    },

    async setLockMin(suggestionId, n) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const s = ctx.get().suggestions[suggestionId];
      if (!s) return err({ code: "NOT_FOUND" });
      if (!memberOf(s.pod_id, me)) return err({ code: "FORBIDDEN" });
      if (s.status !== "suggested" && s.status !== "pending_review") return err({ code: "CONFLICT", message: "This plan is already locked" });
      const now = ctx.now();
      let out: { min: number; locked: boolean } | null = null;
      ctx.commit((d) => { out = applyLockMin(d, suggestionId, me, n, now); });
      return out ? ok(out) : err({ code: "CONFLICT" });
    },

    async approveSuggestion(id, edits) {
      await ctx.latency();
      const s0 = ctx.get().suggestions[id];
      if (!s0) return err({ code: "NOT_FOUND" });
      if (edits?.venue_id && !ctx.get().venues[edits.venue_id]?.active) return err({ code: "VALIDATION", field: "venue_id", message: "Venue is not on the checked list" });
      const now = ctx.now();
      ctx.commit((d) => {
        const s = d.suggestions[id];
        if (edits) {
          Object.assign(s.plan_json, edits);
          if (edits.venue_id) s.venue_id = edits.venue_id;
          if (edits.starts_at) s.starts_at = edits.starts_at;
          if (edits.summary) s.summary = edits.summary;
        }
        s.status = "suggested";
        for (const m of d.memberships) if (m.pod_id === s.pod_id) { m.card_dismissed = false; m.card_dismissed_for = null; }
        attachToVote(d, s, now);
      });
      return ok(ctx.get().suggestions[id]);
    },

    async checkIn(hangoutId) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const h = ctx.get().hangouts[hangoutId];
      if (!h) return err({ code: "NOT_FOUND" });
      if (!memberOf(h.pod_id, me)) return err({ code: "FORBIDDEN" });
      const now = ctx.now();
      if (Date.parse(now) < Date.parse(h.starts_at)) return err({ code: "VALIDATION", field: "time", message: "Check-in opens when the hangout starts" });
      if (Date.parse(now) > Date.parse(h.ends_at) + 48 * HOUR) return err({ code: "VALIDATION", field: "time", message: "Check-in closed" });
      ctx.commit((d) => { applyCheckIn(d, hangoutId, me, now); });
      return ok(ctx.get().rsvps.find((x) => x.hangout_id === hangoutId && x.user_id === me)!);
    },

    async castRunItBack(hangoutId, value) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const db = ctx.get();
      if (!db.hangouts[hangoutId]) return err({ code: "NOT_FOUND" });
      // Private ballot is for people who went.
      if (!db.rsvps.some((r) => r.hangout_id === hangoutId && r.user_id === me && r.checked_in)) return err({ code: "FORBIDDEN", message: "Check in first" });
      const now = ctx.now();
      let tally: RunItBackTally = { yes: 0, answered: 0, checkedIn: 0, revealed: false };
      ctx.commit((d) => { tally = applyRunItBack(d, hangoutId, me, value, now); });
      return ok(tally);
    },

    async voteNextOption(voteId, suggestionId) {
      await ctx.latency();
      const me = ctx.meId();
      if (!me) return err({ code: "FORBIDDEN" });
      const vote = ctx.get().votes[voteId];
      if (!vote || !vote.option_ids.includes(suggestionId)) return err({ code: "NOT_FOUND" });
      if (!memberOf(vote.pod_id, me)) return err({ code: "FORBIDDEN" });
      const now = ctx.now();
      ctx.commit((d) => { applyVote(d, voteId, me, suggestionId, now); });
      return ok(ctx.get().votes[voteId]);
    },
  };
}
