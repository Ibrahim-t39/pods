// Pod view models: pure selectors over DbState and the clock. Used by home, chat, details and events.
// Status priority is BLUEPRINT §8.2. Repeat-loop stage is BLUEPRINT §7.1 / AP-06. Never returns identity fields.
import { lockMinFor } from "@/lib/planner/lock";
import { ribAgain } from "@/lib/planner/run-it-back";
import type { DbState, Hangout, HangoutSuggestion, ID, Membership, NextHangoutVote, Pod, PublicMember, Venue } from "@/lib/types";
import { activeSuggestion, goingUserIds, hangoutForSuggestion, membership, myMemberships, podMembers } from "@/lib/db/selectors";
import { toPublicMember } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import { toChicagoISO, TZ } from "@/lib/time/tz";
import { cardView } from "@/lib/planner/card-state";

const MIN = 60_000;
const HOUR = 60 * MIN;
export const CHECKIN_OPENS_AFTER_START = 30 * MIN; // check-in window: start + 30 min …
export const CHECKIN_CLOSES_AFTER_END = 48 * HOUR; // … to end + 48 h (ARCHITECTURE §15)

export type PodStatus =
  | "checkin_due"
  | "vote_open"
  | "run_it_back"
  | "happening_now"
  | "today"
  | "needs_rsvp"
  | "youre_in"
  | "locked"
  | "generating"
  | "pending_review"
  | "forming"
  | "waitlisted"
  | "on_deck"
  | "quiet"
  | "archived";

export interface PlanVM {
  s: HangoutSuggestion;
  hangout: Hangout | undefined;
  targetId: ID;
  going: ID[];
  size: number;
  threshold: number;
  locked: boolean;
  imIn: boolean;
  cantMake: boolean;
  dismissed: boolean;
  venue: Venue | undefined;
  startsAt: string;
  endsAt: string;
}

/** Display name for a pod: community pods can be masked in-app (D10, per-device toggle). */
export function podName(db: DbState, pod: Pod): string {
  return pod.type === "community" && db.config.flags.maskCommunityInApp ? "Community pod" : pod.name;
}

export function firstName(db: DbState, id: ID | null): string {
  if (!id) return "";
  if (id === db.me) return "You";
  const u = db.users[id];
  return u ? (u.nickname || u.first_name) : "Former member";
}

export function planVM(db: DbState, podId: ID): PlanVM | null {
  const s = activeSuggestion(db, podId);
  if (!s) return null;
  const hangout = hangoutForSuggestion(db, s.id);
  const targetId = hangout?.id ?? s.id;
  const going = goingUserIds(db, targetId);
  const mine = membership(db, podId);
  const myR = db.me ? db.rsvps.find((r) => r.hangout_id === targetId && r.user_id === db.me) : undefined;
  return {
    s,
    hangout,
    targetId,
    going,
    size: podMembers(db, podId).length,
    threshold: lockMinFor(db, s),
    locked: !!hangout,
    imIn: myR?.status === "going",
    cantMake: myR?.status === "not_going",
    dismissed: !!mine?.card_dismissed && mine.card_dismissed_for === s.id,
    venue: db.venues[s.venue_id],
    startsAt: hangout?.starts_at ?? s.plan_json.starts_at,
    endsAt: hangout?.ends_at ?? s.plan_json.ends_at,
  };
}

// ── Repeat loop ─────────────────────────────────────────────────────────
export type LoopStage =
  | { kind: "checkin"; hangout: Hangout }
  | { kind: "ballot"; hangout: Hangout }
  | { kind: "waiting"; hangout: Hangout; answered: number }
  | { kind: "revealed"; hangout: Hangout; yes: number; answered: number }
  | { kind: "vote"; hangout: Hangout; vote: NextHangoutVote; revealed: { yes: number; answered: number } | null };

/** The most recent hangout of a pod that has started and is inside the check-in window. */
export function recentHangout(db: DbState, podId: ID, nowMs: number): Hangout | undefined {
  const list = Object.values(db.hangouts)
    .filter((h) => h.pod_id === podId && h.status !== "cancelled")
    .filter((h) => {
      const start = Date.parse(h.starts_at);
      const end = Date.parse(h.ends_at);
      return nowMs >= start + CHECKIN_OPENS_AFTER_START && nowMs <= end + CHECKIN_CLOSES_AFTER_END;
    })
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return list[0];
}

