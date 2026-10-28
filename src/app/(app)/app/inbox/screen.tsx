// Texts (wireframes N01-N04; V3_SPEC §6.5): what Pods told you, one line per text with the pod's disc and the time.
// Each row opens its screen (the plan, the day, "Everything okay?", the open seat). New texts carry a small blue (--select) dot;
// leaving the page marks them read, so there is no "Mark all read" button to press. Community pods stay discreet (D10).
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Disc } from "@/components/brand/disc";
import { Stage } from "@/components/brand/stage";
import { GENTLE } from "@/components/brand/table-ring";
import { POP, STAGGER } from "@/components/brand/motion";
import { CondensingHead } from "@/components/shell/condensing-head";
import { podHue } from "@/components/profile/hue";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { formatRelative } from "@/lib/time/format";
import { buildInbox, type InboxItem } from "@/lib/notifications/rules";
import { useDevicePrefs } from "@/lib/notifications/prefs";
import "@/components/profile/seat.css";

const SEEN = "pods:inbox-seen";

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SEEN) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Old derived links pointed at the settings pages; those now live in Your seat. */
function hrefOf(n: InboxItem) {
  return n.href.startsWith("/app/settings/safety") ? "/app/profile?sheet=help" : n.href;
}

export function InboxScreen() {
  const repo = useRepo();
  const db = useDb((d) => d);
  const hydrated = useHydrated();
  const now = useClock();
  const { prefs } = useDevicePrefs();
  const [seen, setSeen] = useState<Set<string> | null>(null);
  useEffect(() => setSeen(readSeen()), []);
  const items = useMemo(() => (seen ? buildInbox(db, now.toISOString(), seen, prefs.discreet) : []), [db, now, seen, prefs.discreet]);

  // Mark everything read when the person leaves the page (they have seen it).
  const latest = useRef<InboxItem[]>([]);
  latest.current = items;
  useEffect(
    () => () => {
      const unread = latest.current.filter((i) => !i.read);
      const stored = unread.filter((i) => i.stored).map((i) => i.id);
      if (stored.length) void repo.markNotificationsRead(stored);
      try {
        const next = new Set(readSeen());
        for (const i of unread) if (!i.stored) next.add(i.id);
        window.localStorage.setItem(SEEN, JSON.stringify([...next]));
      } catch {
        /* storage blocked: dots return next visit */
      }
    },
    [repo],
  );

  const ready = hydrated && seen !== null;

  return (
    <div className="seat-pg">
      <Stage light="paper" />
      <CondensingHead left="back" backHref="/app/pods" backLabel="Your pods" size="lg" title="Texts." compact="Texts" className="seat-head" />
      <div className="seat-body texts-body">
        <div>
          {ready && items.length === 0 && (
            <div className="flex items-center gap-s4 border-y border-line py-s4">
              <Disc tone="open" size={32} />
              <p className="text-[16px] text-ink-2">Nothing yet.</p>
            </div>
          )}
          {ready && items.length > 0 && (
            <ul className="border-b border-line" aria-label="Texts">
              {items.map((n, i) => {
                const pod = n.podId ? db.pods[n.podId] : null;
                const discreet = pod?.type === "community" && prefs.discreet;
                return (
                  <motion.li key={n.id} className={i > 6 ? "settle" : undefined} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GENTLE, delay: Math.min(i, 8) * STAGGER }}>
                    <Link href={hrefOf(n)} className="texts-row pressable" aria-label={`${n.title}. ${n.body}`}>
                      <motion.span className="shrink-0" initial={POP.initial} animate={POP.animate} transition={{ ...POP.transition, delay: Math.min(i, 8) * STAGGER }}>
                        {pod ? <Disc tone={podHue(db, pod.id)} initial={discreet ? "" : pod.name.slice(0, 1)} size={32} /> : <Disc tone="you" size={32} initial="" />}
                      </motion.span>
                      <span className="texts-line min-w-0 flex-1 truncate text-[16px]">{n.title}</span>
                      <span data-nc className="shrink-0 text-label text-ink-2 tabular-nums">
                        {formatRelative(n.created_at, now)}
                      </span>
                      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: n.read ? "transparent" : "var(--select)" }} />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
