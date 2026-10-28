// [U0] Small shared helpers. Pure, isomorphic.
import type { ID, Membership, PublicMember, User } from "./types";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}

/** Age in whole years at `onISO` (both ISO strings). */
export function ageOn(dob: string, onISO: string): number {
  const [y, m, d] = dob.slice(0, 10).split("-").map(Number);
  const [ny, nm, nd] = onISO.slice(0, 10).split("-").map(Number);
  let age = ny - y;
  if (nm < m || (nm === m && nd < d)) age--;
  return age;
}

export function displayName(u: Pick<User, "first_name" | "nickname">): string {
  return u.nickname?.trim() || u.first_name;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

/** The ONLY way member data leaves the repo (ARCHITECTURE §9.3). No heritage, faith, phone or DOB. */
export function toPublicMember(u: User, nowISO: string): PublicMember {
  return {
    id: u.id,
    display_name: displayName(u),
    photo_url: u.photo_urls[0] ?? null,
    age: ageOn(u.date_of_birth, nowISO),
    verified: u.verified,
    pronouns: u.pronouns,
    bio: u.bio,
    prompts: u.prompts,
    is_demo_bot: u.is_demo_bot,
  };
}

export function activeMembers(memberships: Membership[], podId: ID): Membership[] {
  return memberships.filter((m) => m.pod_id === podId && m.left_at === null);
}

/** "Malik, Ama and Tobi" */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function byKey<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T> {
  return Object.fromEntries(items.map((t) => [key(t), t])) as Record<K, T>;
}
