// [U3] The clock's arithmetic, pure so it can be tested without the store (ARCHITECTURE §11, BLUEPRINT J5).
import type { ClockState } from "@/lib/types";

/**
 * Demo "now" in epoch ms: virtual_at + (realNow - real_at).
 * Before hydration / on the server (hydrated = false or real_at = 0) it is the virtual time exactly, so prerender and
 * the first client paint agree. A real_at in the future (clock skew) never makes time run backwards.
 */
export function virtualNowMs(clock: ClockState, hydrated: boolean, realNow: number | null): number {
  const base = Date.parse(clock.virtual_at);
  if (!hydrated || realNow === null || !clock.real_at) return base;
  return base + Math.max(0, realNow - clock.real_at);
}

/** The clock state after a Director jump to `iso` at real time `realNow`. Throws on an unparseable ISO. */
export function jumpedClock(iso: string, realNow: number): ClockState {
  if (Number.isNaN(Date.parse(iso))) throw new Error(`jumpTo: not a date: ${iso}`);
  return { virtual_at: iso, real_at: realNow };
}
