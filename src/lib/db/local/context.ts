// [U0] Shared context for LocalRepo domain modules. Each module is `(ctx: RepoCtx) => RepoPart<...>`.
// Rules (ARCHITECTURE §5): authorization checks happen inside the repo (like RLS); member data leaves only via
// toPublicMember(); writes go through ctx.commit (immer draft, bumps rev, persists, broadcasts).
import type { Draft } from "immer";
import { useStore } from "@/lib/db/store";
import { nowISO } from "@/lib/time/clock";
import { hash32 } from "@/lib/ids";
import { sleep } from "@/lib/utils";
import type { AppConfig, DbState, ID, User } from "@/lib/types";
import { err, type Result } from "@/lib/db/repo";

export interface RepoCtx {
  get(): DbState;
  commit(recipe: (d: Draft<DbState>) => void): void;
  now(): string;
  meId(): ID | null;
  me(): User | null;
  config(): AppConfig;
  /** Artificial 120-260 ms seeded jitter so loading states are real. 0 with ?fast=1, demo.fastLatency or tests. */
  latency(): Promise<void>;
  /** Returns an error Result if nobody is signed in. */
  requireMe(): Result<User> | null;
}

let calls = 0;
function fast(): boolean {
  if (typeof process !== "undefined" && process.env?.VITEST) return true;
  if (useStore.getState().db.config.demo.fastLatency) return true;
  try {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fast");
  } catch {
    return false;
  }
}

export const ctx: RepoCtx = {
  get: () => useStore.getState().db,
  commit: (recipe) => useStore.getState().commit(recipe),
  now: () => nowISO(),
  meId: () => useStore.getState().db.me,
  me: () => {
    const db = useStore.getState().db;
    return db.me ? (db.users[db.me] ?? null) : null;
  },
  config: () => useStore.getState().db.config,
  latency: async () => {
    if (fast()) return;
    const jitter = hash32(`latency:${calls++}`) % 141; // 0..140
    await sleep(120 + jitter);
  },
  requireMe: () => (ctx.me() ? null : err({ code: "FORBIDDEN", message: "Not signed in" })),
};
