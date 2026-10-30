// planner_loop · the table's view model (V3_SPEC §6.4; wireframes D01-D16, E01-E07).
// Pure reads over the store + cardView. Counts only (BLUEPRINT D11): no reasons for absence, no names in "why".
"use client";

import { useCallback } from "react";
import { useDb } from "@/lib/db/hooks";
import { cardView, type CardView } from "@/lib/planner/card-state";
import { myMemberships } from "@/lib/db/selectors";
import { useClock } from "@/lib/time/clock";
import type { DbState, HangoutSuggestion, ID, Pod, Venue } from "@/lib/types";
import type { PodHueKey, Seat } from "@/components/brand";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";
import { planTime, planWeekday } from "../plan-display";

export interface Person {
  id: ID;
  name: string;
  initial: string;
  me: boolean;
}

const CITY =
  /\s*·\s*Seattle\b|\bSeattle\s+|\s+Seattle\b|\bEmerald City\s+/g;
/** Pod names never carry the city (product rule 5). */
export const podName = (p: Pod) => p.name.replace(CITY, "").trim() || p.topic;

/** Colour means the pod (DESIGN §4): community = grove, first interest pod = ember, a second interest pod = signal. */
export function podHue(db: DbState, podId: ID): PodHueKey {
  const pod = db.pods[podId];
  if (!pod) return "ember";
  if (pod.type === "community") return "grove";
  const interest = myMemberships(db)
    .filter(
      (m) =>
        db.pods[m.pod_id]?.type === "interest" && m.activation !== "on_deck",
    )
    .sort(
      (a, b) =>
        a.joined_at.localeCompare(b.joined_at) ||
        a.pod_id.localeCompare(b.pod_id),
    )
    .map((m) => m.pod_id);
  return interest.indexOf(podId) === 1 ? "signal" : "ember";
}

export function peopleOf(db: DbState, podId: ID): Person[] {
  return db.memberships
    .filter((m) => m.pod_id === podId && !m.left_at)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => {
      const name = u.nickname?.trim() || u.first_name || "You";
      return {
        id: u.id,
        name,
        initial: name.slice(0, 1).toUpperCase(),
        me: u.id === db.me,
      };
    });
}

/** "Miller" from "Miller Community Center". */
export function placeWord(v: Venue | null | undefined): string {
  if (!v) return "A public place";
  const n = (v.short_name || v.name)
    .replace(/\s*(Recreation|Rec|Community)\s+Center$/i, "")
    .replace(/^Dr\.\s+/, "")
    .trim();
  return n || v.name;
}

/** The rain plan as one word: "gym", "library", "indoors" (wireframe D10 "rain: gym"). */
export function rainWord(v: Venue | null | undefined): string {
  if (!v) return "indoors";
  const t: Partial<Record<Venue["type"], string>> = {
    court: "gym",
    community_center: "gym",
    library: "library",
    cafe: "café",
    museum: "museum",
    studio: "studio",
  };
  return t[v.type] ?? "indoors";
}

/** "10am" / "10:30am" in Seattle time (plan-display, one style app-wide). */
export const hm = (iso: string) => planTime(iso);
export const weekday = (iso: string) => planWeekday(iso);
export const wd3 = (iso: string) => formatInTimeZone(iso, TZ, "EEE");

/** "7 of 8 of you are free…" → { free: 7, of: 8 }. Counts only. */
export function freeCount(
  s: HangoutSuggestion | null,
): { free: number; of: number } | null {
  const src = `${s?.plan_json.reason ?? ""} ${s?.trace.find((t) => t.id === "time")?.detail ?? ""}`;
  const m = /(\d+)\s+of\s+(?:the\s+)?(\d+)/i.exec(src);
  return m ? { free: +m[1], of: +m[2] } : null;
}
export const freeWords = (f: { free: number; of: number } | null) =>
  !f
    ? "free times"
    : f.free >= f.of
      ? "everyone's free"
      : `${f.free} of ${f.of} free`;

export function placesCount(s: HangoutSuggestion | null): number | null {
  const m = /(\d+)\s+public place/i.exec(
    s?.trace.find((t) => t.id === "venues")?.detail ?? "",
  );
  return m ? +m[1] : null;
}

function ageOf(dob: string, nowMs: number) {
  const b = new Date(dob);
  const n = new Date(nowMs);
  let a = n.getFullYear() - b.getFullYear();
  if (
    n.getMonth() < b.getMonth() ||
    (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())
  )
    a--;
  return a;
}

/** Everyone who said "I'm in" to a hangout or checked in at it. */
function attendeeIds(db: DbState, hangoutId: ID): ID[] {
  return [
    ...new Set(
      db.rsvps
        .filter(
          (r) =>
            r.hangout_id === hangoutId &&
            (r.status === "going" || r.checked_in),
        )
        .map((r) => r.user_id),
    ),
  ];
}

