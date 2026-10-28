// SEAT concept: pure read helpers over the real DbState (store/seed/repo stay the source of truth).
import { hash32 } from "@/lib/ids";
import { activeSuggestion, goingUserIds, myMemberships } from "@/lib/db/selectors";
import type { DbState, Hangout, HangoutSuggestion, ID, NextHangoutVote, Pod, Venue } from "@/lib/types";

export type Hue = "ember" | "signal" | "grove";
export const HUES: Record<Hue, { solid: string; tint: string; deep: string }> = {
  ember: { solid: "#FD6123", tint: "#F4D3BE", deep: "#40313F" },
  signal: { solid: "#1B78FE", tint: "#CFDDF3", deep: "#01627E" },
  grove: { solid: "#19C185", tint: "#CBE5D3", deep: "#315B26" },
};
/** Faces: the logo's three colours + the logo's three overlap colours. You are always ink. */
const DISC = ["#FD6123", "#1B78FE", "#19C185", "#40313F", "#01627E", "#315B26"];
export const discColor = (id: ID) => DISC[hash32(`seat:${id}`) % DISC.length];

const CITY = /\s*·\s*Huntsville\b|\bHuntsville\s+|\s+Huntsville\b|\bRocket City\s+/g;
/** Table names never carry the city (product rule): "Huntsville Hoopers" → "Hoopers". */
export function tableName(p: Pod): string {
  const n = p.name.replace(CITY, "").trim();
  return n || p.topic;
}
export function tableHue(p: Pod, index: number): Hue {
  if (p.type === "community") return "grove";
  return index % 2 === 0 ? "ember" : "signal";
}

export interface SeatPerson {
  id: ID;
  name: string;
  initial: string;
  color: string;
  me: boolean;
}

export interface MyTable {
  pod: Pod;
  name: string;
  hue: Hue;
  onDeck: boolean;
  size: number;
}

/** My tables in a stable order (active first, then on-deck), each with its hue. */
export function myTables(db: DbState): MyTable[] {
  const ms = myMemberships(db).filter((m) => db.pods[m.pod_id]);
  ms.sort((a, b) => (a.activation === b.activation ? 0 : a.activation === "active" ? -1 : 1) || a.pod_id.localeCompare(b.pod_id));
  // Hoopers first when present (the pod with the soonest plan), then the rest.
  const order = (id: string) => (id === "pod_hoopers" ? 0 : 1);
  ms.sort((a, b) => (a.activation === b.activation ? order(a.pod_id) - order(b.pod_id) : a.activation === "active" ? -1 : 1));
  return ms.map((m, i) => {
    const pod = db.pods[m.pod_id];
    return {
      pod,
      name: tableName(pod),
      hue: tableHue(pod, i),
      onDeck: m.activation === "on_deck",
      size: db.memberships.filter((x) => x.pod_id === pod.id && !x.left_at).length,
    };
  });
}

export function people(db: DbState, podId: ID): SeatPerson[] {
  const list = db.memberships
    .filter((m) => m.pod_id === podId && !m.left_at)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => {
      const name = u.nickname?.trim() || u.first_name || "You";
      return { id: u.id, name, initial: name.slice(0, 1).toUpperCase(), color: u.id === db.me ? "#1E1B17" : discColor(u.id), me: u.id === db.me };
    });
  // Me first (6 o'clock), then a stable order.
  list.sort((a, b) => (a.me ? -1 : b.me ? 1 : hash32(a.id) - hash32(b.id)));
  return list;
}

export type Phase =
  | { kind: "closed" } // on-deck table
  | { kind: "quiet" } // no plan yet
  | { kind: "plan"; s: HangoutSuggestion; going: ID[]; imIn: boolean }
  | { kind: "locked"; s: HangoutSuggestion | undefined; h: Hangout; going: ID[] }
  | { kind: "after"; h: Hangout; mine: null; checkedIn: boolean }
  | { kind: "waiting"; h: Hangout; mine: string }
  | { kind: "revealed"; h: Hangout; yes: number; answered: number }
  | { kind: "vote"; h: Hangout; v: NextHangoutVote; options: HangoutSuggestion[]; counts: number[]; myPick: ID | null; yes: number };