export function ribTally(db: DbState, hangoutId: ID) {
  const rib = db.runItBack[hangoutId];
  const answers = rib ? Object.values(rib.responses) : [];
  return {
    yes: answers.filter((a) => a === "yes").length,
    answered: answers.length,
    revealedAt: rib?.revealed_at ?? null,
    mine: db.me && rib ? rib.responses[db.me] : undefined,
  };
}

/** Only ever shows a number when the pod is going again (lib/planner/run-it-back). Denominator = people who answered. */
export function revealNumbers(db: DbState, hangoutId: ID): { yes: number; answered: number } | null {
  const t = ribTally(db, hangoutId);
  if (!t.revealedAt || !ribAgain(t.yes, t.answered, db.config.planner.runItBackRevealMin)) return null;
  return { yes: t.yes, answered: t.answered };
}

export function openVoteFor(db: DbState, podId: ID): NextHangoutVote | undefined {
  return Object.values(db.votes).find((v) => v.pod_id === podId && v.status === "open");
}

/** Repeat-loop stage, derived from U4's card state machine (lib/planner/card-state) so every surface agrees. */
export function loopStage(db: DbState, podId: ID, nowMs: number): LoopStage | null {
  const v = cardView(db, podId, nowMs);
  if (!v) return null;
  const h = v.lastHangout ?? v.hangout;
  switch (v.phase) {
    case "check_in":
      return h ? { kind: "checkin", hangout: h } : null;
    case "ballot":
      return h ? { kind: "ballot", hangout: h } : null;
    case "waiting_reveal":
      return h ? { kind: "waiting", hangout: h, answered: ribTally(db, h.id).answered } : null;
    case "planning_next": {
      if (!h) return null;
      const nums = revealNumbers(db, h.id);
      return nums ? { kind: "revealed", hangout: h, ...nums } : { kind: "waiting", hangout: h, answered: ribTally(db, h.id).answered };
    }
    case "vote": {
      if (!v.vote) return null;
      const after = db.hangouts[v.vote.after_hangout_id];
      return after ? { kind: "vote", hangout: after, vote: v.vote, revealed: revealNumbers(db, after.id) } : null;
    }
    default:
      return null;
  }
}

export function checkedInCount(db: DbState, hangoutId: ID): number {
  return db.rsvps.filter((r) => r.hangout_id === hangoutId && r.checked_in).length;
}

/** Hours together: sum of the hangouts in this pod the user checked in to (BLUEPRINT §7.2). Non-gamified. */
export function hoursTogether(db: DbState, podId: ID): number {
  if (!db.me) return 0;
  let ms = 0;
  for (const h of Object.values(db.hangouts)) {
    if (h.pod_id !== podId) continue;
    if (db.rsvps.some((r) => r.hangout_id === h.id && r.user_id === db.me && r.checked_in)) ms += Date.parse(h.ends_at) - Date.parse(h.starts_at);
  }
  return Math.round((ms / HOUR) * 10) / 10;
}

/** Time together, for a pod (you, in this pod) or a person (hangouts you both checked in to). 0 hangouts → null. */
export function timeTogether(db: DbState, of: { podId: ID } | { userId: ID }): { hangouts: number; hours: number } | null {
  if (!db.me) return null;
  const me = db.me;
  const checked = (hid: ID, uid: ID) => db.rsvps.some((r) => r.hangout_id === hid && r.user_id === uid && r.checked_in);
  let n = 0;
  let ms = 0;
  for (const h of Object.values(db.hangouts)) {
    if (h.status === "cancelled") continue;
    if ("podId" in of ? h.pod_id !== of.podId : !checked(h.id, of.userId)) continue;
    if (!checked(h.id, me)) continue;
    n += 1;
    ms += Date.parse(h.ends_at) - Date.parse(h.starts_at);
  }
  return n ? { hangouts: n, hours: Math.round((ms / HOUR) * 10) / 10 } : null;
}

/** "1 hangout · 2 hours together"; null at 0 (the line is hidden). */
export function togetherLine(t: { hangouts: number; hours: number } | null): string | null {
  if (!t) return null;
  const h = Number.isInteger(t.hours) ? String(t.hours) : t.hours.toFixed(1);
  return `${t.hangouts} ${t.hangouts === 1 ? "hangout" : "hangouts"} · ${h} ${t.hours === 1 ? "hour" : "hours"} together`;
}

