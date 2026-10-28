// Per-device choices that have no field on the user yet (filed with integration, V3_SPEC §5):
//   texts   which texts to send (the channel itself is user.notification_prefs.sms)
//   claude  whether Claude plans from your free times (Apple 5.1.2(i), library I #2)
// Browser storage is a convenience only: every read and write is guarded, and defaults render when it is missing.
"use client";

import { useCallback, useEffect, useState } from "react";
import type { TextKind } from "./words";

export interface SeatPrefs {
  texts: Record<TextKind, boolean>;
  claude: boolean;
}

const KEY = "pods:seat-prefs";
const EVT = "pods:seat-prefs-changed";
export const DEFAULT_SEAT_PREFS: SeatPrefs = { texts: { on: true, before: false, plan: false }, claude: true };

function read(): SeatPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SEAT_PREFS;
    const p = JSON.parse(raw) as Partial<SeatPrefs>;
    return { texts: { ...DEFAULT_SEAT_PREFS.texts, ...p.texts }, claude: p.claude ?? true };
  } catch {
    return DEFAULT_SEAT_PREFS;
  }
}

/** Reads after mount only (cacheComponents: never during prerender). */
export function useSeatPrefs() {
  const [prefs, setPrefs] = useState<SeatPrefs>(DEFAULT_SEAT_PREFS);
  useEffect(() => {
    const sync = () => setPrefs(read());
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  const save = useCallback((next: SeatPrefs) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVT));
    } catch {
      /* storage blocked: the choice holds for this visit */
    }
  }, []);
  return { prefs, save };
}
