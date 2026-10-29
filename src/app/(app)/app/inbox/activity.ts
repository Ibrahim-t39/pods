// The Inbox's view model: every stored notification plus what the person's pods are doing right now (a plan waiting on
// them, new messages, an open poll or vote, a check-in, a new pod), each with the one action that settles it.
// Pure over DbState + the clock so Demo and Live behave the same. Ids are stable ("d:<kind>:<ref>") so read state sticks.
import { buildInbox, COMMUNITY_LABEL, maskText, podLabel, type InboxItem } from "@/lib/notifications/rules";
import { cardView, optionLabel } from "@/lib/planner/card-state";
import { chicagoDaysBetween } from "@/lib/time/tz";
import type { DbState, ID } from "@/lib/types";
import { shortDay, shortTime } from "@/components/pods/model";
import { listFormat } from "@/lib/platform/needs-you";
import { lockCopy } from "@/lib/planner/lock";

export type Kind = "plans" | "messages" | "pods";

export type Act =
  | { type: "rsvp"; targetId: ID; going: number; size: number; imIn: boolean; imOut: boolean }
  | { type: "poll"; pollId: ID; options: { id: ID; label: string; count: number }[]; mine: ID | null; total: number }
  | { type: "vote"; voteId: ID; options: { id: ID; label: string; count: number }[]; mine: ID | null; total: number }
  | { type: "reply"; podId: ID; messageId: ID | null; count: number }
  | { type: "checkin"; hangoutId: ID; done: boolean }
  | { type: "ballot"; hangoutId: ID; mine: string | null }
  | { type: "join"; matchId: ID; status: "new" | "joined" | "skipped" };

export interface Activity extends InboxItem {
  kind: Kind;
  /** the person who did it (messages, polls); null = the pod or Pods itself */
  who: { id: ID; name: string } | null;
  /** the pod's display name (masked for discreet community pods) */
  podName: string | null;
  act: Act | null;
  /** one plain line on why it matters right now (Needs you cards only) */
  why?: string;
  /** stored notifications folded into this one row (activation updates): marking it read marks them all */
  ids?: string[];
}

/** Plan-level things only you can settle: they sit on top in "Needs you" until answered. */
export function needsYou(n: Activity): boolean {
  const a = n.act;
  if (!a) return false;
  if (a.type === "rsvp") return !a.imIn && !a.imOut;
  if (a.type === "vote" || a.type === "ballot") return !a.mine;
  if (a.type === "checkin") return !a.done;
  if (a.type === "join") return a.status === "new";
  if (a.type === "poll") return !a.mine;
  return false;
}

/** The answers Home counts as "need you" (one per pod): I'm in, the next-hangout vote, a check-in, meet again.
 *  Chat polls and new-pod offers are optional and never counted. */
export function counted(n: Activity): boolean {
  const t = n.act?.type;
  return needsYou(n) && (t === "rsvp" || t === "vote" || t === "checkin" || t === "ballot");
}

export type Section = "Needs you" | "Today" | "Yesterday" | "This week" | "Earlier";

export function sectionOf(iso: string, now: Date): Section {
  const d = chicagoDaysBetween(iso, now);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 7 ? "This week" : "Earlier";
}

const WINDOW_MS = 5 * 86_400_000;

