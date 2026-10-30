// [U8] Notification rules (ARCHITECTURE §3 / edge case 32), pure and testable.
//  - Chat notifications are batched: at most one per pod per 30 minutes; a muted pod produces none.
//  - Quiet hours 10 PM-8 AM (Seattle) hold everything except safety.
//  - Discreet mode (D10): community pods are only ever "Your community pod" in notification text.
import type { AppNotification, DbState, ID, Pod } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";
import { planWhen } from "@/components/planner/plan-display";

export const CHAT_BATCH_MS = 30 * 60_000;
export const COMMUNITY_LABEL = "Your community pod";

export type NotificationGroup = "hangouts" | "runItBack" | "podChat" | "safety" | "news";

export const TRIGGER_GROUP: Record<AppNotification["trigger"], NotificationGroup> = {
  placed: "hangouts",
  reminder_24h: "hangouts",
  reminder_2h: "hangouts",
  plan_locked: "hangouts",
  next_scheduled: "hangouts",
  chat_batch: "podChat",
  checkin: "runItBack",
  run_it_back_reveal: "runItBack",
  report_update: "safety",
  poll_opened: "podChat",
  reply: "podChat",
  pod_request: "news",
  new_match: "news",
};

export function inQuietHours(iso: string): boolean {
  const h = Number(formatInTimeZone(iso, TZ, "H"));
  return h >= 22 || h < 8;
}

export interface Gate {
  groups: Record<Exclude<NotificationGroup, "safety">, boolean>;
  quietHours: boolean;
}

export type Decision = { send: true } | { send: false; reason: "muted" | "batched" | "quiet" | "off" };

/** Should a notification for `trigger` in `podId` fire at `nowISO`? */
export function decide(db: DbState, userId: ID, trigger: AppNotification["trigger"], podId: ID | null, nowISO: string, gate: Gate): Decision {
  const group = TRIGGER_GROUP[trigger];
  if (group === "safety") return { send: true };
  if (!gate.groups[group]) return { send: false, reason: "off" };
  if (podId) {
    const m = db.memberships.find((x) => x.pod_id === podId && x.user_id === userId && !x.left_at);
    if (m?.muted) return { send: false, reason: "muted" };
  }
  if (gate.quietHours && inQuietHours(nowISO)) return { send: false, reason: "quiet" };
  if (trigger === "chat_batch") {
    const last = db.notifications
      .filter((n) => n.user_id === userId && n.trigger === "chat_batch" && n.pod_id === podId)
      .map((n) => Date.parse(n.created_at))
      .sort((a, b) => b - a)[0];
    if (last !== undefined && Date.parse(nowISO) - last < CHAT_BATCH_MS) return { send: false, reason: "batched" };
  }
  return { send: true };
}

/** What a pod is called in a notification, preview, badge or share text. */
export function podLabel(pod: Pick<Pod, "name" | "type"> | undefined, discreet: boolean): string {
  if (!pod) return "Your pod";
  return pod.type === "community" && discreet ? COMMUNITY_LABEL : pod.name;
}

/** Replace a community pod's name inside free text. */
export function maskText(text: string, pod: Pick<Pod, "name" | "type" | "topic"> | undefined, discreet: boolean): string {
  if (!pod || pod.type !== "community" || !discreet) return text;
  let out = text;
  for (const needle of [pod.name, pod.topic]) if (needle) out = out.split(needle).join(COMMUNITY_LABEL);
  return out;
}

export interface InboxItem {
  id: string;
  trigger: AppNotification["trigger"];
  title: string;
  body: string;
  href: string;
  created_at: string;
  read: boolean;
  podId: ID | null;
  stored: boolean;
}

/**
 * Inbox = stored notifications + items derived from state the person already has (placed, reminders, report updates),
 * so the screen is never empty when something real happened. Derived ids are stable: "d:<kind>:<ref>".
 */
