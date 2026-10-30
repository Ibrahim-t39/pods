// Calendar (round 10-29): every hangout and task across your pods as dated items, plus the subscribable feed.
//   plan       a plan still gathering yeses (needs you when you have not said I'm in)
//   hangout    a locked hangout
//   vote       the pod's next-hangout vote closing
//   checkin    a hangout you went to and have not checked in on
// Pure. The feed is RFC 5545 with one VEVENT per plan or hangout; tasks stay in the app.
import type { DbState, ID } from "@/lib/types";
import { myPlans } from "./selectors";
import { icsDate, icsEscape, icsFold } from "./ics";
import { seattleDayKey } from "@/lib/time/tz";

export type CalKind = "plan" | "hangout" | "vote" | "checkin";

export interface CalItem {
  id: string;
  kind: CalKind;
  podId: ID;
  podName: string;
  title: string;
  /** what the row says under the title */
  line: string;
  starts_at: string;
  ends_at: string;
  /** Seattle calendar day, YYYY-MM-DD */
  day: string;
  href: string;
  needsYou: boolean;
  venue: string | null;
}

export function calendarItems(db: DbState, nowMs: number): CalItem[] {
  const { upcoming, past } = myPlans(db, nowMs);
  const out: CalItem[] = [];
  for (const p of [...upcoming, ...past]) {
    const venue = p.venue ? (p.venue.short_name ?? p.venue.name) : null;
    const href = p.kind === "plan" ? `/app/pods/${p.podId}/plan/${p.id}` : `/app/pods/${p.podId}`;
    const ended = Date.parse(p.ends_at) <= nowMs;
    out.push({
      id: p.id,
      kind: p.locked ? "hangout" : "plan",
      podId: p.podId,
      podName: p.podName,
      title: p.title,
      line: p.locked ? (ended ? "Happened" : p.me === "going" ? "Locked · you're in" : "Locked") : p.me === "going" ? "You're in · waiting on the pod" : "Say if you're in",
      starts_at: p.starts_at,
      ends_at: p.ends_at,
      day: seattleDayKey(p.starts_at),
      href,
      needsYou: !p.locked && p.me !== "going",
      venue,
    });
    if (p.locked && ended && p.me === "going" && !p.checkedIn && nowMs - Date.parse(p.ends_at) < 3 * 86_400_000) {
      out.push({
        id: `${p.id}:checkin`, kind: "checkin", podId: p.podId, podName: p.podName, title: "Check in", line: `How was ${p.title.toLowerCase()}?`,
        starts_at: p.ends_at, ends_at: p.ends_at, day: seattleDayKey(p.ends_at), href: `/app/pods/${p.podId}`, needsYou: true, venue: null,
      });
    }
  }
  const names = Object.fromEntries(out.map((i) => [i.podId, i.podName]));
  for (const v of Object.values(db.votes ?? {})) {
    if (v.status !== "open" || !names[v.pod_id]) continue;
    const voted = !!(db.me && v.votes[db.me]);
    out.push({
      id: `${v.id}:vote`, kind: "vote", podId: v.pod_id, podName: names[v.pod_id], title: "Vote closes", line: voted ? "You voted" : "Pick the next hangout",
      starts_at: v.closes_at, ends_at: v.closes_at, day: seattleDayKey(v.closes_at), href: `/app/pods/${v.pod_id}`, needsYou: !voted, venue: null,
    });
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

// ── the subscribable feed ────────────────────────────────────────────────

/** Compact event for the feed URL: uid, title, start, end, location. */
export interface FeedEvent { u: string; t: string; s: string; e: string; l?: string }

export function feedEvents(items: CalItem[]): FeedEvent[] {
  return items
    .filter((i) => i.kind === "plan" || i.kind === "hangout")
    .map((i) => ({ u: i.id, t: `${i.title} · ${i.podName}`, s: i.starts_at, e: i.ends_at, ...(i.venue ? { l: i.venue } : {}) }));
}

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function encodeFeed(events: FeedEvent[]): string {
  return b64url(JSON.stringify(events));
}

export function decodeFeed(token: string): FeedEvent[] {
  try {
    const json = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is FeedEvent => !!x && typeof x.u === "string" && typeof x.t === "string" && !Number.isNaN(Date.parse(x.s)) && !Number.isNaN(Date.parse(x.e)))
      .slice(0, 200);
  } catch {
    return [];
  }
}

export function buildFeed(events: FeedEvent[], stamp: string, origin?: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pods//Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Pods", "X-PUBLISHED-TTL:PT6H"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.u.replace(/[^\w.-]/g, "")}@pods.app`,
      `DTSTAMP:${icsDate(stamp)}`,
      `DTSTART:${icsDate(e.s)}`,
      `DTEND:${icsDate(e.e)}`,
      `SUMMARY:${icsEscape(e.t.slice(0, 200))}`,
      ...(e.l ? [`LOCATION:${icsEscape(e.l.slice(0, 200))}`] : []),
      ...(origin ? [`URL:${origin}/app/calendar`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/** Links that subscribe each calendar app to the feed URL (https). */
export function subscribeLinks(feedUrl: string) {
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  return {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    apple: webcal,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=Pods`,
  };
}
