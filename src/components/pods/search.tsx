// Search (PLATFORM_SPEC §F8), redesign r2. ⌘K opens the palette on a laptop; this page is the phone's search and the
// palette's "see all".
//   field    44px pill, focused on arrival; kind chips right under it (All · Pods · People · Plans · Interests) with
//            counts once you type (LinkedIn / Shopify)
//   results  grouped by kind with a section label; each kind keeps its own lead (pod = its circle, person = their
//            disc, plan = a date block, interest = a quiet ring); the matched part of the label is bold
//   empty    not a bare field (Rodeo / Perplexity): coming up (date blocks), your pods, your people, browse by interest
//   none     "Nothing for 'x'" + where to look instead
"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Disc } from "@/components/brand";
import { POD_SOLID } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { SearchGlyph } from "@/components/shell/nav-glyphs";
import { ListPage, SectionLabel, DateBlock } from "@/components/platform/page-head";
import { cn } from "@/lib/cn";
import { useDb } from "@/lib/db/hooks";
import { myPeople, myPlans, podLabel, searchAll, type SearchHit } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { toChicagoISO } from "@/lib/time/tz";
import { roomTables, shortDay, shortTime } from "./model";

type Kind = SearchHit["kind"];
const KINDS: [Kind | "all", string][] = [
  ["all", "All"],
  ["pod", "Pods"],
  ["person", "People"],
  ["plan", "Plans"],
  ["interest", "Interests"],
];
const GROUP: Record<Kind, string> = { pod: "Pods", person: "People", plan: "Plans", interest: "Find a pod for" };

