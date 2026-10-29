// Inbox: what your pods did and what they need from you, handled right here.
//   head      compact "Inbox" + how many are new + Mark all read, then All · Plans · Messages · Pods
//   list      grouped Today · Yesterday · This week · Earlier. Each row: a meaningful mark (the pod, or the person with
//             their pod's colour), one line, one preview, the time, a new-dot, and its one inline action
//             only in "Needs you" (I'm in · vote · Check in · Run it back · Join pod); every other row is quiet and
//             opens on tap (messages open the chat to reply, polls open to vote)
//   phone     tap the text to open the real thing; swipe a row left to mark it read
//   laptop    master-detail: the list on the left, the real object on the right (the plan with its details and
//             actions, the chat thread with a reply box, the poll, your pods)
// Community pods: in the app they keep their real name, like everywhere else. The lock-screen label ("Your community
// pod") is for push previews only; the inbox masks names only when "Hide community names" (in-app masking) is on.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Disc, DiscStack, ON_HUE, POD_SOLID, type PodHueKey } from "@/components/brand/disc";
import { Stage } from "@/components/brand/stage";
import { GENTLE, SNAPPY } from "@/components/brand/motion";
import { Chrome } from "@/components/shell/chrome";
import { Icon } from "@/components/icons";
import { Button, notify } from "@/components/ui";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { podHue } from "@/components/profile/hue";
import { shortTime } from "@/components/pods/model";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { chicagoDaysBetween } from "@/lib/time/tz";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";
import { cardView } from "@/lib/planner/card-state";
import { maskText, podLabel } from "@/lib/notifications/rules";
import { useDevicePrefs } from "@/lib/notifications/prefs";
import type { DbState, ID } from "@/lib/types";
import { cn } from "@/lib/cn";
import { buildActivity, needsYou, sectionOf, type Act, type Activity, type Kind, type Section } from "./activity";
import "./inbox.css";

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
const hrefOf = (n: Activity) => (n.href.startsWith("/app/settings/safety") ? "/app/safety" : n.href);

type Filter = "all" | Kind;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "plans", label: "Plans" },
  { id: "messages", label: "Messages" },
  { id: "pods", label: "Pods" },
];
const SECTIONS: Section[] = ["Today", "Yesterday", "This week", "Earlier"];

function stamp(iso: string, now: Date): string {
  const d = chicagoDaysBetween(iso, now);
  if (d <= 0) {
    const min = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
    return min < 1 ? "now" : min < 60 ? `${min}m` : formatInTimeZone(iso, TZ, "h:mmaaa");
  }
  if (d < 7) return formatInTimeZone(iso, TZ, "EEE");
  return formatInTimeZone(iso, TZ, "MMM d");
}

