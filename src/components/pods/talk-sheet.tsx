// Talk (V3_SPEC §6.3, wireframes S03-S05; PLATFORM_SPEC §F2): a full-height sheet over the table, never a page and never
// home (founder R1 #3). Opened by tapping the table or its centre cue, or by /app/pods/[id]/chat.
//   header   the pod's people as overlapping discs (you first) and the pod name
//   lines    the sender's disc and the text on a light cool grey; yours on the plan blue. A run from one person within
//            5 minutes shares one disc; a quiet label only marks a new day (PB 8).
//   reply    swipe a line right, long-press, or the line's "…" (always shown on a phone) → Reply; the answer carries a quote
//   react    long-press / "…" → five circle glyphs; reactions sit under the line as small counts (who is in the label)
//   poll     "+" beside the input → a question and 2-4 options; votes show as discs, never percentages (J #2)
//   vote     the round-two vote lands in Talk too: the options with their voters' discs, one tap to vote (beat 7)
//   input    a 56px pill, "Say something", with the send glyph (44px target)
// States: empty "Say hi.", not sent "Not sent · Retry" inline, offline (sends when back), paused.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DiscStack, SNAPPY, type PodHueKey } from "@/components/brand";
import { personColor } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { notify } from "@/components/ui/toast";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { clientId as newClientId } from "@/lib/ids";
import { useDb, useRepo } from "@/lib/db/hooks";
import { podMembers } from "@/lib/db/selectors";
import { cardView } from "@/lib/planner/card-state";
import { pollTally } from "@/lib/platform/selectors";
import { isChatPaused, myBlockedIds } from "@/lib/safety/selectors";
import { nowISO, useClock } from "@/lib/time/clock";
import { formatDayDivider } from "@/lib/time/format";
import { REACTIONS, type Message, type ReactionKey } from "@/lib/types";
import { dayWord, firstName, shortTime } from "./model";
import { useLastRead } from "./use-last-read";

const RUN_MS = 5 * 60_000;
/** The city lives in the pitch, not the product: host lines that name it lose that sentence (product rule 5). */
const CITY = /\b(Huntsville|Alabama|Madison|Decatur|AAMU|Rocket City)\b/i;
const SHOWN = new Set<Message["kind"]>(["text", "host", "poll", "vote"]);

type Line = Message;

// ── reaction glyphs: circles and dots, like everything else ─────────────

const REACT_LABEL: Record<ReactionKey, string> = { heart: "Love", laugh: "Ha", fire: "Fire", thumbs: "Yes", eyes: "Seen" };