/** Beat 3, said in two places only (placing and the pod's details): "Only 3 Zambians nearby, so your pod is Southern African." */
export function widenedLine(db: DbState, podId: ID): string | null {
  const pod = db.pods[podId];
  const w = pod?.widened_from;
  if (!pod || !w || w.kind !== "group") return null;
  const entry = (db.plannerCache as Record<string, { output?: unknown }>)[`${podId}:widen_explainer`];
  const m = (((entry?.output as { body?: string } | undefined)?.body) ?? "").match(/Only (\d+) (\S+)/);
  return `${m ? `Only ${m[1]} ${m[2]} nearby` : `Not many ${w.from}s nearby`}, so your pod is ${w.to}.`;
}

/** The interest under a pod's name: "Board games", "Southern African". */
export function podTopicLabel(pod: Pick<Pod, "topic" | "type">): string {
  const t = (pod.topic ?? "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : pod.type === "community" ? "Community pod" : "Interest pod";
}

// ── Pod status (§8.2) ───────────────────────────────────────────────────
export interface PodRowVM {
  pod: Pod;
  name: string;
  m: Membership;
  size: number;
  plan: PlanVM | null;
  status: PodStatus;
  loop: LoopStage | null;
  unread: number;
  lastLine: string | null;
  lastAt: string | null;
  waitlisted: boolean;
}

function isToday(iso: string, nowMs: number) {
  return toChicagoISO(Date.parse(iso)).slice(0, 10) === toChicagoISO(nowMs).slice(0, 10);
}

export function podStatus(db: DbState, pod: Pod, m: Membership, plan: PlanVM | null, loop: LoopStage | null, nowMs: number): PodStatus {
  if (pod.status === "closed") return "archived";
  if (m.activation === "on_deck") return "on_deck";
  if (loop?.kind === "checkin" || loop?.kind === "ballot") return "checkin_due";
  if (loop?.kind === "vote") return "vote_open";
  if (loop?.kind === "waiting" || loop?.kind === "revealed") return "run_it_back";
  if (pod.status === "forming") return "forming";
  if (plan) {
    const start = Date.parse(plan.startsAt);
    const end = Date.parse(plan.endsAt);
    if (nowMs >= start && nowMs < end) return "happening_now";
    if (nowMs < start) {
      if (plan.s.status === "pending_review") return "pending_review";
      if (isToday(plan.startsAt, nowMs)) return "today";
      if (!plan.imIn && !plan.locked) return "needs_rsvp";
      if (plan.imIn && !plan.locked) return "youre_in";
      if (plan.locked) return plan.imIn ? "locked" : "needs_rsvp";
    }
  }
  return "quiet";
}

/** Last-read marker is per device (U7 keeps it in localStorage); pass it in for unread counts. */
export function podRows(db: DbState, nowMs: number, lastRead: Record<ID, string> = {}): PodRowVM[] {
  return myMemberships(db)
    .map((m): PodRowVM | null => {
      const pod = db.pods[m.pod_id];
      if (!pod) return null;
      const plan = m.activation === "on_deck" ? null : planVM(db, pod.id);
      const loop = m.activation === "on_deck" ? null : loopStage(db, pod.id, nowMs);
      const msgs = db.messages[pod.id] ?? [];
      const seen = lastRead[pod.id];
      const unread = seen ? msgs.filter((x) => x.created_at > seen && x.user_id !== db.me && x.kind === "text").length : 0;
      const last = [...msgs].reverse().find((x) => x.kind === "text" || x.kind === "host");
      const lastLine = last ? (last.user_id ? `${firstName(db, last.user_id)}: ${last.text}` : last.text) : null;
      return {
        pod,
        name: podName(db, pod),
        m,
        size: podMembers(db, pod.id).length,
        plan,
        status: podStatus(db, pod, m, plan, loop, nowMs),
        loop,
        unread,
        lastLine,
        lastAt: last?.created_at ?? null,
        waitlisted: false,
      };
    })
    .filter((x): x is PodRowVM => !!x);
}

const PRIORITY: PodStatus[] = ["checkin_due", "vote_open", "run_it_back", "happening_now", "today", "needs_rsvp", "youre_in", "locked", "generating", "pending_review", "forming", "waitlisted", "on_deck", "quiet", "archived"];

/** The NextUpHero pick: highest-priority active pod; ties → soonest plan. */
export function heroRow(rows: PodRowVM[]): PodRowVM | undefined {
  const live = rows.filter((r) => r.m.activation === "active" && (r.plan || r.loop));
  return [...live].sort(
    (a, b) =>
      PRIORITY.indexOf(a.status) - PRIORITY.indexOf(b.status) ||
      (a.plan?.startsAt ?? "9").localeCompare(b.plan?.startsAt ?? "9"),
  )[0];
}

export function publicMembers(db: DbState, podId: ID, nowISO: string): (PublicMember & { role: Membership["role"]; you: boolean })[] {
  const list = podMembers(db, podId)
    .map((m): (PublicMember & { role: Membership["role"]; you: boolean }) | null => {
      const u = db.users[m.user_id];
      return u ? { ...toPublicMember(u, nowISO), role: m.role, you: u.id === db.me } : null;
    })
    .filter((x): x is PublicMember & { role: Membership["role"]; you: boolean } => !!x);
  return list.sort((a, b) => Number(b.you) - Number(a.you) || Number(b.role === "admin") - Number(a.role === "admin") || a.display_name.localeCompare(b.display_name));
}

export interface HangoutListItem {
  id: ID;
  podId: ID;
  title: string;
  startsAt: string;
  endsAt: string;
  venue: Venue | undefined;
  locked: boolean;
  going: number;
  size: number;
  imIn: boolean;
  checkedIn: boolean;
  suggestionId: ID;
  sequence: number;
  past: boolean;
}

/** Every hangout + live plan in a pod (for Pod details and Events). Past = ended. */
export function podHangouts(db: DbState, podId: ID, nowMs: number): HangoutListItem[] {
  const size = podMembers(db, podId).length;
  const items: HangoutListItem[] = Object.values(db.hangouts)
    .filter((h) => h.pod_id === podId && h.status !== "cancelled")
    .map((h) => {
      const going = db.rsvps.filter((r) => r.hangout_id === h.id && r.status === "going");
      return {
        id: h.id,
        podId,
        title: h.title,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
        venue: db.venues[h.venue_id],
        locked: true,
        going: going.length,
        size,
        imIn: going.some((r) => r.user_id === db.me),
        checkedIn: db.rsvps.some((r) => r.hangout_id === h.id && r.user_id === db.me && r.checked_in),
        suggestionId: h.suggestion_id,
        sequence: h.sequence,
        past: Date.parse(h.ends_at) <= nowMs,
      };
    });
  const p = planVM(db, podId);
  if (p && !p.locked && p.s.status !== "pending_review") {
    items.push({
      id: p.s.id,
      podId,
      title: p.s.summary,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      venue: p.venue,
      locked: false,
      going: p.going.length,
      size: p.size,
      imIn: p.imIn,
      checkedIn: false,
      suggestionId: p.s.id,
      sequence: p.s.round,
      past: Date.parse(p.endsAt) <= nowMs,
    });
  }
  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function overlaps(a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }) {
  return Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);
}