export function InboxScreen() {
  const repo = useRepo();
  const router = useRouter();
  const db = useDb((d) => d);
  const hydrated = useHydrated();
  const now = useClock();
  const wide = useMediaQuery("(min-width: 1024px)");
  const { prefs } = useDevicePrefs();
  const discreet = prefs.discreet && prefs.maskInApp;
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => setSeen(readSeen()), []);

  const items = useMemo(() => (seen ? buildActivity(db, now, seen, discreet) : []), [db, now, seen, discreet]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, plans: 0, messages: 0, pods: 0 };
    for (const i of items) if (!i.read) (c.all++, c[i.kind]++);
    return c;
  }, [items]);
  const shown = items.filter((n) => filter === "all" || n.kind === filter);
  const unread = items.filter((i) => !i.read);
  const ordered = [...shown.filter(needsYou), ...shown.filter((n) => !needsYou(n))];
  const pick = shown.find((n) => n.id === chosen) ?? ordered[0] ?? null;
  const ready = hydrated && seen !== null;

  async function markRead(list: Activity[], quiet = true) {
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
  function open(n: Activity) {
    void markRead([n]);
    router.push(hrefOf(n));
  }

  const pending = shown.filter(needsYou);
  const groups = [
    { s: "Needs you" as Section, rows: pending },
    ...SECTIONS.map((s) => ({ s, rows: shown.filter((n) => !needsYou(n) && sectionOf(n.created_at, now) === s) })),
  ].filter((g) => g.rows.length);

  return (
    <div className="inbx-pg">
      <Stage light="paper" />
      <Chrome left="mark" className="lg:hidden" />
      <div className="inbx-wrap">
        <section className="inbx-col" aria-label="Inbox">
          <header className="inbx-head">
            <div className="flex min-w-0 items-baseline gap-s3">
              <h1 className="inbx-title">Inbox</h1>
              {ready && counts.all > 0 && (
                <span data-nc className="text-[15px] font-medium text-select tabular-nums">
                  {counts.all} new
                </span>
              )}
            </div>
            {ready && counts.all > 0 && (
              <button type="button" onClick={() => void markAll()} className="inbx-quiet pressable">
                <Icon name="check" size={18} />
                Mark all read
              </button>
            )}
          </header>

          <div role="tablist" aria-label="Show" className="inbx-filters">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className="inbx-filter pressable">
                {filter === f.id && <motion.span layoutId="inbx-bead" aria-hidden className="absolute inset-0 rounded-full bg-ink" transition={SNAPPY} />}
                <span className="relative">{f.label}</span>
                {ready && counts[f.id] > 0 && f.id !== "all" && <span className="inbx-count relative tabular-nums">{counts[f.id]}</span>}
              </button>
            ))}
          </div>

          {!ready && <Skeleton />}

          {ready && shown.length === 0 && <Empty filter={filter} any={items.length > 0} />}

          {ready &&
            groups.map((g) => (
              <div key={g.s} className="inbx-group">
                <h2 className="inbx-section" data-needs={g.s === "Needs you" || undefined}>{g.s}</h2>
                <ul className="inbx-list">
                  <AnimatePresence initial={false}>
                    {g.rows.map((n) => (
                      <motion.li key={n.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={GENTLE} className="relative">
                        <Row
                          n={n}
                          db={db}
                          now={now}
                          wide={wide}
                          discreet={discreet}
                          selected={wide && pick?.id === n.id}
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
              </div>
            ))}
        </section>

        {wide && (
          <aside className="inbx-pane" aria-label="Opened">
            {ready && pick ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={pick.id} className="inbx-pane-in" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={GENTLE}>
                  <Detail n={pick} db={db} now={now} discreet={discreet} onRead={() => void markRead([pick])} />
                </motion.div>
              </AnimatePresence>
            ) : (
              ready && (
                <div className="grid h-full place-items-center text-center">
                  <p className="text-[15px] text-ink-2">Pick something on the left to see it here.</p>
                </div>
              )
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// ── marks ──────────────────────────────────────────────────────────────────────

function PodMark({ db, podId, size = 40, discreet }: { db: DbState; podId: ID; size?: number; discreet: boolean }) {
  const pod = db.pods[podId];
  const hue: PodHueKey = podHue(db, podId);
  const initial = pod && !(pod.type === "community" && discreet) ? pod.name.slice(0, 1) : "";
  return (
    <span data-nc aria-hidden className="inbx-podmark" style={{ width: size, height: size, backgroundColor: POD_SOLID[hue], color: ON_HUE[hue], fontSize: Math.round(size * 0.44) }}>
      {initial || (
        <span className="inbx-people">
          <i />
          <i />
          <i />
        </span>
      )}
    </span>
  );
}

/** The row's mark: the person who did it (wearing their pod's colour), the pod, or your pods together (placed). */
function Mark({ n, db, discreet, size = 40 }: { n: Activity; db: DbState; discreet: boolean; size?: number }) {
  if (n.who) {
    return (
      <span className="relative inline-flex flex-none">
        <Disc initial={n.who.name.slice(0, 1)} tone="ember" seed={n.who.id} size={size} />
        {n.podId && db.pods[n.podId] && (
          <span className="inbx-badge" aria-hidden style={{ backgroundColor: POD_SOLID[podHue(db, n.podId)] }} />
        )}
      </span>
    );
  }
  if (n.podId && db.pods[n.podId]) return <PodMark db={db} podId={n.podId} size={size} discreet={discreet} />;
  if (n.kind === "pods" && db.me) {
    const mine = db.memberships.filter((m) => m.user_id === db.me && !m.left_at).slice(0, 3);
    if (mine.length > 1)
      return (
        <span className="inbx-cluster" aria-hidden style={{ width: size, height: size }}>
          {mine.map((m, i) => (
            <span key={m.pod_id} style={{ backgroundColor: POD_SOLID[podHue(db, m.pod_id)], ...CLUSTER[i] }} />
          ))}
        </span>
      );
  }
  return <Disc tone="you" initial={db.me ? (db.users[db.me]?.first_name ?? "").slice(0, 1) : ""} size={size} />;
}
const CLUSTER = [
  { left: "22%", top: "4%" },
  { left: "2%", top: "40%" },
  { left: "42%", top: "40%" },
];

// ── a row ──────────────────────────────────────────────────────────────────────

function Row({
  n,
  db,
  now,
  wide,
  discreet,
  selected,
  onOpen,
  onChoose,
  onRead,
}: {
  n: Activity;
  db: DbState;
  now: Date;
  wide: boolean;
  discreet: boolean;
  selected: boolean;
  onOpen: () => void;
  onChoose: () => void;
  onRead: () => void;
}) {
  const dragged = useRef(false);
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-72, -8, 0], [1, 0, 0]);
  const label = `${n.read ? "" : "New. "}${n.title}. ${n.body}`;
  const replyCount = n.act?.type === "reply" && !n.read ? n.act.count : 0;
  const text = (
    <>
      <span className="flex items-baseline gap-s2">
        <span className={cn("inbx-line min-w-0 flex-1", !n.read && "font-semibold")}>{n.title}</span>
        <span data-nc className="shrink-0 text-[13px] text-ink-3 tabular-nums">
          {stamp(n.created_at, now)}
        </span>
      </span>
      {(n.body || replyCount > 1) && (
        <span className="flex items-center gap-s2">
          <span className="inbx-body min-w-0 flex-1">{n.body}</span>
          {replyCount > 1 && (
            <span data-nc className="inbx-new tabular-nums" aria-label={`${replyCount} new messages`}>
              {replyCount}
            </span>
          )}
        </span>
      )}
    </>
  );
  const end = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -72 && !n.read) onRead();
    setTimeout(() => (dragged.current = false), 0);
  };

  const inner = (
    <div className="inbx-row" data-unread={n.read ? undefined : ""} data-selected={selected || undefined}>
      <motion.span aria-hidden className="inbx-dot" initial={false} animate={{ scale: n.read ? 0 : 1, opacity: n.read ? 0 : 1 }} transition={SNAPPY} />
      <Mark n={n} db={db} discreet={discreet} />
      <div className="min-w-0 flex-1">
        {wide ? (
          <button type="button" aria-label={label} aria-current={selected || undefined} onClick={onChoose} onDoubleClick={onOpen} className="inbx-hit">
            {text}
          </button>
        ) : (
          <a
            href={hrefOf(n)}
            aria-label={label}
            className="inbx-hit"
            onClick={(e) => {
              e.preventDefault();
              if (dragged.current) return;
              onOpen();
            }}
          >
            {text}
          </a>
        )}
        {n.act && (needsYou(n) ? <Actions n={n} act={n.act} db={db} now={now} onDone={onRead} compact /> : <Meta act={n.act} />)}
      </div>
    </div>
  );

  if (wide || n.read) return inner;
  return (
    <>
      <motion.span aria-hidden style={{ opacity: reveal }} className="absolute inset-y-0 right-0 flex items-center pr-s4 text-label font-semibold text-select">
        Read
      </motion.span>
      <motion.div drag="x" dragDirectionLock dragConstraints={{ left: -96, right: 0 }} dragElastic={0.12} dragSnapToOrigin onDragStart={() => (dragged.current = true)} onDragEnd={end} style={{ x }} className="relative bg-[var(--stage)]">
        {inner}
      </motion.div>
    </>
  );
}

// ── inline actions ───────────────────────────────────────────────────────────────

function useRun() {
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<{ ok: boolean }>, okMsg?: string, failMsg = "That didn't go through. Try again.") {
    setBusy(key);
    try {
      const r = await fn();
      if (!r.ok) notify.error(failMsg);
      else if (okMsg) notify.success(okMsg);
      return r.ok;
    } finally {
      setBusy(null);
    }
  }
  return { busy, run };
}

function Actions({ n, act, onDone, compact }: { n: Activity; act: Act; db: DbState; now: Date; onDone: () => void; compact?: boolean }) {
  const repo = useRepo();
  const { busy, run } = useRun();
  const [replying, setReplying] = useState(false);

  switch (act.type) {
    case "rsvp":
      return (
        <div className="inbx-acts">
          {act.imIn ? (
            <span className="inbx-state">
              <Icon name="check" size={16} /> You're in · {act.going} of {act.size}
            </span>
          ) : (
            <>
              <Button
                variant="spark"
                size="sm"
                className="inbx-btn"
                loading={busy === "in"}
                onClick={async () => {
                  const r = await repo.rsvp(act.targetId, "going");
                  if (!r.ok) return notify.error("Couldn't save. Try again.");
                  onDone();
                  notify.success(r.data.locked ? "Locked. You're in." : `You're in. ${r.data.goingCount} of ${act.size}.`);
                }}
              >
                I'm in
              </Button>
              {compact && (
                <span className="text-[14px] text-ink-2 tabular-nums">
                  {act.going} of {act.size} in
                </span>
              )}
              {!compact && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="inbx-btn"
                  disabled={busy !== null || act.imOut}
                  onClick={() => void run("out", () => repo.rsvp(act.targetId, "not_going"), "Got it. The pod will know you're out.").then((ok) => ok && onDone())}
                >
                  {act.imOut ? "You're out" : "Can't make it"}
                </Button>
              )}
            </>
          )}
        </div>
      );
    case "poll":
    case "vote":
      return (
        <div className="inbx-opts" role="group" aria-label={n.body}>
          {(compact ? act.options.slice(0, 2) : act.options).map((o) => {
            const on = act.mine === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                disabled={busy !== null}
                className="inbx-opt pressable"
                onClick={() =>
                  void run(o.id, () => (act.type === "poll" ? repo.votePoll(act.pollId, o.id) : repo.voteNextOption(act.voteId, o.id)), act.mine ? "Vote changed." : "Voted.").then((ok) => ok && onDone())
                }
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {(act.mine || !compact) && <span className="inbx-opt-n tabular-nums">{o.count}</span>}
              </button>
            );
          })}
          {compact && act.options.length > 2 && (
            <Link href={hrefOf(n)} className="inbx-opt inbx-opt-more pressable" aria-label={`${act.options.length - 2} more options`}>
              +{act.options.length - 2}
            </Link>
          )}
        </div>
      );
    case "reply":
      return replying ? (
        <Composer podId={act.podId} replyTo={act.messageId} onSent={() => (setReplying(false), onDone())} onCancel={() => setReplying(false)} />
      ) : (
        <div className="inbx-acts">
          <button type="button" className="inbx-reply pressable" onClick={() => setReplying(true)}>
            <Icon name="talk" size={16} />
            Reply
          </button>
          {act.count > 1 && <span className="text-[13px] text-ink-3 tabular-nums">{act.count} new</span>}
        </div>
      );
    case "checkin":
      return (
        <div className="inbx-acts">
          {act.done ? (
            <span className="inbx-state">
              <Icon name="check" size={16} /> Checked in
            </span>
          ) : (
            <Button size="sm" className="inbx-btn" loading={busy === "ci"} onClick={() => void run("ci", () => repo.checkIn(act.hangoutId), "Checked in. Have fun.").then((ok) => ok && onDone())}>
              Check in
            </Button>
          )}
        </div>
      );
    case "ballot":
      return (
        <div className="inbx-acts">
          {act.mine ? (
            <span className="inbx-state">
              <Icon name="check" size={16} /> Answered
            </span>
          ) : (
            <>
              <Button variant="spark" size="sm" className="inbx-btn" loading={busy === "yes"} onClick={() => void run("yes", () => repo.castRunItBack(act.hangoutId, "yes"), "Got it.").then((ok) => ok && onDone())}>
                Run it back
              </Button>
              <Button variant="secondary" size="sm" className="inbx-btn" disabled={busy !== null} onClick={() => void run("ns", () => repo.castRunItBack(act.hangoutId, "not_sure"), "Got it.").then((ok) => ok && onDone())}>
                Not sure
              </Button>
            </>
          )}
        </div>
      );
    case "join":
      if (act.status !== "new")
        return (
          <div className="inbx-acts">
            <span className="inbx-state">{act.status === "joined" ? "Joined" : "Skipped"}</span>
          </div>
        );
      return (
        <div className="inbx-acts">
          <Button size="sm" className="inbx-btn" loading={busy === "join"} onClick={() => void run("join", () => repo.joinPodMatch(act.matchId), "You're in the pod.").then((ok) => ok && onDone())}>
            Join pod
          </Button>
          <Button variant="ghost" size="sm" className="inbx-btn" disabled={busy !== null} onClick={() => void run("skip", () => repo.skipPodMatch(act.matchId)).then((ok) => ok && onDone())}>
            Not now
          </Button>
        </div>
      );
  }
}

