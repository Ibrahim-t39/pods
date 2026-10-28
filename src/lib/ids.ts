// [U0] Ids. Seed ids are deterministic (stable across reloads, so deep links and tests work);
// runtime ids use nanoid. Never use Math.random at render.
import { nanoid } from "nanoid";

/** Deterministic id for seed data: seedId("user", "malik") → "user_malik". */
export function seedId(prefix: string, key: string | number): string {
  return `${prefix}_${String(key).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

/** Runtime id: newId("msg") → "msg_V1StGXR8Z5jdHi6B". */
export function newId(prefix: string): string {
  return `${prefix}_${nanoid(16)}`;
}

/** Client id for idempotent sends. */
export function clientId(): string {
  return nanoid(12);
}

/** Stable 32-bit FNV-1a hash (tie-breaks, seeded jitter, seedHash). */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) for seed generation and latency jitter. */
export function seededRandom(seed: number | string): () => number {
  let a = typeof seed === "string" ? hash32(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
