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
import { DEMO } from "@/config/demo";
import { AppConfigSchema } from "@/config";
import { hash32 } from "@/lib/ids";

export const STORE_KEY = "pods:v1";
export const SCHEMA_VERSION = 1;
export const SEED_HASH = String(hash32(`${SEED_VERSION}|${DEMO.anchor}`));
const CHANNEL = "pods";

type Persisted = { db: DbState; seedHash: string; schemaVersion: number };

export interface StoreState {
  db: DbState;
  hydrated: boolean;
  storageMode: "local" | "memory";
  /** Apply an immer recipe to the db, bump rev, persist and broadcast. Repo modules only. */
  commit: (recipe: (draft: Draft<DbState>) => void) => void;
  /** Replace the db with a fresh seed (Director / DemoBar "Reset demo"). */
  resetDemo: () => void;
}

export function freshDb(): DbState {
  return buildSeed(DEMO.anchor);
}

// ── Storage: localStorage with in-memory fallback ─────────────────────
const memory = new Map<string, string>();
let memoryMode = false;
let warnedMemory = false;
let pendingResetToast = false;

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
function isUsable(p: unknown): p is Persisted {
  if (!p || typeof p !== "object") return false;
  const v = p as Partial<Persisted>;
  if (v.seedHash !== SEED_HASH || v.schemaVersion !== SCHEMA_VERSION) return false;
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
        const rev = get().db.rev + 1;
        const db = freshDb();
        db.rev = rev;
        db.clock = { virtual_at: db.clock.virtual_at, real_at: Date.now() };
        set({ db });
        broadcast(rev);
      },
    }),
    {
      name: STORE_KEY,
      version: SCHEMA_VERSION,
      storage: safeStorage,
      skipHydration: true,
      partialize: (s) => ({ db: s.db, seedHash: SEED_HASH, schemaVersion: SCHEMA_VERSION }),
      migrate: () => {
        // Any older schema → clean reset (J5). Returning a non-usable value makes merge() fall back to fresh.
        pendingResetToast = true;
        return null as unknown as Persisted;
      },
      merge(persisted, current) {
        if (persisted == null) return current; // first visit, or reset requested
        if (!isUsable(persisted)) {
          pendingResetToast = true;
          return { ...current, db: freshDb() };
        }
        // Fill any top-level keys a newer build added, keep everything persisted.
        return { ...current, db: { ...freshDb(), ...persisted.db } };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) pendingResetToast = true;
        const s = useStore.getState();
        if (!booted) {
          booted = true;
          // Pinned clock (J5): re-stamp real time at boot so "now" resumes at the stored virtual time.
          const db = produce(s.db, (d) => {
            d.clock.real_at = Date.now();
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

function startSync(): () => void {
  if (!useStore.getState().hydrated) void useStore.persist.rehydrate();
  const ch = getChannel();
  const onMsg = (e: MessageEvent) => {
    const m = e.data as { type?: string; rev?: number; from?: string };
    if (m?.type === "db" && m.from !== TAB_ID && (m.rev ?? 0) >= useStore.getState().db.rev) {
      void useStore.persist.rehydrate();
    }
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORE_KEY) void useStore.persist.rehydrate();
  };
  if (ch) ch.addEventListener("message", onMsg);
  else window.addEventListener("storage", onStorage);
  return () => {
    ch?.removeEventListener("message", onMsg);
    window.removeEventListener("storage", onStorage);
  };
}

export type { Draft };
