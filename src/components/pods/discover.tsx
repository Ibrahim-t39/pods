// Discover (PLATFORM_SPEC §F5), redesign r2: pods with open seats, and WHY each one fits you, with the join right on
// the row. Community pods never show here (they come only from your own likes, K D4).
//   header   compact title + one line; filter chips (All · Your people · This week · Free) and an interest chip from ?i=
//   laptop   pods (2-col cards) left, "Open hangouts" rail right (date block, title, place, seats, one action)
//   phone    chips, the next 3 open hangouts, then the pods as compact rows
//   a pod    flat solid circle with its people as white dots (the dot is the person), name, what + next plan, and a
//            reason line: people you already know in it > your likes > it keeps meeting > seats open
//   action   Join / Ask inline (one tap; undo on the toast for asks). The row itself opens the preview sheet.
//   states   loading = row skeletons (ListPage) · no pods = an empty card that points to Invite · filtered to nothing =
//            "Nothing here" + clear filter
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SNAPPY, STAGGER, Disc, DiscStack, type PodHueKey } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toast";
import { ListPage, SectionLabel, DateBlock } from "@/components/platform/page-head";
import { cn } from "@/lib/cn";
import { useDb, useRepo } from "@/lib/db/hooks";
import { discoverPods, myPeople, type DiscoverRow } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { toSeattleISO } from "@/lib/time/tz";
import { displayName } from "@/lib/utils";
import { opensAfter, roomTables, shortDay, shortTime } from "./model";
import { PodOrb } from "./pod-orb";

/** A pod's kind decides its colour, so the list reads as different places, not one card repeated. */
const MOVING = new Set(["basketball", "pickleball", "soccer", "running", "disc_golf", "climbing", "climbing_gym", "volleyball", "tennis", "cycling", "swimming", "yoga"]);
const OUTDOORS = new Set(["hiking", "volunteering", "photography", "gardening", "birding"]);
function hueOf(topicKey: string): PodHueKey {
  if (MOVING.has(topicKey)) return "ember";
  if (OUTDOORS.has(topicKey)) return "grove";
  return "signal";
}

const WEEK = 7 * 864e5;
/** Interest labels are stored lowercase ("climbing & bouldering"); a label leads with a capital. */
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
type Filter = "all" | "people" | "week" | "free";
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["people", "Your people"],
  ["week", "This week"],
  ["free", "Free"],
];

interface Enriched extends DiscoverRow {
  known: { id: string; name: string; pod: string }[];
  faces: { id: string; name: string }[];
  title: string | null;
  free: boolean;
  met: number;
  why: string;
}

