// The clock for admin screens. Same maths as lib/time/clock but never touches Date.now() before hydration
// (U3's nowMs() evaluates Date.now() eagerly, which cacheComponents rejects during prerender).
"use client";

import { useEffect, useState } from "react";
import { toChicagoISO } from "@/lib/time/tz";
import { useStore } from "@/lib/db/store";
import { virtualNowMs } from "@/lib/time/clock-core";

export function useAdminNow(): { date: Date; iso: string } {
  const clock = useStore((s) => s.db.clock);
  const hydrated = useStore((s) => s.hydrated);
  const [wall, setWall] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setWall(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const ms = virtualNowMs(clock, hydrated, hydrated ? wall : null);
  return { date: new Date(ms), iso: toChicagoISO(ms) };
}