// ── The Room (V3_SPEC §6.3, wireframes C01-C08) ─────────────────────────

export type TableHue = "ember" | "signal" | "grove";

export interface RoomPerson {
  id: ID;
  name: string;
  initial: string;
  /** said yes to the pod's current plan */
  in: boolean;
}

export interface RoomTable {
  row: PodRowVM;
  hue: TableHue;
  open: boolean;
  people: RoomPerson[];
  /** hangouts held (each one wears a ring into the table, C06) */
  held: number;
}

/** "1pm", "11:30am": times are labels, never "1:00 PM". */
export function shortTime(iso: string): string {
  return formatInTimeZone(iso, TZ, "h:mmaaa").replace(":00", "");
}

/** "Sun" within the next 6 days, otherwise "Nov 15" (a bare weekday two weeks out reads as this week). */
export function shortDay(iso: string, nowMs?: number): string {
  return near(iso, nowMs) ? formatInTimeZone(iso, TZ, "EEE") : formatInTimeZone(iso, TZ, "MMM d");
}

/** "Sunday" within the next 6 days, otherwise "Nov 15". */
export function dayWord(iso: string, nowMs?: number): string {
  return near(iso, nowMs) ? formatInTimeZone(iso, TZ, "EEEE") : formatInTimeZone(iso, TZ, "MMM d");
}

