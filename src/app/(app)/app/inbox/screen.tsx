// Inbox: what your pods did and what they need from you, handled right here.
//   head      compact "Inbox" + how many are new + Mark all read, then All · Plans · Messages · Pods
//   list      grouped Today · Yesterday · This week · Earlier. Each row: a meaningful mark (the pod, or the person with
//             their pod's colour), one line, one preview, the time, a new-dot, and its one inline action
//             (I'm in · vote · Reply · Check in · Run it back · Join pod)
//   phone     tap the text to open the real thing; swipe a row left to mark it read
//   laptop    master-detail: the list on the left, the real object on the right (the plan with its details and
//             actions, the chat thread with a reply box, the poll, your pods)
// Community pods stay discreet (D10): names are masked when "Hide community names" is on.
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
import { buildActivity, sectionOf, type Act, type Activity, type Kind, type Section } from "./activity";
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
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => setSeen(readSeen()), []);

  const items = useMemo(() => (seen ? buildActivity(db, now, seen, prefs.discreet) : []), [db, now, seen, prefs.discreet]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, plans: 0, messages: 0, pods: 0 };
    for (const i of items) if (!i.read) (c.all++, c[i.kind]++);
    return c;
  }, [items]);
  const shown = items.filter((n) => filter === "all" || n.kind === filter);
  const unread = items.filter((i) => !i.read);
  const pick = shown.find((n) => n.id === chosen) ?? shown[0] ?? null;
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

  const groups = SECTIONS.map((s) => ({ s, rows: shown.filter((n) => sectionOf(n.created_at, now) === s) })).filter((g) => g.rows.length);

  return (
    <div className="inbx-pg">
      <Stage light="paper" />
      <Chrome left="mark" right="seat" className="lg:hidden" />
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
                <h2 className="inbx-section">{g.s}</h2>
                <ul className="inbx-list">
                  <AnimatePresence initial={false}>
                    {g.rows.map((n) => (
                      <motion.li key={n.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={GENTLE} className="relative">
                        <Row
                          n={n}
                          db={db}
                          now={now}
                          wide={wide}
                          discreet={prefs.discreet}
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
                <motion.div key={pick.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={GENTLE}>
                  <Detail n={pick} db={db} now={now} discreet={prefs.discreet} onRead={() => void markRead([pick])} />
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
      {initial}
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
  const text = (
    <>
      <span className="flex items-baseline gap-s2">
        <span className={cn("inbx-line min-w-0 flex-1", !n.read && "font-semibold")}>{n.title}</span>
        <span data-nc className="shrink-0 text-[13px] text-ink-3 tabular-nums">
          {stamp(n.created_at, now)}
        </span>
      </span>
      {n.body && <span className="inbx-body">{n.body}</span>}
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
        {n.act && <Actions n={n} act={n.act} db={db} now={now} onDone={onRead} compact />}
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
              <span className="text-[14px] text-ink-2 tabular-nums">
                {act.going} of {act.size} in
              </span>
            </>
          )}
        </div>
      );
    case "poll":
    case "vote":
      return (
        <div className="inbx-opts" role="group" aria-label={n.body}>
          {act.options.map((o) => {
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
        </div>
      );
    case "reply":
      return replying ? (
        <Composer podId={act.podId} replyTo={act.messageId} onSent={() => (setReplying(false), onDone())} onCancel={() => setReplying(false)} />
      ) : (
        <div className="inbx-acts">
          <Button variant="secondary" size="sm" className="inbx-btn" onClick={() => setReplying(true)}>
            Reply
          </Button>
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

function Composer({ podId, replyTo, onSent, onCancel, autoFocus = true }: { podId: ID; replyTo: ID | null; onSent: () => void; onCancel?: () => void; autoFocus?: boolean }) {
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
        placeholder="Write a reply"
        aria-label="Reply"
        className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
      />
      <button type="submit" aria-label="Send" disabled={!text.trim() || sending} className="inbx-send pressable">
        <Icon name="send" size={18} />
      </button>
    </form>
  );
}

// ── the laptop pane: the real thing ─────────────────────────────────────────────────

function Detail({ n, db, now, discreet, onRead }: { n: Activity; db: DbState; now: Date; discreet: boolean; onRead: () => void }) {
  const pod = n.podId ? db.pods[n.podId] : undefined;
  const head = (
    <div className="flex items-center gap-s3">
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

  let body: ReactNode = null;
  if (n.kind === "plans" && n.podId) body = <PlanPane n={n} db={db} now={now} discreet={discreet} onRead={onRead} />;
  else if (n.kind === "messages" && n.podId) body = <ThreadPane n={n} db={db} now={now} discreet={discreet} onRead={onRead} />;
  else if (n.kind === "pods" && n.act?.type !== "join" && !pod) body = <PodsPane db={db} discreet={discreet} />;
  else
    body = (
      <>
        <h2 className="inbx-pane-title">{n.title}</h2>
        <p className="mt-s3 max-w-[56ch] text-[16px] leading-[1.5] text-ink-2">{n.body}</p>
        {n.act && (
          <div className="mt-s6">
            <Actions n={n} act={n.act} db={db} now={now} onDone={onRead} />
          </div>
        )}
      </>
    );

  return (
    <div>
      {head}
      <div className="mt-s8">{body}</div>
    </div>
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

function PlanPane({ n, db, now, discreet, onRead }: { n: Activity; db: DbState; now: Date; discreet: boolean; onRead: () => void }) {
  const podId = n.podId as ID;
  const pod = db.pods[podId];
  const v = cardView(db, podId, now.getTime());
  const h = v?.lastHangout && (n.act?.type === "checkin" || n.act?.type === "ballot" || v.locked) ? v.lastHangout : null;
  const s = (h ? db.suggestions[h.suggestion_id] : null) ?? v?.suggestion ?? null;
  if (!v || !s) return <h2 className="inbx-pane-title">{n.title}</h2>;
  const plan = s.plan_json;
  const venue = db.venues[plan.venue_id];
  const rain = plan.rain_venue_id ? db.venues[plan.rain_venue_id] : null;
  const going = v.going.map((id) => ({ initial: (db.users[id]?.first_name ?? "?").slice(0, 1), seed: id, tone: (id === db.me ? "you" : "ember") as "you" | "ember", label: db.users[id]?.first_name }));
  const open = Math.max(0, v.size - v.going.length);
  return (
    <>
      <p className="text-[14px] font-medium text-ink-2">{v.locked ? "Locked" : v.phase === "vote" ? "Vote open" : v.imIn ? "You're in" : "Needs your answer"}</p>
      <h2 className="inbx-pane-title mt-s1">{maskText(s.summary, pod, discreet)}</h2>
      <dl className="inbx-facts">
        <Fact k="When">
          {formatInTimeZone(plan.starts_at, TZ, "EEEE, MMM d")} · {shortTime(plan.starts_at)}–{shortTime(plan.ends_at)}
        </Fact>
        <Fact k="Where">{venue?.name ?? "To be set"}</Fact>
        <Fact k="Cost">{plan.cost || "Free"}</Fact>
      </dl>

      <div className="inbx-block">
        <div className="flex flex-wrap items-center gap-s3">
          <DiscStack people={[...going, ...Array.from({ length: Math.min(open, 6) }, () => ({ initial: "", tone: "open" as const }))]} size={30} max={10} />
          <span className="text-[15px] text-ink tabular-nums">
            <b className="font-semibold">{v.going.length} of {v.size}</b> in{!v.locked && v.threshold > v.going.length ? ` · locks at ${v.threshold}` : ""}
          </span>
        </div>
        {n.act && (
          <div className="mt-s4">
            <Actions n={n} act={n.act} db={db} now={now} onDone={onRead} />
          </div>
        )}
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
}

function ThreadPane({ n, db, now, discreet, onRead }: { n: Activity; db: DbState; now: Date; discreet: boolean; onRead: () => void }) {
  const podId = n.podId as ID;
  const pod = db.pods[podId];
  const lines = (db.messages[podId] ?? []).filter((m) => (m.kind === "text" || m.kind === "poll") && m.created_at <= now.toISOString()).slice(-7);
  const poll = n.act?.type === "poll" ? n.act : null;
  return (
    <>
      {poll && (
        <div className="inbx-block mt-0 border-t-0 pt-0">
          <h2 className="inbx-pane-title">{n.body}</h2>
          <p className="mt-s1 text-[14px] text-ink-2 tabular-nums">
            {poll.total} voted · asked by {n.who?.name}
          </p>
          <PollBars act={poll} n={n} db={db} now={now} onDone={onRead} />
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
        <div className="mt-s4">
          <Composer podId={podId} replyTo={null} autoFocus={false} onSent={onRead} />
        </div>
      </div>
    </>
  );
}

function PollBars({ act, n, db, now, onDone }: { act: Extract<Act, { type: "poll" | "vote" }>; n: Activity; db: DbState; now: Date; onDone: () => void }) {
  const max = Math.max(1, ...act.options.map((o) => o.count));
  return (
    <div className="mt-s4">
      <div className="inbx-bars">
        {act.options.map((o) => (
          <div key={o.id} className="inbx-bar" style={{ ["--w" as string]: `${(o.count / max) * 100}%` }} data-on={act.mine === o.id || undefined}>
            <span className="truncate">{o.label}</span>
            <span className="tabular-nums">{o.count}</span>
          </div>
        ))}
      </div>
      <p className="mt-s4 text-[14px] text-ink-2">{act.mine ? "Change your vote:" : "Your vote:"}</p>
      <div className="mt-s2">
        <Actions n={n} act={act} db={db} now={now} onDone={onDone} />
      </div>
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

