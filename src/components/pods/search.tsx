// Search (PLATFORM_SPEC §F8): your pods, your people, your plans, and interests (to Discover). ⌘K opens the palette on
// a laptop; this page is the phone's search (from Home's glyph) and the palette's "see all".
//   input    a 56px pill at the top, focused on arrival
//   results  one row per hit, the kind as its glyph (circles and dots), the label, one quiet line
// States: empty query (suggestions: your next plan, your pods, people; QA core r1, never a bare field), no matches,
// community pods follow the in-app mask.
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Icon } from "@/components/icons";
import { NAV_GLYPH, SearchGlyph } from "@/components/shell/nav-glyphs";
import { useDb } from "@/lib/db/hooks";
import { myPeople, myPlans, podLabel, searchAll } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { toChicagoISO } from "@/lib/time/tz";
import { Frame } from "./frame";
import { shortDay, shortTime } from "./model";

const GLYPH = { pod: "pods", person: "people", plan: "plans", interest: "discover" } as const;

export function Search() {
  const [q, setQ] = useState("");
  const iso = toChicagoISO(useClock(60_000).getTime());
  const hits = useDb(useCallback((db) => searchAll(db, q, iso), [q, iso]));
  return (
    <Frame line="Search.">
      <label className="flex h-14 items-center gap-s3 rounded-full bg-paper px-s4 shadow-[inset_0_0_0_1.5px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--select)]">
        <SearchGlyph size={22} className="shrink-0 text-ink-2" />
        <span className="sr-only">Search</span>
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pods, people, plans"
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-3"
          autoComplete="off"
        />
      </label>
      {!q.trim() && <Suggestions />}
      {q.trim() && !hits.length && <p className="mt-s8 text-[17px] text-ink-2">No matches.</p>}
      {hits.length > 0 && (
        <ul className="mt-s6 border-t border-line">
          {hits.map((h) => {
            const G = NAV_GLYPH[GLYPH[h.kind]];
            return (
              <li key={`${h.kind}:${h.id}`} className="border-b border-line">
                <Link href={h.href} className="pressable flex min-h-16 items-center gap-s4 outline-offset-[-2px]">
                  <G size={24} className="shrink-0 text-ink-2" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold text-ink">{h.label}</span>
                    {h.sub && <span className="block truncate text-label text-ink-2">{h.sub}</span>}
                  </span>
                  <Icon name="arrow" size={20} className="shrink-0 text-ink-2" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Frame>
  );
}

/** Before you type: the next plan, your pods and the people you share them with, each one tap away. */
function Suggestions() {
  const now = useClock(60_000).getTime();
  const iso = toChicagoISO(now);
  const next = useDb(useCallback((db) => myPlans(db, now).upcoming[0] ?? null, [now]));
  const pods = useDb(
    useCallback(
      (db) =>
        db.memberships
          .filter((m) => m.user_id === db.me && !m.left_at && m.activation === "active" && db.pods[m.pod_id])
          .map((m) => ({ id: m.pod_id, label: podLabel(db, db.pods[m.pod_id]) })),
      [],
    ),
  );
  const people = useDb(useCallback((db) => myPeople(db, iso).slice(0, 6).map((p) => ({ id: p.member.id, label: p.member.display_name })), [iso]));
  const chip = "pressable inline-flex h-11 items-center rounded-full px-s4 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line-2)] outline-offset-2";
  return (
    <div className="mt-s8 flex flex-col gap-s8">
      {next && (
        <section aria-label="Next plan">
          <h2 className="text-overline text-ink-2">Next</h2>
          <Link href={`/app/pods/${next.podId}`} className="pressable mt-s3 flex min-h-16 items-center gap-s4 border-y border-line outline-offset-[-2px]">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold text-ink">{next.title}</span>
              <span className="tabular block truncate text-label text-ink-2">
                {next.podName} · {shortDay(next.starts_at, now)} {shortTime(next.starts_at)}
              </span>
            </span>
            <Icon name="arrow" size={20} className="shrink-0 text-ink-2" />
          </Link>
        </section>
      )}
      {pods.length > 0 && (
        <section aria-label="Your pods">
          <h2 className="text-overline text-ink-2">Your pods</h2>
          <div className="mt-s3 flex flex-wrap gap-s2">
            {pods.map((p) => (
              <Link key={p.id} href={`/app/pods/${p.id}`} className={chip}>
                {p.label}
              </Link>
            ))}
          </div>
        </section>
      )}
      {people.length > 0 && (
        <section aria-label="People">
          <h2 className="text-overline text-ink-2">People</h2>
          <div className="mt-s3 flex flex-wrap gap-s2">
            {people.map((p) => (
              <Link key={p.id} href={`/app/people/${p.id}`} className={chip}>
                {p.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
