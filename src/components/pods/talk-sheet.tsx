// Talk: the pod's group chat (v3/chat/CHAT_REDESIGN.md R1-R13; refs CH01-CH18). A full-height sheet over the table on
// a phone, a right-hand sheet from 768px, docked beside the table from 1280px (the plan left, the talk right).
//   header   close · pod name + "8 members" (or "Malik is typing…") · flat member discs (tap → members)       R10
//   pinned   the next plan in one row with one action by phase (I'm in / Locked / Check in / Ask AI)             R7
//   thread   yours right on the plan blue, others left on sunken grey; name + time on top of a run, a flat disc
//            beside its last line; 2px inside a run, 12px between runs; plans, check-ins, votes and polls inline  R2-R8
//   actions  long-press (phone) / hover + right-click (laptop) → reactions, Reply, Copy, Report; swipe right = Reply R6
//   composer "+" (Photo · Poll · Ask AI) · "Message Hoopers" · send appears with text                               R9
// States: empty (wave), typing, sending, not sent + retry, offline resend, paused, unread divider, "New" pill.
"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Drawer } from "vaul";
import { Dialog } from "radix-ui";
import { SNAPPY, type PodHueKey } from "@/components/brand";
import { POD_SOLID, personColor, YOU_COLOR } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { notify } from "@/components/ui/toast";
import { useIsDesktop } from "@/components/ui/use-media-query";
import { ReportSheet } from "@/components/safety/report-sheet";
import { usePlanActions } from "@/components/planner/use-plan-actions";
import { cn } from "@/lib/cn";
import { clientId as newClientId } from "@/lib/ids";
import { useDb, useRepo } from "@/lib/db/hooks";
import { podMembers } from "@/lib/db/selectors";
import { cardView, type CardView } from "@/lib/planner/card-state";
import { pollTally } from "@/lib/platform/selectors";
import { isChatPaused, myBlockedIds } from "@/lib/safety/selectors";
import { useTyping } from "@/lib/simulation/crowd";
import { nowISO, useClock } from "@/lib/time/clock";
import { formatDayDivider } from "@/lib/time/format";
import { REACTIONS, type Memory, type Message, type ReactionKey } from "@/lib/types";
import { dayWord, firstName, shortDay, shortTime } from "./model";
import { useLastRead } from "./use-last-read";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";

const RUN_MS = 5 * 60_000;
/** The city lives in the pitch, not the product: host lines that name it lose that sentence (product rule 5). */
const CITY = /\b(Huntsville|Alabama|Madison|Decatur|AAMU|Rocket City)\b/i;
const OPEN_PHASES = new Set(["proposed", "in", "vote", "pending_review"]);

// ── glyphs: reactions keep the circle-and-dot language; everything else is a word (R12) ─────────────────

const REACT_LABEL: Record<ReactionKey, string> = { heart: "Love", laugh: "Ha", fire: "Fire", thumbs: "Yes", eyes: "Seen" };

function ReactGlyph({ k, size = 20 }: { k: ReactionKey; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (k) {
    case "heart":
      return (
        <svg {...p}>
          <path d="M12 19.5s-7-4.3-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.2c0 5-7 9.3-7 9.3Z" fill="currentColor" fillOpacity=".22" />
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
          <path d="M12 20a6 6 0 0 1-6-6c0-3.6 3-5.2 3.4-9 2.6 1.6 4 4 4 6.2.9-.5 1.5-1.5 1.7-2.6 1.8 1.4 2.9 3.4 2.9 5.4a6 6 0 0 1-6 6Z" fill="currentColor" fillOpacity=".22" />
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

/** Send: an arrow rising out of the pill (the universal send shape, drawn in the set's 1.75 stroke). */
function SendGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5.5M6 11.5l6-6 6 6" />
    </svg>
  );
}

/** Reply: a line that turns back on itself. */
function ReplyGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.5 6.5 5 11l4.5 4.5" />
      <path d="M5.5 11H14a5 5 0 0 1 5 5v1.5" />
    </svg>
  );
}

