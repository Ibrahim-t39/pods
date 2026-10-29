// A week of free slots in plain words: "Tue and Thu evenings, weekend afternoons". Pure; used by the profile line,
// the sign-up summary and anywhere else availability is read aloud.
import { WEEK_DAYS, normalizeSlots, type WeekDay } from "@/lib/types";

type Part = "morning" | "afternoon" | "evening";
const PART_ORDER: Part[] = ["morning", "afternoon", "evening"];
const FULL: Record<WeekDay, string> = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
const join = (w: string[]) => (w.length <= 1 ? (w[0] ?? "") : `${w.slice(0, -1).join(", ")} and ${w[w.length - 1]}`);

function daysPhrase(days: WeekDay[]): string {
  const key = days.join(",");
  if (days.length === 7) return "every day";
  if (key === "monday,tuesday,wednesday,thursday,friday") return "weekdays";
  if (key === "saturday,sunday") return "weekends";
  if (days.length === 1) return `${FULL[days[0]]}s`;
  return join(days.map((d) => FULL[d].slice(0, 3)));
}

function partsPhrase(parts: Part[], days: WeekDay[]): string {
  if (parts.length === 3) return days.length === 7 ? "any time" : "all day";
  return join(parts.map((p) => `${p}s`));
}

/** "Tue and Thu evenings, weekend afternoons" · "weekends all day" · "" when nothing is free. Natural case: starts lower-case unless it names a day. */
export function weekWords(raw: readonly string[]): string {
  const slots = new Set<string>(normalizeSlots(raw));
  const groups = new Map<string, WeekDay[]>();
  for (const d of WEEK_DAYS) {
    const parts = PART_ORDER.filter((p) => slots.has(`${d}-${p}`));
    if (parts.length) groups.set(parts.join(","), [...(groups.get(parts.join(",")) ?? []), d]);
  }
  const phrases = [...groups].map(([k, days]) => {
    const parts = k.split(",") as Part[];
    const d = daysPhrase(days);
    if (days.length === 7 && parts.length === 3) return "any time";
    if (d === "weekdays" && parts.join() === "evening") return "weeknights";
    if (parts.length < 3 && days.length === 1) return `${FULL[days[0]]} ${partsPhrase(parts, days)}`;
    if (parts.length < 3 && (d === "weekdays" || d === "weekends")) return `${d.slice(0, -1)} ${partsPhrase(parts, days)}`;
    if (days.length === 7 && parts.length < 3) return `every ${parts.join(" and ")}`;
    return `${d} ${partsPhrase(parts, days)}`;
  });
  return phrases.join(", ");
}
