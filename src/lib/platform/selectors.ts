// Platform foundation selectors (PLATFORM_SPEC §D). Pure over DbState; pass times from the clock (useClock / nowISO),
// never Date.now during render. Member data leaves only as PublicMember. Community pod names follow the in-app mask.
import type {
  AppNotification, DbState, Hangout, HangoutSuggestion, ID, Memory, Pod, Poll, PublicMember, RsvpStatus, Venue,
} from "@/lib/types";
import { activeSuggestion, hangoutForSuggestion, myMemberships, myPods } from "@/lib/db/selectors";
import { toPublicMember } from "@/lib/utils";
import { TRIGGER_GROUP, type NotificationGroup } from "@/lib/notifications/rules";
import { joinVerdict, type JoinVerdict } from "@/lib/db/local/social";

// ── Names ───────────────────────────────────────────────────────────────
/** What the app calls a pod on screen (D10 in-app mask for community pods). */
export function podLabel(db: DbState, pod: Pod): string {
  return pod.type === "community" && db.config.flags.maskCommunityInApp ? "Community pod" : pod.name;
}

// ── Plans / calendar (§F4) ──────────────────────────────────────────────
export interface PlanItem {
  id: ID; // hangout id once locked, else suggestion id (the RSVP target)
  kind: "hangout" | "plan";
  podId: ID;
  podName: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue: Venue | null;
  rainVenue: Venue | null;
  locked: boolean;
  status: Hangout["status"] | HangoutSuggestion["status"];
  going: number;
  me: RsvpStatus | null;
  checkedIn: boolean;
  sequence: number | null;
  source: HangoutSuggestion["source"] | null;
}

function rsvpOf(db: DbState, targetId: ID) {
  const going = db.rsvps.filter((r) => r.hangout_id === targetId && r.status === "going").length;
  const mine = db.me ? db.rsvps.find((r) => r.hangout_id === targetId && r.user_id === db.me) : undefined;
  return { going, me: mine?.status ?? null, checkedIn: !!mine?.checked_in };
}

/** Every plan and hangout across my pods. Upcoming ascending, past descending. Cancelled and replaced are left out. */
export function myPlans(db: DbState, nowMs: number): { upcoming: PlanItem[]; past: PlanItem[] } {
  const pods = myPods(db);
  const items: PlanItem[] = [];
  for (const pod of pods) {
    const name = podLabel(db, pod);
    for (const h of Object.values(db.hangouts)) {
      if (h.pod_id !== pod.id || h.status === "cancelled") continue;
      const s = db.suggestions[h.suggestion_id];
      items.push({
        id: h.id, kind: "hangout", podId: pod.id, podName: name, title: h.title, starts_at: h.starts_at, ends_at: h.ends_at,
        venue: db.venues[h.venue_id] ?? null, rainVenue: s?.plan_json.rain_venue_id ? (db.venues[s.plan_json.rain_venue_id] ?? null) : null,
        locked: true, status: h.status, ...rsvpOf(db, h.id), sequence: h.sequence, source: s?.source ?? null,
      });
    }
    const s = activeSuggestion(db, pod.id);
    if (s && !hangoutForSuggestion(db, s.id) && s.status !== "replaced") {
      // Every open option of the current round (a vote shows them all).
      const round = Object.values(db.suggestions).filter((x) => x.pod_id === pod.id && x.round === s.round && x.status !== "replaced" && !hangoutForSuggestion(db, x.id));
      for (const o of round) {
        items.push({
          id: o.id, kind: "plan", podId: pod.id, podName: name, title: o.summary, starts_at: o.starts_at, ends_at: o.plan_json.ends_at,
          venue: db.venues[o.venue_id] ?? null, rainVenue: o.plan_json.rain_venue_id ? (db.venues[o.plan_json.rain_venue_id] ?? null) : null,
          locked: false, status: o.status, ...rsvpOf(db, o.id), sequence: null, source: o.source,
        });
      }
    }
  }
  const upcoming = items.filter((i) => Date.parse(i.ends_at) > nowMs && i.status !== "done").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = items.filter((i) => !upcoming.includes(i) && i.kind === "hangout").sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { upcoming, past };
}