export function phaseOf(db: DbState, podId: ID): Phase {
  const me = db.me;
  const m = db.memberships.find((x) => x.pod_id === podId && x.user_id === me && !x.left_at);
  if (m?.activation === "on_deck") return { kind: "closed" };
  const hs = Object.values(db.hangouts)
    .filter((h) => h.pod_id === podId && h.status !== "cancelled")
    .sort((a, b) => a.sequence - b.sequence);
  const last = hs[hs.length - 1];
  if (last && (last.status === "upcoming" || last.status === "in_progress")) {
    return { kind: "locked", h: last, s: db.suggestions[last.suggestion_id], going: goingUserIds(db, last.id) };
  }
  if (last && last.status === "done") {
    const rib = db.runItBack[last.id];
    const mine = me ? rib?.responses[me] : undefined;
    const yes = Object.values(rib?.responses ?? {}).filter((a) => a === "yes").length;
    const answered = Object.keys(rib?.responses ?? {}).length;
    const v = Object.values(db.votes).find((x) => x.pod_id === podId && x.status === "open");
    if (v && rib?.revealed_at) {
      const options = v.option_ids.map((id) => db.suggestions[id]).filter(Boolean);
      const counts = options.map((o) => Object.values(v.votes).filter((x) => x === o.id).length);
      return { kind: "vote", h: last, v, options, counts, myPick: (me && v.votes[me]) || null, yes };
    }
    if (!mine) {
      const checkedIn = db.rsvps.some((r) => r.hangout_id === last.id && r.user_id === me && r.checked_in);
      return { kind: "after", h: last, mine: null, checkedIn };
    }
    if (!rib?.revealed_at) return { kind: "waiting", h: last, mine };
    return { kind: "revealed", h: last, yes, answered };
  }
  const s = activeSuggestion(db, podId);
  if (s && (s.status === "suggested" || s.status === "accepted")) {
    const going = goingUserIds(db, s.id);
    return { kind: "plan", s, going, imIn: !!me && going.includes(me) };
  }
  return { kind: "quiet" };
}

/** The next thing on any of my tables (for the room's lamp). */
export function nextTableId(db: DbState, tables: MyTable[]): ID | null {
  let best: { id: ID; t: number } | null = null;
  for (const t of tables) {
    if (t.onDeck) continue;
    const ph = phaseOf(db, t.pod.id);
    const at = ph.kind === "plan" ? ph.s.starts_at : ph.kind === "locked" ? ph.h.starts_at : null;
    const score = ph.kind === "after" || ph.kind === "vote" || ph.kind === "waiting" || ph.kind === "revealed" ? 0 : at ? Date.parse(at) : Infinity;
    if (score !== Infinity && (!best || score < best.t)) best = { id: t.pod.id, t: score };
  }
  return best?.id ?? tables.find((t) => !t.onDeck)?.pod.id ?? null;
}

// ── formatting (Chicago time, short) ───────────────────────────────────
const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function parts(iso: string) {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  const h = Number(iso.slice(11, 13));
  const mi = iso.slice(14, 16);
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return { y, mo, d, h, mi, wd };
}
/** "Sun" */
export const dayShort = (iso: string) => {
  const p = parts(iso);
  return DOW[p.wd][0].toUpperCase() + DOW[p.wd].slice(1);
};
/** "1 PM" / "6:30 PM" */
export const hourLabel = (iso: string) => {
  const p = parts(iso);
  const h12 = ((p.h + 11) % 12) + 1;
  return `${h12}${p.mi === "00" ? "" : `:${p.mi}`} ${p.h < 12 ? "AM" : "PM"}`;
};
/** "nov 8" */
export const dateShort = (iso: string) => {
  const p = parts(iso);
  return `${MON[p.mo - 1]} ${p.d}`;
};

export function venueOf(db: DbState, id: ID | null | undefined): Venue | undefined {
  return id ? db.venues[id] : undefined;
}
export const venueName = (v: Venue | undefined) => (v ? (v.short_name ?? v.name) : "");

/** 2-word margin captions for the four dealt objects (PB 1.4). Derived from the plan + its trace, never invented. */
export function captions(s: HangoutSuggestion, v: Venue | undefined, rain: Venue | undefined) {
  const m = /(\d+) of (\d+)/.exec(s.plan_json.reason ?? "");
  return {
    time: m ? `${m[1]} of ${m[2]} free` : "most are free",
    place: v?.is_public ? "public · checked" : "checked",
    weather: v?.indoor ? "indoors" : "outside",
    rain: v?.indoor ? "rain-proof" : rain ? `rain → ${(rain.short_name ?? rain.name).split(" ").slice(0, 2).join(" ").toLowerCase()}` : "new time if wet",
  };
}

/** One mono line per planner step, short enough for the table rim. */
export function rimLine(step: { id: string; label: string; detail?: string }): string {
  const d = (step.detail ?? "").replace(/Huntsville\s*/g, "").replace(/\s+·\s+/g, " · ");
  switch (step.id) {
    case "pod":
      return (d.split(" · ").slice(1).join(" · ") || "reading the table").toLowerCase();
    case "time":
      return (d.split(" · ")[0] || "finding a time").toLowerCase();
    case "venues":
      return (d.split(" · ")[0] || "checking places").toLowerCase();
    case "weather":
      return d ? d.toLowerCase().replace("indoor venue, so the forecast doesn't change the plan", "indoors, forecast can't touch it") : "checking the sky";
    case "context":
      return (d || "what worked last time").toLowerCase();
    case "repeat":
      return (d || "keeping what worked").toLowerCase();
    case "draft":
      return "laying the table";
    case "validate":
      return "checked: public · under $15 · daytime";
    default:
      return step.label.toLowerCase();
  }
}