export function Search() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const nowMs = useClock(60_000).getTime();
  const iso = toChicagoISO(nowMs);
  const hits = useDb(useCallback((db) => searchAll(db, q, iso, 40), [q, iso]));
  const hues = useDb(useCallback((db) => Object.fromEntries(roomTables(db, nowMs).map((t) => [t.row.pod.id, t.hue])), [nowMs]));
  const typed = q.trim().length > 0;
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: hits.length };
    for (const h of hits) c[h.kind] = (c[h.kind] ?? 0) + 1;
    return c;
  }, [hits]);
  const shown = kind === "all" ? hits : hits.filter((h) => h.kind === kind);
  const groups = (["plan", "person", "pod", "interest"] as Kind[]).map((k) => ({ k, items: shown.filter((h) => h.kind === k) })).filter((g) => g.items.length);

  return (
    <ListPage title="Search">
      <div className="lg:max-w-[880px]">
        <label className="flex h-12 items-center gap-s3 rounded-full bg-surface px-s4 shadow-[inset_0_0_0_1.5px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--select)]">
          <SearchGlyph size={20} className="shrink-0 text-ink-2" />
          <span className="sr-only">Search</span>
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pods, people, plans, places"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
            autoComplete="off"
          />
          {typed && (
            <button type="button" onClick={() => setQ("")} className="pressable -mr-s2 inline-flex h-9 items-center rounded-full px-s3 text-[14px] font-medium text-ink-2">
              Clear
            </button>
          )}
        </label>

        {typed && (
          <div className="-mx-gutter mt-s3 flex gap-s2 overflow-x-auto px-gutter [scrollbar-width:none] lg:mx-0 lg:px-0">
            {KINDS.map(([k, label]) => {
              const n = counts[k] ?? 0;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  disabled={k !== "all" && !n}
                  onClick={() => setKind(k)}
                  className={cn(
                    "pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-s4 text-[14px] font-medium disabled:opacity-40",
                    kind === k ? "bg-ink text-paper" : "text-ink shadow-[inset_0_0_0_1px_var(--line-2)]",
                  )}
                >
                  {label}
                  <span className={cn("tabular", kind === k ? "text-paper/70" : "text-ink-3")}>{n}</span>
                </button>
              );
            })}
          </div>
        )}

        {!typed && <Suggestions now={nowMs} hues={hues} onPick={setQ} />}

        {typed && !shown.length && (
          <div className="mt-s8 rounded-2xl px-s4 py-s8 text-center shadow-[inset_0_0_0_1px_var(--line)]">
            <p className="text-[16px] font-semibold text-ink">Nothing for &ldquo;{q.trim()}&rdquo;</p>
            <p className="mt-1 text-[14px] text-ink-2">Search looks through your pods, their people and plans.</p>
            <Link href="/app/discover" className="mt-s4 inline-flex h-10 items-center rounded-full px-s4 text-[14px] font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--line-2)]">
              Browse pods near you
            </Link>
          </div>
        )}

        {groups.map((g) => (
          <section key={g.k} className="mt-s6">
            <SectionLabel count={g.items.length}>{GROUP[g.k]}</SectionLabel>
            <ul className="mt-s2">
              {g.items.map((h) => (
                <li key={`${h.kind}:${h.id}`}>
                  <Link href={h.href} className="pressable -mx-s3 flex min-h-[56px] items-center gap-s3 rounded-xl px-s3 py-s2 outline-offset-[-2px] hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
                    <Lead hit={h} hue={hues[h.id]} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] leading-[1.3] text-ink">
                        <Mark text={h.label} q={q} />
                      </span>
                      <span className="tabular block truncate text-[13px] text-ink-2">
                        {h.kind === "plan" ? `${shortDay(h.starts_at, nowMs)} ${shortTime(h.starts_at)} · ${h.sub}` : h.kind === "interest" ? "See pods with open seats" : h.sub}
                      </span>
                    </span>
                    <Icon name="arrow" size={18} className="shrink-0 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ListPage>
  );
}

function Lead({ hit, hue }: { hit: SearchHit; hue?: string }) {
  if (hit.kind === "plan") return <DateBlock iso={hit.starts_at} size={36} />;
  if (hit.kind === "person") return <Disc initial={hit.label.slice(0, 1)} seed={hit.label} tone="ember" size={36} />;
  if (hit.kind === "pod") return <span aria-hidden className="block size-9 shrink-0 rounded-full" style={{ backgroundColor: POD_SOLID[(hue as "ember") ?? "ember"] }} />;
  return <span aria-hidden className="block size-9 shrink-0 rounded-full border-[1.5px] border-dashed border-line-2" />;
}

/** Bold the matched part of a label. */
function Mark({ text, q }: { text: string; q: string }): ReactNode {
  const i = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (i < 0 || !q.trim()) return <span className="font-semibold">{text}</span>;
  const n = q.trim().length;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-semibold">{text.slice(i, i + n)}</span>
      {text.slice(i + n)}
    </>
  );
}

/** Before you type: what's coming up, your pods and people, and interests to browse. Each one tap away. */
function Suggestions({ now, hues, onPick }: { now: number; hues: Record<string, string>; onPick: (q: string) => void }) {
  const iso = toChicagoISO(now);
  const data = useDb(
    useCallback(
      (db) => {
        const pods = db.memberships
          .filter((m) => m.user_id === db.me && !m.left_at && m.activation === "active" && db.pods[m.pod_id])
          .map((m) => db.pods[m.pod_id]);
        return {
          next: myPlans(db, now).upcoming.slice(0, 3),
          pods: pods.map((p) => ({ id: p.id, label: podLabel(db, p), sub: `${db.memberships.filter((m) => m.pod_id === p.id && !m.left_at).length} people` })),
          people: myPeople(db, iso).slice(0, 10).map((p) => ({ id: p.member.id, label: p.member.display_name })),
          topics: [...new Set(Object.values(db.pods).filter((p) => p.type === "interest" && p.status !== "closed").map((p) => p.topic_key))]
            .map((k) => db.interests[k])
            .filter(Boolean)
            .slice(0, 10)
            .map((i) => ({ id: i.id, label: i.label })),
        };
      },
      [now, iso],
    ),
  );
  const chip = "pressable inline-flex h-9 items-center rounded-full px-s4 text-[14px] font-medium text-ink shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]";
  return (
    <div className="mt-s6 grid grid-cols-1 gap-s8 lg:grid-cols-2 lg:gap-x-s12">
      {data.next.length > 0 && (
        <section aria-label="Coming up">
          <SectionLabel>Coming up</SectionLabel>
          <ul className="mt-s2">
            {data.next.map((p) => (
              <li key={p.id}>
                <Link href={`/app/plans/${p.id}`} className="pressable -mx-s3 flex min-h-[56px] items-center gap-s3 rounded-xl px-s3 py-s2 hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
                  <DateBlock iso={p.starts_at} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{p.title}</span>
                    <span className="tabular block truncate text-[13px] text-ink-2">
                      {p.podName} · {shortDay(p.starts_at, now)} {shortTime(p.starts_at)}
                      {p.locked ? " · Locked" : ` · ${p.going} in`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.pods.length > 0 && (
        <section aria-label="Your pods">
          <SectionLabel>Your pods</SectionLabel>
          <ul className="mt-s2">
            {data.pods.map((p) => (
              <li key={p.id}>
                <Link href={`/app/pods/${p.id}`} className="pressable -mx-s3 flex min-h-[56px] items-center gap-s3 rounded-xl px-s3 py-s2 hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
                  <span aria-hidden className="block size-9 shrink-0 rounded-full" style={{ backgroundColor: POD_SOLID[(hues[p.id] as "ember") ?? "ember"] }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{p.label}</span>
                    <span className="tabular block truncate text-[13px] text-ink-2">{p.sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.people.length > 0 && (
        <section aria-label="People">
          <SectionLabel right={<Link href="/app/people" className="text-[14px] font-medium text-select">All people</Link>}>People</SectionLabel>
          <ul className="mt-s3 flex flex-wrap gap-x-s2 gap-y-s3">
            {data.people.map((p) => (
              <li key={p.id}>
                <Link href={`/app/people/${p.id}`} className="pressable inline-flex h-10 items-center gap-s2 rounded-full pr-s4 pl-1 text-[14px] font-medium text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]">
                  <Disc initial={p.label.slice(0, 1)} seed={p.label} tone="ember" size={32} />
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.topics.length > 0 && (
        <section aria-label="Try">
          <SectionLabel>Try searching</SectionLabel>
          <div className="mt-s3 flex flex-wrap gap-s2">
            {data.topics.map((t) => (
              <button key={t.id} type="button" onClick={() => onPick(t.label)} className={chip}>
                {t.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