/** A quiet one-line state for rows that don't need you: no buttons, the row itself opens the thing. */
function Meta({ act }: { act: Act }) {
  let text: string | null = null;
  if (act.type === "poll" || act.type === "vote") {
    const mine = act.options.find((o) => o.id === act.mine);
    text = mine ? `You voted: ${mine.label}` : `${act.type === "poll" ? "Poll" : "Vote"} · ${act.options.length} options · ${act.total} voted`;
  } else if (act.type === "rsvp" && act.imIn) text = `You're in · ${act.going} of ${act.size}`;
  else if (act.type === "checkin" && act.done) text = "Checked in";
  else if (act.type === "ballot" && act.mine) text = "Answered";
  else if (act.type === "join" && act.status !== "new") text = act.status === "joined" ? "Joined" : "Skipped";
  if (!text) return null;
  const open = (act.type === "poll" || act.type === "vote") && !act.mine;
  return (
    <span className="inbx-meta" data-open={open || undefined}>
      {!open && <Icon name="check" size={14} />}
      <span className="truncate">{text}</span>
      {open && <span className="inbx-meta-cta">Vote</span>}
    </span>
  );
}

function Composer({ podId, replyTo, onSent, onCancel, autoFocus = true, placeholder = "Write a reply" }: { podId: ID; replyTo: ID | null; onSent: () => void; onCancel?: () => void; autoFocus?: boolean; placeholder?: string }) {
  const repo = useRepo();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const r = await repo.sendMessage(podId, t, `inbox-${Date.now()}`, replyTo ? { replyTo } : undefined);
    setSending(false);
    if (!r.ok) return notify.error("Not sent. Try again.");
    setText("");
    notify.success("Sent.");
    onSent();
  }
  return (
    <form
      className="inbx-compose"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <input
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel?.()}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
      />
      <button type="submit" aria-label="Send" disabled={!text.trim() || sending} className="inbx-send pressable">
        <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}