/** Flat person disc (R3: no bead in Talk). You are ink; everyone else wears a logo colour. */
function Face({ name, you, size = 28 }: { name: string; you?: boolean; size?: number }) {
  const c = you ? YOU_COLOR : personColor(name);
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full font-semibold leading-none select-none" style={{ width: size, height: size, background: c.bg, color: c.fg, fontSize: Math.round(size * 0.46) }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** "Chanda, Ama, Malik +5": the laptop dock names the people beside the talk (R11). */
function memberLine(people: { name: string; you: boolean }[]) {
  const shown = people.slice(0, 3).map((p) => p.name);
  return people.length > 3 ? `${shown.join(", ")} +${people.length - 3}` : shown.join(", ");
}

function activityWord(event: string) {
  const w = event.split(/[,:;(—–]/)[0].trim();
  return w.length > 44 ? `${w.slice(0, 43).trimEnd()}…` : w;
}

// ── shells ───────────────────────────────────────────────────────────────────────────────────────────────

type TalkProps = { open: boolean; onOpenChange: (o: boolean) => void; podId: string; podName: string; hue: PodHueKey; onMembers?: () => void };

/** Phone: a full-height sheet (drag down to close). 768-1279: a right-hand sheet. Solid, never glass (R1). */
export function TalkSheet(props: TalkProps) {
  const desktop = useIsDesktop();
  const body = <TalkBody {...props} where="sheet" />;
  if (desktop)
    return (
      <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="pods-scrim fixed inset-0 z-overlay" />
          <Dialog.Content
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              // land in the composer, like every desktop chat, instead of ringing the header
              const box = e.currentTarget as HTMLElement | null;
              const ta = box?.querySelector?.<HTMLTextAreaElement>("textarea:not(:disabled)");
              if (ta) (e.preventDefault(), ta.focus());
            }}
            className="fixed top-4 right-4 bottom-4 z-sheet flex w-[min(460px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] bg-lit text-ink shadow-[0_0_0_1px_var(--line),var(--shadow-float)] outline-none"
          >
            <Dialog.Title className="sr-only">{props.podName} talk</Dialog.Title>
            {body}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  return (
    <Drawer.Root open={props.open} onOpenChange={props.onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="pods-scrim fixed inset-0 z-overlay" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-sheet flex h-[94dvh] flex-col overflow-hidden rounded-t-[24px] bg-lit text-ink outline-none">
          <Drawer.Title className="sr-only">{props.podName} talk</Drawer.Title>
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-2" />
          {body}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** ≥1280: Talk docked beside the table as the context panel (R11), always open, no scrim. */
export function TalkPanel({ podId, podName, hue, focusKey, onMembers }: { podId: string; podName: string; hue: PodHueKey; focusKey: number; onMembers?: () => void }) {
  return (
    <aside aria-label={`${podName} talk`} className="pods-talk-dock overflow-hidden bg-lit shadow-[0_0_0_1px_var(--line),var(--shadow-float)]">
      <TalkBody open onOpenChange={() => undefined} podId={podId} podName={podName} hue={hue} focusKey={focusKey} onMembers={onMembers} where="dock" />
    </aside>
  );
}

// ── the body: header · pinned plan · thread · composer ─────────────────────────────────────────────────

type Row =
  | { t: "msg"; key: string; at: string; who: string | null; m: Message }
  | { t: "photo"; key: string; at: string; who: string; mem: Memory };

type MenuState = { id: string; top: number; bottom: number; left: number; right: number; mine: boolean; text: string; who: string; userId: string | null } | null;

function TalkBody({ open, onOpenChange, podId, podName, hue, focusKey, onMembers, where }: TalkProps & { focusKey?: number; where: "sheet" | "dock" }) {
  const repo = useRepo();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { lastRead, mark } = useLastRead();
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const meId = useDb((db) => db.me);
  const stored = useDb(useCallback((db) => db.messages[podId] ?? [], [podId]));
  const memories = useDb(useCallback((db) => db.memories, []));
  const view = useDb(useCallback((db) => cardView(db, podId, minute), [podId, minute]));
  const names = useDb(
    useCallback(
      (db) => {
        const out: Record<string, string> = {};
        for (const m of podMembers(db, podId)) out[m.user_id] = m.user_id === db.me ? "You" : firstName(db, m.user_id);
        for (const x of db.messages[podId] ?? []) if (x.user_id && !out[x.user_id]) out[x.user_id] = firstName(db, x.user_id);
        return out;
      },
      [podId],
    ),
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
  const podOpen = useDb((db) => db.pods[podId]?.status === "active");
  const paused = useDb((db) => isChatPaused(db, podId));
  const blocked = useDb((db) => myBlockedIds(db));
  const typing = useTyping(podId);
  const actions = usePlanActions(podId);

  const [pending, setPending] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; who: string; text: string } | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [tray, setTray] = useState(false);
  const [polling, setPolling] = useState(false);
  const [reporting, setReporting] = useState<{ messageId: string; userId: string | null; userName: string; preview: string } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [fresh, setFresh] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  // what was on screen when Talk opened: only later rows animate in; the unread divider is fixed at open
  const [snap, setSnap] = useState<{ keys: Set<string>; unread: string | null } | null>(null);

  const byId = useMemo(() => new Map(stored.map((m) => [m.id, m])), [stored]);

  const rows = useMemo<Row[]>(() => {
    const ids = new Set(stored.map((m) => m.client_id).filter(Boolean));
    const msgs: Row[] = [...stored, ...pending.filter((p) => !ids.has(p.client_id))]
      .filter((m) => !(m.user_id && blocked.includes(m.user_id)))
      .map((m): Message => (m.kind === "host" && CITY.test(m.text) ? { ...m, text: m.text.split(/(?<=[.!?])\s+/).filter((s) => !CITY.test(s)).join(" ") } : m))
      .filter((m) => m.kind === "poll" || m.kind === "vote" || m.kind === "plan_card" || m.text.trim())
      .map((m) => ({ t: "msg" as const, key: m.client_id ?? m.id, at: m.created_at, who: m.kind === "text" ? m.user_id : null, m }));
    const photos: Row[] = Object.values(memories)
      .filter((x) => x.pod_id === podId && x.photo_url && !x.removed_at && !blocked.includes(x.user_id))
      .map((mem) => ({ t: "photo" as const, key: mem.id, at: mem.created_at, who: mem.user_id, mem }));
    // a later plan card for the same suggestion replaces an earlier one (re-plans), so the thread holds one per plan
    const out = [...msgs, ...photos].sort((a, b) => a.at.localeCompare(b.at));
    const lastCard = new Map<string, string>();
    for (const r of out) if (r.t === "msg" && r.m.kind === "plan_card" && r.m.ref_id) lastCard.set(r.m.ref_id, r.key);
    return out.filter((r) => !(r.t === "msg" && r.m.kind === "plan_card" && r.m.ref_id && lastCard.get(r.m.ref_id) !== r.key));
  }, [stored, pending, blocked, memories, podId]);

  if (open && !snap) {
    const since = lastRead[podId];
    setSnap({ keys: new Set(rows.map((r) => r.key)), unread: since ? (rows.find((r) => r.at > since && r.who && r.who !== meId)?.key ?? null) : null });
  }
  if (!open && snap) setSnap(null);
  const unreadFrom = snap?.unread ?? null;

  const toBottom = useCallback((smooth = false) => {
    const box = scroller.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // keep the newest line in view while you are at the bottom; otherwise count what arrived ("New" pill)
  const lastKey = rows[rows.length - 1]?.key;
  const lastMine = rows[rows.length - 1]?.who === meId;
  useLayoutEffect(() => {
    if (!open) return;
    if (atBottom || lastMine) {
      toBottom();
      const t = setTimeout(() => toBottom(), 320); // late layout (fonts, images) can't strand the last line
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a line arrived while you read history
    setFresh((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new last line decides this
  }, [open, lastKey]);
  useEffect(() => {
    if (!open) return;
    const last = stored[stored.length - 1];
    if (last) mark(podId, last.created_at);
  }, [open, stored, mark, podId]);
  useEffect(() => {
    if (open && typing && atBottom) toBottom(true);
  }, [open, typing, atBottom, toBottom]);
  useEffect(() => {
    if (focusKey) field.current?.focus();
  }, [focusKey]);
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a closed sheet forgets its half-states
      setMenu(null);
      setTray(false);
      setPolling(false);
      setFresh(0);
    }
  }, [open]);

  async function send(body: string, cid = newClientId(), reply: string | null = null) {
    const optimistic: Message = { id: `pending:${cid}`, pod_id: podId, user_id: meId, text: body, created_at: nowISO(), kind: "text", ref_id: null, client_id: cid, pinned: false, delivery: "sending", reply_to: reply };
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

  const submit = () => {
    const t = text.trim();
    if (!t || paused || !podOpen) return;
    setText("");
    const reply = replyTo?.id ?? null;
    setReplyTo(null);
    void send(t, undefined, reply);
    requestAnimationFrame(() => field.current?.focus());
  };

  const startReply = (id: string, who: string, body: string) => {
    setMenu(null);
    setTray(false);
    setPolling(false);
    setReplyTo({ id, who, text: body });
    setTimeout(() => field.current?.focus(), 30);
  };

  const openMenu = (r: Row & { t: "msg" }, el: HTMLElement) => {
    const box = root.current?.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!box) return;
    navigator.vibrate?.(8);
    setTray(false);
    setMenu({ id: r.m.id, top: b.top - box.top, bottom: b.bottom - box.top, left: b.left - box.left, right: box.right - b.right, mine: r.who === meId, text: r.m.text, who: names[r.who ?? ""] ?? "Member", userId: r.who });
  };

  // "Ask AI": plan when the table is empty, add an option while a plan is open, draft the next round after the reveal
  const ai = useMemo(() => {
    if (!view) return null;
    if (view.phase === "empty") return { label: "Ask AI for a plan", run: () => void actions.planNow() };
    if (OPEN_PHASES.has(view.phase) && view.suggestion && !view.locked) {
      const s = view.suggestion;
      return { label: "Ask AI for another option", run: () => void actions.suggestElse(s, []) };
    }
    if (view.phase === "planning_next" && !view.vote) return { label: "Ask AI for next options", run: () => void actions.planNextRound(view) };
    return null;
  }, [view, actions]);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    setTray(false);
    try {
      const url = await shrink(f);
      const r = await repo.addMemory(podId, { caption: text.trim().slice(0, 200), photoUrl: url });
      if (!r.ok) return notify.error(r.error.code === "VALIDATION" ? r.error.message : "Not sent.");
      setText("");
    } catch {
      notify.error("That photo didn't load.");
    }
  };

  const typingName = typing && typing.userId !== meId ? (names[typing.userId] ?? null) : null;
  const generating = actions.genKind !== null;
  const genStep = actions.genSteps[actions.genSteps.length - 1]?.label;

  // ── header (R10) ──
  const header = (
    <header className={cn("flex shrink-0 items-center gap-s3 border-b border-line", where === "dock" ? "h-[72px] px-s6" : "h-14 pr-s2 pl-s4 md:h-16 md:pl-s6")}>
      <button type="button" onClick={onMembers} disabled={!onMembers} className="pressable -ml-s1 flex min-h-11 min-w-0 flex-1 items-center gap-s3 rounded-[14px] px-s1 text-left disabled:cursor-default">
        <span className="flex shrink-0 items-center" style={{ paddingLeft: 8 }}>
          {people.slice(0, 3).map((p, i) => (
            <span key={p.id} className="rounded-full ring-2 ring-lit" style={{ marginLeft: -8, zIndex: 3 - i }}>
              <Face name={p.name} you={p.you} size={28} />
            </span>
          ))}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[17px] leading-[1.2] font-semibold tracking-[-0.01em] text-ink">{podName}</span>
          <span className="truncate text-[13px] leading-[1.3] text-ink-2" aria-live="polite">
            {typingName ? `${typingName} is typing…` : where === "dock" ? memberLine(people) : `${people.length} members`}
          </span>
        </span>
      </button>
      {where === "sheet" && (
        <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="pressable grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-sunken">
          <Icon name="close" size={22} />
        </button>
      )}
    </header>
  );

  // ── pinned plan (R7): hidden in the dock, where the plan is the left pane ──
  const pinned =
    where === "sheet" && view ? (
      <PinnedPlan
        view={view}
        hue={hue}
        minute={minute}
        busy={actions.busy || generating}
        ai={ai}
        onOpen={() => {
          const id = view.suggestion?.id;
          onOpenChange(false);
          setTimeout(() => router.push(id && !["check_in", "ballot", "waiting_reveal", "planning_next", "missed"].includes(view.phase) ? `/app/pods/${podId}/plan/${id}` : `/app/pods/${podId}`), 60);
        }}
        onIn={() => view.targetId && void actions.rsvp(view.targetId, "going")}
        onVote={() => {
          const el = scroller.current?.querySelector<HTMLElement>("[data-vote]");
          if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
          else toBottom(true);
        }}
        onCheckIn={async () => {
          if (!view.lastHangout) return;
          const r = await repo.checkIn(view.lastHangout.id);
          if (!r.ok) notify.error("Not checked in. Try again.");
        }}
      />
    ) : null;

  // ── thread ──
  const thread = (
    <div
      ref={scroller}
      data-talk-scroll
      onScroll={(e) => {
        const b = e.currentTarget;
        const bottom = b.scrollHeight - b.scrollTop - b.clientHeight < 160;
        if (bottom !== atBottom) setAtBottom(bottom);
        if (bottom && fresh) setFresh(0);
      }}
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper", where === "dock" ? "px-s6" : "px-s4 md:px-s6")}
    >
      <div role="log" aria-live="polite" aria-label={`${podName} messages`} className="flex min-h-full flex-col justify-end pt-s6 pb-s4">
        {!rows.length && !generating && (
          <div className="flex flex-col items-center gap-s4 pb-s12 text-center">
            <span className="flex" style={{ paddingLeft: 12 }}>
              {people.slice(0, 5).map((p, i) => (
                <span key={p.id} className="rounded-full ring-[3px] ring-paper" style={{ marginLeft: -12, zIndex: 5 - i }}>
                  <Face name={p.name} you={p.you} size={44} />
                </span>
              ))}
            </span>
            <p className="text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] text-ink">Say hi to {podName}.</p>
            {podOpen && !paused && (
              <button type="button" onClick={() => void send("Hey everyone 👋")} className="pressable h-11 rounded-full bg-lit px-s6 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line-2)]">
                Wave 👋
              </button>
            )}
          </div>
        )}
        {rows.map((r, i) => {
          const prev = rows[i - 1];
          const next = rows[i + 1];
          const day = formatDayDivider(r.at, now);
          const newDay = !prev || formatDayDivider(prev.at, now) !== day;
          const person = r.who !== null && (r.t === "photo" || r.m.kind === "text");
          const joins = (a: Row | undefined, b: Row) =>
            !!a && a.who !== null && a.who === b.who && (a.t === "photo" || a.m.kind === "text") && Date.parse(b.at) - Date.parse(a.at) < RUN_MS && formatDayDivider(a.at, now) === formatDayDivider(b.at, now) && !(b.t === "msg" && b.m.reply_to) && b.key !== unreadFrom;
          const first = !person || !joins(prev, r);
          const last = !person || !next || !joins(r, next);
          const mine = person && r.who === meId;
          const animate = !!snap && !snap.keys.has(r.key) && !reduce;
          return (
            <div key={r.key} className={cn(first ? (i === 0 || newDay ? "" : "mt-s3") : "mt-0.5")}>
              {newDay && <p className={cn("pb-s3 text-center text-[12px] font-medium tracking-[0.02em] text-ink-3", i > 0 && "pt-s6")}>{day}</p>}
              {r.key === unreadFrom && (
                <div className="flex items-center gap-s3 pt-s2 pb-s3" aria-label="New messages">
                  <span className="h-px flex-1 bg-select/40" />
                  <span className="text-[12px] font-semibold text-select">New</span>
                  <span className="h-px flex-1 bg-select/40" />
                </div>
              )}
              <motion.div initial={animate ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={SNAPPY}>
                {r.t === "photo" ? (
                  <PhotoLine mem={r.mem} mine={mine} first={first} last={last} who={names[r.who] ?? "Member"} time={shortTime(r.at)} />
                ) : r.m.kind === "text" ? (
                  <TextLine
                    m={r.m}
                    mine={mine}
                    first={first}
                    last={last}
                    who={names[r.who ?? ""] ?? "Member"}
                    meId={meId}
                    names={names}
                    parent={r.m.reply_to ? byId.get(r.m.reply_to) : undefined}
                    showStatus={mine && last && i >= rows.length - 3}
                    lit={menu?.id === r.m.id}
                    onMenu={(el) => openMenu(r, el)}
                    onReply={() => startReply(r.m.id, names[r.who ?? ""] ?? "Member", r.m.text)}
                    onReact={(k) => !r.m.id.startsWith("pending:") && void repo.react(podId, r.m.id, k)}
                    onRetry={() => void send(r.m.text, r.m.client_id ?? undefined, r.m.reply_to ?? null)}
                  />
                ) : r.m.kind === "poll" ? (
                  <PollLine pollId={r.m.ref_id} hue={hue} names={names} />
                ) : r.m.kind === "vote" ? (
                  <VoteLine view={view} minute={minute} hue={hue} names={names} />
                ) : r.m.kind === "plan_card" ? (
                  <PlanLine id={r.m.ref_id} text={r.m.text} minute={minute} podId={podId} onOpen={(href) => (onOpenChange(false), setTimeout(() => router.push(href), 60))} />
                ) : r.m.kind === "checkin_prompt" ? (
                  <CheckInLine hangoutId={r.m.ref_id} />
                ) : (
                  <EventLine text={r.m.text} kind={r.m.kind} />
                )}
              </motion.div>
            </div>
          );
        })}
        <AnimatePresence initial={false}>
          {generating && (
            <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SNAPPY} className="mt-s3 flex items-end gap-s2">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-lit">AI</span>
              <div className="rounded-[20px] rounded-bl-md bg-lit px-s4 py-2.5 text-[15px] text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]">
                <span className="font-semibold text-ink">Planning</span>
                {genStep ? ` · ${genStep}` : "…"}
              </div>
            </motion.div>
          )}
          {typingName && typing && (
            <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SNAPPY} className="mt-s3 flex items-end gap-s2">
              <Face name={typingName} size={28} />
              <div className="flex h-10 items-center gap-1 rounded-[20px] rounded-bl-md bg-sunken px-s4" role="status" aria-label={`${typingName} is typing`}>
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} className="size-1.5 rounded-full bg-ink-2" animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.16 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // ── composer (R9) ──
  const locked = paused || !podOpen;
  const composer = polling ? (
    <div className={cn("shrink-0 border-t border-line bg-lit pt-s3", where === "dock" ? "px-s6 pb-s6" : "px-s4 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-s6 md:pb-s6")}>
      <PollComposer
        onCancel={() => setPolling(false)}
        onPost={async (q, opts) => {
          const r = await repo.createPoll(podId, q, opts, newClientId());
          if (!r.ok) return notify.error(r.error.code === "VALIDATION" ? r.error.message : "Not sent.");
          setPolling(false);
        }}
      />
    </div>
  ) : (
    <div className={cn("relative shrink-0 border-t border-line bg-lit pt-s2", where === "dock" ? "px-s4 pb-s4" : "px-s3 pb-[calc(8px+env(safe-area-inset-bottom))] md:px-s4 md:pb-s4")}>
      <AnimatePresence initial={false}>
        {replyTo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.16 }} className="overflow-hidden">
            <div className="mb-s2 flex items-center gap-s3 rounded-[14px] bg-sunken py-1 pr-1 pl-s3">
              <span className="h-8 w-[3px] shrink-0 rounded-full bg-select" />
              <span className="min-w-0 flex-1 text-[13px] leading-[1.3]">
                <span className="block font-semibold text-ink">Replying to {replyTo.who === "You" ? "yourself" : replyTo.who}</span>
                <span className="block truncate text-ink-2">{replyTo.text}</span>
              </span>
              <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)} className="pressable grid size-11 shrink-0 place-items-center rounded-full text-ink-2">
                <Icon name="close" size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {tray && (
          <motion.div
            role="menu"
            aria-label="Add to the chat"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SNAPPY}
            className="absolute bottom-[calc(100%+8px)] left-s3 z-20 w-[min(280px,calc(100%-24px))] origin-bottom-left overflow-hidden rounded-[18px] bg-lit p-1 shadow-[0_0_0_1px_var(--line),var(--shadow-float)]"
          >
            <TrayItem label="Photo" hint="Share with the pod" onClick={() => file.current?.click()} />
            <TrayItem label="Poll" hint="Ask the pod a question" onClick={() => (setTray(false), setReplyTo(null), setPolling(true))} />
            {ai && <TrayItem label={ai.label} hint="A time and place that works" ai disabled={generating} onClick={() => (setTray(false), ai.run())} />}
          </motion.div>
        )}
      </AnimatePresence>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => (void pickPhoto(e.target.files?.[0]), (e.target.value = ""))} />
      <form
        className="flex items-end gap-s2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <button
          type="button"
          aria-label="Add photo, poll or plan"
          aria-expanded={tray}
          disabled={locked}
          onClick={() => setTray((o) => !o)}
          className={cn("pressable grid size-11 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-30", tray ? "bg-ink text-lit" : "bg-sunken text-ink")}
        >
          <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden animate={{ rotate: tray ? 45 : 0 }} transition={SNAPPY}>
            <path d="M12 5v14M5 12h14" />
          </motion.svg>
        </button>
        <label className="flex min-h-11 w-full items-end rounded-[22px] bg-sunken focus-within:shadow-[inset_0_0_0_1.5px_var(--select)]">
          <span className="sr-only">Message {podName}</span>
          <textarea
            ref={field}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 132)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            onFocus={() => (setTray(false), atBottom && setTimeout(() => toBottom(true), 250))}
            disabled={locked}
            maxLength={500}
            aria-label={`Message ${podName}`}
            placeholder={paused ? "Talk is paused" : !podOpen ? "Opens when the pod does" : replyTo ? "Reply" : `Message ${podName}`}
            className="block max-h-[132px] min-h-11 w-full resize-none bg-transparent py-[11px] pr-1 pl-s4 text-[16px] leading-[22px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none disabled:cursor-not-allowed"
            enterKeyHint="send"
            autoComplete="off"
          />
          <AnimatePresence initial={false}>
            {text.trim() && !locked && (
              <motion.button
                type="submit"
                aria-label="Send"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={SNAPPY}
                className="pressable m-1 grid size-9 shrink-0 place-items-center rounded-full bg-select text-on-select after:absolute after:-inset-1 after:content-[''] relative"
              >
                <SendGlyph />
              </motion.button>
            )}
          </AnimatePresence>
        </label>
      </form>
    </div>
  );

  const scrim = (
    <AnimatePresence>
      {menu && (
        <MessageMenu
          key={menu.id}
          menu={menu}
          meId={meId}
          reactions={byId.get(menu.id)?.reactions}
          onClose={() => setMenu(null)}
          onReact={(k) => {
            setMenu(null);
            if (!menu.id.startsWith("pending:")) void repo.react(podId, menu.id, k);
          }}
          onReply={() => startReply(menu.id, menu.who, menu.text)}
          onCopy={async () => {
            setMenu(null);
            try {
              await navigator.clipboard.writeText(menu.text);
              notify("Copied.");
            } catch {
              notify.error("Couldn't copy.");
            }
          }}
          onReport={
            menu.mine
              ? undefined
              : () => {
                  setMenu(null);
                  setReporting({ messageId: menu.id, userId: menu.userId, userName: menu.who, preview: menu.text });
                }
          }
        />
      )}
    </AnimatePresence>
  );

  return (
    <div ref={root} className="relative flex min-h-0 flex-1 flex-col" onClick={() => tray && setTray(false)}>
      {header}
      {pinned}
      {thread}
      <AnimatePresence>
        {fresh > 0 && !atBottom && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => (toBottom(true), setFresh(0))}
            className="pressable absolute right-s4 z-10 flex h-10 items-center gap-s1 rounded-full bg-ink px-s4 text-[14px] font-semibold text-lit shadow-[var(--shadow-float)]"
            style={{ bottom: 84 }}
          >
            New <span aria-hidden>↓</span>
          </motion.button>
        )}
      </AnimatePresence>
      {composer}
      {scrim}
      {reporting && (
        <ReportSheet
          open
          onOpenChange={(o) => !o && setReporting(null)}
          target={{ kind: "message", messageId: reporting.messageId, userId: reporting.userId, podId, userName: reporting.userName, preview: reporting.preview }}
        />
      )}
    </div>
  );
}

