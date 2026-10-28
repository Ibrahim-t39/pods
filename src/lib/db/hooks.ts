// [U0] React hooks over the local DB. Reads: useDb(selector). Writes: useRepo().<method>().
"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { bootStore, useStore } from "./store";
import { localRepo } from "./local";
import type { Repo } from "./repo";
import type { DbState, User } from "@/lib/types";

/** Structural equality up to `depth` levels (arrays + plain objects); leaves by Object.is. */
function sameShape(a: unknown, b: unknown, depth = 4): boolean {
  if (Object.is(a, b)) return true;
  if (depth === 0 || typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!sameShape((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], depth - 1)) return false;
  }
  return true;
}

/**
 * Select from the DB. Selectors may build new arrays/objects (e.g. `db => myPods(db).map(p => ({ p, n }))`):
 * the result is compared structurally (4 levels, leaves by identity; immer keeps unchanged records identical),
 * so there are no re-render loops and no re-renders when nothing you selected changed. Keep selectors pure.
 */
export function useDb<T>(selector: (db: DbState) => T): T {
  const cache = useRef<{ db?: DbState; sel?: (db: DbState) => T; out?: T }>({});
  const get = useCallback((): T => {
    const db = useStore.getState().db;
    const c = cache.current;
    if (c.db === db && c.sel === selector) return c.out as T;
    const out = selector(db);
    if (c.db === undefined || !sameShape(c.out, out)) c.out = out;
    c.db = db;
    c.sel = selector;
    return c.out as T;
  }, [selector]);
  return useSyncExternalStore(useStore.subscribe, get, get);
}

/** True once the persisted store has been read on the client. Render skeletons until then. */
export function useHydrated(): boolean {
  useEffect(() => bootStore(), []);
  return useStore((s) => s.hydrated);
}

/** The signed-in user (or null). */
export function useMe(): User | null {
  return useStore((s) => (s.db.me ? (s.db.users[s.db.me] ?? null) : null));
}

/** The Repo. LocalRepo today; SupabaseRepo later, same call sites. */
export function useRepo(): Repo {
  return localRepo();
}

/** "local" or "memory" (localStorage blocked/full). */
export function useStorageMode() {
  return useStore((s) => s.storageMode);
}
