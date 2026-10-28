// [U0] The local database: a zustand store persisted to localStorage "pods:v1".
// - Versioned (SCHEMA_VERSION) and seed-stamped (SEED_HASH): any mismatch, parse failure or bad shape resets
//   to a fresh seed with the toast "Demo reset to a fresh start." (ARCHITECTURE §11, BLUEPRINT J5).
// - Cross-tab: every commit posts {rev} on BroadcastChannel("pods"); other tabs rehydrate (storage event fallback).
// - localStorage blocked/full → in-memory fallback + toast "Changes won't be saved in this browser" (edge case 34).
// - skipHydration: the server and the first client render use the deterministic seed; <StoreBoot/> rehydrates
//   after mount. Screens should gate on useHydrated() (or U5's StoreGate) before showing persisted data.
// Screens never import this directly for writes: reads via hooks.ts useDb(), writes via useRepo().
import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { produce, type Draft } from "immer";
import { toast } from "sonner";
import type { DbState } from "@/lib/types";
import { buildSeed, SEED_VERSION } from "@/data/seed";
import { buildLiveSeed, LIVE_SEED_VERSION } from "@/data/live-seed";
import { DB_KEYS, MODE_KEY, modeFromSearch, readModePref, resolveInitialMode, writeModePref, type AppMode } from "@/lib/mode/mode";
import { toChicagoISO } from "@/lib/time/tz";
import { DEMO } from "@/config/demo";
import { AppConfigSchema } from "@/config";
import { hash32 } from "@/lib/ids";

/** The Demo database key (kept as "pods:v1"). Live uses DB_KEYS.live. */
export const STORE_KEY = DB_KEYS.demo;
export const SCHEMA_VERSION = 1;
export const SEED_HASH = String(hash32(`${SEED_VERSION}|${DEMO.anchor}`));
/** Live never resets on a demo seed bump: only a change to the Live world itself does. */
export const LIVE_SEED_HASH = String(hash32(`live|${LIVE_SEED_VERSION}`));
const seedHashFor = (m: AppMode) => (m === "live" ? LIVE_SEED_HASH : SEED_HASH);
const CHANNEL = "pods";

type Persisted = { db: DbState; seedHash: string; schemaVersion: number };

export interface StoreState {
  db: DbState;
  hydrated: boolean;
  storageMode: "local" | "memory";
  /** Apply an immer recipe to the db, bump rev, persist and broadcast. Repo modules only. */
  commit: (recipe: (draft: Draft<DbState>) => void) => void;
  /** Replace the CURRENT mode's db with a fresh one (Director "Reset demo"; Live "Start over"). */
  resetDemo: () => void;
  /** Platform §M: which world is loaded. "demo" on the server and first paint; bootStore() applies the saved mode. */
  mode: AppMode;
  /** Switch worlds. Persists the current one, loads (or creates) the other. Never deletes data. */
  setMode: (m: AppMode) => Promise<void>;
}

/** A fresh database for a mode. Live reads the real clock, so call it on the client only. */
export function freshDb(mode: AppMode = "demo"): DbState {
  if (mode === "live") return buildLiveSeed(toChicagoISO(typeof window === "undefined" ? Date.parse(DEMO.anchor) : Date.now()));
  return buildSeed(DEMO.anchor);
}

/** Live runs on the real clock: re-anchor virtual time to real time at boot (Demo keeps its pinned clock). */
function realClock(): DbState["clock"] {
  const t = Date.now();
  return { virtual_at: toChicagoISO(t), real_at: t };
}

// ── Storage: localStorage with in-memory fallback ─────────────────────
const memory = new Map<string, string>();
let memoryMode = false;
let warnedMemory = false;
let pendingResetToast = false;
/** True while a mode swap resets in-memory state: the persist middleware writes on every setState, and that write
 * must not overwrite the incoming world before it is read. */
let suppressWrites = false;

function warnMemory() {
  memoryMode = true;
  if (typeof window !== "undefined" && !warnedMemory) {
    warnedMemory = true;
    setTimeout(() => toast("Changes won't be saved in this browser"), 0);
  }
}

const safeStorage: PersistStorage<Persisted> = {
  getItem(name) {
    let raw: string | null = null;
    if (!memoryMode) {
      try {
        raw = window.localStorage.getItem(name);
      } catch {
        warnMemory();
      }
    }
    if (memoryMode) raw = memory.get(name) ?? null;
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as StorageValue<Persisted>;
    } catch {
      pendingResetToast = true;
      return null;
    }
  },
  setItem(name, value) {
    if (suppressWrites) return;
    const raw = JSON.stringify(value);
    if (!memoryMode) {
      try {
        window.localStorage.setItem(name, raw);
        return;
      } catch {
        warnMemory();
      }
    }
    memory.set(name, raw);
  },
  removeItem(name) {
    memory.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

/** Light structural check + zod on config; anything off → fresh seed. */
function isUsable(p: unknown, mode: AppMode = currentMode()): p is Persisted {
  if (!p || typeof p !== "object") return false;
  const v = p as Partial<Persisted>;
  if (v.seedHash !== seedHashFor(mode) || v.schemaVersion !== SCHEMA_VERSION) return false;
  const db = v.db as Partial<DbState> | undefined;
  if (!db || typeof db.rev !== "number" || typeof db.users !== "object" || typeof db.pods !== "object") return false;
  return AppConfigSchema.safeParse(db.config).success;
}

// ── Cross-tab sync ─────────────────────────────────────────────────────
const TAB_ID = typeof window !== "undefined" ? Math.random().toString(36).slice(2) : "server";
let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}
function broadcast(rev: number) {
  try {
    getChannel()?.postMessage({ type: "db", rev, from: TAB_ID });
  } catch {
    /* ignore */
  }
}