/** Downscale a picked photo to ≤1280px JPEG so it fits the local store (≤2 MB data URL). */
async function shrink(f: File): Promise<string> {
  const src = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.82, 0.7, 0.55]) {
    const out = c.toDataURL("image/jpeg", q);
    if (out.length < 1_900_000) return out;
  }
  throw new Error("too big");
}

function TrayItem({ label, hint, onClick, ai, disabled }: { label: string; hint: string; onClick: () => void; ai?: boolean; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={(e) => (e.stopPropagation(), onClick())} className="pressable flex min-h-14 w-full items-center gap-s3 rounded-[14px] px-s3 text-left hover:bg-sunken disabled:opacity-40">
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-[1.25] font-semibold text-ink">{label}</span>
        <span className="block text-[13px] leading-[1.3] text-ink-2">{hint}</span>
      </span>
      {ai && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-lit">AI</span>}
    </button>
  );
}

// ── pinned next plan (R7) ───────────────────────────────────────────────────────────────────────────────

function PinnedPlan({
  view, hue, minute, busy, ai, onOpen, onIn, onCheckIn, onVote,
}: {
  view: CardView; hue: PodHueKey; minute: number; busy: boolean; ai: { label: string; run: () => void } | null;
  onOpen: () => void; onIn: () => void; onCheckIn: () => void; onVote: () => void;
}) {
  const plan = view.suggestion?.plan_json;
  const when = view.hangout?.starts_at ?? plan?.starts_at;
  const title = plan ? activityWord(plan.event) : view.hangout?.title ? activityWord(view.hangout.title) : null;
  const count = view.going.length;
  let line: string;
  let action: ReactNode = null;
  const btn = "pressable h-9 shrink-0 rounded-full px-s4 text-[14px] font-semibold disabled:opacity-40";
  switch (view.phase) {
    case "empty":
      line = "No plan yet";
      action = ai && (
        <button type="button" disabled={busy} onClick={(e) => (e.stopPropagation(), ai.run())} className={cn(btn, "bg-ink text-lit")}>
          Ask AI
        </button>
      );
      break;
    case "check_in":
      line = "Did you make it?";
      action = (
        <button type="button" onClick={(e) => (e.stopPropagation(), onCheckIn())} className={cn(btn, "bg-select text-on-select")}>
          Check in
        </button>
      );
      break;
    case "ballot":
    case "waiting_reveal":
    case "missed":
      line = view.phase === "ballot" ? "Run it back?" : "Waiting on the pod";
      action = <span className="shrink-0 text-[14px] font-semibold text-select">Open</span>;
      break;
    case "planning_next":
      line = view.vote ? "Pick the next time" : "Same people, next time";
      action = <span className="shrink-0 text-[14px] font-semibold text-select">{view.vote ? "Vote" : "Open"}</span>;
      break;
    case "vote":
      line = "Pick a time";
      action = (
        <button type="button" onClick={(e) => (e.stopPropagation(), onVote())} className={cn(btn, "bg-select text-on-select")}>
          Vote
        </button>
      );
      break;
    case "locked":
    case "starting_soon":
    case "happening_now":
      line = `${count} going`;
      action = (
        <span className="flex shrink-0 items-center gap-s1 text-[14px] font-semibold text-ink">
          <Icon name="locked" size={18} /> {view.phase === "happening_now" ? "Now" : "Locked"}
        </span>
      );
      break;
    default:
      line = `${count} of ${view.size} in`;
      action = view.imIn ? (
        <span className="shrink-0 text-[14px] font-semibold text-select">You&apos;re in</span>
      ) : (
        <button type="button" disabled={busy || !view.targetId} onClick={(e) => (e.stopPropagation(), onIn())} className={cn(btn, "bg-spark text-on-spark")}>
          I&apos;m in
        </button>
      );
  }
  const loop = ["check_in", "ballot", "waiting_reveal", "planning_next", "missed"].includes(view.phase);
  const head = loop ? line : title ?? "No plan yet";
  const sub = loop ? (title ? `${title}${when ? ` · ${shortDay(when, minute)}` : ""}` : "") : view.phase === "empty" ? "" : `${when ? `${shortDay(when, minute)} ${shortTime(when)} · ` : ""}${line}`;
  return (
    <div className="shrink-0 border-b border-line bg-lit px-s3 py-s2 md:px-s4">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
        aria-label={`Open plan: ${head}${sub ? `, ${sub}` : ""}`}
        className="pressable flex min-h-12 cursor-pointer items-center gap-s3 rounded-[14px] px-s1 hover:bg-sunken/60"
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full text-center leading-none font-semibold text-white" style={{ background: POD_SOLID[hue] }}>
          {when && !loop ? (
            <span className="flex flex-col items-center">
              <span className="text-[10px] tracking-[0.06em] uppercase opacity-90">{formatInTimeZone(when, TZ, "EEE")}</span>
              <span className="tabular text-[15px]">{formatInTimeZone(when, TZ, "d")}</span>
            </span>
          ) : (
            <Icon name={loop ? "again" : "day"} size={20} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-[1.25] font-semibold text-ink">{head}</span>
          {sub && <span className="tabular block truncate text-[13px] leading-[1.3] text-ink-2">{sub}</span>}
        </span>
        {action}
      </div>
    </div>
  );
}

// ── one text line ───────────────────────────────────────────────────────────────────────────────────────

function TextLine({
  m, mine, first, last, who, meId, names, parent, showStatus, lit, onMenu, onReply, onReact, onRetry,
}: {
  m: Message; mine: boolean; first: boolean; last: boolean; who: string; meId: string | null; names: Record<string, string>;
  parent: Message | undefined; showStatus: boolean; lit: boolean;
  onMenu: (el: HTMLElement) => void; onReply: () => void; onReact: (k: ReactionKey) => void; onRetry: () => void;
}) {
  const reduce = useReducedMotion();
  const bubble = useRef<HTMLDivElement>(null);
  const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const fired = useRef(false);
  const [dx, setDx] = useState(0);
  const reacts = Object.entries(m.reactions ?? {}).filter(([, ids]) => ids.length) as [ReactionKey, string[]][];

  const pointer = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      fired.current = false;
      clearTimeout(press.current);
      press.current = setTimeout(() => {
        fired.current = true;
        if (bubble.current) onMenu(bubble.current);
      }, 420);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const x = e.clientX - s.x;
      const y = e.clientY - s.y;
      if (Math.abs(x) > 8 || Math.abs(y) > 8) clearTimeout(press.current);
      if (e.pointerType === "touch" && x > 0 && Math.abs(x) > Math.abs(y)) setDx(Math.min(72, x * 0.6));
    },
    onPointerUp: () => {
      clearTimeout(press.current);
      if (dx > 44) onReply();
      setDx(0);
      start.current = null;
    },
    onPointerCancel: () => {
      clearTimeout(press.current);
      setDx(0);
      start.current = null;
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!fired.current && bubble.current) onMenu(bubble.current);
    },
  };

  const pName = parent ? (names[parent.user_id ?? ""] ?? "Pods") : "";
  const radius = mine
    ? cn("rounded-[20px]", !first && "rounded-tr-[6px]", !last && "rounded-br-[6px]")
    : cn("rounded-[20px]", !first && "rounded-tl-[6px]", !last && "rounded-bl-[6px]");

  return (
    <div data-line data-mine={mine ? "" : undefined} className={cn("group relative flex items-end gap-s2", mine ? "justify-end" : "justify-start")}>
      {!mine && <span className="w-7 shrink-0">{last && <Face name={who} />}</span>}
      <div className={cn("flex max-w-[78%] min-w-0 flex-col md:max-w-[72%]", mine ? "items-end" : "items-start")}>
        {!mine && first && (
          <p className="mb-1 flex items-baseline gap-s2 px-s3 text-[13px] leading-none">
            <span className="font-semibold text-ink-2">{who}</span>
            <span className="tabular text-ink-3">{shortTime(m.created_at)}</span>
          </p>
        )}
        {parent && (
          <span className={cn("mb-1 flex max-w-full items-center gap-s2 rounded-[14px] px-s3 py-1.5 text-[13px] leading-[1.3] text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]", mine && "self-end")}>
            <ReplyGlyph size={14} />
            <span className="min-w-0 truncate">
              <span className="font-semibold">{pName}</span> {parent.text}
            </span>
          </span>
        )}
        <motion.div
          ref={bubble}
          data-bubble
          style={{ x: dx, touchAction: "pan-y" }}
          animate={dx ? undefined : { x: 0 }}
          transition={reduce ? { duration: 0 } : SNAPPY}
          {...pointer}
          className={cn(
            "relative max-w-full px-[14px] py-[9px] text-[16px] leading-[22px] break-words whitespace-pre-wrap [-webkit-touch-callout:none] max-md:select-none",
            radius,
            mine ? "bg-select text-on-select" : "bg-sunken text-ink",
            m.delivery === "sending" && "opacity-70",
            lit && "opacity-0",
          )}
        >
          {!mine && <span className="sr-only">{who}: </span>}
          {m.text}
        </motion.div>
        {reacts.length > 0 && (
          <span className={cn("relative z-[1] -mt-1.5 flex flex-wrap gap-1", mine ? "justify-end pr-s2" : "pl-s2")}>
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
                    "tabular relative flex h-6 items-center gap-0.5 rounded-full px-1.5 text-[12px] font-semibold shadow-[0_0_0_2px_var(--paper)] after:absolute after:-inset-2.5 after:content-['']",
                    on ? "bg-select text-on-select" : "bg-lit text-ink shadow-[0_0_0_2px_var(--paper),inset_0_0_0_1px_var(--line)]",
                  )}
                >
                  <ReactGlyph k={k} size={14} />
                  {ids.length > 1 && ids.length}
                </motion.button>
              );
            })}
          </span>
        )}
        {m.delivery === "failed" ? (
          <button type="button" onClick={onRetry} className="mt-0.5 min-h-11 px-s2 text-[13px] font-semibold text-danger-text">
            Not sent · Retry
          </button>
        ) : (
          showStatus && <span className="mt-1 px-s2 text-[12px] text-ink-3">{m.delivery === "sending" ? "Sending…" : "Sent"}</span>
        )}
      </div>
      {/* laptop: hover actions beside the bubble (R6); hidden on touch, where long-press and swipe do this */}
      <span className={cn("pointer-events-none flex shrink-0 items-center self-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 max-md:hidden", mine && "order-first")}>
        <button type="button" aria-label="React" onClick={() => bubble.current && onMenu(bubble.current)} className="pressable grid size-9 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink">
          <ReactGlyph k="laugh" size={18} />
        </button>
        <button type="button" aria-label="Reply" onClick={onReply} className="pressable grid size-9 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink">
          <ReplyGlyph />
        </button>
      </span>
    </div>
  );
}

