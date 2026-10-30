// People (PLATFORM_SPEC §F7), round 1029: "non-intuitive, overwhelming" -> grouped the way people think, by pod.
//   group   the pod's glossy sphere · pod name · when you next see that table ("Sat 10am · Brahan Spring Park")
//   row     person disc · first name · one short line of what you share (never a truncated bio) · "In" when they
//           said yes to the pod's next hangout · chevron. 64px rows, one line of meta.
//   laptop  master-detail: the list left (400px), the selected person right, sticky
//   states  loading = row skeletons · no people = points to Discover · no match = "No one matches …"
"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Disc } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { SearchGlyph } from "@/components/shell/nav-glyphs";
import { ListPage } from "@/components/platform/page-head";
import { InChip, memberLine } from "@/components/platform/kit";
import { listFormat } from "@/lib/platform/needs-you";
import { Icon } from "@/components/icons";
import { PersonCard, usePersonView } from "@/components/platform/person-card";
import { cn } from "@/lib/cn";
import { useDb } from "@/lib/db/hooks";
import { myPeople, podLabel } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { toChicagoISO } from "@/lib/time/tz";
import { roomTables, shortDay, shortTime } from "./model";
import { PodOrb } from "./pod-orb";
import type { PodHueKey } from "@/components/brand/disc";

interface Row {
  id: string;
  name: string;
  age: number;
  pods: string[];
  common: string[];
  likes: string[];
  bio: string | null;
  /** the shared pod's own interest ("basketball"), the fallback for what you share */
  topic: string | null;
}

