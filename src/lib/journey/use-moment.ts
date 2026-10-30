// useMoment(): the adaptive front for the signed-in member (MOTION_SYSTEM §6). Reads the store and the virtual clock
// (never the real clock during prerender) and returns momentOf(...). Recomputes once a minute.
"use client";

import { useCallback } from "react";
import { useDb } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { podRows } from "@/components/pods/model";
import { toChicagoISO } from "@/lib/time/tz";
import { momentOf, type MomentOut } from "./moment";

export function useMoment(): MomentOut {
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  return useDb(
    useCallback(
      (db) => {
        const rows = podRows(db, minute);
        const held = Object.values(db.hangouts).filter(
          (h) => h.status !== "cancelled" && Date.parse(h.ends_at) <= minute && rows.some((r) => r.pod.id === h.pod_id),
        ).length;
        const hour = Number(toChicagoISO(minute).slice(11, 13));
        return momentOf({ statuses: rows.map((r) => r.status), podIds: rows.map((r) => r.pod.id), held, hour });
      },
      [minute],
    ),
  );
}
