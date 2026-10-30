// Admin read helpers (pure, store-only). Every number on an admin screen comes from here, so each one has a single
// definition: "seated" = members who have not left; "locked" = a plan with its own min_to_lock (lockMinFor) or more "I'm in";
// "held" = 3 or more checked in (library H #1); hours together = the length of every held hangout (H #2, admin only).
import type { DbState, Hangout, HangoutSuggestion, Pod, ReportReason } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";
import type { PodHueKey } from "@/components/brand/disc";

export const HELD_MIN = 3;

/** Report reasons, word for word with the member's "What happened?" sheet (V3_SPEC 6.5). */
export const REASON: Record<ReportReason, string> = {
  unsafe: "Felt unsafe",
  harassment: "Harassment",
  fake_profile: "Fake profile",
  spam: "Spam",
  other: "Something else",
};

export const DONE: Record<string, string> = {
  warn: "Warned",
  suspend: "Kept paused",
  ban: "Removed",
  dismiss: "Dismissed",
};

export const hueOf = (pod: Pod | undefined): PodHueKey => pod?.hue ?? (pod?.type === "community" ? "grove" : "ember");

/** "2h", "1d", "3w": the queue's age column. */
export function age(iso: string, now: number): string {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 14 ? `${d}d` : `${Math.round(d / 7)}w`;
}

export const weekday = (iso: string) => formatInTimeZone(iso, "America/Chicago", "EEE");

export const seated = (db: DbState, podId: string) => db.memberships.filter((m) => m.pod_id === podId && !m.left_at).length;

export const goingCount = (db: DbState, id: string) => db.rsvps.filter((r) => r.hangout_id === id && r.status === "going").length;
export const hereCount = (db: DbState, id: string) => db.rsvps.filter((r) => r.hangout_id === id && r.checked_in).length;

const ended = (h: Hangout, now: number) => h.status === "done" || Date.parse(h.ends_at) <= now;

/** Hours a pod has spent together: the length of each held hangout. */
export function hoursTogether(db: DbState, podId: string, now: number): number {
  let ms = 0;
  for (const h of Object.values(db.hangouts)) {
    if (h.pod_id !== podId || h.status === "cancelled" || !ended(h, now)) continue;
    if (hereCount(db, h.id) >= HELD_MIN) ms += Date.parse(h.ends_at) - Date.parse(h.starts_at);
  }
  return Math.round(ms / 3_600_000);
}

/** The pod's open plan (before lock): the option with the most "I'm in". */
export function openPlan(db: DbState, podId: string): { s: HangoutSuggestion; going: number } | null {
  let best: { s: HangoutSuggestion; going: number } | null = null;
  for (const s of Object.values(db.suggestions)) {
    if (s.pod_id !== podId || s.status !== "suggested") continue;
    const going = goingCount(db, s.id);
    if (!best || going > best.going) best = { s, going };
  }
  return best;
}

/** Where a pod is in its rounds: "#1 locked", "#2 Sat", "#1 held", "planning", "forming". */
export function roundState(db: DbState, pod: Pod, now: number): string {
  if (pod.status === "closed") return "closed";
  const hs = Object.values(db.hangouts)
    .filter((h) => h.pod_id === pod.id && h.status !== "cancelled")
    .sort((a, b) => b.sequence - a.sequence || b.starts_at.localeCompare(a.starts_at));
  const h = hs[0];
  if (h && !ended(h, now)) return h.sequence === 1 ? "#1 locked" : `#${h.sequence} ${weekday(h.starts_at)}`;
  if (openPlan(db, pod.id)) return `#${(h?.sequence ?? 0) + 1} planning`;
  if (h) return hereCount(db, h.id) >= HELD_MIN ? `#${h.sequence} held` : `#${h.sequence} done`;
  return pod.status === "forming" ? "forming" : "planning";
}