// ── message menu: the thread dims, the line stays lit, reactions above, actions below (R6, CH02-CH03) ──────

function MessageMenu({
  menu, meId, reactions, onClose, onReact, onReply, onCopy, onReport,
}: {
  menu: NonNullable<MenuState>; meId: string | null; reactions: Record<string, string[]> | undefined;
  onClose: () => void; onReact: (k: ReactionKey) => void; onReply: () => void; onCopy: () => void; onReport?: () => void;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const parent = panel.current?.parentElement;
    if (parent) setH(parent.clientHeight);
    panel.current?.querySelector<HTMLElement>("[role^=menuitem]")?.focus();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onClose());
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  // the bar sits above the line; the actions below it, or above the bar when the line is low on screen
  const below = h ? h - menu.bottom > 190 : true;
  const side = menu.mine ? { right: menu.right } : { left: Math.max(8, menu.left) };
  const item = "pressable flex min-h-11 w-full items-center justify-between gap-s4 rounded-[12px] px-s3 text-left text-[16px] text-ink hover:bg-sunken";
  return (
    <motion.div className="absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_32%,transparent)]" onClick={onClose} aria-hidden />
      {/* the line itself, lifted above the dim */}
      <div aria-hidden className={cn("absolute max-w-[78%] rounded-[20px] px-[14px] py-[9px] text-[16px] leading-[22px] break-words whitespace-pre-wrap md:max-w-[72%]", menu.mine ? "bg-select text-on-select" : "bg-sunken text-ink")} style={{ top: menu.top, ...side }}>
        {menu.text}
      </div>
      <motion.div
        ref={panel}
        role="menu"
        aria-label="Message actions"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SNAPPY}
        className={cn("absolute flex w-[232px] flex-col gap-s2", menu.mine ? "items-end" : "items-start", menu.mine ? "origin-top-right" : "origin-top-left")}
        style={{ ...side, ...(below ? { top: Math.max(8, menu.top - 60) } : { bottom: Math.max(8, (h || 0) - menu.top + 8) }) }}
      >
        <div className={cn("flex items-center gap-0.5 rounded-full bg-lit p-1 shadow-[0_0_0_1px_var(--line),var(--shadow-float)]", !below && "order-2")}>
          {REACTIONS.map((k) => {
            const on = !!meId && (reactions?.[k] ?? []).includes(meId);
            return (
              <button key={k} type="button" role="menuitemcheckbox" aria-label={REACT_LABEL[k]} aria-checked={on} onClick={() => onReact(k)} className={cn("pressable grid size-11 place-items-center rounded-full", on ? "bg-select text-on-select" : "text-ink hover:bg-sunken")}>
                <ReactGlyph k={k} size={22} />
              </button>
            );
          })}
        </div>
        <div style={below ? { marginTop: menu.bottom - menu.top + 8 } : undefined} className={cn("w-[220px] rounded-[16px] bg-lit p-1 shadow-[0_0_0_1px_var(--line),var(--shadow-float)]", !below && "order-1")}>
          <button type="button" role="menuitem" onClick={onReply} className={item}>
            Reply <ReplyGlyph />
          </button>
          <button type="button" role="menuitem" onClick={onCopy} className={item}>
            Copy
          </button>
          {onReport && (
            <button type="button" role="menuitem" onClick={onReport} className={cn(item, "text-danger-text")}>
              Report <Icon name="flag" size={18} />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── a shared photo (pod memory with a picture) ──────────────────────────────────────────────────────────

function PhotoLine({ mem, mine, first, last, who, time }: { mem: Memory; mine: boolean; first: boolean; last: boolean; who: string; time: string }) {
  return (
    <div className={cn("flex items-end gap-s2", mine ? "justify-end" : "justify-start")}>
      {!mine && <span className="w-7 shrink-0">{last && <Face name={who} />}</span>}
      <figure className={cn("flex max-w-[68%] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && first && (
          <figcaption className="mb-1 flex items-baseline gap-s2 px-s3 text-[13px] leading-none">
            <span className="font-semibold text-ink-2">{who}</span>
            <span className="tabular text-ink-3">{time}</span>
          </figcaption>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, no optimisation to do */}
        <img src={mem.photo_url!} alt={mem.caption || `Photo from ${who}`} className="max-h-[320px] w-auto rounded-[18px] object-cover shadow-[inset_0_0_0_1px_var(--line)]" />
        {mem.caption && <span className={cn("mt-0.5 rounded-[18px] px-[14px] py-[8px] text-[16px] leading-[22px]", mine ? "bg-select text-on-select" : "bg-sunken text-ink")}>{mem.caption}</span>}
      </figure>
    </div>
  );
}

// ── events and cards inline (R8) ────────────────────────────────────────────────────────────────────────

function EventLine({ text, kind }: { text: string; kind: Message["kind"] }) {
  const again = kind === "run_it_back";
  if (kind === "system" && /locked/i.test(text))
    return (
      <p className="my-s1 flex justify-center">
        <span className="inline-flex items-center gap-s1 rounded-full bg-ink px-s3 py-1 text-[13px] font-semibold text-lit">
          <Icon name="locked" size={16} />
          {text}
        </span>
      </p>
    );
  return (
    <p className="mx-auto my-s1 max-w-[40ch] text-center text-[13px] leading-[1.45] text-ink-2">
      {again ? <span className="inline-flex items-center gap-s1 rounded-full bg-lit px-s3 py-1 font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line)]"><Icon name="again" size={16} />{text}</span> : text}
    </p>
  );
}

function CardShell({ eyebrow, children }: { eyebrow: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto my-s1 w-full max-w-[360px] rounded-[20px] bg-lit p-s4 shadow-[inset_0_0_0_1px_var(--line)]">
      <p className="flex items-center gap-s2 text-[12px] font-semibold tracking-[0.04em] text-ink-2 uppercase">{eyebrow}</p>
      {children}
    </div>
  );
}

function PlanLine({ id, text, minute, podId, onOpen }: { id: string | null; text: string; minute: number; podId: string; onOpen: (href: string) => void }) {
  const s = useDb(useCallback((db) => (id ? db.suggestions[id] : undefined), [id]));
  const venue = useDb(useCallback((db) => (s ? db.venues[s.venue_id] : undefined), [s]));
  const by = useDb(useCallback((db) => (s?.source === "member" && s.proposed_by ? firstName(db, s.proposed_by) : null), [s]));
  if (!s) return <EventLine text={text} kind="host" />;
  const p = s.plan_json;
  return (
    <CardShell eyebrow={by ? `Proposed by ${by}` : (<><span aria-hidden className="rounded-full bg-ink px-1.5 py-px text-[10px] text-lit">AI</span> Planned by AI</>)}>
      <p className="tabular mt-s2 text-[20px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink">
        {dayWord(s.starts_at, minute)}, {shortTime(s.starts_at)}
      </p>
      <p className="mt-1 text-[15px] leading-[1.35] text-ink-2">
        {activityWord(p.event)}
        {venue ? ` · ${venue.short_name ?? venue.name}` : ""}
        {p.cost ? ` · ${p.cost}` : ""}
      </p>
      <button type="button" onClick={() => onOpen(`/app/pods/${podId}/plan/${s.id}`)} className="pressable mt-s3 flex h-10 items-center rounded-full bg-sunken px-s4 text-[14px] font-semibold text-ink hover:bg-line">
        See plan
      </button>
    </CardShell>
  );
}

function CheckInLine({ hangoutId }: { hangoutId: string | null }) {
  const repo = useRepo();
  const mine = useDb(useCallback((db) => (hangoutId && db.me ? db.rsvps.find((r) => r.hangout_id === hangoutId && r.user_id === db.me) : undefined), [hangoutId]));
  const count = useDb(useCallback((db) => (hangoutId ? db.rsvps.filter((r) => r.hangout_id === hangoutId && r.checked_in).length : 0), [hangoutId]));
  const [busy, setBusy] = useState(false);
  if (!hangoutId) return null;
  const done = !!mine?.checked_in;
  return (
    <CardShell eyebrow="After the hangout">
      <p className="mt-s2 text-[18px] leading-[1.25] font-semibold text-ink">Did you make it?</p>
      <div className="mt-s3 flex items-center justify-between gap-s3">
        <span className="tabular text-[14px] text-ink-2">{count} checked in</span>
        {done ? (
          <span className="flex items-center gap-s1 text-[14px] font-semibold text-select">
            <Icon name="check" size={18} /> You&apos;re checked in
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await repo.checkIn(hangoutId);
              setBusy(false);
              if (!r.ok) notify.error("Not checked in. Try again.");
            }}
            className="pressable h-10 rounded-full bg-select px-s4 text-[14px] font-semibold text-on-select disabled:opacity-40"
          >
            Check in
          </button>
        )}
      </div>
    </CardShell>
  );
}

// ── polls and the round-two vote: counts as discs, never percentages (J #2) ─────────────────────────────

function Voters({ ids, names }: { ids: string[]; names: Record<string, string> }) {
  const me = useDb((db) => (db.me ? (db.users[db.me]?.first_name ?? "You") : "You"));
  if (!ids.length) return null;
  return (
    <span className="flex shrink-0 items-center" style={{ paddingLeft: 6 }}>
      {ids.slice(0, 4).map((id, i) => (
        <span key={id} className="rounded-full ring-2 ring-lit" style={{ marginLeft: -6, zIndex: 4 - i }}>
          <Face name={names[id] === "You" ? me : (names[id] ?? "?")} you={names[id] === "You"} size={22} />
        </span>
      ))}
      {ids.length > 4 && <span className="ml-1 text-[12px] text-ink-2">+{ids.length - 4}</span>}
    </span>
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
        "pressable flex min-h-12 w-full items-center gap-s3 rounded-[14px] px-s3 text-left text-[15px] disabled:cursor-default",
        on ? "bg-[color-mix(in_srgb,var(--select)_10%,var(--lit))] font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--select)]" : "bg-sunken text-ink",
      )}
    >
      <span aria-hidden className={cn("size-[18px] shrink-0 rounded-full", on ? "bg-select shadow-[inset_0_0_0_4px_var(--lit)] ring-[1.5px] ring-select" : "bg-lit ring-[1.5px] ring-line-2")} />
      <span className="min-w-0 flex-1">{label}</span>
      {children}
    </button>
  );
}

