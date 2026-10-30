// Platform: small time helpers that keep the Seattle offset (no Date.now; callers pass times).
import { toSeattleISO } from "@/lib/time/tz";

export function addMinutesISO(iso: string, minutes: number): string {
  return toSeattleISO(Date.parse(iso) + minutes * 60_000);
}