// ── the laptop pane: the real thing ─────────────────────────────────────────────────

function Detail({ n, db, now, discreet, onRead }: { n: Activity; db: DbState; now: Date; discreet: boolean; onRead: () => void }) {
  const pod = n.podId ? db.pods[n.podId] : undefined;
  const head = (
    <div className="inbx-detail-head">
      <Mark n={n} db={db} discreet={discreet} size={32} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium text-ink">{n.podName ?? (n.kind === "pods" ? "Your pods" : "Pods")}</p>
        <p data-nc className="text-[13px] text-ink-3">
          {formatInTimeZone(n.created_at, TZ, "EEE MMM d · h:mmaaa")}
        </p>
      </div>
      <Link href={hrefOf(n)} onClick={onRead} className="inbx-quiet pressable ml-auto">
        {n.kind === "messages" ? "Open chat" : n.kind === "plans" ? "Open plan" : "Open"}
        <Icon name="arrow" size={18} />
      </Link>
    </div>
  );

  let view: { body: ReactNode; foot?: ReactNode };
  if (n.kind === "plans" && n.podId) view = planPane({ n, db, now, discreet, onRead });
  else if (n.kind === "messages" && n.podId) view = threadPane({ n, db, now, discreet, onRead });
  else if (n.kind === "pods" && n.act?.type !== "join" && !pod) view = { body: <PodsPane db={db} discreet={discreet} /> };
  else
    view = {
      body: (
        <>
          <h2 className="inbx-pane-title">{n.title}</h2>
          <p className="mt-s3 max-w-[56ch] text-[16px] leading-[1.5] text-ink-2">{n.body}</p>
        </>
      ),
      foot: n.act ? <Actions n={n} act={n.act} db={db} now={now} onDone={onRead} /> : undefined,
    };

  return (
    <>
      {head}
      <div className="inbx-detail-body">{view.body}</div>
      {view.foot && <div className="inbx-detail-foot">{view.foot}</div>}
    </>
  );
}