let booted = false;
const currentMode = (): AppMode => useStore.getState()?.mode ?? "demo";

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      db: freshDb(),
      hydrated: false,
      storageMode: "local",
      commit(recipe) {
        const prev = get().db;
        const next = produce(prev, (d) => {
          recipe(d);
          d.rev = prev.rev + 1;
        });
        set({ db: next, storageMode: memoryMode ? "memory" : "local" });
        broadcast(next.rev);
      },
      resetDemo() {
        const mode = get().mode;
        const rev = get().db.rev + 1;
        const db = freshDb(mode);
        db.rev = rev;
        db.clock = mode === "live" ? realClock() : { virtual_at: db.clock.virtual_at, real_at: Date.now() };
        set({ db });
        broadcast(rev);
      },
      mode: "demo",
      async setMode(m) {
        if (typeof window === "undefined") return;
        writeModePref(m);
        if (get().mode === m && get().hydrated) return;
        await loadMode(m);
      },
    }),
    {
      name: STORE_KEY,
      version: SCHEMA_VERSION,
      storage: safeStorage,
      skipHydration: true,
      partialize: (s) => ({ db: s.db, seedHash: seedHashFor(s.mode), schemaVersion: SCHEMA_VERSION }),
      migrate: () => {
        // Any older schema → clean reset (J5). Returning a non-usable value makes merge() fall back to fresh.
        pendingResetToast = true;
        return null as unknown as Persisted;
      },
      merge(persisted, current) {
        if (persisted == null) return current; // first visit, or reset requested
        if (!isUsable(persisted, current.mode)) {
          pendingResetToast = current.mode === "demo";
          return { ...current, db: freshDb(current.mode) };
        }
        // Fill any top-level keys a newer build added, keep everything persisted.
        return { ...current, db: { ...freshDb(current.mode), ...persisted.db } };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) pendingResetToast = true;
        const s = useStore.getState();
        if (!booted) {
          booted = true;
          // Pinned clock (J5): re-stamp real time at boot so "now" resumes at the stored virtual time.
          const db = produce(s.db, (d) => {
            if (s.mode === "live") d.clock = realClock();
            else d.clock.real_at = Date.now();
          });
          useStore.setState({ db, hydrated: true, storageMode: memoryMode ? "memory" : "local" });
        } else {
          useStore.setState({ hydrated: true });
        }
        if (pendingResetToast) {
          pendingResetToast = false;
          if (booted) setTimeout(() => toast("Demo reset to a fresh start."), 0);
        }
        void state;
      },
    },
  ),
);

let bootCount = 0;
let stopSync: (() => void) | null = null;

/**
 * Hydrate from storage and start cross-tab sync. Idempotent and ref-counted: <StoreBoot/> in the root providers
 * calls it, and useHydrated() calls it too, so any screen that reads the store boots it even outside the providers.
 */
export function bootStore(): () => void {
  if (typeof window === "undefined") return () => {};
  bootCount++;
  if (!stopSync) stopSync = startSync();
  return () => {
    bootCount--;
    if (bootCount === 0 && stopSync) {
      stopSync();
      stopSync = null;
    }
  };
}

/**
 * Point the persist middleware at `m`'s key and load it. A mode with nothing stored starts from its fresh world.
 * The outgoing world is already persisted (every commit writes), so nothing is lost.
 */
async function loadMode(m: AppMode): Promise<void> {
  suppressWrites = true;
  try {
    useStore.persist.setOptions({ name: DB_KEYS[m] });
    booted = false; // re-stamp the clock for the incoming world
    useStore.setState({ mode: m, db: freshDb(m), hydrated: false });
  } finally {
    suppressWrites = false;
  }
  await useStore.persist.rehydrate();
  const rev = useStore.getState().db.rev;
  broadcast(rev);
}

function startSync(): () => void {
  if (!useStore.getState().hydrated) {
    const m = resolveInitialMode(window.location.search, readModePref());
    if (modeFromSearch(window.location.search)) writeModePref(m); // ?mode= sticks, like the toggle
    if (m !== useStore.getState().mode) void loadMode(m);
    else void useStore.persist.rehydrate();
  }
  const ch = getChannel();
  const onMsg = (e: MessageEvent) => {
    const m = e.data as { type?: string; rev?: number; from?: string };
    if (m?.type === "db" && m.from !== TAB_ID) {
      const saved = readModePref();
      if (saved && saved !== useStore.getState().mode) void loadMode(saved);
      else if ((m.rev ?? 0) >= useStore.getState().db.rev) void useStore.persist.rehydrate();
    }
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === DB_KEYS[useStore.getState().mode]) void useStore.persist.rehydrate();
    // Another tab switched worlds: follow it.
    if (e.key === MODE_KEY) {
      const m = readModePref();
      if (m && m !== useStore.getState().mode) void loadMode(m);
    }
  };
  if (ch) ch.addEventListener("message", onMsg);
  else window.addEventListener("storage", onStorage);
  return () => {
    ch?.removeEventListener("message", onMsg);
    window.removeEventListener("storage", onStorage);
  };
}

export type { Draft };