function ReactGlyph({ k, size = 20 }: { k: ReactionKey; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (k) {
    case "heart":
      return (
        <svg {...p}>
          <path d="M12 19.5s-7-4.3-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.2c0 5-7 9.3-7 9.3Z" fill="currentColor" fillOpacity=".18" />
        </svg>
      );
    case "laugh":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M8 13.2a4.4 4.4 0 0 0 8 0Z" fill="currentColor" />
          <circle cx="9.2" cy="9.6" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.8" cy="9.6" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "fire":
      return (
        <svg {...p}>
          <path d="M12 20a6 6 0 0 1-6-6c0-3.6 3-5.2 3.4-9 2.6 1.6 4 4 4 6.2.9-.5 1.5-1.5 1.7-2.6 1.8 1.4 2.9 3.4 2.9 5.4a6 6 0 0 1-6 6Z" fill="currentColor" fillOpacity=".18" />
        </svg>
      );
    case "thumbs":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="m8.4 12.2 2.4 2.4 4.8-4.8" />
        </svg>
      );
    case "eyes":
      return (
        <svg {...p}>
          <circle cx="8.3" cy="12" r="4.3" />
          <circle cx="15.7" cy="12" r="4.3" />
          <circle cx="9.2" cy="12.6" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="16.6" cy="12.6" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

// ── the sheet ───────────────────────────────────────────────────────────

type TalkProps = { open: boolean; onOpenChange: (o: boolean) => void; podId: string; podName: string; hue: PodHueKey };

/** Phone and narrow laptops: Talk is a full-height sheet over the table. */
export function TalkSheet(props: TalkProps) {
  const t = useTalk(props);
  return (
    <ResponsiveSheet open={props.open} onOpenChange={props.onOpenChange} size="md" className="h-[92dvh] md:h-[calc(100dvh-48px)]" title={t.title} footer={t.footer}>
      {t.log}
    </ResponsiveSheet>
  );
}

/** Wide laptops (≥1280): Talk is docked beside the table as the context panel (PLATFORM_SPEC §C split view), always
 *  open, no scrim, so the plan and the talk are read together. */
export function TalkPanel({ podId, podName, hue, focusKey }: { podId: string; podName: string; hue: PodHueKey; focusKey: number }) {
  const t = useTalk({ open: true, onOpenChange: () => undefined, podId, podName, hue, focusKey });
  return (
    <aside aria-label={`${podName} talk`} className="pods-talk-dock glass">
      <header className="flex items-center gap-s4 px-s8 pt-s8 pb-s4">
        <span className="min-w-0 truncate text-[24px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink">{t.title}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-s8">{t.log}</div>
      <div className="px-s8 pt-s3 pb-s8">{t.footer}</div>
    </aside>
  );
}

function useTalk({ open, podId, podName, hue, focusKey }: TalkProps & { focusKey?: number }) {
  const repo = useRepo();
  const reduce = useReducedMotion();
  const { mark } = useLastRead();
  const now = useClock();
  const meId = useDb((db) => db.me);
  const stored = useDb(useCallback((db) => db.messages[podId] ?? [], [podId]));
  const names = useDb(
    useCallback((db) => {
      const out: Record<string, string> = {};
      for (const m of podMembers(db, podId)) out[m.user_id] = m.user_id === db.me ? "You" : firstName(db, m.user_id);
      for (const x of db.messages[podId] ?? []) if (x.user_id && !out[x.user_id]) out[x.user_id] = firstName(db, x.user_id);
      return out;
    }, [podId]),
  );
  const people = useDb(
    useCallback(
      (db) =>
        podMembers(db, podId)
          .map((m) => ({ id: m.user_id, name: m.user_id === db.me ? (db.users[m.user_id]?.first_name ?? "") : firstName(db, m.user_id), you: m.user_id === db.me }))
          .sort((a, b) => Number(b.you) - Number(a.you)),
      [podId],
    ),
  );
  const paused = useDb((db) => isChatPaused(db, podId));
  const blocked = useDb((db) => myBlockedIds(db));
  const [pending, setPending] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Line | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const opened = useRef<Set<string> | null>(null);

  const byId = useMemo(() => new Map(stored.map((m) => [m.id, m])), [stored]);
  const lines = useMemo(() => {
    const ids = new Set(stored.map((m) => m.client_id).filter(Boolean));
    const all: Line[] = [...stored, ...pending.filter((p) => !ids.has(p.client_id))];
    return all
      .filter((m) => SHOWN.has(m.kind))
      .filter((m) => !(m.user_id && blocked.includes(m.user_id)))
      .map((m): Line => (m.kind === "host" && CITY.test(m.text) ? { ...m, text: m.text.split(/(?<=[.!?])\s+/).filter((s) => !CITY.test(s)).join(" ") } : m))
      .filter((m) => m.kind === "poll" || m.kind === "vote" || m.text.trim());
  }, [stored, pending, blocked]);

  // Only lines that arrive while Talk is open animate in.
  if (open && opened.current === null) opened.current = new Set(lines.map((l) => l.id));
  if (!open && opened.current) opened.current = null;

  useEffect(() => {
    if (!open) return;
    const last = stored[stored.length - 1];
    if (last) mark(podId, last.created_at);
    // keep the newest line in view: scroll the nearest scrolling box (the sheet or the docked panel), twice so late
    // layout (fonts, reactions) can't leave the last line under the composer
    const pin = () => {
      const box = end.current?.closest<HTMLElement>(".overflow-y-auto");
      if (box) box.scrollTop = box.scrollHeight;
      else end.current?.scrollIntoView({ block: "end" });
    };
    const a = setTimeout(pin, 40);
    const b = setTimeout(pin, 360);
    return () => (clearTimeout(a), clearTimeout(b));
  }, [open, stored, lines.length, mark, podId]);

  useEffect(() => {
    if (focusKey) field.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a closed sheet forgets its half-states
      setMenuFor(null);
      setPolling(false);
    }
  }, [open]);

  async function send(body: string, cid = newClientId(), reply: string | null = null) {
    const optimistic: Line = { id: `pending:${cid}`, pod_id: podId, user_id: meId, text: body, created_at: nowISO(), kind: "text", ref_id: null, client_id: cid, pinned: false, delivery: "sending", reply_to: reply };
    setPending((p) => [...p.filter((x) => x.client_id !== cid), optimistic]);
    const r = await repo.sendMessage(podId, body, cid, reply ? { replyTo: reply } : undefined);
    if (r.ok) setPending((p) => p.filter((x) => x.client_id !== cid));
    else setPending((p) => p.map((x) => (x.client_id === cid ? { ...x, delivery: "failed" } : x)));
  }

  // offline: resend what failed once the connection is back
  useEffect(() => {
    const on = () => pending.filter((p) => p.delivery === "failed").forEach((p) => void send(p.text, p.client_id!, p.reply_to ?? null));
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  });

  const startReply = (m: Line) => {
    setMenuFor(null);
    setPolling(false);
    setReplyTo(m);
    setTimeout(() => field.current?.focus(), 30);
  };

  const footer = polling ? (
    <PollComposer
      onCancel={() => setPolling(false)}
      onPost={async (q, opts) => {
        const r = await repo.createPoll(podId, q, opts, newClientId());
        if (!r.ok) return notify.error(r.error.code === "VALIDATION" ? r.error.message : "Not sent.");
        setPolling(false);
      }}
    />
  ) : (
    <form
      className="flex w-full flex-col gap-s2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || paused) return;
        setText("");
        const reply = replyTo?.id ?? null;
        setReplyTo(null);
        void send(t, undefined, reply);
      }}
    >
      <AnimatePresence initial={false}>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            className="flex items-center gap-s2 pl-s4 text-label text-ink-2"
          >
            <Icon name="turn" size={16} className="shrink-0 text-select" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-ink">{names[replyTo.user_id ?? ""] ?? "Pods"}</span> · {replyTo.text}
            </span>
            <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)} className="pressable grid size-11 place-items-center rounded-full">
              <Icon name="close" size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex w-full items-center gap-s2">
        <button
          type="button"
          aria-label="New poll"
          disabled={paused}
          onClick={() => (setReplyTo(null), setPolling(true))}
          className="pressable flex h-11 shrink-0 items-center gap-1 rounded-full pr-s3 pl-s2 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--line-2)] disabled:opacity-30"
        >
          <Icon name="add" size={20} />
          Poll
        </button>
        <label className="relative flex h-14 w-full items-center rounded-full bg-paper shadow-[inset_0_0_0_1.5px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--select)]">
          <span className="sr-only">Message {podName}</span>
          <input
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={paused}
            maxLength={500}
            placeholder={paused ? "Talk is paused" : replyTo ? "Reply" : "Say something"}
            className="h-full min-w-0 flex-1 bg-transparent pr-2 pl-5 text-[17px] text-ink outline-none placeholder:text-ink-2 disabled:cursor-not-allowed"
            enterKeyHint="send"
            autoComplete="off"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!text.trim() || paused}
            className="pressable mr-1.5 grid size-11 shrink-0 place-items-center rounded-full bg-select text-on-select shadow-primary transition-opacity disabled:opacity-25 disabled:shadow-none"
          >
            <Icon name="send" size={22} />
          </button>
        </label>
      </div>
    </form>
  );

  const title = (
<span className="flex items-center gap-s4">
          <DiscStack size={36} max={4} people={people.map((p) => ({ initial: p.name.slice(0, 1).toUpperCase(), tone: p.you ? "you" : hue, seed: p.name }))} />
          <span className="truncate">{podName}</span>
        </span>
  );
  const log = (
      <div className="flex min-h-full flex-col justify-end gap-s3 pb-s2" role="log" aria-live="polite" aria-label={`${podName} talk`} onClick={() => menuFor && setMenuFor(null)}>
        {!lines.length && <p className="pb-s8 text-[32px] leading-none font-semibold tracking-[-0.03em] text-ink-2">Say hi.</p>}
        {lines.map((m, i) => {
          const prev = lines[i - 1];
          const t = Date.parse(m.created_at);
          const gap = !prev || formatDayDivider(prev.created_at, now) !== formatDayDivider(m.created_at, now);
          const run = !!prev && !gap && prev.user_id === m.user_id && prev.kind === m.kind && t - Date.parse(prev.created_at) < RUN_MS && !m.reply_to;
          const mine = m.user_id === meId && m.kind === "text";
          const fresh = !!opened.current && !opened.current.has(m.id) && !reduce;
          const parent = m.reply_to ? byId.get(m.reply_to) : undefined;
          const who = names[m.user_id ?? ""] ?? "Member";
          return (
            <div key={m.client_id ?? m.id} className={cn(run && "-mt-s2")}>
              {gap && (
                <p className="pt-s4 pb-s2 text-center text-caption text-ink-2" data-nc>
                  {formatDayDivider(m.created_at, now)}
                </p>
              )}
              <motion.div initial={fresh ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={SNAPPY} data-nc>
                {m.kind === "host" ? (
                  <p className="max-w-[46ch] text-label text-ink-2">{m.text}</p>
                ) : m.kind === "poll" ? (
                  <PollLine pollId={m.ref_id} hue={hue} names={names} />
                ) : m.kind === "vote" ? (
                  <VoteLine podId={podId} hue={hue} names={names} />
                ) : (
                  <TextLine
                    m={m}
                    mine={mine}
                    run={run}
                    who={who}
                    parent={parent ? { who: names[parent.user_id ?? ""] ?? "Pods", text: parent.text } : null}
                    meId={meId}
                    menuOpen={menuFor === m.id}
                    onMenu={(o) => setMenuFor(o ? m.id : null)}
                    onReply={() => startReply(m)}
                    onReact={(k) => {
                      setMenuFor(null);
                      if (!m.id.startsWith("pending:")) void repo.react(podId, m.id, k);
                    }}
                    onRetry={() => void send(m.text, m.client_id ?? undefined, m.reply_to ?? null)}
                    names={names}
                  />
                )}
              </motion.div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
  );
  return { title, log, footer };
}

// ── one text line ───────────────────────────────────────────────────────

function TextLine({
  m, mine, run, who, parent, meId, menuOpen, onMenu, onReply, onReact, onRetry, names,
}: {
  m: Line; mine: boolean; run: boolean; who: string; parent: { who: string; text: string } | null; meId: string | null;
  menuOpen: boolean; onMenu: (o: boolean) => void; onReply: () => void; onReact: (k: ReactionKey) => void; onRetry: () => void;
  names: Record<string, string>;
}) {
  const reduce = useReducedMotion();
  const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const reacts = Object.entries(m.reactions ?? {}).filter(([, ids]) => ids.length) as [ReactionKey, string[]][];

  const handlers = {
    onContextMenu: (e: React.MouseEvent) => (e.preventDefault(), onMenu(true)),
    onTouchStart: (e: React.TouchEvent) => {
      const p = e.touches[0];
      touch.current = { x: p.clientX, y: p.clientY };
      press.current = setTimeout(() => onMenu(true), 480);
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = touch.current;
      if (!s) return;
      const p = e.touches[0];
      const x = p.clientX - s.x;
      if (Math.abs(x) > 8 || Math.abs(p.clientY - s.y) > 8) clearTimeout(press.current);
      if (x > 0 && Math.abs(x) > Math.abs(p.clientY - s.y)) setDx(Math.min(72, x * 0.6));
    },
    onTouchEnd: () => {
      clearTimeout(press.current);
      if (dx > 48) onReply();
      setDx(0);
      touch.current = null;
    },
  };

  const bubble = (
    <div className={cn("group relative flex max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
      {parent && (
        <span className={cn("mb-1 max-w-full truncate border-l-2 border-select/50 px-s2 text-caption text-ink-2", mine && "text-right")}>
          <span className="font-semibold">{parent.who}</span> · {parent.text}
        </span>
      )}
      <motion.p
        style={{ x: dx }}
        animate={dx ? undefined : { x: 0 }}
        transition={reduce ? { duration: 0 } : SNAPPY}
        {...handlers}
        className={cn(
          "min-w-0 rounded-[22px] px-4 py-2.5 text-[17px] leading-[1.4] [-webkit-touch-callout:none] select-text",
          mine ? "rounded-br-md bg-select text-on-select" : "rounded-bl-md bg-sunken text-ink",
        )}
      >
        {!mine && <span className="sr-only">{who}: </span>}
        {m.text}
      </motion.p>
      {/* laptop: the line's own "…" on hover/focus */}
      <button
        type="button"
        aria-label="React or reply"
        onClick={(e) => (e.stopPropagation(), onMenu(!menuOpen))}
        className={cn(
          // visible on a phone too (QA core r1: react and reply need a control you can see, not only a long-press)
          "pressable absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink-2 opacity-70 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100",
          mine ? "-left-12" : "-right-12",
        )}
      >
        <Icon name="more" size={20} />
      </button>
      {reacts.length > 0 && (
        <span className={cn("-mt-2 flex flex-wrap gap-1", mine ? "justify-end pr-s2" : "pl-s2")}>
          {reacts.map(([k, ids]) => {
            const on = !!meId && ids.includes(meId);
            return (
              <motion.button
                key={k}
                type="button"
                layout
                initial={reduce ? false : { scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={SNAPPY}
                onClick={() => onReact(k)}
                aria-pressed={on}
                aria-label={`${REACT_LABEL[k]}: ${ids.map((id) => names[id] ?? "Member").join(", ")}`}
                className={cn(
                  "tabular relative z-[1] flex h-7 items-center gap-1 rounded-full px-2 text-[13px] font-semibold shadow-[0_0_0_2px_var(--lit)] after:absolute after:-inset-2 after:content-['']",
                  on ? "bg-[color-mix(in_srgb,var(--select)_16%,var(--lit))] text-select" : "bg-lit text-ink",
                )}
              >
                <ReactGlyph k={k} size={16} />
                {ids.length}
              </motion.button>
            );
          })}
        </span>
      )}
      {m.delivery === "failed" && (
        <button type="button" onClick={onRetry} className="mt-1 min-h-11 text-label text-ink underline underline-offset-4">
          Not sent · Retry
        </button>
      )}
    </div>
  );

  const menu = (
    <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="menu"
            aria-label="React or reply"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={SNAPPY}
            className={cn("glass absolute bottom-[calc(100%+6px)] z-10 flex items-center gap-0.5 rounded-full p-1", mine ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left")}
          >
            {REACTIONS.map((k) => {
              const on = !!meId && (m.reactions?.[k] ?? []).includes(meId);
              return (
                <button key={k} type="button" role="menuitem" aria-label={REACT_LABEL[k]} aria-pressed={on} onClick={() => onReact(k)} className={cn("pressable grid size-11 place-items-center rounded-full", on ? "bg-[color-mix(in_srgb,var(--select)_14%,transparent)] text-select" : "text-ink")}>
                  <ReactGlyph k={k} size={22} />
                </button>
              );
            })}
            <span aria-hidden className="mx-1 h-6 w-px bg-line" />
            <button type="button" role="menuitem" onClick={onReply} className="pressable flex h-11 items-center gap-s1 rounded-full px-s3 text-[15px] font-semibold text-ink">
              <Icon name="turn" size={18} /> Reply
            </button>
          </motion.div>
        )}
      </AnimatePresence>
  );
  if (mine)
    return (
      <div className="relative flex flex-col items-end">
        {menu}
        {bubble}
      </div>
    );
  const pc = personColor(who === "Member" ? undefined : who);
  return (
    <div className="relative flex items-start gap-s3">
      {menu}
      <span
        aria-hidden
        className="mt-1 grid size-8 shrink-0 place-items-center rounded-full text-[15px] leading-none font-semibold"
        style={run ? undefined : { background: pc.bg, color: pc.fg, backgroundImage: "var(--bead)" }}
      >
        {run ? "" : who.slice(0, 1).toUpperCase()}
      </span>
      {bubble}
    </div>
  );
}

// ── polls: counts as discs ──────────────────────────────────────────────

function Voters({ ids, names, hue }: { ids: string[]; names: Record<string, string>; hue: PodHueKey }) {
  const meInitial = useDb((db) => (db.me ? (db.users[db.me]?.first_name ?? "").slice(0, 1).toUpperCase() : ""));
  if (!ids.length) return null;
  return (
    <DiscStack
      size={22}
      max={4}
      people={ids.map((id) => (names[id] === "You" ? { initial: meInitial, tone: "you" as const } : { initial: (names[id] ?? "?").slice(0, 1).toUpperCase(), tone: hue, seed: names[id] }))}
    />
  );
}

function Choice({ label, on, disabled, onClick, children }: { label: ReactNode; on: boolean; disabled?: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        "pressable flex min-h-12 w-full items-center gap-s3 rounded-[16px] px-s4 text-left text-[16px] disabled:cursor-default",
        on ? "bg-[color-mix(in_srgb,var(--select)_12%,var(--lit))] font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--select)]" : "bg-lit text-ink shadow-[inset_0_0_0_1px_var(--line)]",
      )}
    >
      <span aria-hidden className={cn("size-4 shrink-0 rounded-full", on ? "bg-select shadow-[inset_0_0_0_3px_var(--lit)] ring-[1.5px] ring-select" : "ring-[1.5px] ring-line-2")} />
      <span className="min-w-0 flex-1">{label}</span>
      {children}
    </button>
  );
}

function PollLine({ pollId, hue, names }: { pollId: string | null; hue: PodHueKey; names: Record<string, string> }) {
  const repo = useRepo();
  const meId = useDb((db) => db.me);
  const poll = useDb(useCallback((db) => (pollId ? db.polls[pollId] : undefined), [pollId]));
  if (!poll) return null;
  const tally = pollTally(poll, meId);
  const closed = poll.status !== "open";
  const total = tally.total;
  return (
    <div className="w-full max-w-[420px] rounded-[22px] bg-sunken p-s4">
      <p className="text-overline text-ink-2">{closed ? "Poll · closed" : `Poll · ${names[poll.created_by] ?? "Member"}`}</p>
      <p className="mt-s1 text-[17px] leading-[1.3] font-semibold text-ink">{poll.question}</p>
      <div className="mt-s3 flex flex-col gap-s2">
        {tally.options.map((o) => {
          const voters = Object.entries(poll.votes).filter(([, opt]) => opt === o.id).map(([u]) => u);
          return (
            <Choice key={o.id} label={o.label} on={tally.mine === o.id} disabled={closed} onClick={() => void repo.votePoll(poll.id, o.id)}>
              <Voters ids={voters} names={names} hue={hue} />
            </Choice>
          );
        })}
      </div>
      <div className="mt-s3 flex items-center justify-between text-label text-ink-2">
        <span className="tabular">{total} voted</span>
        {!closed && poll.created_by === meId && (
          <button type="button" onClick={() => void repo.closePoll(poll.id)} className="pressable min-h-11 font-semibold text-ink underline underline-offset-4">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function PollComposer({ onCancel, onPost }: { onCancel: () => void; onPost: (q: string, opts: string[]) => Promise<unknown> }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const ready = q.trim() && opts.filter((o) => o.trim()).length >= 2;
  const field = "h-12 w-full rounded-full bg-paper px-5 text-[16px] text-ink outline-none shadow-[inset_0_0_0_1.5px_var(--line-2)] placeholder:text-ink-3 focus:shadow-[inset_0_0_0_2px_var(--select)]";
  return (
    <form
      className="flex w-full flex-col gap-s2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || busy) return;
        setBusy(true);
        await onPost(q.trim(), opts.map((o) => o.trim()).filter(Boolean));
        setBusy(false);
      }}
    >
      <input autoFocus aria-label="Question" placeholder="Ask the pod" maxLength={120} value={q} onChange={(e) => setQ(e.target.value)} className={field} />
      {opts.map((o, i) => (
        <input key={i} aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} maxLength={40} value={o} onChange={(e) => setOpts((p) => p.map((x, j) => (j === i ? e.target.value : x)))} className={cn(field, "pl-8")} />
      ))}
      <div className="flex items-center justify-between gap-s2 pt-s1">
        {opts.length < 4 ? (
          <button type="button" onClick={() => setOpts((p) => [...p, ""])} className="pressable flex min-h-11 items-center gap-s1 text-label font-semibold text-ink">
            <Icon name="add" size={18} /> Option
          </button>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-s2">
          <button type="button" onClick={onCancel} className="pressable min-h-11 rounded-full px-s4 text-[15px] font-semibold text-ink">
            Cancel
          </button>
          <button type="submit" disabled={!ready || busy} className="pressable sheen h-11 rounded-full bg-primary px-s6 text-[15px] font-semibold text-on-primary disabled:bg-transparent disabled:text-ink-3 disabled:shadow-[inset_0_0_0_1.5px_var(--line)]">
            Post
          </button>
        </span>
      </div>
    </form>
  );
}

// ── the round-two vote, in Talk (beat 7) ────────────────────────────────

function VoteLine({ podId, hue, names }: { podId: string; hue: PodHueKey; names: Record<string, string> }) {
  const repo = useRepo();
  const now = useClock(30_000);
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const view = useDb(useCallback((db) => cardView(db, podId, minute), [podId, minute]));
  const vote = view?.vote;
  if (!vote || !view?.options.length) return null;
  const voted = Object.keys(vote.votes).length;
  return (
    <div className="w-full max-w-[420px] rounded-[22px] bg-sunken p-s4">
      <p className="text-overline text-ink-2">Same people, next time</p>
      <p className="mt-s1 text-[17px] leading-[1.3] font-semibold text-ink">Pick a time.</p>
      <div className="mt-s3 flex flex-col gap-s2">
        {view.options.map((o) => {
          const voters = Object.entries(vote.votes).filter(([, s]) => s === o.id).map(([u]) => u);
          return (
            <Choice
              key={o.id}
              on={view.myVote === o.id}
              onClick={() => void repo.voteNextOption(vote.id, o.id)}
              label={
                <span className="tabular">
                  {dayWord(o.starts_at, minute)}, {shortTime(o.starts_at)}
                </span>
              }
            >
              <Voters ids={voters} names={names} hue={hue} />
            </Choice>
          );
        })}
      </div>
      <p className="tabular mt-s3 text-label text-ink-2">
        {voted} of {view.size} voted
      </p>
    </div>
  );
}
