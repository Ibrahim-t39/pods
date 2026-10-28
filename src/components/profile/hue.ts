// Colour means the pod (DESIGN.md §4): community pods are grove; your interest pods take ember, then signal, in the
// order you joined them, so your pods read as the logo's three circles. You are always ink.
import type { DbState } from "@/lib/types";
import type { PodHueKey } from "@/components/brand/disc";

export function podHue(db: DbState, podId: string | null | undefined): PodHueKey {
  if (!podId) return "ember";
  const pod = db.pods[podId];
  if (pod?.type === "community") return "grove";
  const mine = db.memberships
    .filter((m) => m.user_id === db.me && !m.left_at && db.pods[m.pod_id]?.type === "interest")
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    .map((m) => m.pod_id);
  return mine.indexOf(podId) === 1 ? "signal" : "ember";
}