export function People() {
  const nowMs = useClock(60_000).getTime();
  const iso = toChicagoISO(nowMs);
  const wide = useMediaQuery("(min-width: 1024px)");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const data = useDb(
    useCallback(
      (db) => {
        const mine = new Set(db.userInterests.filter((x) => x.user_id === db.me).map((x) => x.interest_id));
        const rows: Row[] = myPeople(db, iso).map((p) => {
          // the pod's own topic is a given for everyone at that table, so it never counts as "in common" here
          const topics = new Set(p.sharedPodIds.map((id) => db.pods[id]?.topic_key));
          const theirs = db.userInterests.filter((x) => x.user_id === p.member.id && !topics.has(x.interest_id)).map((x) => db.interests[x.interest_id]).filter(Boolean);
          return {
            id: p.member.id,
            name: p.member.display_name,
            age: p.member.age,
            pods: p.sharedPodIds,
            common: theirs.filter((i) => mine.has(i.id)).map((i) => i.label.toLowerCase()),
            likes: theirs.filter((i) => !mine.has(i.id)).map((i) => i.label.toLowerCase()),
            bio: p.member.bio,
            topic: p.sharedPodIds.map((id) => db.interests[db.pods[id]?.topic_key ?? ""]?.label).find(Boolean) ?? null,
          };
        });
        const tables = new Map(roomTables(db, nowMs).map((t) => [t.row.pod.id, t]));
        const podIds = [...new Set(rows.flatMap((r) => r.pods))];
        const pods = podIds
          .map((id) => db.pods[id])
          .filter(Boolean)
          .sort((a, b) => Number(a.type === "community") - Number(b.type === "community"))
          .map((p) => {
            const t = tables.get(p.id);
            const plan = t?.row.plan;
            const next = plan && Date.parse(plan.endsAt) > nowMs ? { at: plan.startsAt, venue: plan.venue?.short_name ?? plan.venue?.name ?? null } : null;
            return { id: p.id, name: podLabel(db, p), hue: (t?.hue ?? "signal") as PodHueKey, size: t?.row.size ?? 0, going: plan?.going.length ?? 0, goingIds: plan?.going ?? [], next };
          });
        return { rows, pods };
      },
      [iso, nowMs],
    ),
  );

  const needle = q.trim().toLowerCase();
  const groups = useMemo(() => {
    const hit = data.rows.filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.common.some((c) => c.includes(needle)) || r.likes.some((c) => c.includes(needle)));
    const shared = hit.filter((r) => r.pods.length > 1);
    const seen = new Set(shared.map((r) => r.id));
    const out: { id: string; name: string; rows: Row[]; pod?: (typeof data.pods)[number] }[] = [];
    if (shared.length) out.push({ id: "_shared", name: "In more than one of your pods", rows: shared });
    for (const p of data.pods) {
      const rows = hit.filter((r) => r.pods[0] === p.id && !seen.has(r.id)).sort((a, b) => b.common.length - a.common.length || a.name.localeCompare(b.name));
      if (rows.length) out.push({ id: p.id, name: p.name, rows, pod: p });
    }
    return out;
  }, [data, needle]);

  const flat = groups.flatMap((g) => g.rows);
  const selected = picked && flat.some((r) => r.id === picked) ? picked : (flat[0]?.id ?? null);
  const view = usePersonView(wide ? selected : null);
  const podName = (id: string) => data.pods.find((p) => p.id === id)?.name ?? "";

  if (!data.rows.length)
    return (
      <ListPage title="People" sub="Everyone you share a pod with.">
        <div className="rounded-2xl px-s4 py-s8 text-center shadow-[inset_0_0_0_1px_var(--line)] lg:max-w-[560px]">
          <p className="text-[17px] font-semibold text-ink">Your people show up here</p>
          <p className="mt-1 text-[14px] text-ink-2">Once you&apos;re in a pod, everyone at the table is one tap away.</p>
          <Button asChild variant="secondary" size="sm" className="mt-s4">
            <Link href="/app/discover">Find a pod</Link>
          </Button>
        </div>
      </ListPage>
    );

  return (
    <ListPage title="People" sub={`${data.rows.length} people, grouped by pod.`}>
      <div className="grid grid-cols-1 gap-s8 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-s12">
        <div className="min-w-0">
          <label className="flex h-11 items-center gap-s2 rounded-full bg-surface px-s4 shadow-[inset_0_0_0_1px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--select)]">
            <SearchGlyph size={18} className="shrink-0 text-ink-3" />
            <span className="sr-only">Search people</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or interest"
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
            />
          </label>

          {groups.length === 0 && <p className="mt-s6 text-[15px] text-ink-2">No one matches &ldquo;{q.trim()}&rdquo;.</p>}

          {groups.map((g) => (
            <section key={g.id} className="mt-s8">
              {g.pod ? (
                <Link href={`/app/pods/${g.pod.id}`} className="pressable -mx-s2 flex items-center gap-s3 rounded-2xl px-s2 py-s1 hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
                  <PodOrb hue={g.pod.hue} people={Math.max(1, g.pod.size)} inCount={g.pod.going} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] leading-[1.25] font-semibold text-ink">{g.name}</span>
                    <span className="tabular block truncate text-[14px] leading-[1.35] text-ink-2">
                      {g.pod.next ? `Next: ${shortDay(g.pod.next.at, nowMs)} ${shortTime(g.pod.next.at)}${g.pod.next.venue ? ` · ${g.pod.next.venue}` : ""}` : "No hangout planned yet"}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-[14px] text-ink-3">{g.rows.length} {g.rows.length === 1 ? "person" : "people"}</span>
                </Link>
              ) : (
                <h2 className="py-s1 text-[17px] font-semibold text-ink">{g.name}</h2>
              )}
              <ul className="mt-s2">
                {g.rows.map((r) => {
                  const on = wide && r.id === selected;
                  const going = (g.pod ? [g.pod] : data.pods).some((p) => p.next && p.goingIds.includes(r.id));
                  const line =
                    g.id === "_shared"
                      ? listFormat(r.pods.map(podName))
                      : memberLine(r.age, r.common[0] ?? r.likes[0] ?? r.topic);
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/app/people/${r.id}`}
                        onClick={(e) => {
                          if (!wide) return;
                          e.preventDefault();
                          setPicked(r.id);
                        }}
                        aria-current={on ? "true" : undefined}
                        className={cn(
                          "pressable -mx-s3 flex min-h-[64px] items-center gap-s3 rounded-xl px-s3 py-s2 outline-offset-[-2px]",
                          on ? "bg-[color-mix(in_srgb,var(--select)_9%,transparent)]" : "hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]",
                        )}
                      >
                        <Disc initial={r.name.slice(0, 1)} seed={r.name} tone="ember" size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] leading-[1.3] font-semibold text-ink">{r.name}</span>
                          <span className={cn("block truncate text-[14px] leading-[1.35]", "text-ink-2")}>{line}</span>
                        </span>
                        {going && <InChip />}
                        <Icon name="arrow" size={14} stroke={2} className="shrink-0 text-ink-3 lg:hidden" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {wide && (
          <div className="hidden min-w-0 lg:block">
            <div className="sticky top-s8 rounded-3xl bg-surface p-s8 shadow-[inset_0_0_0_1px_var(--line)]">
              {view ? <PersonCard key={view.member.id} view={view} wide /> : <p className="text-[15px] text-ink-2">Pick someone to see what you share.</p>}
            </div>
          </div>
        )}
      </div>
    </ListPage>
  );
}
