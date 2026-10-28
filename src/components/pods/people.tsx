// People (PLATFORM_SPEC §F7): everyone you share a pod with, most shared first. Blocked people are left out. Tap a person
// → their card (/app/people/[id]: shared pods, report, block). Each row shows the pods you share as small orbs: the
// overlaps are what you share (BRAND §1).
"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Disc } from "@/components/brand";
import { POD_SOLID, POD_WASH } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { useDb } from "@/lib/db/hooks";
import { myPeople } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { toChicagoISO } from "@/lib/time/tz";
import { Frame } from "./frame";
import { roomTables } from "./model";

export function People() {
  const now = useClock(60_000).getTime();
  const iso = toChicagoISO(now);
  const people = useDb(useCallback((db) => myPeople(db, iso), [iso]));
  const hues = useDb(useCallback((db) => Object.fromEntries(roomTables(db, now).map((t) => [t.row.pod.id, { hue: t.hue, name: t.row.name }])), [now]));
  return (
    <Frame over="People" line="Your people.">
      {people.length ? (
        <ul className="border-t border-line">
          {people.map((p) => (
            <li key={p.member.id} className="border-b border-line">
              <Link href={`/app/people/${p.member.id}`} className="pressable flex min-h-[72px] items-center gap-s4 outline-offset-[-2px]">
                <Disc initial={p.member.display_name.slice(0, 1).toUpperCase()} seed={p.member.display_name} tone="signal" size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-ink">{p.member.display_name}</span>
                  <span className="block truncate text-label text-ink-2">{p.sharedPodIds.map((id) => hues[id]?.name).filter(Boolean).join(" · ")}</span>
                </span>
                <span aria-hidden className="flex shrink-0 items-center">
                  {p.sharedPodIds.slice(0, 3).map((id, i) => {
                    const h = hues[id]?.hue ?? "ember";
                    return <span key={id} className="orb size-6" style={{ marginLeft: i ? -8 : 0, ["--orb" as string]: POD_SOLID[h], ["--orb-wash" as string]: POD_WASH[h] }} />;
                  })}
                </span>
                <Icon name="arrow" size={20} className="shrink-0 text-ink-2" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[20px] leading-[1.3] text-ink-2">Your pods&apos; people appear here.</p>
      )}
    </Frame>
  );
}
