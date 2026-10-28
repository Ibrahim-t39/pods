// Inbox (wireframes N01-N04; V3_SPEC §6.5; PLATFORM_SPEC §F6): what Pods told you, one line per text with the pod's
// bead and the time. New texts carry a small blue (--select) dot.
//   filters      only the kinds you actually have (All, New, then Plans · Pods · Run it back · Help), never empty chips
//   read         opening a text reads it; swipe a row left to read it without opening (the app's one sideways swipe,
//                MOTION_SYSTEM §12); "Mark all read" sits beside the filters only while something is new
//   phone        mark · "Inbox." · 24 · filters · rows · room for the floating nav
//   laptop       the list in the 520 column; the chosen text opens beside it (pod bead, line, body, Open), so the
//                list stays put (PLATFORM_SPEC §C "Inbox: the opened item")
// Community pods stay discreet (D10): buildInbox masks their names when "Hide community names" is on.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Disc } from "@/components/brand/disc";
import { Line } from "@/components/brand/line";
import { Stage } from "@/components/brand/stage";
import { GENTLE, POP, SNAPPY, STAGGER } from "@/components/brand/motion";
import { CondensingHead } from "@/components/shell/condensing-head";
import { Button, notify } from "@/components/ui";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { GoLink } from "@/components/profile/kit";
import { podHue } from "@/components/profile/hue";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { formatRelative } from "@/lib/time/format";
import { buildInbox, TRIGGER_GROUP, type InboxItem, type NotificationGroup } from "@/lib/notifications/rules";
import { cardView } from "@/lib/planner/card-state";
import { shortDay, shortTime } from "@/components/pods/model";
import type { DbState } from "@/lib/types";
import { useDevicePrefs } from "@/lib/notifications/prefs";
import { cn } from "@/lib/cn";
import "@/components/profile/seat.css";

const SEEN = "pods:inbox-seen";

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SEEN) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function writeSeen(s: Set<string>) {
  try {
    window.localStorage.setItem(SEEN, JSON.stringify([...s]));
  } catch {
    /* storage blocked: the dots come back next visit */
  }
}

/** Old derived links pointed at the settings pages; help now lives at /app/safety. */
function hrefOf(n: InboxItem) {
  return n.href.startsWith("/app/settings/safety") ? "/app/safety" : n.href;
}

type Filter = "all" | "new" | "plans" | "pods" | "again" | "help";
const GROUP_FILTER: Record<NotificationGroup, Filter> = { hangouts: "plans", podChat: "pods", news: "pods", runItBack: "again", safety: "help" };
const FILTER_LABEL: Record<Filter, string> = { all: "All", new: "New", plans: "Plans", pods: "Pods", again: "Run it back", help: "Help" };
const ORDER: Filter[] = ["all", "new", "plans", "pods", "again", "help"];

