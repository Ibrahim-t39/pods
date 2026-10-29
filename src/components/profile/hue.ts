// Colour means the pod (DESIGN.md §4), and the pod owns it: every sphere of a pod takes pod.hue, on every screen
// (placing, Home, Pods, Inbox, Invite, Profile). Community pods are grove. You are always ink.
import type { DbState } from "@/lib/types";
import type { PodHueKey } from "@/components/brand/disc";

export function podHue(db: DbState, podId: string | null | undefined): PodHueKey {
  if (!podId) return "ember";
  const pod = db.pods[podId];
  return pod?.hue ?? (pod?.type === "community" ? "grove" : "ember");
}

/** A pod you are in that has not opened yet (one pod at a time): drawn as faded glass everywhere. */
export function podOnDeck(db: DbState, podId: string | null | undefined): boolean {
  return !!podId && db.memberships.some((m) => m.pod_id === podId && m.user_id === db.me && !m.left_at && m.activation === "on_deck");
}