export function buildActivity(db: DbState, now: Date, seen: Set<string>, discreet: boolean): Activity[] {
  const me = db.me;
  if (!me) return [];
  const nowMs = now.getTime();
  const nowISO = now.toISOString();
  const out: Activity[] = [];
  const name = (podId: ID | null) => (podId && db.pods[podId] ? podLabel(db.pods[podId], discreet) : null);
  const first = (id: ID) => db.users[id]?.first_name ?? "Someone";
  const mine = db.memberships.filter((m) => m.user_id === me && !m.left_at);
  const myPods = new Set(mine.map((m) => m.pod_id));
  // An on-deck pod's chat is quiet until it opens: no previews, no unread counts, no polls.
  const openPods = new Set(mine.filter((m) => m.activation !== "on_deck").map((m) => m.pod_id));

  // ── plans: one per pod, from the card's state machine ───────────────────────────
  for (const m of mine) {
    const v = cardView(db, m.pod_id, nowMs);
    if (!v) continue;
    const pod = db.pods[m.pod_id];
    const label = podLabel(pod, discreet);
    const s = v.suggestion;
    if (s && !v.locked && s.status === "suggested" && v.phase !== "vote" && m.activation === "active") {
      const id = `d:ready:${s.id}`;
      const venue = db.venues[s.venue_id]?.name;
      out.push({
        id, kind: "plans", trigger: "plan_locked", stored: false, podId: m.pod_id, podName: label, who: null,
        title: v.imIn ? `You're in for ${maskText(s.summary, pod, discreet)}` : `Are you in for ${shortDay(s.plan_json.starts_at, nowMs)}?`,
        body: `${maskText(s.summary, pod, discreet)} · ${shortDay(s.plan_json.starts_at, nowMs)} ${shortTime(s.plan_json.starts_at)}${venue && !s.summary.includes(venue) ? ` · ${venue}` : ""}`,
        href: `/app/pods/${m.pod_id}`, created_at: s.created_at, read: seen.has(id),
        act: { type: "rsvp", targetId: s.id, going: v.going.length, size: v.size, imIn: v.imIn, imOut: v.imOut },
        why: v.going.length >= v.threshold ? `${v.going.length} of ${v.size} are in.` : `${v.going.length} of ${v.size} are in. ${lockCopy(v.threshold - v.going.length)}, so your answer counts.`,
      });
    }
    if (v.phase === "vote" && v.vote) {
      const id = `d:vote:${v.vote.id}`;
      const counts = Object.values(v.vote.votes);
      const after = v.lastHangout?.ends_at ?? v.vote.closes_at;
      out.push({
        id, kind: "plans", trigger: "next_scheduled", stored: false, podId: m.pod_id, podName: label, who: null,
        title: "Pick the next hangout",
        body: `${counts.length} of ${v.size} voted · closes ${shortDay(v.vote.closes_at, nowMs)} ${shortTime(v.vote.closes_at)}`,
        why: "The AI plans whichever option gets the most votes.",
        href: `/app/pods/${m.pod_id}`, created_at: after < nowISO ? after : nowISO, read: seen.has(id),
        act: {
          type: "vote", voteId: v.vote.id, mine: v.myVote, total: counts.length,
          options: v.options.map((o) => ({ id: o.id, label: `${optionLabel(o, pod.topic ?? "")} · ${shortDay(o.plan_json.starts_at, nowMs)} ${shortTime(o.plan_json.starts_at)}`, count: counts.filter((c) => c === o.id).length })),
        },
      });
    }
    const h = v.lastHangout;
    if (h && (v.phase === "check_in" || v.phase === "happening_now") && v.imIn) {
      const id = `d:checkin:${h.id}`;
      out.push({
        id, kind: "plans", trigger: "checkin", stored: false, podId: m.pod_id, podName: label, who: null,
        title: v.checkedIn ? `You checked in at ${maskText(h.title, pod, discreet)}` : `Made it to ${maskText(h.title, pod, discreet)}?`,
        body: v.checkedIn ? label : `${shortDay(h.starts_at, nowMs)} ${shortTime(h.starts_at)}`,
        why: "Check in so the pod knows you're there.",
        href: `/app/pods/${m.pod_id}`, created_at: h.starts_at < nowISO ? h.starts_at : nowISO, read: seen.has(id) || v.checkedIn,
        act: { type: "checkin", hangoutId: h.id, done: v.checkedIn },
      });
    }
    if (h && v.phase === "ballot") {
      const id = `d:ballot:${h.id}`;
      out.push({
        id, kind: "plans", trigger: "run_it_back_reveal", stored: false, podId: m.pod_id, podName: label, who: null,
        title: `Meet ${label} again?`,
        body: maskText(h.title, pod, discreet),
        why: "Your answer stays private. Only the total is shared.",
        href: `/app/pods/${m.pod_id}`, created_at: h.ends_at < nowISO ? h.ends_at : nowISO, read: seen.has(id),
        act: { type: "ballot", hangoutId: h.id, mine: v.myBallot },
      });
    }
  }

  // ── messages: the newest line from someone else per pod, with how many more came in ────
  for (const podId of openPods) {
    const pod = db.pods[podId];
    const recent = (db.messages[podId] ?? []).filter((x) => x.kind === "text" && x.user_id && x.user_id !== me && nowMs - Date.parse(x.created_at) < WINDOW_MS && x.created_at <= nowISO);
    const last = recent[recent.length - 1];
    if (!last?.user_id) continue;
    const id = `d:msg:${last.id}`;
    const more = recent.length - 1;
    out.push({
      id, kind: "messages", trigger: "chat_batch", stored: false, podId, podName: podLabel(pod, discreet), who: { id: last.user_id, name: first(last.user_id) },
      title: `${first(last.user_id)} in ${podLabel(pod, discreet)}`,
      body: maskText(last.text, pod, discreet),
      href: `/app/pods/${podId}/chat`, created_at: last.created_at, read: seen.has(id),
      act: { type: "reply", podId, messageId: last.id, count: more + 1 },
    });
  }

  // ── polls: open ones you haven't settled ────────────────────────────────────────
  const pollsShown = new Set<string>();
  for (const p of Object.values(db.polls ?? {})) {
    if (!openPods.has(p.pod_id) || p.status !== "open" || p.created_by === me || p.created_at > nowISO) continue;
    const pod = db.pods[p.pod_id];
    const id = `d:poll:${p.id}`;
    const votes = Object.values(p.votes);
    pollsShown.add(`${p.pod_id}|${p.question}`);
    out.push({
      id, kind: "messages", trigger: "poll_opened", stored: false, podId: p.pod_id, podName: podLabel(pod, discreet), who: { id: p.created_by, name: first(p.created_by) },
      title: maskText(p.question, pod, discreet),
      body: `${first(p.created_by)} asked · ${votes.length} voted`,
      href: `/app/pods/${p.pod_id}/chat`, created_at: p.created_at, read: seen.has(id) || !!p.votes[me],
      act: { type: "poll", pollId: p.id, mine: p.votes[me] ?? null, total: votes.length, options: p.options.map((o) => ({ ...o, count: votes.filter((v) => v === o.id).length })) },
    });
  }

  // ── stored notifications + the derived basics (placed, locked, reports) ─────────────
  const readyPods = new Set(out.filter((a) => a.act?.type === "rsvp").map((a) => a.podId));
  const inbox = buildInbox(db, nowISO, seen, discreet);
  const lockedPods = new Set(inbox.filter((n) => n.id.startsWith("d:locked:")).map((n) => n.podId));
  // Pods that opened later (after your first hangout) each wrote a stored "placed" line; they fold into one update per
  // moment, and the "You're in N pods" update keeps saying what was open when you were placed.
  const activations = inbox.filter((n) => n.stored && n.trigger === "placed" && n.podId);
  const openedLater = new Set(activations.map((n) => n.podId));
  const byMoment = new Map<string, InboxItem[]>();
  for (const n of activations) {
    const k = n.created_at.slice(0, 16);
    byMoment.set(k, [...(byMoment.get(k) ?? []), n]);
  }
  for (const group of byMoment.values()) {
    const pods = [...new Set(group.map((n) => n.podId as ID))];
    const names = pods.map((id) => (db.pods[id] ? podLabel(db.pods[id], discreet) : "A pod"));
    out.push({
      ...group[0], kind: "pods", podId: pods.length === 1 ? pods[0] : null, podName: pods.length === 1 ? names[0] : null, who: null, act: null,
      title: `${listFormat(names)} ${pods.length === 1 ? "is" : "are"} open now.`, body: "", href: pods.length === 1 ? `/app/pods/${pods[0]}` : "/app/pods",
      read: group.every((n) => n.read), ids: group.map((n) => n.id),
    });
  }
  for (const n of inbox) {
    if (n.stored && n.trigger === "placed" && n.podId) continue;
    // the stored "It's on" line repeats the derived locked item for the same pod
    if (n.stored && n.trigger === "plan_locked" && n.podId && lockedPods.has(n.podId)) continue;
    if (n.id.startsWith("d:locked:") && n.podId && !readyPods.has(n.podId)) {
      const h = db.hangouts[n.id.slice("d:locked:".length)];
      if (h) {
        const going = db.rsvps.filter((r) => r.hangout_id === h.id && r.status === "going").length;
        const label = podLabel(db.pods[n.podId], discreet);
        out.push({ ...n, kind: "plans", podName: label, who: null, act: null, title: `${maskText(h.title, db.pods[n.podId], discreet)} is on`, body: `${shortDay(h.starts_at, nowMs)} ${shortTime(h.starts_at)} · ${going} going · the plan is locked` });
        continue;
      }
    }
    if (n.trigger === "poll_opened" && n.podId && pollsShown.has(`${n.podId}|${db.pods[n.podId] ? n.body : ""}`)) continue;
    if (n.id.startsWith("d:locked:") && n.podId && readyPods.has(n.podId)) continue;
    // Stored lines were written with the lock-screen label; in the app the pod keeps its real name (unless masked in-app).
    const cpod = n.podId ? db.pods[n.podId] : undefined;
    if (!discreet && cpod?.type === "community") {
      const fix = (t: string) => t.split(COMMUNITY_LABEL).join(cpod.name).split("your community pod").join(cpod.name);
      n.title = fix(n.title);
      n.body = fix(n.body);
    }
    const base = { ...n, podName: name(n.podId), who: null as Activity["who"], act: null as Act | null };
    if (n.trigger === "placed" && !n.stored) {
      const open = mine.filter((m) => m.activation === "active" && !openedLater.has(m.pod_id)).map((m) => podLabel(db.pods[m.pod_id], discreet));
      const later = mine.length - open.length;
      out.push({ ...base, kind: "pods", title: `You're in ${mine.length} pods`, body: `${listFormat(open)} ${open.length === 1 ? "is" : "are"} open${later ? `. ${later} more open after your first hangout` : ""}.` });
      continue;
    }
    if (n.trigger === "pod_request" && (n.body.trim() === "You're in." || n.body.trim() === "Seat saved.")) {
      const saved = n.body.trim() === "Seat saved.";
      out.push({ ...base, kind: "pods", title: saved ? `You saved a seat in ${base.podName ?? n.title}.` : `You joined ${base.podName ?? n.title}.`, body: saved ? "It opens after your first hangout." : "" });
      continue;
    }
    if (n.trigger === "new_match") {
      const matchId = n.href.split("match=")[1];
      const match = (db.podMatches ?? []).find((x) => x.id === matchId);
      out.push({ ...base, kind: "pods", act: match ? { type: "join", matchId: match.id, status: match.status } : null, why: "Joining is free. You can leave any time." });
      continue;
    }
    if (n.trigger === "reply" || n.trigger === "chat_batch") {
      out.push({ ...base, kind: "messages", title: n.trigger === "reply" ? `Someone answered you in ${base.podName ?? "your pod"}` : n.title, act: n.podId ? { type: "reply", podId: n.podId, messageId: null, count: 0 } : null });
      continue;
    }
    const kind: Kind = n.trigger === "poll_opened" ? "messages" : ["placed", "pod_request", "report_update"].includes(n.trigger) ? "pods" : "plans";
    out.push({ ...base, kind });
  }

  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
