// Platform: small time helpers that keep the Chicago offset (no Date.now; callers pass times).
import { toChicagoISO } from "@/lib/time/tz";

export function addMinutesISO(iso: string, minutes: number): string {
  return toChicagoISO(Date.parse(iso) + minutes * 60_000);
}