export function buildInbox(db: DbState, nowISO: string, seen: Set<string>, discreet: boolean): InboxItem[] {
  const me = db.me;
  if (!me) return [];
  const items: InboxItem[] = [];
  const mask = (text: string, podId: ID | null) => maskText(text, podId ? db.pods[podId] : undefined, discreet);

  for (const n of db.notifications) {
    if (n.user_id !== me) continue;
    items.push({ id: n.id, trigger: n.trigger, title: mask(n.title, n.pod_id), body: mask(n.body, n.pod_id), href: n.href, created_at: n.created_at, read: !!n.read_at, podId: n.pod_id, stored: true });
  }

  const mine = db.memberships.filter((m) => m.user_id === me);
  const active = mine.filter((m) => !m.left_at && m.activation === "active");
  if (active.length) {
    const first = [...active].sort((a, b) => a.joined_at.localeCompare(b.joined_at))[0];
    const id = `d:placed:${first.joined_at}`;
    items.push({
      id,
      trigger: "placed",
      title: `You're in ${mine.filter((m) => !m.left_at).length} pods`,
      body: `${active.length} ${active.length === 1 ? "is" : "are"} open now. The rest open after your first hangout.`,
      href: "/app/pods",
      created_at: first.joined_at,
      read: seen.has(id),
      podId: null,
      stored: false,
    });
  }

  for (const h of Object.values(db.hangouts)) {
    if (h.status !== "upcoming") continue;
    const m = db.memberships.find((x) => x.pod_id === h.pod_id && x.user_id === me && !x.left_at);
    if (!m) continue;
    const going = db.rsvps.some((r) => r.hangout_id === h.id && r.user_id === me && r.status === "going");
    const pod = db.pods[h.pod_id];
    const label = podLabel(pod, discreet);
    const id = `d:locked:${h.id}`;
    if (going || h.is_starter) {
      items.push({
        id,
        trigger: "plan_locked",
        title: going ? "It's locked. You're in." : "A plan is ready",
        body: `${h.title} with ${label}. Tap for the details.`,
        href: `/app/pods/${h.pod_id}`,
        created_at: h.starts_at < nowISO ? h.starts_at : nowISO,
        read: seen.has(id),
        podId: h.pod_id,
        stored: false,
      });
    }
  }

  items.push(...reminders(db, nowISO, seen, discreet));

  for (const r of Object.values(db.reports)) {
    if (r.reporter_id !== me) continue;
    const id = `d:report:${r.id}:${r.status}`;
    items.push({
      id,
      trigger: "report_update",
      title: r.status === "open" ? "We got your report" : "Your report was reviewed",
      body: r.status === "open" ? "A person on our team will look at it. Reports about safety go first." : "Thank you for telling us. You'll find the status in Safety.",
      href: "/app/settings/safety",
      created_at: r.created_at,
      read: seen.has(id),
      podId: null,
      stored: false,
    });
  }

  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const H = 3_600_000;
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/** "Pickup basketball, rotating 5-on-5 games" → "Pickup basketball". */
export function activityName(text: string): string {
  const w = text.split(/[,:;(—–]/)[0].trim();
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "Hangout";
}

/**
 * Reminders for every plan you said "I'm in" to (locked hangouts, and suggested plans not locked yet):
 *  d:r24:<id> "Tomorrow 10am · Pickup basketball" from start-24h, until the 2-hour one takes over;
 *  d:r2:<id>  "In 2 hours · Miller Playfield" (Directions) from start-2h until it starts.
 */
export function reminders(db: DbState, nowISO: string, seen: Set<string>, discreet: boolean): InboxItem[] {
  const me = db.me;
  if (!me) return [];
  const now = Date.parse(nowISO);
  const going = new Set(db.rsvps.filter((r) => r.user_id === me && r.status === "going").map((r) => r.hangout_id));
  const member = (podId: ID) => db.memberships.some((m) => m.pod_id === podId && m.user_id === me && !m.left_at);
  type T = { id: ID; podId: ID; startsAt: string; event: string; venueId: ID };
  const targets: T[] = [];
  const lockedSugs = new Set<ID>();
  for (const h of Object.values(db.hangouts)) {
    if (h.status !== "upcoming" || !going.has(h.id) || !member(h.pod_id)) continue;
    lockedSugs.add(h.suggestion_id);
    const s = db.suggestions[h.suggestion_id];
    targets.push({ id: h.id, podId: h.pod_id, startsAt: h.starts_at, event: s?.plan_json.event || h.title, venueId: h.venue_id });
  }
  for (const s of Object.values(db.suggestions)) {
    if (s.status !== "suggested" || lockedSugs.has(s.id) || !going.has(s.id) || !member(s.pod_id)) continue;
    targets.push({ id: s.id, podId: s.pod_id, startsAt: s.starts_at, event: s.plan_json.event || s.summary, venueId: s.venue_id });
  }
  const out: InboxItem[] = [];
  for (const t of targets) {
    const start = Date.parse(t.startsAt);
    if (!(now < start)) continue;
    const pod = db.pods[t.podId];
    const venue = db.venues[t.venueId];
    const place = venue ? venue.short_name || venue.name : "A public place";
    const what = maskText(activityName(t.event), pod, discreet);
    if (now >= start - 2 * H) {
      const id = `d:r2:${t.id}`;
      const mins = Math.max(1, Math.round((start - now) / 60_000));
      const lead = mins >= 90 ? "In 2 hours" : mins >= 60 ? "In 1 hour" : `In ${mins} min`;
      out.push({
        id, trigger: "reminder_2h", title: `${lead} · ${place}`, body: `${what} with ${podLabel(pod, discreet)}. Tap for directions.`,
        href: venue ? mapsUrl(`${venue.name}, ${venue.address}`) : `/app/pods/${t.podId}`,
        created_at: new Date(start - 2 * H).toISOString(), read: seen.has(id), podId: t.podId, stored: false,
      });
    } else if (now >= start - 24 * H) {
      const id = `d:r24:${t.id}`;
      out.push({
        id, trigger: "reminder_24h", title: `${planWhen(t.startsAt, now)} · ${what}`, body: `${place} with ${podLabel(pod, discreet)}.`,
        href: `/app/pods/${t.podId}`,
        created_at: new Date(start - 24 * H).toISOString(), read: seen.has(id), podId: t.podId, stored: false,
      });
    }
  }
  return out;
}