// ── Inbox (§F6) ─────────────────────────────────────────────────────────
export type InboxFilter = "all" | "unread" | NotificationGroup;

export function inbox(db: DbState, filter: InboxFilter = "all"): AppNotification[] {
  if (!db.me) return [];
  return db.notifications
    .filter((n) => n.user_id === db.me)
    .filter((n) => (filter === "all" ? true : filter === "unread" ? !n.read_at : TRIGGER_GROUP[n.trigger] === filter))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

export function unreadCount(db: DbState): number {
  return db.me ? db.notifications.filter((n) => n.user_id === db.me && !n.read_at).length : 0;
}

// ── People (§F7) ────────────────────────────────────────────────────────
export interface PersonRow {
  member: PublicMember;
  sharedPodIds: ID[];
}

/** Everyone I share a pod with (public view), most shared pods first. People I blocked are left out. */
export function myPeople(db: DbState, nowISO: string): PersonRow[] {
  const me = db.me;
  if (!me) return [];
  const mine = new Set(myMemberships(db).filter((m) => m.activation === "active").map((m) => m.pod_id));
  const shared = new Map<ID, ID[]>();
  for (const m of db.memberships) {
    if (m.left_at || m.user_id === me || !mine.has(m.pod_id) || m.activation !== "active") continue;
    if (db.blocks.some((b) => b.blocker_id === me && b.blocked_id === m.user_id)) continue;
    (shared.get(m.user_id) ?? shared.set(m.user_id, []).get(m.user_id)!).push(m.pod_id);
  }
  return [...shared.entries()]
    .filter(([id]) => db.users[id] && db.users[id].status !== "deleted")
    .map(([id, pods]) => ({ member: toPublicMember(db.users[id], nowISO), sharedPodIds: pods }))
    .sort((a, b) => b.sharedPodIds.length - a.sharedPodIds.length || a.member.display_name.localeCompare(b.member.display_name));
}

export function mutualPodIds(db: DbState, otherId: ID): ID[] {
  const me = db.me;
  if (!me) return [];
  const mine = new Set(myMemberships(db).map((m) => m.pod_id));
  return db.memberships.filter((m) => m.user_id === otherId && !m.left_at && mine.has(m.pod_id)).map((m) => m.pod_id);
}

// ── Discover (§F5) ──────────────────────────────────────────────────────
export interface DiscoverRow {
  pod: Pod;
  members: number;
  seatsOpen: number;
  matchesMyLikes: boolean;
  verdict: JoinVerdict;
  next: { starts_at: string; venueName: string | null } | null;
  requested: boolean;
}

/** Interest pods I'm not in (community pods never appear here: they come only from your own likes). */
export function discoverPods(db: DbState, nowISO: string, interestId?: string): DiscoverRow[] {
  const me = db.me;
  if (!me) return [];
  const likes = new Set(db.userInterests.filter((u) => u.user_id === me).map((u) => u.interest_id));
  const max = db.config.placement.podMax;
  return Object.values(db.pods)
    .filter((p) => p.type === "interest" && p.status !== "closed" && (!interestId || p.topic_key === interestId))
    .map((pod): DiscoverRow => {
      const members = db.memberships.filter((m) => m.pod_id === pod.id && !m.left_at).length;
      const s = activeSuggestion(db, pod.id);
      const h = Object.values(db.hangouts).filter((x) => x.pod_id === pod.id && x.status === "upcoming").sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
      const next = h ? { starts_at: h.starts_at, venueName: db.venues[h.venue_id]?.short_name ?? db.venues[h.venue_id]?.name ?? null }
        : s ? { starts_at: s.starts_at, venueName: db.venues[s.venue_id]?.short_name ?? db.venues[s.venue_id]?.name ?? null } : null;
      return {
        pod, members, seatsOpen: Math.max(0, max - members), matchesMyLikes: likes.has(pod.topic_key),
        verdict: joinVerdict(db, pod.id, me, nowISO), next,
        requested: db.podRequests.some((r) => r.user_id === me && r.pod_id === pod.id && r.status !== "cancelled"),
      };
    })
    .filter((r) => r.verdict !== "already" && r.verdict !== "blocked" && r.verdict !== "missing")
    .sort((a, b) => Number(b.matchesMyLikes) - Number(a.matchesMyLikes) || b.seatsOpen - a.seatsOpen || a.pod.name.localeCompare(b.pod.name));
}

// ── Search (§F8) ────────────────────────────────────────────────────────
export type SearchHit =
  | { kind: "pod"; id: ID; label: string; sub: string; href: string }
  | { kind: "person"; id: ID; label: string; sub: string; href: string }
  | { kind: "plan"; id: ID; label: string; sub: string; href: string; starts_at: string }
  | { kind: "interest"; id: ID; label: string; sub: string; href: string };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();

/** Search my pods, the people in them, our plans, and interests (to Discover). Empty query → no hits. Max 20. */
export function searchAll(db: DbState, query: string, nowISO: string, limit = 20): SearchHit[] {
  const q = norm(query);
  if (q.length < 1 || !db.me) return [];
  const hit = (...fields: (string | null | undefined)[]) => fields.some((f) => f && norm(f).includes(q));
  const out: SearchHit[] = [];
  for (const pod of myPods(db)) {
    const label = podLabel(db, pod);
    const masked = label !== pod.name;
    if (hit(label, masked ? null : pod.topic)) out.push({ kind: "pod", id: pod.id, label, sub: masked ? "" : pod.topic, href: `/app/pods/${pod.id}` });
  }
  for (const p of myPeople(db, nowISO)) {
    if (hit(p.member.display_name)) out.push({ kind: "person", id: p.member.id, label: p.member.display_name, sub: `${p.sharedPodIds.length} shared`, href: `/app/people/${p.member.id}` });
  }
  const { upcoming, past } = myPlans(db, Date.parse(nowISO));
  for (const it of [...upcoming, ...past]) {
    if (hit(it.title, it.venue?.name, it.venue?.short_name)) {
      out.push({ kind: "plan", id: it.id, label: it.title, sub: it.podName, starts_at: it.starts_at, href: `/app/plans/${it.id}` });
    }
  }
  for (const i of Object.values(db.interests)) {
    if (i.active && hit(i.label)) out.push({ kind: "interest", id: i.id, label: i.label, sub: "Discover", href: `/app/discover?i=${i.id}` });
  }
  return out.slice(0, limit);
}

// ── Polls + memories (§F2) ──────────────────────────────────────────────
export function pollTally(poll: Poll, meId: ID | null): { options: { id: ID; label: string; votes: number }[]; total: number; mine: ID | null } {
  const counts = new Map<ID, number>();
  for (const o of Object.values(poll.votes)) counts.set(o, (counts.get(o) ?? 0) + 1);
  return {
    options: poll.options.map((o) => ({ ...o, votes: counts.get(o.id) ?? 0 })),
    total: Object.keys(poll.votes).length,
    mine: meId ? (poll.votes[meId] ?? null) : null,
  };
}

export function podMemories(db: DbState, podId: ID): Memory[] {
  return Object.values(db.memories)
    .filter((m) => m.pod_id === podId && !m.removed_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function podPolls(db: DbState, podId: ID): Poll[] {
  return Object.values(db.polls).filter((p) => p.pod_id === podId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ── Safety: share my plan (§F9) ─────────────────────────────────────────
/** Plain text for a trusted contact. Never includes other members' names. `when` is pre-formatted by the caller. */
export function planShareText(item: Pick<PlanItem, "title" | "venue">, when: string, endsAt: string): string {
  const place = item.venue ? `${item.venue.short_name ?? item.venue.name}, ${item.venue.address}` : "a public place";
  return `I'm at ${item.title}, ${when}, at ${place}. It should end around ${endsAt}. Sent from Pods.`;
}

export function smsHref(phone: string, body: string): string {
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
}
