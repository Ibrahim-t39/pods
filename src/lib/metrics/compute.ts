// [U9] Spec success metrics over the local DB (ARCHITECTURE §12). Pure: pass the DB and a clock ms.
// Every figure here is computed from SYNTHETIC seed history; the admin pages say so.
import type { DbState, Hangout, ID, Pod } from "@/lib/types";

const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(iso);

export interface MetricValue {
  value: number | null; // pct 0-100, or a rate
  num: number;
  den: number;
}
export interface MetricSet {
  signupToVerified: MetricValue;
  fit: MetricValue;
  repeat: MetricValue;
  retention: MetricValue;
  reportsPer100: MetricValue;
  signups: number;
}

const ratio = (num: number, den: number, scale = 100): MetricValue => ({
  value: den > 0 ? (num / den) * scale : null,
  num,
  den,
});

interface Checkin {
  user: ID;
  hangout: Hangout;
  at: number;
}

export function checkins(db: DbState): Checkin[] {
  const out: Checkin[] = [];
  for (const r of db.rsvps) {
    if (!r.checked_in) continue;
    const h = db.hangouts[r.hangout_id];
    if (!h) continue;
    out.push({ user: r.user_id, hangout: h, at: ms(r.checked_in_at ?? h.starts_at) });
  }
  return out;
}

function placedAt(db: DbState): Map<ID, number> {
  const m = new Map<ID, number>();
  for (const x of db.memberships) {
    const t = ms(x.joined_at);
    const cur = m.get(x.user_id);
    if (cur === undefined || t < cur) m.set(x.user_id, t);
  }
  return m;
}

/** All five spec metrics as of instant `t` (ms). */
export function metricsAt(db: DbState, t: number): MetricSet {
  const users = Object.values(db.users).filter((u) => u.status !== "deleted" && ms(u.created_at) <= t);
  const verified = users.filter((u) => u.verified && u.verified_at && ms(u.verified_at) <= t);
  const placed = placedAt(db);
  const cis = checkins(db).filter((c) => c.at <= t);

  // Fit: verified & placed users with a check-in within 7 days of first placement
  const verifiedPlaced = verified.filter((u) => (placed.get(u.id) ?? Infinity) <= t);
  const fitNum = verifiedPlaced.filter((u) => {
    const p = placed.get(u.id)!;
    return cis.some((c) => c.user === u.id && c.at >= p && c.at <= p + 7 * DAY);
  }).length;

  // Repeat: pods with a done starter / those also with a done sequence>=2 hangout that has a check-in
  const done = (h: Hangout) => h.status !== "cancelled" && ms(h.ends_at) <= t;
  const hangouts = Object.values(db.hangouts);
  const starterPods = new Set(hangouts.filter((h) => h.sequence === 1 && done(h)).map((h) => h.pod_id));
  const repeatPods = new Set(
    hangouts.filter((h) => h.sequence >= 2 && done(h) && cis.some((c) => c.hangout.id === h.id)).map((h) => h.pod_id),
  );
  const repeatNum = [...starterPods].filter((p) => repeatPods.has(p)).length;

  // Retention: placed >= 30 days ago, >= 2 check-ins within 30 days of placement
  const old = users.filter((u) => (placed.get(u.id) ?? Infinity) <= t - 30 * DAY);
  const retNum = old.filter((u) => {
    const p = placed.get(u.id)!;
    return cis.filter((c) => c.user === u.id && c.at >= p && c.at <= p + 30 * DAY).length >= 2;
  }).length;

  const doneCount = hangouts.filter(done).length;
  const reports = Object.values(db.reports).filter((r) => ms(r.created_at) <= t).length;

  return {
    signupToVerified: ratio(verified.length, users.length),
    fit: ratio(fitNum, verifiedPlaced.length),
    repeat: ratio(repeatNum, starterPods.size),
    retention: ratio(retNum, old.length),
    reportsPer100: ratio(reports, doneCount),
    signups: users.length,
  };
}

export type MetricKey = Exclude<keyof MetricSet, "signups">;

/** Six weekly points ending at `nowMs` (oldest first). */
export function metricSeries(db: DbState, nowMs: number, points = 6): { at: number; set: MetricSet }[] {
  return Array.from({ length: points }, (_, i) => {
    const at = nowMs - (points - 1 - i) * 7 * DAY;
    return { at, set: metricsAt(db, at) };
  });
}