function Fact({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="inbx-fact">
      <dt>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Seats: one dot per place in the plan. Filled = in (yours in your colour), hollow = still open. No letters to clip. */
function Seats({ db, going, size }: { db: DbState; going: ID[]; size: number }) {
  return (
    <span className="inbx-seats" role="img" aria-label={`${going.length} of ${size} in`}>
      {Array.from({ length: size }, (_, i) => {
        const id = going[i];
        return <i key={i} data-in={id ? "" : undefined} data-you={id && id === db.me ? "" : undefined} />;
      })}
    </span>
  );
}

function names(db: DbState, ids: ID[]): string {
  const list = ids.map((id) => (id === db.me ? "you" : (db.users[id]?.first_name ?? "Someone")));
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function planPane({ n, db, now, discreet, onRead }: { n: Activity; db: DbState; now: Date; discreet: boolean; onRead: () => void }): { body: ReactNode; foot?: ReactNode } {
  const podId = n.podId as ID;
  const pod = db.pods[podId];
  const v = cardView(db, podId, now.getTime());
  const h = v?.lastHangout && (n.act?.type === "checkin" || n.act?.type === "ballot" || v.locked) ? v.lastHangout : null;
  const s = (h ? db.suggestions[h.suggestion_id] : null) ?? v?.suggestion ?? null;
  if (!v || !s) return { body: <h2 className="inbx-pane-title">{n.title}</h2>, foot: n.act ? <Actions n={n} act={n.act} db={db} now={now} onDone={onRead} /> : undefined };
  const plan = s.plan_json;
  const venue = db.venues[plan.venue_id];
  const rain = plan.rain_venue_id ? db.venues[plan.rain_venue_id] : null;
  const status = `${v.going.length} of ${v.size} in${!v.locked && v.threshold > v.going.length ? ` · locks at ${v.threshold}` : v.locked ? " · locked" : ""}`;
  const body = (
    <>
      <p className="text-[14px] font-medium text-ink-2">{v.locked ? "Locked" : v.phase === "vote" ? "Vote open" : v.imIn ? "You're in" : "Needs your answer"}</p>
      <h2 className="inbx-pane-title mt-s1">{maskText(s.summary, pod, discreet)}</h2>
      {n.act?.type === "vote" && (
        <div className="inbx-block mt-s4 border-t-0 pt-0">
          <h3 className="inbx-h3">Pick the next one · {n.act.total} of {v.size} voted</h3>
          <PollBars act={n.act} onDone={onRead} />
        </div>
      )}
      <dl className="inbx-facts">
        <Fact k="When">
          {formatInTimeZone(plan.starts_at, TZ, "EEEE, MMM d")} · {shortTime(plan.starts_at)}–{shortTime(plan.ends_at)}
        </Fact>
        <Fact k="Where">{venue?.name ?? "To be set"}</Fact>
        <Fact k="Cost">{plan.cost || "Free"}</Fact>
      </dl>

      <div className="inbx-block">
        <h3 className="inbx-h3">Who&apos;s in</h3>
        <div className="mt-s3 flex flex-wrap items-center gap-x-s4 gap-y-s2">
          <Seats db={db} going={v.going} size={v.size} />
          <span className="text-[15px] text-ink tabular-nums">{status}</span>
        </div>
        {v.going.length > 0 && <p className="mt-s2 text-[14px] text-ink-2">{names(db, v.going).replace(/^./, (c) => c.toUpperCase())}</p>}
      </div>

      {plan.bring.length > 0 && (
        <div className="inbx-block">
          <h3 className="inbx-h3">Bring</h3>
          <ul className="mt-s2 flex flex-wrap gap-s2">
            {plan.bring.map((b) => (
              <li key={b} className="inbx-tag">
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(plan.rain_plan || rain) && (
        <div className="inbx-block">
          <h3 className="inbx-h3">If it rains</h3>
          <p className="mt-s1 max-w-[60ch] text-[15px] leading-[1.5] text-ink-2">{plan.rain_plan || `Moves to ${rain?.name}.`}</p>
        </div>
      )}
      {plan.reason && (
        <p className="mt-s6 text-[14px] text-ink-3">
          Why this plan: {plan.reason.replace(/^./, (c) => c.toLowerCase())}
        </p>
      )}
    </>
  );
  const foot = n.act && n.act.type !== "vote" ? (
    <div className="flex flex-wrap items-center justify-between gap-s3">
      <span className="text-[14px] text-ink-2 tabular-nums">{status}</span>
      <Actions n={n} act={n.act} db={db} now={now} onDone={onRead} />
    </div>
  ) : undefined;
  return { body, foot };
}

function threadPane({ n, db, now, discreet, onRead }: { n: Activity; db: DbState; now: Date; discreet: boolean; onRead: () => void }): { body: ReactNode; foot: ReactNode } {
  const podId = n.podId as ID;
  const pod = db.pods[podId];
  const lines = (db.messages[podId] ?? []).filter((m) => (m.kind === "text" || m.kind === "poll") && m.created_at <= now.toISOString()).slice(-8);
  const poll = n.act?.type === "poll" ? n.act : null;
  const body = (
    <>
      {poll && (
        <div>
          <h2 className="inbx-pane-title">{n.body}</h2>
          <p className="mt-s1 text-[14px] text-ink-2 tabular-nums">
            {poll.total} voted · asked by {n.who?.name}
            {poll.mine ? " · tap another to change" : ""}
          </p>
          <PollBars act={poll} onDone={onRead} />
        </div>
      )}
      <div className={cn(poll && "inbx-block")}>
        {poll && <h3 className="inbx-h3">Latest in {podLabel(pod, discreet)}</h3>}
        <ol className="inbx-thread">
          {lines.map((m) => {
            const who = m.user_id ? db.users[m.user_id] : null;
            const mine = m.user_id === db.me;
            return (
              <li key={m.id} className={cn("inbx-msg", m.id === (n.act?.type === "reply" ? n.act.messageId : null) && "is-new")}>
                {m.user_id ? <Disc initial={(who?.first_name ?? "?").slice(0, 1)} tone={mine ? "you" : "ember"} seed={m.user_id} size={28} /> : <PodMark db={db} podId={podId} size={28} discreet={discreet} />}
                <div className="min-w-0">
                  <p className="text-[13px] text-ink-3">
                    <span className="font-medium text-ink-2">{mine ? "You" : (who?.first_name ?? "Pods")}</span> · {stamp(m.created_at, now)}
                  </p>
                  <p className="mt-0.5 text-[15px] leading-[1.45] text-ink">{m.kind === "poll" ? `Poll: ${maskText(m.text, pod, discreet)}` : maskText(m.text, pod, discreet)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
  return { body, foot: <Composer podId={podId} replyTo={null} autoFocus={false} onSent={onRead} placeholder={`Message ${podLabel(pod, discreet)}`} /> };
}

/** The poll as tappable bars: tap an option to vote (or change your vote); the bar shows the count. */
function PollBars({ act, onDone }: { act: Extract<Act, { type: "poll" | "vote" }>; onDone: () => void }) {
  const repo = useRepo();
  const { busy, run } = useRun();
  const max = Math.max(1, ...act.options.map((o) => o.count));
  return (
    <div className="inbx-bars mt-s4" role="group" aria-label="Vote">
      {act.options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={act.mine === o.id}
          disabled={busy !== null}
          className="inbx-bar pressable"
          style={{ ["--w" as string]: `${(o.count / max) * 100}%` }}
          data-on={act.mine === o.id || undefined}
          onClick={() =>
            act.mine !== o.id &&
            void run(o.id, () => (act.type === "poll" ? repo.votePoll(act.pollId, o.id) : repo.voteNextOption(act.voteId, o.id)), act.mine ? "Vote changed." : "Voted.").then((ok) => ok && onDone())
          }
        >
          <span className="flex min-w-0 items-center gap-s2">
            {act.mine === o.id && <Icon name="check" size={16} />}
            <span className="truncate">{o.label}</span>
          </span>
          <span className="tabular-nums">{o.count}</span>
        </button>
      ))}
    </div>
  );
}

function PodsPane({ db, discreet }: { db: DbState; discreet: boolean }) {
  const mine = db.memberships.filter((m) => m.user_id === db.me && !m.left_at).sort((a, b) => (a.activation === b.activation ? 0 : a.activation === "active" ? -1 : 1));
  return (
    <>
      <h2 className="inbx-pane-title">Your pods</h2>
      <p className="mt-s2 text-[15px] text-ink-2">{openLine(mine.filter((m) => m.activation === "active").length, mine.length)}</p>
      <ul className="mt-s6 border-t border-line">
        {mine.map((m) => {
          const pod = db.pods[m.pod_id];
          const people = db.memberships.filter((x) => x.pod_id === m.pod_id && !x.left_at);
          return (
            <li key={m.pod_id}>
              <Link href={`/app/pods/${m.pod_id}`} className="inbx-podrow pressable">
                <PodMark db={db} podId={m.pod_id} size={36} discreet={discreet} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium text-ink">{podLabel(pod, discreet)}</span>
                  <span className="block text-[14px] text-ink-2">
                    {people.length} people · {m.activation === "active" ? "Open" : "Opens after your first hangout"}
                  </span>
                </span>
                <DiscStack people={people.slice(0, 5).map((p) => ({ initial: (db.users[p.user_id]?.first_name ?? "?").slice(0, 1), seed: p.user_id, tone: p.user_id === db.me ? "you" : "ember" }))} size={24} max={5} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const NUM = ["No", "One", "Two", "Three", "Four", "Five"];
function openLine(open: number, all: number) {
  const n = NUM[open] ?? String(open);
  return open === all ? `All ${all} are open.` : `${n} ${open === 1 ? "is" : "are"} open now. The rest open after your first hangout.`;
}

// ── states ────────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="mt-s6" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-s3 py-s3">
          <span className="size-10 rounded-full bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]" />
          <span className="flex-1">
            <span className="block h-3.5 w-3/5 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
            <span className="mt-2 block h-3 w-4/5 rounded-full bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]" />
          </span>
        </div>
      ))}
    </div>
  );
}

const EMPTY: Record<Filter, [string, string]> = {
  all: ["Nothing yet.", "Plans, messages and new pods land here."],
  plans: ["No plans waiting.", "When the AI plans a hangout for a pod, it shows up here."],
  messages: ["No new messages.", "Replies and polls from your pods show up here."],
  pods: ["No pod news.", "New pods for you and pods opening show up here."],
};
function Empty({ filter, any }: { filter: Filter; any: boolean }) {
  const [a, b] = EMPTY[filter];
  return (
    <div className="mt-s8 flex items-start gap-s4">
      <Disc tone="open" size={40} />
      <div>
        <p className="text-[16px] font-medium text-ink">{filter === "all" && any ? "All caught up." : a}</p>
        <p className="mt-s1 text-[15px] text-ink-2">{b}</p>
      </div>
    </div>
  );
}

