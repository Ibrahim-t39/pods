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
  if (!likes.length) return "No interests added yet.";
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

/* Reminders. They show in the app (Inbox and the day's card); nothing here claims a text is sent. */
export type ReminderKind = "plan" | "before" | "on";
export const REMINDER_KINDS: { key: ReminderKind; label: string; when: string }[] = [
  { key: "plan", label: "When a plan is ready", when: "when a plan is ready" },
  { key: "before", label: "The day before", when: "the day before" },
  { key: "on", label: "When it’s on", when: "2 hours before" },
];
export const DEFAULT_REMINDERS: Record<ReminderKind, boolean> = { plan: false, before: true, on: true };

/** "In the app, the day before and 2 hours before" · "Off. Plans still show in your Inbox" */
export function remindersHint(r: Record<ReminderKind, boolean>) {
  const on = REMINDER_KINDS.filter((k) => r[k.key]).map((k) => k.when);
  if (!on.length) return "Off. Plans still show in your Inbox";
  const list = on.length === 1 ? on[0] : `${on.slice(0, -1).join(", ")} and ${on[on.length - 1]}`;
  return `In the app, ${list}`;
}

/** Row value: "On" while any reminder is on, else "Off". */
export function remindersValue(r: Record<ReminderKind, boolean>) {
  return REMINDER_KINDS.some((k) => r[k.key]) ? "On" : "Off";
}

/** The value half of a line, for labelled fields: "Into basketball, guitar." → "basketball, guitar". */
export function valueOf(line: string, prefix: string) {
  const v = line.startsWith(prefix) ? line.slice(prefix.length) : line;
  return v.replace(/[.?]$/, "");
}