export function Discover() {
  const now = useClock(60_000);
  const nowMs = now.getTime();
  const iso = toSeattleISO(nowMs);
  const params = useSearchParams();
  const router = useRouter();
  const interest = params.get("i") ?? undefined;
  const [filter, setFilter] = useState<Filter>("all");
  const [peek, setPeek] = useState<Enriched | null>(null);

  const rows = useDb(
    useCallback(
      (db) => {
        const people = new Map(myPeople(db, iso).map((p) => [p.member.id, p.member.display_name]));
        // the pod you share with them, so "Tendai (Southern African) is in it" says where you know them from
        const myPodIds = db.memberships.filter((m) => m.user_id === db.me && !m.left_at).map((m) => m.pod_id);
        const sharedPod = (uid: string) => {
          const id = myPodIds.find((p) => db.memberships.some((m) => m.pod_id === p && m.user_id === uid && !m.left_at));
          return id ? (db.pods[id]?.name ?? "your pods") : "your pods";
        };
        const likes = new Set(db.userInterests.filter((u) => u.user_id === db.me).map((u) => u.interest_id));
        return discoverPods(db, iso, interest).map((r): Enriched => {
          const ms = db.memberships.filter((m) => m.pod_id === r.pod.id && !m.left_at);
          const known = ms.filter((m) => people.has(m.user_id)).map((m) => ({ id: m.user_id, name: people.get(m.user_id)!, pod: sharedPod(m.user_id) }));
          const faces = ms.map((m) => db.users[m.user_id]).filter(Boolean).map((u) => ({ id: u.id, name: displayName(u) }));
          const h = Object.values(db.hangouts).filter((x) => x.pod_id === r.pod.id && x.status === "upcoming").sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
          const s = Object.values(db.suggestions).find((x) => x.pod_id === r.pod.id && x.status !== "replaced" && r.next && x.starts_at === r.next.starts_at);
          const venueId = h?.venue_id ?? s?.venue_id;
          const venue = venueId ? db.venues[venueId] : undefined;
          const met = Object.values(db.hangouts).filter((x) => x.pod_id === r.pod.id && x.status === "done").length;
          const why = known.length
            ? `${known.length === 1 ? known[0].name : `${known[0].name} +${known.length - 1}`} (${known[0].pod}) ${known.length === 1 ? "is" : "are"} in it`
            : likes.has(r.pod.topic_key)
              ? `You picked ${r.pod.topic}`
              : met >= 2
                ? `Met ${met} times so far`
                : r.verdict === "join"
                  ? `${r.seatsOpen} seats open`
                  : "Full · ask to join";
          return { ...r, known, faces, title: h?.title ?? s?.plan_json.event ?? null, free: venue ? venue.cost_per_person === 0 && !venue.cost_unconfirmed : false, met, why };
        });
      },
      [iso, interest],
    ),
  );
  // Before your first hangout a new pod waits on deck: the button saves a seat and says when it opens.
  const queue = useDb(
    useCallback(
      (db) => {
        if (!db.me || db.rsvps.some((r) => r.user_id === db.me && r.checked_in)) return null;
        return opensAfter(roomTables(db, nowMs), nowMs);
      },
      [nowMs],
    ),
  );
  const interestLabel = useDb(useCallback((db) => (interest ? (db.interests[interest]?.label ?? null) : null), [interest]));

  const shown = useMemo(
    () =>
      rows
        .filter((r) =>
          filter === "people" ? r.known.length > 0 : filter === "week" ? !!r.next && Date.parse(r.next.starts_at) - nowMs < WEEK : filter === "free" ? r.free : true,
        )
        .sort((a, b) => b.known.length - a.known.length),
    [rows, filter, nowMs],
  );
  const open = useMemo(
    () =>
      rows
        .filter((r) => r.next && Date.parse(r.next.starts_at) > nowMs && Date.parse(r.next.starts_at) - nowMs < 2 * WEEK && r.verdict !== "cap")
        .sort((a, b) => a.next!.starts_at.localeCompare(b.next!.starts_at))
        .slice(0, 6),
    [rows, nowMs],
  );

  const chips = (
    <div className="-mx-gutter flex gap-s2 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
      {interestLabel && (
        <button type="button" onClick={() => router.replace("/app/discover")} className="pressable inline-flex h-9 shrink-0 items-center gap-s2 rounded-full bg-ink px-s4 text-[14px] font-medium text-paper">
          {interestLabel}
          <span aria-hidden>×</span>
          <span className="sr-only">Clear</span>
        </button>
      )}
      {FILTERS.map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={filter === k}
          onClick={() => setFilter(k)}
          className={cn(
            "pressable inline-flex h-9 shrink-0 items-center rounded-full px-s4 text-[14px] font-medium",
            filter === k ? "bg-ink text-paper" : "text-ink shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <ListPage title="Discover" sub="Pods near you with open seats. Join one, we plan the rest.">
      {chips}
      <div className="mt-s6 grid grid-cols-1 gap-s8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-s12">
        {open.length > 0 && (
          <aside aria-label="Open hangouts" className="min-w-0 lg:sticky lg:top-s8 lg:col-start-2 lg:row-start-1 lg:self-start">
            <SectionLabel>Open hangouts</SectionLabel>
            <p className="mt-1 hidden text-[14px] text-ink-2 lg:block">Pods meeting soon with room for one more.</p>
            <ul className="-mx-gutter mt-s3 flex snap-x snap-mandatory scroll-px-gutter gap-s3 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] lg:mx-0 lg:block lg:overflow-visible lg:rounded-2xl lg:bg-surface lg:px-0 lg:pb-0 lg:shadow-[inset_0_0_0_1px_var(--line)]">
              {open.map((r, i) => (
                <li key={r.pod.id} className={cn("w-[300px] shrink-0 snap-start rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--line)] lg:w-auto lg:rounded-none lg:bg-transparent lg:shadow-none", i > 0 && "lg:border-t lg:border-line")}>
                  <button type="button" onClick={() => setPeek(r)} className="pressable flex h-full w-full items-start gap-s3 px-s4 py-s3 text-left outline-offset-[-2px]">
                    <DateBlock iso={r.next!.starts_at} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[15px] leading-[1.3] font-semibold text-ink">{r.title ?? r.pod.name}</span>
                      <span className="tabular mt-0.5 block truncate text-[13px] text-ink-2">
                        {shortDay(r.next!.starts_at, nowMs)} {shortTime(r.next!.starts_at)}
                        {r.next!.venueName ? ` · ${r.next!.venueName}` : ""}
                      </span>
                      <span className="block truncate text-[13px] text-ink-3">
                        {r.pod.name} · {r.free ? "Free · " : ""}
                        {r.seatsOpen} open
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        <section aria-label="Pods" className="min-w-0 lg:col-start-1 lg:row-start-1">
          <SectionLabel count={shown.length}>{filter === "people" ? "Pods with your people" : "Pods for you"}</SectionLabel>
          {queue && <p className="mt-1 text-[14px] text-ink-2 lg:hidden">Save a seat now. New pods {queue.replace(/^Opens/, "open").replace(/^open soon$/, "open soon")}.</p>}
          {shown.length ? (
            <ul className="mt-s3 border-t border-line lg:rounded-2xl lg:border-t-0 lg:bg-surface lg:shadow-[inset_0_0_0_1px_var(--line)]">
              {shown.map((r, i) => (
                <PodItem key={r.pod.id} row={r} i={i} now={nowMs} queue={queue} onPeek={() => setPeek(r)} />
              ))}
            </ul>
          ) : rows.length ? (
            <div className="mt-s3 rounded-2xl px-s4 py-s8 text-center shadow-[inset_0_0_0_1px_var(--line)]">
              <p className="text-[16px] font-semibold text-ink">Nothing here yet</p>
              <p className="mt-1 text-[14px] text-ink-2">No pods match this filter right now.</p>
              <Button variant="secondary" size="sm" className="mt-s4" onClick={() => setFilter("all")}>
                Show all pods
              </Button>
            </div>
          ) : (
            <div className="mt-s3 rounded-2xl px-s4 py-s8 text-center shadow-[inset_0_0_0_1px_var(--line)]">
              <p className="text-[16px] font-semibold text-ink">No open seats right now</p>
              <p className="mt-1 text-[14px] text-ink-2">New pods open every week. Bring a friend in meanwhile.</p>
              <Button asChild variant="secondary" size="sm" className="mt-s4">
                <Link href="/app/invite">Invite a friend</Link>
              </Button>
            </div>
          )}
        </section>

      </div>
      <SeatPreview row={peek} now={nowMs} queue={queue} onClose={() => setPeek(null)} />
    </ListPage>
  );
}

function useJoin(row: Enriched | null, queue: string | null, after?: () => void) {
  const repo = useRepo();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const take = async () => {
    if (!row) return;
    setBusy(true);
    const r = await repo.requestPod(row.pod.id);
    setBusy(false);
    if (!r.ok) return notify.error(r.error.message ?? "Not sent.");
    after?.();
    if (r.data.status === "joined") {
      notify.success(queue ? `Seat saved in ${row.pod.name}. ${queue}.` : `You're in ${row.pod.name}.`);
      router.push(`/app/pods/${row.pod.id}`);
    } else {
      const id = r.data.id;
      notify(`Asked to join ${row.pod.name}.`, { undo: () => void repo.cancelPodRequest(id) });
    }
  };
  return { busy, take };
}

function PodItem({ row, i, now, queue, onPeek }: { row: Enriched; i: number; now: number; queue: string | null; onPeek: () => void }) {
  const reduce = useReducedMotion();
  const { busy, take } = useJoin(row, queue);
  const when = row.next ? `${shortDay(row.next.starts_at, now)} ${shortTime(row.next.starts_at)}` : "First plan after you join";
  return (
    <motion.li
      className="relative border-b border-line lg:last:border-b-0"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAPPY, delay: Math.min(i, 8) * STAGGER }}
    >
      <button
        type="button"
        onClick={onPeek}
        className={cn("pressable flex w-full items-start gap-s3 py-s4 text-left outline-offset-[-2px] lg:px-s4", queue ? "pr-[124px] lg:pr-[144px]" : "pr-[92px] lg:pr-[112px]")}
        aria-label={`${row.pod.name}, ${row.pod.topic}. ${row.why}.`}
      >
        <PodOrb hue={hueOf(row.pod.topic_key)} people={row.members + row.seatsOpen} inCount={row.members} you={false} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] leading-[1.3] font-semibold text-ink">{row.pod.name}</span>
          <span className="tabular block truncate text-[14px] leading-[1.4] text-ink-2">
            {cap(row.pod.topic)} · {when}
          </span>
          <span className={cn("mt-s2 flex items-center gap-s2 text-[13px] leading-[1.3]", row.known.length ? "font-medium text-ink-2" : "text-ink-3")}>
            {row.known.length > 0 && <DiscStack size={20} max={3} people={row.known.map((k) => ({ initial: k.name.slice(0, 1), seed: k.name, tone: "ember" as const }))} />}
            <span className="line-clamp-2">{row.why}</span>
          </span>
        </span>
      </button>
      <div className="absolute top-s4 right-0 lg:top-1/2 lg:right-s4 lg:-translate-y-1/2">
        {row.requested ? (
          <span className="inline-flex h-9 items-center rounded-full px-s3 text-[14px] font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]">Asked</span>
        ) : row.verdict === "cap" ? (
          <span className="inline-flex h-9 items-center text-[13px] text-ink-3">At your limit</span>
        ) : (
          <span className="flex flex-col items-end gap-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => void take()}
              className="pressable inline-flex h-9 min-w-[76px] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-ember)_14%,transparent)] px-s4 text-[14px] font-semibold text-ember-text hover:bg-spark hover:text-on-spark disabled:opacity-60"
            >
              {row.verdict !== "join" ? "Ask" : queue ? "Save a seat" : "Join"}
            </button>
            {queue && row.verdict === "join" && <span className="hidden text-[12px] text-ink-3 lg:block">{queue}</span>}
          </span>
        )}
      </div>
    </motion.li>
  );
}

/** Who, when, where, then one seat. A small preview before anyone joins (QA core r1). */
function SeatPreview({ row, now, queue, onClose }: { row: Enriched | null; now: number; queue: string | null; onClose: () => void }) {
  const repo = useRepo();
  const { busy, take } = useJoin(row, queue, onClose);
  const band = useDb(useCallback((db) => (row ? db.pods[row.pod.id] : null), [row]));
  const requestId = useDb(
    useCallback((db) => (row ? (db.podRequests.find((r) => r.user_id === db.me && r.pod_id === row.pod.id && r.status !== "cancelled")?.id ?? null) : null), [row]),
  );
  if (!row) return <ResponsiveSheet open={false} onOpenChange={() => onClose()} title="Pod" />;

  const cancel = async () => {
    if (!requestId) return;
    const r = await repo.cancelPodRequest(requestId);
    if (!r.ok) return notify.error("Not saved.");
    onClose();
    notify("Taken off the list.");
  };

  const facts: [string, string][] = [
    ["Next", row.next ? `${row.title ? `${row.title}, ` : ""}${shortDay(row.next.starts_at, now)} ${shortTime(row.next.starts_at)}` : "First plan after you join"],
    ...(row.next?.venueName ? ([["Where", `${row.next.venueName}${row.free ? " · Free" : ""}`]] as [string, string][]) : []),
    ["Who", `${row.members} people${band ? `, ${band.age_min} to ${band.age_max}` : ""}`],
    ["Seats", row.verdict === "join" ? `${row.seatsOpen} open` : "Full for now"],
  ];

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={row.pod.name}
      description={row.met >= 2 ? `${cap(row.pod.topic)} · met ${row.met} times` : cap(row.pod.topic)}
      media={<PodOrb hue={hueOf(row.pod.topic_key)} people={row.members + row.seatsOpen} inCount={row.members} you={false} size={40} />}
    >
      <div className="flex items-center gap-s3">
        <span className="flex -space-x-2">
          {row.faces.slice(0, 7).map((f) => (
            <Disc key={f.id} initial={f.name.slice(0, 1)} seed={f.name} tone="ember" size={32} ring />
          ))}
        </span>
        <p className="min-w-0 text-[14px] text-ink-2">{row.known.length ? <span className="font-medium text-ink">{row.why}</span> : row.faces.slice(0, 3).map((f) => f.name).join(", ") + (row.faces.length > 3 ? ` +${row.faces.length - 3}` : "")}</p>
      </div>
      <dl className="mt-s4 border-t border-line">
        {facts.map(([k, v]) => (
          <div key={k} className="flex min-h-12 items-center justify-between gap-s4 border-b border-line py-s2">
            <dt className="text-[14px] text-ink-2">{k}</dt>
            <dd className="tabular text-right text-[15px] font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-s6 flex items-center justify-between gap-s4">
        <p className="text-[14px] text-ink-2">{row.verdict !== "join" ? "We'll hold the next seat for you." : queue ? `${queue}. Leave anytime.` : "Leave anytime."}</p>
        {row.requested ? (
          <Button variant="secondary" size="md" onClick={() => void cancel()}>
            Cancel ask
          </Button>
        ) : row.verdict === "cap" ? (
          <span className="text-[14px] text-ink-2">At your limit</span>
        ) : (
          <Button variant="spark" size="md" loading={busy} onClick={() => void take()}>
            {row.verdict !== "join" ? "Ask to join" : queue ? "Save a seat" : "Take a seat"}
          </Button>
        )}
      </div>
    </ResponsiveSheet>
  );
}
