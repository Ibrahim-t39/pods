// Inbox: what is happening in your pods and what you should do next, in that order.
//   Needs you  decisions only you can make, as cards with the one-tap answer (I'm in, vote, check in, meet again, join)
//   Updates    what happened (plan locked, someone joined, pods opening), quiet rows that open the real thing
//   Messages   one row per pod: the newest line and how many are new; opens the chat
//   laptop     master-detail: the list on the left, the real object on the right (plan, vote, chat with a reply box)
// Community pods keep their real name in the app; the inbox masks names only when in-app masking is on.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Disc, DiscStack, POD_SOLID, type PodHueKey } from "@/components/brand/disc";
import { PodSphere } from "@/components/brand/pod-sphere";
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
import { buildActivity, needsYou, type Act, type Activity } from "./activity";
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

function stamp(iso: string, now: Date): string {
  const d = chicagoDaysBetween(iso, now);
  if (d <= 0) {
    const min = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
    return min < 1 ? "now" : min < 60 ? `${min}m` : formatInTimeZone(iso, TZ, "h:mmaaa");
  }
  if (d < 7) return formatInTimeZone(iso, TZ, "EEE");
  return formatInTimeZone(iso, TZ, "MMM d");
}

const UPDATES_SHOWN = 6;

/** One chat per pod: the newest line, who said it, and how many came in since you last looked. */
interface Thread {
  podId: ID;
  podName: string;
  last: { who: string; text: string; at: string } | null;
  unread: number;
  items: Activity[];
  /** the row the laptop pane opens: the chat itself */
  view: Activity;
}

