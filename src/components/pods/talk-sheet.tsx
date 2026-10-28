// Talk (V3_SPEC §6.3, wireframes S03-S05): a full-height sheet over the table, never a page and never home
// (founder R1 #3). Opened by tapping the table or its centre cue.
//   header   the pod's people as overlapping discs (you ink first) and the pod name, bold
//   lines    one line each: the sender's disc (their own colour) and the text on a light cool grey. Yours sit right on
//            the plan blue (--select) with white text (COLOR_LIFE §10.1; teal is safety only). No timestamp on every line: a run from one person within 5 minutes shares one disc, and a quiet time
//            label only marks a new day (PB 8; CM chat counterexamples).
//   input    a 56px pill, "Say something", with the send glyph (44px target)
// States: empty "Say hi.", not sent "Not sent · Retry" inline, offline (sends when back), paused.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DiscStack, SNAPPY, type PodHueKey } from "@/components/brand";
import { personColor } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { clientId as newClientId } from "@/lib/ids";
import { useDb, useRepo } from "@/lib/db/hooks";
import { podMembers } from "@/lib/db/selectors";
import { isChatPaused, myBlockedIds } from "@/lib/safety/selectors";
import { nowISO, useClock } from "@/lib/time/clock";
import { formatDayDivider } from "@/lib/time/format";
import type { Message } from "@/lib/types";
import { firstName } from "./model";
import { useLastRead } from "./use-last-read";

const RUN_MS = 5 * 60_000;
/** The city lives in the pitch, not the product: host lines that name it lose that sentence (product rule 5). */
const CITY = /\b(Huntsville|Alabama|Madison|Decatur|AAMU|Rocket City)\b/i;

type Line = Message;

export function TalkSheet({ open, onOpenChange, podId, podName, hue }: { open: boolean; onOpenChange: (o: boolean) => void; podId: string; podName: string; hue: PodHueKey }) {
  const repo = useRepo();
  const reduce = useReducedMotion();
  const { mark } = useLastRead();
  const now = useClock();
  const meId = useDb((db) => db.me);
  const stored = useDb(useCallback((db) => db.messages[podId] ?? [], [podId]));
  const names = useDb(
    useCallback((db) => {
      const out: Record<string, string> = {};
      for (const m of podMembers(db, podId)) out[m.user_id] = firstName(db, m.user_id);
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
  const end = useRef<HTMLDivElement>(null);
  const opened = useRef<Set<string> | null>(null);

  const lines = useMemo(() => {
    const ids = new Set(stored.map((m) => m.client_id).filter(Boolean));
    const all: Line[] = [...stored, ...pending.filter((p) => !ids.has(p.client_id))];
    return all
      .filter((m) => m.kind === "text" || m.kind === "host")
      .filter((m) => !(m.user_id && blocked.includes(m.user_id)))
      .map((m): Line => (m.kind === "host" && CITY.test(m.text) ? { ...m, text: m.text.split(/(?<=[.!?])\s+/).filter((s) => !CITY.test(s)).join(" ") } : m))
      .filter((m) => m.text.trim());
  }, [stored, pending, blocked]);

  // Only lines that arrive while Talk is open animate in.
  if (open && opened.current === null) opened.current = new Set(lines.map((l) => l.id));
  if (!open && opened.current) opened.current = null;

  useEffect(() => {
    if (!open) return;
    const last = stored[stored.length - 1];
    if (last) mark(podId, last.created_at);
    const t = setTimeout(() => void end.current?.scrollIntoView({ block: "end" }), 40);
    return () => clearTimeout(t);
  }, [open, stored, lines.length, mark, podId]);

  async function send(body: string, cid = newClientId()) {
    const optimistic: Line = { id: `pending:${cid}`, pod_id: podId, user_id: meId, text: body, created_at: nowISO(), kind: "text", ref_id: null, client_id: cid, pinned: false, delivery: "sending" };
    setPending((p) => [...p.filter((x) => x.client_id !== cid), optimistic]);
    const r = await repo.sendMessage(podId, body, cid);
    if (r.ok) setPending((p) => p.filter((x) => x.client_id !== cid));
    else setPending((p) => p.map((x) => (x.client_id === cid ? { ...x, delivery: "failed" } : x)));
  }

  // offline: resend what failed once the connection is back
  useEffect(() => {
    const on = () => pending.filter((p) => p.delivery === "failed").forEach((p) => void send(p.text, p.client_id!));
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  });

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      className="h-[92dvh] md:h-[calc(100dvh-48px)]"
      title={
        <span className="flex items-center gap-s4">
          <DiscStack size={36} max={4} people={people.map((p) => ({ initial: p.name.slice(0, 1).toUpperCase(), tone: p.you ? "you" : hue, seed: p.name }))} />
          <span className="truncate">{podName}</span>
        </span>
      }
      footer={
        <form
          className="flex w-full items-center"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t || paused) return;
            setText("");
            void send(t);
          }}
        >
          <label className="relative flex h-14 w-full items-center rounded-full bg-paper shadow-[inset_0_0_0_1.5px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--select)]">
            <span className="sr-only">Message {podName}</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={paused}
              maxLength={500}
              placeholder={paused ? "Talk is paused" : "Say something"}
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
        </form>
      }
    >
      <div className="flex min-h-full flex-col justify-end gap-s3 pb-s2" role="log" aria-live="polite" aria-label={`${podName} talk`}>
        {!lines.length && <p className="pb-s8 font-display text-[32px] leading-none font-bold tracking-[-0.03em] text-ink-2">Say hi.</p>}
        {lines.map((m, i) => {
          const prev = lines[i - 1];
          const t = Date.parse(m.created_at);
          const gap = !prev || formatDayDivider(prev.created_at, now) !== formatDayDivider(m.created_at, now);
          const run = !!prev && !gap && prev.user_id === m.user_id && prev.kind === m.kind && t - Date.parse(prev.created_at) < RUN_MS;
          const mine = m.user_id === meId && m.kind === "text";
          const fresh = !!opened.current && !opened.current.has(m.id) && !reduce;
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
                ) : mine ? (
                  <div className="flex flex-col items-end">
                    <p className="max-w-[80%] rounded-[22px] rounded-br-md bg-select px-4 py-2.5 text-[17px] leading-[1.4] text-on-select">
                      {m.text}
                    </p>
                    {m.delivery === "failed" && (
                      <button type="button" onClick={() => void send(m.text, m.client_id ?? undefined)} className="mt-1 min-h-11 text-label text-ink underline underline-offset-4">
                        Not sent · Retry
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-s3">
                    <span
                      aria-hidden
                      className="mt-1 grid size-8 shrink-0 place-items-center rounded-full font-display text-[15px] leading-none font-bold"
                      style={run ? undefined : { background: personColor(names[m.user_id ?? ""]).bg, color: personColor(names[m.user_id ?? ""]).fg }}
                    >
                      {run ? "" : (names[m.user_id ?? ""] ?? "").slice(0, 1).toUpperCase()}
                    </span>
                    <p className="min-w-0 max-w-[80%] rounded-[22px] rounded-bl-md bg-sunken px-4 py-2.5 text-[17px] leading-[1.4] text-ink">
                      <span className="sr-only">{names[m.user_id ?? ""] ?? "Member"}: </span>
                      {m.text}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
    </ResponsiveSheet>
  );
}
