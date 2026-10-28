// [U8] Per-device notification preferences. Browser-only convenience state (localStorage, guarded):
// category toggles, quiet hours, and the discreet community-name switches (BLUEPRINT D10).
// The channel switches (push / sms / email) live on the user via repo.setNotificationPrefs.
"use client";

import { useCallback, useEffect, useState } from "react";

export interface DevicePrefs {
  hangouts: boolean;
  runItBack: boolean;
  podChat: boolean;
  news: boolean;
  quietHours: boolean;
  /** D10: notification text, inbox previews, badge and share text say "Your community pod". */
  discreet: boolean;
  /** D10: also mask community pods inside the app (screen sharing). */
  maskInApp: boolean;
}

export const DEFAULT_DEVICE_PREFS: DevicePrefs = {
  hangouts: true,
  runItBack: true,
  podChat: true,
  news: false,
  quietHours: true,
  discreet: true,
  maskInApp: false,
};

const KEY = "pods:device-prefs";
const EVT = "pods:device-prefs-changed";

function read(): DevicePrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_DEVICE_PREFS, ...(JSON.parse(raw) as Partial<DevicePrefs>) } : DEFAULT_DEVICE_PREFS;
  } catch {
    return DEFAULT_DEVICE_PREFS;
  }
}

/** Reads after mount (cacheComponents: never during prerender). `ready` is false until then. */
export function useDevicePrefs() {
  const [prefs, setPrefs] = useState<DevicePrefs>(DEFAULT_DEVICE_PREFS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setPrefs(read());
    sync();
    setReady(true);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const set = useCallback(<K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) => {
    const next = { ...read(), [key]: value };
    setPrefs(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVT));
    } catch {
      /* blocked: state stays for this session only */
    }
  }, []);
  return { prefs, set, ready };
}

/** Other units: mask community pod names in-app when the person turned this on. */
export function useMaskCommunityInApp(): boolean {
  const { prefs } = useDevicePrefs();
  return prefs.maskInApp;
}
