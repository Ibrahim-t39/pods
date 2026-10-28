// [U7] Per-device "last read" markers for pod chats (unread dots, the "New messages" divider).
// localStorage is read only after mount (cacheComponents: never during prerender).
"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "pods:lastRead";

function read(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();

export function useLastRead() {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const sync = () => setMap(read());
    sync();
    listeners.add(sync);
    return () => void listeners.delete(sync);
  }, []);
  const mark = useCallback((podId: string, iso: string) => {
    const cur = read();
    if (cur[podId] && cur[podId] >= iso) return;
    cur[podId] = iso;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cur));
    } catch {
      /* in-memory only */
    }
    listeners.forEach((l) => l());
  }, []);
  return { lastRead: map, mark };
}

/** Small per-device flags (e.g. "I couldn't make it" to a check-in). Read after mount. */
export function useDeviceFlag(key: string): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- per-device flag, read after mount only
      setV(window.localStorage.getItem(`pods:flag:${key}`) === "1");
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = useCallback(
    (next: boolean) => {
      setV(next);
      try {
        if (next) window.localStorage.setItem(`pods:flag:${key}`, "1");
        else window.localStorage.removeItem(`pods:flag:${key}`);
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [v, set];
}