function near(iso: string, nowMs?: number) {
  if (nowMs == null) return true;
  const days = (Date.parse(toChicagoISO(Date.parse(iso)).slice(0, 10)) - Date.parse(toChicagoISO(nowMs).slice(0, 10))) / 86_400_000;
  return days >= 0 && days <= 6;
}

/** Colour means the pod, and the pod owns it (pod.hue): every sphere of a pod is the same colour on every screen. */
export function podColor(pod: Pick<Pod, "hue" | "type"> | undefined): TableHue {
  return pod?.hue ?? (pod?.type === "community" ? "grove" : "ember");
}
function assignHues(rows: PodRowVM[]): TableHue[] {
  return rows.map((r) => podColor(r.pod));
}

/** The Room's tables in a stable order; the next one is picked separately (heroRow). */
export function roomTables(db: DbState, nowMs: number): RoomTable[] {
  const rows = podRows(db, nowMs).filter((r) => r.status !== "archived");
  // A stable order, so a table keeps its place (and its dot) while its plan changes: live pods first, interest
  // before community, then the order you joined.
  rows.sort(
    (a, b) =>
      Number(b.m.activation === "active") - Number(a.m.activation === "active") ||
      Number(a.pod.type === "community") - Number(b.pod.type === "community") ||
      (a.m.joined_at ?? "").localeCompare(b.m.joined_at ?? "") ||
      a.pod.id.localeCompare(b.pod.id),
  );
  const hues = assignHues(rows);
  return rows.map((row, i) => {
    const going = new Set(row.plan?.going ?? []);
    const people = podMembers(db, row.pod.id)
      .filter((m) => m.user_id !== db.me)
      .map((m) => {
        const name = firstName(db, m.user_id);
        return { id: m.user_id, name, initial: name.slice(0, 1).toUpperCase(), in: going.has(m.user_id) };
      })
      .sort((a, b) => Number(b.in) - Number(a.in) || a.name.localeCompare(b.name));
    const held = Object.values(db.hangouts).filter((h) => h.pod_id === row.pod.id && h.status !== "cancelled" && Date.parse(h.ends_at) <= nowMs).length;
    return { row, hue: hues[i], open: row.m.activation === "active", people, held };
  });
}

/** What opens a pod that is not yet yours: your first hangout ("Opens after Sat"), else "Opens soon" (QA core r1). */
export function opensAfter(tables: RoomTable[], nowMs?: number): string {
  const first = tables.filter((t) => t.open).map((t) => t.row.plan?.startsAt).filter((x): x is string => !!x).sort()[0];
  return first ? `Opens after ${shortDay(first, nowMs)}` : "Opens soon";
}

/** The label under a table's name in the Room: "Sat · 10am · in", "planning", "Opens after Sat". Two to three words. */
export function tableState(t: RoomTable, nowMs?: number, closed = "Opens soon"): string {
  const { row } = t;
  if (!t.open) return closed;
  switch (row.status) {
    case "checkin_due":
    case "run_it_back":
      return "Run it back?";
    case "vote_open":
      return "Pick a time";
    case "happening_now":
      return "Now";
    case "forming":
      return "Filling";
    default:
      break;
  }
  if (row.plan && row.plan.s.status !== "pending_review") {
    const when = `${shortDay(row.plan.startsAt, nowMs)} · ${shortTime(row.plan.startsAt)}`;
    return row.plan.imIn ? `${when} · in` : when;
  }
  return "Planning";
}

/** The Room's one line: what is next, in five words or fewer ("Hoopers, Sunday 1pm."). */
export function nextLine(t: RoomTable | undefined, nowMs: number): string | null {
  if (!t || !t.open) return null;
  const { row } = t;
  switch (row.status) {
    case "checkin_due":
    case "run_it_back":
      return `${row.name}. Run it back?`;
    case "vote_open":
      return `${row.name}, pick a time.`;
    case "happening_now":
      return `${row.name}, now.`;
    default:
      break;
  }
  if (!row.plan || row.plan.s.status === "pending_review") return null;
  const today = toChicagoISO(Date.parse(row.plan.startsAt)).slice(0, 10) === toChicagoISO(nowMs).slice(0, 10);
  return `${row.name}, ${today ? "today" : dayWord(row.plan.startsAt, nowMs)} ${shortTime(row.plan.startsAt)}.`;
}