export function InboxScreen() {
  const repo = useRepo();
  const router = useRouter();
  const db = useDb((d) => d);
  const hydrated = useHydrated();
  const now = useClock();
  const wide = useMediaQuery("(min-width: 1024px)");
  const { prefs } = useDevicePrefs();
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => setSeen(readSeen()), []);
  const items = useMemo(
    () => (seen ? [...planReady(db, now.getTime(), seen, prefs.discreet), ...buildInbox(db, now.toISOString(), seen, prefs.discreet)].sort((a, b) => b.created_at.localeCompare(a.created_at)) : []),
    [db, now, seen, prefs.discreet],
  );

  const kindOf = (n: InboxItem): Filter => GROUP_FILTER[TRIGGER_GROUP[n.trigger]] ?? "pods";
  const present = useMemo(() => {
    const kinds = new Set(items.map(kindOf));
    const out = ORDER.filter((f) => f === "all" || (f === "new" ? items.some((i) => !i.read) : kinds.has(f)));
    return out.length > 2 && items.length >= 3 ? out : []; // filters only earn their row when there is something to tell apart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  const active = present.includes(filter) ? filter : "all";
  const shown = items.filter((n) => active === "all" || (active === "new" ? !n.read : kindOf(n) === active));
  const unread = items.filter((i) => !i.read);
  const pick = shown.find((n) => n.id === chosen) ?? shown[0] ?? null;

  async function markRead(list: InboxItem[], quiet = true) {
    if (!list.length) return;
    const stored = list.filter((i) => i.stored && !i.read).map((i) => i.id);
    if (stored.length) {
      const r = await repo.markNotificationsRead(stored);
      if (!r.ok && !quiet) notify.error("Not marked. Try again.");
    }
    const derived = list.filter((i) => !i.stored);
    if (derived.length) {
      const next = new Set(readSeen());
      for (const i of derived) next.add(i.id);
      writeSeen(next);
      setSeen(next);
    }
  }

  async function markAll() {
    const r = await repo.markAllNotificationsRead();
    if (!r.ok) notify.error("Not marked. Try again.");
    await markRead(unread.filter((i) => !i.stored));
  }

  function open(n: InboxItem) {
    void markRead([n]);
    router.push(hrefOf(n));
  }

  const ready = hydrated && seen !== null;

  return (
    <div className="seat-pg">
      <Stage light="paper" />
      <CondensingHead left="mark" size="lg" title="Inbox." compact="Inbox" className="seat-head" />
      <div className="seat-body inbox-body">
        <div className="seat-col">
          {ready && (present.length > 0 || unread.length > 0) && (
            <div className="inbox-filters">
              <div role="tablist" aria-label="Show" className="inbox-chips">
                {present.map((f) => (
                  <button key={f} type="button" role="tab" aria-selected={active === f} onClick={() => setFilter(f)} className="inbox-chip pressable">
                    {active === f && <motion.span layoutId="inbox-bead" aria-hidden className="absolute inset-0 rounded-full bg-select" transition={SNAPPY} />}
                    <span className="relative">{FILTER_LABEL[f]}</span>
                  </button>
                ))}
              </div>
              {unread.length > 0 && (
                <GoLink onClick={() => void markAll()} className="shrink-0 text-[15px]">
                  Mark all read
                </GoLink>
              )}
            </div>
          )}

          {ready && shown.length === 0 && (
            <div className="mt-s6 flex items-center gap-s4 border-y border-line py-s4">
              <Disc tone="open" size={32} />
              <p className="text-[16px] text-ink-2">{items.length ? "Nothing new." : "Nothing yet."}</p>
            </div>
          )}

          {ready && shown.length > 0 && (
            <ul className="inbox-list" aria-label="Inbox">
              <AnimatePresence initial={false}>
                {shown.map((n, i) => (
                  <motion.li
                    key={n.id}
                    layout="position"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ ...GENTLE, delay: Math.min(i, 8) * STAGGER }}
                    className="relative overflow-hidden"
                  >
                    <Row
                      n={n}
                      i={i}
                      now={now}
                      wide={wide}
                      selected={wide && pick?.id === n.id}
                      hue={n.podId && db.pods[n.podId] ? podHue(db, n.podId) : null}
                      initial={n.podId && db.pods[n.podId] && !(db.pods[n.podId].type === "community" && prefs.discreet) ? db.pods[n.podId].name.slice(0, 1) : ""}
                      onOpen={() => open(n)}
                      onChoose={() => {
                        setChosen(n.id);
                        void markRead([n]);
                      }}
                      onRead={() => void markRead([n], false)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* laptop: the chosen text, opened beside the list */}
        {wide && ready && pick && (
          <aside className="inbox-pane" aria-label="Opened">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={pick.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={GENTLE}>
                <motion.span className="inline-block" initial={POP.initial} animate={POP.animate} transition={POP.transition}>
                  {pick.podId && db.pods[pick.podId] ? (
                    <Disc tone={podHue(db, pick.podId)} seed={pick.podId} initial={db.pods[pick.podId].type === "community" && prefs.discreet ? "" : db.pods[pick.podId].name.slice(0, 1)} size={64} />
                  ) : (
                    <Disc tone="you" initial="" size={64} />
                  )}
                </motion.span>
                <Line size="md" className="mt-s6 max-w-[20ch]">
                  {pick.title}
                </Line>
                <p className="mt-s4 max-w-[52ch] text-[17px] leading-[1.5] text-ink-2">{pick.body}</p>
                <p data-nc className="mt-s2 text-label text-ink-2 tabular-nums">
                  {formatRelative(pick.created_at, now)}
                </p>
                <Button asChild className="mt-s8">
                  <Link href={hrefOf(pick)} onClick={() => void markRead([pick])}>
                    Open
                  </Link>
                </Button>
              </motion.div>
            </AnimatePresence>
          </aside>
        )}
      </div>
    </div>
  );
}

/** One text. Phone: a link you can swipe left to read. Laptop: a row you choose (it opens beside the list). */
function Row({
  n,
  i,
  now,
  wide,
  selected,
  hue,
  initial,
  onOpen,
  onChoose,
  onRead,
}: {
  n: InboxItem;
  i: number;
  now: Date;
  wide: boolean;
  selected: boolean;
  hue: ReturnType<typeof podHue> | null;
  initial: string;
  onOpen: () => void;
  onChoose: () => void;
  onRead: () => void;
}) {
  const dragged = useRef(false);
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-72, -8, 0], [1, 0, 0]);
  const body = (
    <>
      <motion.span className="shrink-0" initial={POP.initial} animate={POP.animate} transition={{ ...POP.transition, delay: Math.min(i, 8) * STAGGER }}>
        {hue ? <Disc tone={hue} seed={n.podId ?? undefined} initial={initial} size={36} /> : <Disc tone="you" size={36} initial="" />}
      </motion.span>
      <span className="min-w-0 flex-1">
        <span className={cn("texts-line block truncate text-[16px] text-ink", !n.read && "font-semibold")}>{n.title}</span>
        {n.body && <span className="block truncate text-label text-ink-2">{n.body}</span>}
      </span>
      <span data-nc className="shrink-0 text-label text-ink-2 tabular-nums">
        {formatRelative(n.created_at, now)}
      </span>
      <motion.span
        aria-hidden
        className="size-2 shrink-0 rounded-full bg-select"
        initial={false}
        animate={{ scale: n.read ? 0 : 1, opacity: n.read ? 0 : 1 }}
        transition={SNAPPY}
      />
    </>
  );
  const label = `${n.read ? "" : "New. "}${n.title}. ${n.body}`;

  if (wide)
    return (
      <button type="button" aria-label={label} aria-current={selected || undefined} onClick={onChoose} onDoubleClick={onOpen} className="texts-row pressable w-full text-left" data-selected={selected || undefined}>
        {body}
      </button>
    );

  const end = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -72 && !n.read) onRead();
    setTimeout(() => (dragged.current = false), 0);
  };
  return (
    <>
      {/* behind the row: what the swipe does */}
      <motion.span aria-hidden style={{ opacity: reveal }} data-swipe-label={n.read ? "" : "Read"} className="absolute inset-y-0 right-0 flex items-center pr-s4 text-label font-semibold text-select after:content-[attr(data-swipe-label)]" />
      <motion.div
        drag={n.read ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={0.12}
        dragSnapToOrigin
        onDragStart={() => (dragged.current = true)}
        onDragEnd={end}
        style={{ x }}
        className="relative"
      >
        <a
          href={hrefOf(n)}
          aria-label={label}
          className="texts-row pressable"
          onClick={(e) => {
            e.preventDefault();
            if (dragged.current) return;
            onOpen();
          }}
        >
          {body}
        </a>
      </motion.div>
    </>
  );
}

/** A plan waiting on you is the first thing the inbox says (QA core r1: "Hoopers: plan ready · 3 of 8 in"). One per pod
 *  with a live plan you haven't answered; it reads once opened. Community names follow the discreet setting. */
function planReady(db: DbState, nowMs: number, seen: Set<string>, discreet: boolean): InboxItem[] {
  if (!db.me) return [];
  const out: InboxItem[] = [];
  for (const m of db.memberships) {
    if (m.user_id !== db.me || m.left_at || m.activation !== "active") continue;
    const v = cardView(db, m.pod_id, nowMs);
    const s = v?.suggestion;
    if (!v || !s || v.locked || v.imIn || s.status !== "suggested") continue;
    const pod = db.pods[m.pod_id];
    const name = pod.type === "community" && discreet ? "Your community pod" : pod.name;
    const id = `d:ready:${s.id}`;
    out.push({
      id,
      trigger: "plan_locked",
      title: `${name}: plan ready`,
      body: `${v.going.length} of ${v.size} in · ${shortDay(s.plan_json.starts_at, nowMs)} ${shortTime(s.plan_json.starts_at)}`,
      href: `/app/pods/${m.pod_id}`,
      created_at: s.created_at,
      read: seen.has(id),
      podId: m.pod_id,
      stored: false,
    });
  }
  return out;
}