function buildThreads(db: DbState, items: Activity[], now: Date, discreet: boolean): Thread[] {
  if (!db.me) return [];
  const nowISO = now.toISOString();
  const out: Thread[] = [];
  for (const m of db.memberships.filter((x) => x.user_id === db.me && !x.left_at)) {
    const pod = db.pods[m.pod_id];
    if (!pod) continue;
    const lines = (db.messages[m.pod_id] ?? []).filter((x) => x.kind === "text" && x.created_at <= nowISO);
    const lastMsg = lines[lines.length - 1];
    const mine = items.filter((i) => i.podId === m.pod_id && i.kind === "messages" && i.act?.type === "reply");
    if (!lastMsg && !mine.length) continue;
    const unread = mine.filter((i) => !i.read).reduce((t, i) => t + Math.max(1, i.act?.type === "reply" ? i.act.count : 1), 0);
    const who = lastMsg ? (lastMsg.user_id === db.me ? "You" : lastMsg.user_id ? (db.users[lastMsg.user_id]?.first_name ?? "Someone") : "AI") : "";
    const name = podLabel(pod, discreet);
    const at = lastMsg?.created_at ?? mine[0]?.created_at ?? nowISO;
    out.push({
      podId: m.pod_id,
      podName: name,
      last: lastMsg ? { who, text: maskText(lastMsg.text, pod, discreet), at } : null,
      unread,
      items: mine,
      view: {
        id: `t:${m.pod_id}`, kind: "messages", trigger: "chat_batch", stored: false, podId: m.pod_id, podName: name, who: null,
        title: name, body: lastMsg ? maskText(lastMsg.text, pod, discreet) : "", href: `/app/pods/${m.pod_id}/chat`, created_at: at, read: unread === 0,
        act: { type: "reply", podId: m.pod_id, messageId: mine.find((i) => i.act?.type === "reply" && i.act.messageId)?.act?.type === "reply" ? (mine.find((i) => i.act?.type === "reply" && i.act.messageId)!.act as Extract<Act, { type: "reply" }>).messageId : null, count: unread },
      },
    });
  }
  return out.sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.view.created_at.localeCompare(a.view.created_at));
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
  const [chosen, setChosen] = useState<string | null>(null);
  const [allUpdates, setAllUpdates] = useState(false);
  useEffect(() => setSeen(readSeen()), []);

  const items = useMemo(() => (seen ? buildActivity(db, now, seen, discreet) : []), [db, now, seen, discreet]);
  const threads = useMemo(() => buildThreads(db, items, now, discreet), [db, items, now, discreet]);
  const RANK: Record<string, number> = { checkin: 0, rsvp: 1, ballot: 2, vote: 3, join: 4, poll: 5 };
  const pending = items.filter(needsYou).sort((a, b) => (RANK[a.act?.type ?? ""] ?? 9) - (RANK[b.act?.type ?? ""] ?? 9) || b.created_at.localeCompare(a.created_at));
  const isThreadItem = (n: Activity) => n.kind === "messages" && n.act?.type === "reply";
  const updates = items.filter((n) => !needsYou(n) && !isThreadItem(n));
  const updatesShown = allUpdates ? updates : updates.slice(0, UPDATES_SHOWN);
  const unread = items.filter((i) => !i.read);
  const newCount = unread.filter((i) => !needsYou(i)).length;
  const all = [...pending, ...updates, ...threads.map((t) => t.view)];
  const pick = all.find((n) => n.id === chosen) ?? all[0] ?? null;
  const ready = hydrated && seen !== null;

  async function markRead(list: Activity[], quiet = true) {
    list = list.filter((i) => !i.id.startsWith("t:"));
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
  function open(n: Activity, also: Activity[] = []) {
    void markRead([n, ...also]);
    router.push(hrefOf(n));
  }
  function choose(n: Activity, also: Activity[] = []) {
    setChosen(n.id);
    void markRead([n, ...also]);
  }
  const lead = pending.length === 0 ? "Nothing needs you right now." : pending.length === 1 ? "One thing needs your answer." : `${NUM[pending.length] ?? pending.length} things need your answer.`;

  return (
    <div className="inbx-pg">
      <Stage light="paper" />
      <Chrome left="mark" className="lg:hidden" />
      <div className="inbx-wrap">
        <section className="inbx-col" aria-label="Inbox">
          <header className="inbx-head">
            <div className="min-w-0">
              <h1 className="inbx-title">Inbox</h1>
              {ready && <p className="inbx-lead">{lead}</p>}
            </div>
            {ready && newCount > 0 && (
              <button type="button" onClick={() => void markAll()} className="inbx-quiet pressable">
                <Icon name="check" size={18} />
                Mark all read
              </button>
            )}
          </header>

          {!ready && <Skeleton />}

          {ready && (
            <>
              <div className="inbx-group">
                <h2 className="inbx-section" data-needs="">
                  Needs you {pending.length > 0 && <span className="inbx-count tabular-nums">{pending.length}</span>}
                </h2>
                {pending.length === 0 ? (
                  <AllSet />
                ) : (
                  ([
                    ["Say if you're in", pending.filter((n) => n.act?.type !== "poll" && n.act?.type !== "vote")],
                    ["Votes", pending.filter((n) => n.act?.type === "poll" || n.act?.type === "vote")],
                  ] as const).map(([label, list]) =>
                    list.length === 0 ? null : (
                      <div key={label} className="inbx-subgroup">
                        <h3 className="inbx-subhead">{label}</h3>
                        <ul className="inbx-cards">
                          <AnimatePresence initial={false}>
                            {list.map((n) => (
                              <motion.li key={n.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={GENTLE}>
                                <NeedCard n={n} db={db} now={now} wide={wide} discreet={discreet} selected={wide && pick?.id === n.id} onOpen={() => open(n)} onChoose={() => choose(n)} onDone={() => void markRead([n])} />
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      </div>
                    ),
                  )
                )}
              </div>

              {updates.length > 0 && (
                <div className="inbx-group">
                  <h2 className="inbx-section">Updates</h2>
                  <ul className="inbx-list">
                    {updatesShown.map((n) => (
                      <li key={n.id} className="relative">
                        <Row n={n} db={db} now={now} wide={wide} discreet={discreet} selected={wide && pick?.id === n.id} onOpen={() => open(n)} onChoose={() => choose(n)} onRead={() => void markRead([n], false)} />
                      </li>
                    ))}
                  </ul>
                  {updates.length > UPDATES_SHOWN && (
                    <button type="button" className="inbx-more pressable" onClick={() => setAllUpdates((v) => !v)}>
                      {allUpdates ? "Show fewer" : `Show ${updates.length - UPDATES_SHOWN} earlier`}
                    </button>
                  )}
                </div>
              )}

              {threads.length > 0 && (
                <div className="inbx-group">
                  <h2 className="inbx-section">Messages</h2>
                  <ul className="inbx-list">
                    {threads.map((t) => (
                      <li key={t.podId}>
                        <ThreadRow t={t} db={db} now={now} wide={wide} discreet={discreet} selected={wide && pick?.id === t.view.id} onOpen={() => open(t.view, t.items)} onChoose={() => choose(t.view, t.items)} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {items.length === 0 && threads.length === 0 && <Empty />}
            </>
          )}
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

/** A decision only you can make: pod, plain headline, why it matters, and the one-tap answer. */
function NeedCard({ n, db, now, wide, discreet, selected, onOpen, onChoose, onDone }: { n: Activity; db: DbState; now: Date; wide: boolean; discreet: boolean; selected: boolean; onOpen: () => void; onChoose: () => void; onDone: () => void }) {
  return (
    <article className="inbx-card" data-selected={selected || undefined}>
      <button type="button" className="inbx-card-hit" onClick={wide ? onChoose : onOpen} aria-label={`${n.title}. ${n.body}`}>
        <span className="inbx-kicker">
          <Mark n={{ ...n, who: null }} db={db} discreet={discreet} size={24} />
          <span className="truncate">{n.podName ?? "Pods"}</span>
          <span data-nc className="ml-auto shrink-0 text-[13px] font-normal text-ink-3 tabular-nums">{stamp(n.created_at, now)}</span>
        </span>
        <span className="inbx-card-title">{n.title}</span>
        {n.body && <span className="inbx-body block">{n.body}</span>}
        {n.why && <span className="inbx-why">{n.why}</span>}
      </button>
      {n.act && <Actions n={n} act={n.act} db={db} now={now} onDone={onDone} />}
    </article>
  );
}

function ThreadRow({ t, db, now, wide, discreet, selected, onOpen, onChoose }: { t: Thread; db: DbState; now: Date; wide: boolean; discreet: boolean; selected: boolean; onOpen: () => void; onChoose: () => void }) {
  const line = t.last ? `${t.last.who}: ${t.last.text}` : "Open the chat";
  return (
    <div className="inbx-row" data-unread={t.unread ? "" : undefined} data-selected={selected || undefined}>
      <PodMark db={db} podId={t.podId} size={40} discreet={discreet} />
      <button type="button" className="inbx-hit min-w-0 flex-1" onClick={wide ? onChoose : onOpen} aria-label={`${t.podName}. ${t.unread ? `${t.unread} new. ` : ""}${line}`}>
        <span className="flex items-baseline gap-s2">
          <span className={cn("inbx-line min-w-0 flex-1", t.unread > 0 && "font-semibold")}>{t.podName}</span>
          {t.last && <span data-nc className="shrink-0 text-[13px] text-ink-3 tabular-nums">{stamp(t.last.at, now)}</span>}
        </span>
        <span className="flex items-center gap-s2">
          <span className={cn("inbx-body min-w-0 flex-1", t.unread > 0 && "text-ink")}>{line}</span>
          {t.unread > 0 && <span data-nc className="inbx-new tabular-nums" aria-hidden>{t.unread}</span>}
        </span>
      </button>
    </div>
  );
}

function AllSet() {
  return (
    <div className="inbx-allset">
      <span className="inbx-allset-mark" aria-hidden>
        <Icon name="check" size={18} />
      </span>
      <div>
        <p className="text-[16px] font-medium text-ink">You&apos;re all set</p>
        <p className="mt-0.5 text-[15px] text-ink-2">When a plan needs your answer, it shows up here first.</p>
      </div>
    </div>
  );
}

// ── marks ──────────────────────────────────────────────────────────────────────

function PodMark({ db, podId, size = 40 }: { db: DbState; podId: ID; size?: number; discreet: boolean }) {
  // a pod is always its glossy sphere (one bead per person), never a letter: the same mark as Pods and the pod page
  const hue: PodHueKey = podHue(db, podId);
  const people = db.memberships.filter((m) => m.pod_id === podId && !m.left_at).length;
  return <PodSphere hue={hue} people={Math.max(1, people)} you={db.memberships.some((m) => m.pod_id === podId && m.user_id === db.me && !m.left_at)} inCount={people} size={size} />;
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
        <div className="inbx-opts" role="group" aria-label={n.title}>
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
          {stamp(n.created_at, now)}
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
          <h2 className="inbx-pane-title">{n.title}</h2>
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

function Empty() {
  return (
    <div className="mt-s6 flex items-start gap-s4">
      <Disc tone="open" size={40} />
      <div>
        <p className="text-[16px] font-medium text-ink">Nothing here yet</p>
        <p className="mt-s1 text-[15px] text-ink-2">Plans, updates and messages from your pods will show up here.</p>
      </div>
    </div>
  );
}
