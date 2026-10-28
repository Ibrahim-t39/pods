// [U3] Offers (ARCHITECTURE §9.1 step 6): when a narrower group reaches the minimum, members of the widened pod
// are offered the narrower pod too. Accepting adds a pod and keeps the old one.
import type { PlacementConfig } from "@/config/placement";
import type { DbState, ID } from "@/lib/types";
import { inGroup } from "./ladder";
import { activeMemberIds } from "./scoring";
import { DEFAULT_TAXONOMY, type Taxonomy } from "./taxonomy";

export interface PlacementOffer {
  user_id: ID;
  /** The widened pod the person is already in. */
  from_pod_id: ID;
  kind: "heritage" | "faith";
  /** Narrow group key + copy. */
  group_key: string;
  group_label: string;
  /** People in the metro in that narrow group, including this member. */
  count: number;
  /** "There are now 6 Zambians nearby. Want to join a Zambian pod too?" */
  message: string;
}

export function offerMessage(count: number, label: string, plural: string): string {
  return `There are now ${count} ${plural} nearby. Want to join a ${label} pod too?`;
}

/** Offers that should exist now. The caller de-duplicates against notifications it already sent. */
export function findOffers(db: DbState, config: PlacementConfig, tax: Taxonomy = DEFAULT_TAXONOMY): PlacementOffer[] {
  const out: PlacementOffer[] = [];
  for (const pod of Object.values(db.pods)) {
    if (pod.type !== "community" || pod.widened_from?.kind !== "group" || pod.status === "closed") continue;
    const kind = pod.community_kind;
    if (!kind) continue;
    const table = tax[kind];
    const narrow = Object.values(table).find((n) => n.label === pod.widened_from!.from);
    if (!narrow) continue;
    // Skip when a narrow pod already exists.
    if (Object.values(db.pods).some((p) => p.status !== "closed" && p.type === "community" && p.topic_key === narrow.key)) continue;
    const eligible = Object.values(db.users).filter((u) => {
      if (u.status !== "active" || !u.verified || !config.metro.includes(u.city)) return false;
      const v = kind === "heritage" ? db.identities[u.id]?.heritage : db.identities[u.id]?.faith;
      return !!v && inGroup(kind, v.code, narrow.key, tax);
    });
    if (eligible.length < config.podMin) continue;
    for (const memberId of activeMemberIds(db, pod.id)) {
      const v = kind === "heritage" ? db.identities[memberId]?.heritage : db.identities[memberId]?.faith;
      if (!v || !inGroup(kind, v.code, narrow.key, tax)) continue;
      out.push({
        user_id: memberId,
        from_pod_id: pod.id,
        kind,
        group_key: narrow.key,
        group_label: narrow.label,
        count: eligible.length,
        message: offerMessage(eligible.length, narrow.label, narrow.plural),
      });
    }
  }
  return out;
}
