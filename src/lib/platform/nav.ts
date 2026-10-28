// Platform §N: the information architecture as data, so the phone bar, the laptop rail, the command palette (⌘K) and
// the tests agree. Pure. The shell (core area) renders it; the labels are final copy (one word each).
export type DestinationId = "home" | "pods" | "plans" | "inbox" | "you" | "discover" | "search" | "people" | "safety" | "settings";

export interface Destination {
  id: DestinationId;
  label: string;
  href: string;
  /** keyboard shortcut on laptop (g then key), shown in the palette */
  key: string;
  /** where it lives: "primary" = phone bar + laptop rail; "rail" = laptop rail only; "menu" = account menu / palette */
  slot: "primary" | "rail" | "menu";
  match: RegExp;
}

export const DESTINATIONS: Destination[] = [
  { id: "home", label: "Home", href: "/app/home", key: "h", slot: "primary", match: /^\/app\/home(\/|$)/ },
  { id: "pods", label: "Pods", href: "/app/pods", key: "p", slot: "primary", match: /^\/app\/pods(\/|$)/ },
  { id: "plans", label: "Plans", href: "/app/plans", key: "l", slot: "primary", match: /^\/app\/(plans|events)(\/|$)/ },
  { id: "inbox", label: "Inbox", href: "/app/inbox", key: "i", slot: "primary", match: /^\/app\/inbox(\/|$)/ },
  { id: "you", label: "You", href: "/app/profile", key: "y", slot: "primary", match: /^\/app\/profile(\/|$)/ },
  { id: "discover", label: "Discover", href: "/app/discover", key: "d", slot: "rail", match: /^\/app\/discover(\/|$)/ },
  { id: "people", label: "People", href: "/app/people", key: "e", slot: "rail", match: /^\/app\/people(\/|$)/ },
  { id: "search", label: "Search", href: "/app/search", key: "/", slot: "menu", match: /^\/app\/search(\/|$)/ },
  { id: "safety", label: "Help", href: "/app/safety", key: "s", slot: "menu", match: /^\/app\/safety(\/|$)/ },
  { id: "settings", label: "Settings", href: "/app/settings", key: ",", slot: "menu", match: /^\/app\/settings(\/|$)/ },
];

/** The destination a pathname belongs to (for the active state), or null (first run, invite, admin). */
export function activeDestination(pathname: string): DestinationId | null {
  return DESTINATIONS.find((d) => d.match.test(pathname))?.id ?? null;
}

/** Phone: the 5 primary destinations. Laptop rail: primary + rail. Everything is in the palette. */
export function destinationsFor(surface: "phone" | "laptop" | "palette"): Destination[] {
  if (surface === "phone") return DESTINATIONS.filter((d) => d.slot === "primary");
  if (surface === "laptop") return DESTINATIONS.filter((d) => d.slot !== "menu");
  return DESTINATIONS;
}

/** Routes that show no navigation at all (first run, placement, invite landing, a sheet-only flow). */
const NO_NAV = [/^\/app\/?$/, /^\/app\/welcome(\/|$)/, /^\/app\/onboarding(\/|$)/, /^\/app\/verify(\/|$)/, /^\/app\/placing(\/|$)/];
export function showsNav(pathname: string): boolean {
  return pathname.startsWith("/app") && !NO_NAV.some((r) => r.test(pathname));
}