function PollLine({ pollId, names }: { pollId: string | null; hue: PodHueKey; names: Record<string, string> }) {
  const repo = useRepo();
  const meId = useDb((db) => db.me);
  const poll = useDb(useCallback((db) => (pollId ? db.polls[pollId] : undefined), [pollId]));
  if (!poll) return null;
  const tally = pollTally(poll, meId);
  const closed = poll.status !== "open";
  return (
    <CardShell eyebrow={closed ? "Poll · closed" : `Poll · ${names[poll.created_by] ?? "Member"}`}>
      <p className="mt-s2 text-[17px] leading-[1.3] font-semibold text-ink">{poll.question}</p>
      <div className="mt-s3 flex flex-col gap-s2">
        {tally.options.map((o) => {
          const voters = Object.entries(poll.votes).filter(([, opt]) => opt === o.id).map(([u]) => u);
          return (
            <Choice key={o.id} label={o.label} on={tally.mine === o.id} disabled={closed} onClick={() => void repo.votePoll(poll.id, o.id)}>
              <Voters ids={voters} names={names} />
            </Choice>
          );
        })}
      </div>
      <div className="mt-s3 flex min-h-6 items-center justify-between text-[13px] text-ink-2">
        <span className="tabular">{tally.total} voted</span>
        {!closed && poll.created_by === meId && (
          <button type="button" onClick={() => void repo.closePoll(poll.id)} className="pressable min-h-11 font-semibold text-ink underline underline-offset-4">
            Close poll
          </button>
        )}
      </div>
    </CardShell>
  );
}

