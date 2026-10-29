// First-run words: the short, lowercase word a like or a free time takes inside the sentence (K D3 plain host;
// "hoops", not "Basketball"). Pure, so the line can be written as you choose.
import type { Slot } from "@/lib/types";

export const LIKE_WORD: Record<string, string> = {
  basketball: "basketball",
  pickleball: "pickleball",
  running: "running",
  hiking: "hiking",
  climbing: "climbing",
  soccer: "soccer",
  disc_golf: "disc golf",
  guitar: "guitar",
  music_making: "making music",
  board_games: "board games",
  books: "books",
  art: "art",
  photography: "photos",
  volunteering: "volunteering",
  cooking: "cooking",
  coffee: "coffee",
  gym_yoga: "gym and yoga",
  dancing: "dancing",
  gaming: "gaming",
};

export const joinWords = (w: string[]) => w.join(", ");

export type Day = "weeknights" | "saturday" | "sunday";
export type Part = "morning" | "afternoon" | "evening";
export const PARTS: Part[] = ["morning", "afternoon", "evening"];

export interface Free {
  weeknights: boolean;
  saturday: boolean;
  sunday: boolean;
  /** applies to the weekend days; empty = any time */
  parts: Part[];
}

export function fromSlots(slots: Slot[]): Free {
  const parts = PARTS.filter((p) => slots.includes(`saturday-${p}` as Slot) || slots.includes(`sunday-${p}` as Slot));
  return {
    weeknights: slots.includes("weekday-evening"),
    saturday: slots.some((s) => s.startsWith("saturday")),
    sunday: slots.some((s) => s.startsWith("sunday")),
    parts: parts.length === 3 ? [] : parts,
  };
}

export function toSlots(f: Free): Slot[] {
  const out: Slot[] = [];
  if (f.weeknights) out.push("weekday-evening");
  const parts = f.parts.length ? f.parts : PARTS;
  for (const d of ["saturday", "sunday"] as const) if (f[d]) for (const p of parts) out.push(`${d}-${p}` as Slot);
  return out;
}

/** "weekends, afternoons" · "weeknights, Sundays" · "Saturdays, mornings and evenings". Empty when nothing is free. */
export function freeWords(f: Free): string[] {
  const days: string[] = [];
  if (f.weeknights) days.push("weeknights");
  if (f.saturday && f.sunday) days.push("weekends");
  else if (f.saturday) days.push("Saturdays");
  else if (f.sunday) days.push("Sundays");
  const weekend = f.saturday || f.sunday;
  const parts = weekend && f.parts.length && f.parts.length < 3 ? [f.parts.map((p) => `${p}s`).join(" and ")] : [];
  return [...days, ...parts];
}