export function funnel(db: DbState): { key: string; label: string; count: number }[] {
  const placed = new Set(db.memberships.filter((m) => !m.left_at).map((m) => m.user_id));
  const going = new Set(db.rsvps.filter((r) => r.status === "going").map((r) => r.user_id));
  const cis = checkins(db);
  const checked = new Set(cis.map((c) => c.user));
  const voted = new Set<ID>();
  for (const v of Object.values(db.votes)) for (const u of Object.keys(v.votes)) voted.add(u);
  for (const r of Object.values(db.runItBack)) for (const u of Object.keys(r.responses)) voted.add(u);
  const byUser = new Map<ID, Set<ID>>();
  for (const c of cis) byUser.set(c.user, (byUser.get(c.user) ?? new Set()).add(c.hangout.id));
  const again = [...byUser.values()].filter((s) => s.size >= 2).length;
  return [
    { key: "placed", label: "Placed", count: placed.size },
    { key: "rsvp", label: "RSVP'd", count: going.size },
    { key: "checkin", label: "Checked in", count: checked.size },
    { key: "voted", label: "Voted", count: voted.size },
    { key: "again", label: "Met again", count: again },
  ];
}

export type PodState = "forming" | "active" | "quiet" | "closed";

/** "quiet" = active but nothing upcoming and nothing held for 21+ days. */
export function podState(db: DbState, pod: Pod, nowMs: number): PodState {
  if (pod.status === "closed") return "closed";
  if (pod.status === "forming") return "forming";
  const hs = Object.values(db.hangouts).filter((h) => h.pod_id === pod.id && h.status !== "cancelled");
  const upcoming = hs.some((h) => ms(h.ends_at) > nowMs);
  const last = Math.max(0, ...hs.map((h) => ms(h.ends_at)));
  return !upcoming && last > 0 && nowMs - last > 21 * DAY ? "quiet" : "active";
}

export interface AttentionItem {
  id: string;
  kind: "urgent_report" | "stuck_forming" | "low_rsvps" | "no_second";
  podId: ID | null;
  reportId?: ID;
  title: string;
  detail: string;
}

export function needsAttention(db: DbState, nowMs: number): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const r of Object.values(db.reports)) {
    if (r.status === "open" && r.urgent) {
      out.push({ id: `rep_${r.id}`, kind: "urgent_report", podId: r.pod_id, reportId: r.id, title: "Urgent report open", detail: "Review target 1 hour" });
    }
  }
  const members = (pid: ID) => db.memberships.filter((m) => m.pod_id === pid && !m.left_at).length;
  for (const p of Object.values(db.pods)) {
    if (p.status === "forming" && nowMs - ms(p.created_at) > 7 * DAY) {
      out.push({ id: `forming_${p.id}`, kind: "stuck_forming", podId: p.id, title: "Still forming after 7 days", detail: `${members(p.id)} members` });
    }
  }
  const lock = db.config.planner.lockThreshold;
  for (const h of Object.values(db.hangouts)) {
    const start = ms(h.starts_at);
    if (h.status === "upcoming" && start > nowMs && start - nowMs < DAY) {
      const going = db.rsvps.filter((r) => r.hangout_id === h.id && r.status === "going").length;
      if (going < lock) out.push({ id: `low_${h.id}`, kind: "low_rsvps", podId: h.pod_id, title: "Low RSVPs, under 24 hours out", detail: `${going} going, locks at ${lock}` });
    }
  }
  for (const p of Object.values(db.pods)) {
    if (p.status !== "active") continue;
    const hs = Object.values(db.hangouts).filter((h) => h.pod_id === p.id && h.status !== "cancelled");
    const starterDone = hs.some((h) => h.sequence === 1 && ms(h.ends_at) <= nowMs);
    const hasSecond = hs.some((h) => h.sequence >= 2);
    const pendingPlan = Object.values(db.suggestions).some((s) => s.pod_id === p.id && s.round >= 2 && s.status !== "replaced");
    if (starterDone && !hasSecond && !pendingPlan) {
      out.push({ id: `second_${p.id}`, kind: "no_second", podId: p.id, title: "No hangout #2 planned", detail: "Starter is done" });
    }
  }
  return out;
}

export type PlannerHealth = { label: "Claude live" | "Fallback mode" | "Seeded plans"; tone: "success" | "warning" | "neutral" };
export function plannerHealth(db: DbState): PlannerHealth {
  const s = Object.values(db.suggestions).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = s.find((x) => x.source !== "seed" && x.source !== "admin");
  if (!latest) return { label: "Seeded plans", tone: "neutral" };
  return latest.source === "claude" ? { label: "Claude live", tone: "success" } : { label: "Fallback mode", tone: "warning" };
}
