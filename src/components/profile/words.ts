// Your seat (Y01) speaks in sentences built from what the person told us. Pure helpers, no store access.
// Copy rules: DESIGN.md §8 (plain host, full stops on display lines, no em dashes). Wireframe Y01.
import type { Slot } from "@/lib/types";

/** Short spoken nouns for the interest list ("Into basketball, guitar."). Unknown ids fall back to the lowercased label. */
const SHORT: Record<string, string> = {
  basketball: "basketball",
  pickleball: "pickleball",
  running: "running",
  hiking: "hiking",
  climbing: "climbing",
  soccer: "soccer",
  disc_golf: "disc golf",
  guitar: "guitar",
  music_making: "music",
  board_games: "board games",
  books: "books",
  art: "art",
  photography: "photography",
  volunteering: "volunteering",
};

export function shortLike(id: string, label: string) {
  return SHORT[id] ?? label.toLowerCase();
}

/** "Into basketball, guitar." · "Into basketball, guitar, +2." · "Into nothing yet." */
export function likesLine(likes: { id: string; label: string }[]) {
  if (!likes.length) return "Into nothing yet.";
  const words = likes.map((l) => shortLike(l.id, l.label));
  if (words.length <= 2) return `Into ${words.join(", ")}.`;
  return `Into ${words.slice(0, 2).join(", ")}, +${words.length - 2}.`;
}

const PARTS = ["morning", "afternoon", "evening"] as const;

/** "Free weekends, afternoons." · "Free Sundays, all day." · "Free weeknights." · "Free when?" */
export function freeLine(slots: Slot[]) {
  if (!slots.length) return "Free when?";
  const sat = PARTS.filter((p) => slots.includes(`saturday-${p}` as Slot));
  const sun = PARTS.filter((p) => slots.includes(`sunday-${p}` as Slot));
  const nights = slots.includes("weekday-evening");
  const days: string[] = [];
  if (nights) days.push("weeknights");
  if (sat.length && sun.length) days.push("weekends");
  else if (sat.length) days.push("Saturdays");
  else if (sun.length) days.push("Sundays");
  const parts = [...new Set([...sat, ...sun])];
  const when = !parts.length ? "" : parts.length === 3 ? "all day" : parts.map((p) => `${p}s`).join(" and ");
  if (nights && !parts.length) return "Free weeknights.";
  return `Free ${days.join(", ")}${when && !nights ? `, ${when}` : ""}.`;
}

export type TextKind = "on" | "before" | "plan";
export const TEXT_KINDS: { key: TextKind; label: string; line: string }[] = [
  { key: "on", label: "When it’s on", line: "Texts when it’s on." },
  { key: "before", label: "The day before", line: "Texts the day before." },
  { key: "plan", label: "When a plan is ready", line: "Texts when a plan’s ready." },
];

export function textsLine(sms: boolean, kinds: Record<TextKind, boolean>) {
  const on = TEXT_KINDS.filter((k) => kinds[k.key]);
  if (!sms || !on.length) return "Texts off.";
  if (on.length === 1) return on[0].line;
  return `${on[0].line.slice(0, -1)}, +${on.length - 1}.`;
}
