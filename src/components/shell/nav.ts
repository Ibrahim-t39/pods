// Depth model (DESIGN.md §5). The visible navigation (capsule, rail, ⌘K) is nav-bar.tsx over lib/platform/nav.ts
// (MOTION_SYSTEM §12). Depth is distance:
//   Your pods (/app/pods, the room of overlapping tables)  ⇄  one table (/app/pods/[podId])  ⇄  its sheets
// Moving deeper zooms in, moving out zooms out, moving sideways (pod to pod) slides. Pure functions of the pathname,
// so server and client agree on first paint.

export type ShellChrome = "bare" | "app";

/** Routes that need no signed-in person (first run, sign-in, placement). Everything else sits behind StoreGate. */
const BARE = [/^\/app\/?$/, /^\/app\/welcome(\/|$)/, /^\/app\/onboarding(\/|$)/, /^\/app\/verify(\/|$)/, /^\/app\/placing(\/|$)/];

export function chromeFor(pathname: string): ShellChrome {
  return BARE.some((r) => r.test(pathname)) ? "bare" : "app";
}

/**
 * Key for the page transition. A pod's table, details and plan share one key, so opening a sheet over the table
 * never re-mounts it.
 */
export function transitionKey(pathname: string): string {
  const pod = pathname.match(/^\/app\/pods\/([^/]+)/);
  if (pod) return `/app/pods/${pod[1]}`;
  return pathname.replace(/\/$/, "") || "/";
}

/** Sections with their own nested layout; the shell keys the transition by section there (the section animates). */
export const NESTED_LAYOUT_SECTIONS = new Set(["settings", "onboarding"]);

export function shellTransitionKey(pathname: string): string {
  const section = pathname.match(/^\/app\/([^/]+)/)?.[1];
  if (section && NESTED_LAYOUT_SECTIONS.has(section)) return `/app/${section}`;
  return transitionKey(pathname);
}

export function depthOf(pathname: string): number {
  return transitionKey(pathname).split("/").filter(Boolean).length;
}

/** in = zoom in (deeper), out = zoom out (shallower), side = same depth (pod to pod, step to step),
 *  fade = between destinations (Home, Pods, Plans…: siblings, a 160ms cross-fade, MOTION_SYSTEM §12). */
export type Direction = "in" | "out" | "side" | "fade";

const section = (p: string) => p.match(/^\/app\/([^/]+)/)?.[1] ?? "";

export function directionBetween(from: string | null, to: string): Direction | "none" {
  if (!from) return "none";
  if (section(from) !== section(to)) return depthOf(to) <= 2 && depthOf(from) <= 2 ? "fade" : depthOf(to) > depthOf(from) ? "in" : "out";
  const a = depthOf(from);
  const b = depthOf(to);
  return b > a ? "in" : b < a ? "out" : "side";
}
