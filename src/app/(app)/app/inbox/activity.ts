// The Inbox's view model: every stored notification plus what the person's pods are doing right now (a plan waiting on
// them, new messages, an open poll or vote, a check-in, a new pod), each with the one action that settles it.
// Pure over DbState + the clock so Demo and Live behave the same. Ids are stable ("d:<kind>:<ref>") so read state sticks.
import { buildInbox, COMMUNITY_LABEL, maskText, podLabel, type InboxItem } from "@/lib/notifications/rules";
import { cardView, optionLabel } from "@/lib/planner/card-state";
import { chicagoDaysBetween } from "@/lib/time/tz";
import type { DbState, ID } from "@/lib/types";
import { shortDay, shortTime } from "@/components/pods/model";

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
}

/** Plan-level things only you can settle: they sit on top in "Needs you" until answered. */
export function needsYou(n: Activity): boolean {
  const a = n.act;
  if (!a) return false;
  if (a.type === "rsvp") return !a.imIn && !a.imOut;
  if (a.type === "vote" || a.type === "ballot") return !a.mine;
  if (a.type === "checkin") return !a.done;
  if (a.type === "join") return a.status === "new";
  return false;
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
        title: v.imIn ? `You're in for ${label}` : `${label} has a plan`,
        body: `${maskText(s.summary, pod, discreet)} · ${shortDay(s.plan_json.starts_at, nowMs)} ${shortTime(s.plan_json.starts_at)}${venue && !s.summary.includes(venue) ? ` · ${venue}` : ""}`,
        href: `/app/pods/${m.pod_id}`, created_at: s.created_at, read: seen.has(id),
        act: { type: "rsvp", targetId: s.id, going: v.going.length, size: v.size, imIn: v.imIn, imOut: v.imOut },
      });
    }
    if (v.phase === "vote" && v.vote) {
      const id = `d:vote:${v.vote.id}`;
      const counts = Object.values(v.vote.votes);
      const after = v.lastHangout?.ends_at ?? v.vote.closes_at;
      out.push({
        id, kind: "plans", trigger: "next_scheduled", stored: false, podId: m.pod_id, podName: label, who: null,
        title: `${label} is voting on the next hangout`,
        body: `${counts.length} of ${v.size} voted · closes ${shortDay(v.vote.closes_at, nowMs)} ${shortTime(v.vote.closes_at)}`,
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
        title: v.checkedIn ? `Checked in with ${label}` : `Check in with ${label}`,
        body: `${maskText(h.title, pod, discreet)} · tap when you're there`,
        href: `/app/pods/${m.pod_id}`, created_at: h.starts_at < nowISO ? h.starts_at : nowISO, read: seen.has(id) || v.checkedIn,
        act: { type: "checkin", hangoutId: h.id, done: v.checkedIn },
      });
    }
    if (h && v.phase === "ballot") {
      const id = `d:ballot:${h.id}`;
      out.push({
        id, kind: "plans", trigger: "run_it_back_reveal", stored: false, podId: m.pod_id, podName: label, who: null,
        title: `Run it back with ${label}?`,
        body: "Your answer stays private. Only the total is shared.",
        href: `/app/pods/${m.pod_id}`, created_at: h.ends_at < nowISO ? h.ends_at : nowISO, read: seen.has(id),
        act: { type: "ballot", hangoutId: h.id, mine: v.myBallot },
      });
    }
  }

  // ── messages: the newest line from someone else per pod, with how many more came in ────
  for (const podId of myPods) {
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
    if (!myPods.has(p.pod_id) || p.status !== "open" || p.created_by === me || p.created_at > nowISO) continue;
    const pod = db.pods[p.pod_id];
    const id = `d:poll:${p.id}`;
    const votes = Object.values(p.votes);
    pollsShown.add(`${p.pod_id}|${p.question}`);
    out.push({
      id, kind: "messages", trigger: "poll_opened", stored: false, podId: p.pod_id, podName: podLabel(pod, discreet), who: { id: p.created_by, name: first(p.created_by) },
      title: `${first(p.created_by)} asked ${podLabel(pod, discreet)}`,
      body: maskText(p.question, pod, discreet),
      href: `/app/pods/${p.pod_id}/chat`, created_at: p.created_at, read: seen.has(id) || !!p.votes[me],
      act: { type: "poll", pollId: p.id, mine: p.votes[me] ?? null, total: votes.length, options: p.options.map((o) => ({ ...o, count: votes.filter((v) => v === o.id).length })) },
    });
  }

  // ── stored notifications + the derived basics (placed, locked, reports) ─────────────
  const readyPods = new Set(out.filter((a) => a.act?.type === "rsvp").map((a) => a.podId));
  const inbox = buildInbox(db, nowISO, seen, discreet);
  const lockedPods = new Set(inbox.filter((n) => n.id.startsWith("d:locked:")).map((n) => n.podId));
  for (const n of inbox) {
    // the stored "It's on" line repeats the derived locked item for the same pod
    if (n.stored && n.trigger === "plan_locked" && n.podId && lockedPods.has(n.podId)) continue;
    if (n.id.startsWith("d:locked:") && n.podId && !readyPods.has(n.podId)) {
      const h = db.hangouts[n.id.slice("d:locked:".length)];
      if (h) {
        const going = db.rsvps.filter((r) => r.hangout_id === h.id && r.status === "going").length;
        const label = podLabel(db.pods[n.podId], discreet);
        out.push({ ...n, kind: "plans", podName: label, who: null, act: null, title: `${label} is locked`, body: `${maskText(h.title, db.pods[n.podId], discreet)} · ${shortDay(h.starts_at, nowMs)} ${shortTime(h.starts_at)} · ${going} going` });
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
      const open = mine.filter((m) => m.activation === "active").map((m) => podLabel(db.pods[m.pod_id], discreet));
      const later = mine.length - open.length;
      out.push({ ...base, kind: "pods", title: `You're in ${mine.length} pods`, body: `${open.join(" and ")} ${open.length === 1 ? "is" : "are"} open${later ? `. ${later} more open after your first hangout` : ""}.` });
      continue;
    }
    if (n.trigger === "new_match") {
      const matchId = n.href.split("match=")[1];
      const match = (db.podMatches ?? []).find((x) => x.id === matchId);
      out.push({ ...base, kind: "pods", act: match ? { type: "join", matchId: match.id, status: match.status } : null });
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
