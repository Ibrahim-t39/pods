// "If something’s off" (V3_SPEC §6.5; never "Safety center" or "safe", library I #4). The old safety centre is now
// a handful of rows inside Your seat → More → Help: call lines first, then share your plan, blocked people, write to us.
"use client";

import { useState } from "react";
import { notify } from "@/components/ui";
import { useDb } from "@/lib/db/hooks";
import { formatWhen } from "@/lib/time/format";
import { Rows, SheetRow } from "@/components/profile/kit";
import { HelpLines, WRITE_TO_US } from "./help-lines";
import { useBlockedPeople } from "./blocked-list";

/** The next locked hangout, said the way you'd text a friend. Community pods stay discreet (D10). */
function useNextPlan() {
  return useDb((db) => {
    if (!db.me) return null;
    const mine = new Set(db.memberships.filter((m) => m.user_id === db.me && !m.left_at).map((m) => m.pod_id));
    const h = Object.values(db.hangouts)
      .filter((x) => x.status === "upcoming" && mine.has(x.pod_id))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    if (!h) return null;
    const v = db.venues[h.venue_id];
    const pod = db.pods[h.pod_id];
    return { title: pod?.type === "community" ? "my pod" : h.title, when: h.starts_at, place: v?.short_name ?? v?.name ?? "", address: v?.address ?? "" };
  });
}

export function SafetyCenter({ onBlocked }: { onBlocked: () => void }) {
  const next = useNextPlan();
  const blocked = useBlockedPeople().length;
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (!next || sharing) return;
    setSharing(true);
    const text = `I’m going to ${next.title}, ${formatWhen(next.when)}${next.place ? ` at ${next.place}` : ""}${next.address ? ` (${next.address})` : ""}. I’ll text you after.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        notify("Copied. Send it to someone you trust.");
      }
    } catch {
      /* dismissed */
    } finally {
      setSharing(false);
    }
  }

  return (
    <Rows label="If something’s off">
      <HelpLines />
      {next && <SheetRow icon="send" label="Share my plan" onClick={share} />}
      <SheetRow icon="block" label="Blocked" value={<span data-nc>{blocked || undefined}</span>} arrow onClick={onBlocked} />
      <SheetRow icon="bell" label="Write to us" href={WRITE_TO_US} external />
    </Rows>
  );
}
