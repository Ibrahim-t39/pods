// Call concept: pure helpers that turn store records into the few words a call needs.
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";
import type { DbState, ID, PlannerStep, Pod, Slot, Venue } from "@/lib/types";

const CITY = /\b(Seattle|Emerald City|Bellevue|Shoreline|Washington|UW|WA)\b,?/g;
export const noCity = (s: string) => s.replace(/\s*·\s*Seattle/gi, "").replace(CITY, "").replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();

const TOPIC_WORD: Record<string, string> = {
  basketball: "Hoops", guitar: "Strings", pickleball: "Pickleball", running: "Runs", hiking: "Trails", climbing: "Climbing",
  soccer: "Kickabout", disc_golf: "Disc golf", music_making: "Music", board_games: "Game night", books: "Books", art: "Studio",
  photography: "Photo walks", volunteering: "Giving", sda: "Adventist", muslim: "Muslim",
};
export function podWord(pod: Pod | undefined | null): string {
  if (!pod) return "";
  return TOPIC_WORD[pod.topic_key] ?? noCity(pod.topic.replace(/^./, (c) => c.toUpperCase()));
}

/** A person's index reads as the logo: interest pods take ember then signal, community pods take grove. */
export function podHue(pods: Pod[], pod: Pod): "ember" | "signal" | "grove" {
  if (pod.type === "community") return "grove";
  const interest = pods.filter((p) => p.type === "interest");
  return interest.indexOf(pod) % 2 === 1 ? "signal" : "ember";
}

/** The generic place word used in the call before lock ("the courts"); the venue's own name replaces it at lock. */
export function placeWord(venue: Venue | null | undefined, topicKey?: string): string {
  if (topicKey === "basketball") return "the courts";
  if (topicKey === "soccer") return "the pitch";
  if (topicKey === "pickleball") return "the courts";
  if (!venue) return "somewhere close";
  const m: Record<Venue["type"], string> = {
    park: "the park", court: "the courts", library: "the library", cafe: "the café", community_center: "the rec",
    museum: "the museum", trail: "the trail", studio: "the studio", restaurant: "dinner", church_hall: "the hall", campus: "campus",
  };
  return m[venue.type] ?? "somewhere close";
}
export const venueWord = (v: Venue | null | undefined) => (v ? noCity(v.short_name ?? v.name).replace(/\bRecreation Center\b/, "Rec Center") : "");

export const dayWord = (iso: string) => formatInTimeZone(iso, TZ, "EEEE");
export function hourWord(iso: string): string {
  const m = formatInTimeZone(iso, TZ, "mm");
  return formatInTimeZone(iso, TZ, m === "00" ? "h" : "h:mm") + formatInTimeZone(iso, TZ, "aaa").replace(/\./g, "");
}
export function ordinal(iso: string): string {
  const d = Number(formatInTimeZone(iso, TZ, "d"));
  const s = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
  return `${d}${s}`;
}
export const dateShort = (iso: string) => formatInTimeZone(iso, TZ, "EEE MMM d").toLowerCase();

export function firstName(db: DbState, id: ID): string {
  const u = db.users[id];
  return u?.nickname || u?.first_name || "someone";
}
export const initial = (name: string) => (name.trim()[0] ?? "·").toUpperCase();

export function tone(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String(h % 7);
}

/** Trace rows as one short mono line each. Never shows build or provenance chatter. */
export function traceLine(s: Pick<PlannerStep, "id" | "label" | "detail">): string {
  const label = s.label.replace(/…|\.\.\./g, "").toLowerCase();
  let d = (s.detail ?? "").replace(/pre-?written[^·]*/i, "").replace(/\b(demo|sample|simulated)\b/gi, "");
  d = noCity(d).replace(/✓/g, "·").replace(/\s*·\s*·\s*/g, " · ").replace(/\s{2,}/g, " ").replace(/^[\s·]+|[\s·]+$/g, "").toLowerCase();
  if (s.id === "draft") return "drafted the plan";
  return d ? `${label} — ${d}` : label;
}

/** "Sun afternoon: 7 of 8 free · Sat morning: 4 of 8 free" → "7 of 8 free" */
export function freeLine(trace: PlannerStep[] | undefined): string | null {
  const t = trace?.find((x) => x.id === "time")?.detail;
  if (!t) return null;
  const m = /(\d+) of (\d+)/.exec(t);
  return m ? `${m[1]} of ${m[2]} free` : null;
}

export const INTEREST_WORDS: Record<string, string> = {
  basketball: "hoops", pickleball: "pickleball", running: "running", hiking: "hiking", climbing: "climbing", soccer: "soccer",
  disc_golf: "disc golf", guitar: "guitar", music_making: "music", board_games: "board games", books: "books", art: "art",
  photography: "photos", volunteering: "volunteering",
};

export const SLOT_WORDS: { id: Slot; w: string }[] = [
  { id: "weekday-evening", w: "weeknights" },
  { id: "saturday-morning", w: "sat mornings" },
  { id: "saturday-afternoon", w: "sat afternoons" },
  { id: "saturday-evening", w: "sat nights" },
  { id: "sunday-morning", w: "sun mornings" },
  { id: "sunday-afternoon", w: "sun afternoons" },
  { id: "sunday-evening", w: "sun nights" },
];

/** Font size for a call so the longest row fits: big when short, steps down for long venue names. */
export function fitSize(rows: string[], width: number, max: number, min = 40, em = 0.47): number {
  const longest = Math.max(...rows.map((r) => r.length), 1);
  // Newsreader at opsz 72 averages about 0.47 em per character.
  return Math.round(Math.max(min, Math.min(max, (width / (longest * em)))));
}