export interface TableModel {
  view: CardView;
  pod: Pod;
  name: string;
  hue: PodHueKey;
  people: Person[];
  me: Person | null;
  /** the plan in front of you (the active suggestion, or the last hangout's plan in the after phases) */
  plan: HangoutSuggestion | null;
  venue: Venue | null;
  rainVenue: Venue | null;
  iso: string | null;
  ages: [number, number] | null;
  unread: number;
  hereCount: number;
  hereIds: ID[];
  /** run it back: answers in (count only) and how many checked in at the last hangout */
  answered: number;
  went: number;
  /** who was in for the last hangout (the one denominator for run it back and the vote) */
  attended: number;
  /** the last hangout's people (initials and names), for the after screens */
  attendees: Person[];
  nowMs: number;
}

export function useTable(podId: ID): TableModel | null {
  const now = useClock(15_000).getTime();
  const sel = useCallback(
    (db: DbState): TableModel | null => {
      const view = cardView(db, podId, now);
      const pod = db.pods[podId];
      if (!view || !pod) return null;
      const after = [
        "check_in",
        "ballot",
        "waiting_reveal",
        "planning_next",
        "missed",
      ].includes(view.phase);
      const plan =
        (after && view.lastHangout
          ? db.suggestions[view.lastHangout.suggestion_id]
          : null) ?? view.suggestion;
      const venueId = view.hangout?.venue_id ?? plan?.venue_id;
      const venue = venueId ? (db.venues[venueId] ?? null) : null;
      const rainId = plan?.plan_json.rain_venue_id;
      const people = peopleOf(db, podId);
      const ages = people
        .map((p) => db.users[p.id]?.date_of_birth)
        .filter(Boolean)
        .map((d) => ageOf(d, now));
      const hId = view.hangout?.id;
      const here = hId
        ? db.rsvps
            .filter((r) => r.hangout_id === hId && r.checked_in)
            .map((r) => r.user_id)
        : [];
      const lh = view.lastHangout?.id;
      return {
        view,
        pod,
        name:
          pod.type === "community" && db.config.flags.maskCommunityInApp
            ? "Community pod"
            : podName(pod),
        hue: podHue(db, podId),
        people,
        me: people.find((p) => p.me) ?? null,
        plan,
        venue,
        rainVenue: rainId ? (db.venues[rainId] ?? null) : null,
        iso: view.hangout?.starts_at ?? plan?.starts_at ?? null,
        ages: ages.length ? [Math.min(...ages), Math.max(...ages)] : null,
        unread: 0,
        hereCount: here.length,
        hereIds: here,
        answered: lh
          ? Object.keys(db.runItBack[lh]?.responses ?? {}).length
          : 0,
        went: lh
          ? db.rsvps.filter((r) => r.hangout_id === lh && r.checked_in).length
          : 0,
        attended: lh ? attendeeIds(db, lh).length : 0,
        attendees: lh
          ? people.filter((p) => attendeeIds(db, lh).includes(p.id))
          : [],
        nowMs: now,
      };
    },
    [podId, now],
  );
  return useDb(sel);
}

/**
 * Seats for the ring. Until it locks: one seat per member (8 in a full pod; COLOR_LIFE §13), yours at 6 o'clock,
 * then everyone who is in, then dashed open seats (the count is the form; the first `threshold` seats are the lock
 * arc). After the lock: everyone going, up to 6, plus your seat if you are not in yet (D07).
 */
export function seatsFor(
  m: TableModel,
  opts: { all?: boolean; here?: boolean } = {},
): { seats: Seat[]; n: number } {
  const { view, people, me } = m;
  const going = new Set(view.going);
  const others = people.filter((p) => !p.me && going.has(p.id));
  const meIn = !!me && going.has(me.id);
  const here = new Set(opts.here ? m.hereIds : []);
  const you: Seat = {
    initial: me?.initial ?? "",
    name: "you",
    in: meIn || !!opts.all,
    here: !!me && here.has(me.id),
  };
  if (view.locked || opts.all) {
    const list = others
      .slice(0, 5)
      .map<Seat>((p) => ({
        initial: p.initial,
        name: p.name,
        in: true,
        here: here.has(p.id),
      }));
    const seats = [you, ...list];
    return { seats, n: Math.max(view.threshold, seats.length) };
  }
  const n = Math.min(8, Math.max(view.threshold, people.length));
  const list = others
    .slice(0, n - 1)
    .map<Seat>((p) => ({ initial: p.initial, name: p.name, in: true }));
  while (list.length < n - 1) list.push({ open: true });
  return { seats: [you, ...list], n };
}

/** Who made this plan, as users read it: "Planned by AI" (never the model's name), "Proposed by Malik", or
 *  "Planned from free times" (the no-AI path). */
export function sourceLine(s: HangoutSuggestion | null): string {
  if (!s) return "";
  if (s.source === "claude" || s.source === "seed") return "Planned by AI";
  if ((s.source as string) === "member")
    return /^Proposed by /.test(s.plan_json.reason ?? "")
      ? s.plan_json.reason.replace(/\.$/, "")
      : "Proposed by the pod";
  return "Planned from free times";
}