function PollComposer({ onCancel, onPost }: { onCancel: () => void; onPost: (q: string, opts: string[]) => Promise<unknown> }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const ready = q.trim() && opts.filter((o) => o.trim()).length >= 2;
  const field = "h-11 w-full rounded-[14px] bg-sunken px-s4 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:shadow-[inset_0_0_0_1.5px_var(--select)]";
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
      <p className="pb-s1 text-[15px] font-semibold text-ink">New poll</p>
      <input autoFocus aria-label="Question" placeholder="Ask the pod" maxLength={120} value={q} onChange={(e) => setQ(e.target.value)} className={cn(field, "font-semibold")} />
      {opts.map((o, i) => (
        <input key={i} aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} maxLength={40} value={o} onChange={(e) => setOpts((p) => p.map((x, j) => (j === i ? e.target.value : x)))} className={field} />
      ))}
      <div className="flex items-center justify-between gap-s2 pt-s1">
        {opts.length < 4 ? (
          <button type="button" onClick={() => setOpts((p) => [...p, ""])} className="pressable min-h-11 text-[15px] font-semibold text-select">
            Add option
          </button>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-s2">
          <button type="button" onClick={onCancel} className="pressable min-h-11 rounded-full px-s4 text-[15px] font-semibold text-ink">
            Cancel
          </button>
          <button type="submit" disabled={!ready || busy} className="pressable h-11 rounded-full bg-select px-s6 text-[15px] font-semibold text-on-select disabled:opacity-30">
            Post
          </button>
        </span>
      </div>
    </form>
  );
}

function VoteLine({ view, minute, names }: { view: CardView | null; minute: number; hue: PodHueKey; names: Record<string, string> }) {
  const repo = useRepo();
  const vote = view?.vote;
  if (!vote || !view?.options.length) return null;
  const voted = Object.keys(vote.votes).length;
  return (
    <div data-vote>
    <CardShell eyebrow={<><Icon name="again" size={16} /> Same people, next time</>}>
      <p className="mt-s2 text-[17px] leading-[1.3] font-semibold text-ink">Pick a time.</p>
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
                  <span className="block text-[13px] font-normal text-ink-2">{activityWord(o.plan_json.event)}</span>
                </span>
              }
            >
              <Voters ids={voters} names={names} />
            </Choice>
          );
        })}
      </div>
      <p className="tabular mt-s3 text-[13px] text-ink-2">
        {voted} of {view.size} voted
      </p>
    </CardShell>
    </div>
  );
}
