// "New pod for you": the moment continuous placement surfaces a pod after you add a like or a community.
// One object, one choice: your dot drifts into the pod's circle (the "moving together" signature, BRAND §1: the dot is
// the person), the pod's name, one line of facts, Join (the one filled primary) or Not now. Solid surface, clear edge,
// no glass (founder 2026-10-28: "bubbles too transparent").
// References (INTERESTS.md): Discord invite (one name, one count, Accept / No thanks), Strava club card (name + count
// + Join), Hinge Signals sheet (one filled action over a quiet text dismiss). Left: Discord's member/online stats,
// Strava's list of many, every badge.
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button, notify } from "@/components/ui";
import { POD_SOLID, type PodHueKey } from "@/components/brand/disc";
import "@/components/brand/pod-sphere.css";
import { Icon } from "@/components/icons";
import { useDb, useRepo } from "@/lib/db/hooks";
import { cardView } from "@/lib/planner/card-state";
import { useClock } from "@/lib/time/clock";
import { roomTables, shortDay, shortTime } from "@/components/pods/model";
import type { PodMatch } from "@/lib/types";
import { openMatches } from "@/lib/placement/matches";
import { cn } from "@/lib/cn";

const GENTLE = { type: "spring", stiffness: 170, damping: 26 } as const;
const SNAPPY = { type: "spring", stiffness: 420, damping: 32 } as const;

/** The pod's circle with its people as white dots and you arriving as the ink dot. `joined` settles you in. */
export function MatchMark({ hue, people, size = 72, joined = false }: { hue: PodHueKey; people: number; size?: number; joined?: boolean }) {
  const reduce = useReducedMotion();
  const n = Math.max(3, Math.min(9, people - 1));
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size * 1.2, height: size }}>
      <motion.span
        className="pod-sphere absolute top-0 right-0"
        style={{ ["--ps" as string]: `${size}px`, ["--ps-h" as string]: POD_SOLID[hue] }}
        initial={reduce ? false : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={GENTLE}
      >
        {Array.from({ length: n }, (_, d) => {
          const a = -Math.PI / 2 + ((d + 1) / (n + 1)) * Math.PI * 2;
          return (
            <motion.span
              key={d}
              className="absolute z-[1] block rounded-full bg-white shadow-[0_1px_2px_rgb(22_12_58/.3)]"
              style={{ width: "11%", height: "11%", left: `${50 + Math.cos(a) * 31}%`, top: `${50 + Math.sin(a) * 31}%`, x: "-50%", y: "-50%" }}
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...SNAPPY, delay: 0.15 + d * 0.04 }}
            />
          );
        })}
      </motion.span>
      {/* you: arrive from outside, settle into the open seat at the top of the circle once you join */}
      <motion.span
        className="absolute block rounded-full shadow-[0_0_0_2px_var(--lit)]"
        style={{ backgroundColor: "var(--you)", width: size * 0.2, height: size * 0.2, top: size * 0.4, left: 0 }}
        initial={reduce ? false : { x: -size * 0.3, opacity: 0 }}
        animate={joined ? { x: size * 0.6, y: -size * 0.31, opacity: 1 } : reduce ? { x: size * 0.06, opacity: 1 } : { x: [-size * 0.3, size * 0.12, size * 0.06], opacity: [0, 1, 1] }}
        transition={joined ? SNAPPY : { duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1], times: [0, 0.7, 1] }}
      />
    </span>
  );
}

export interface NewPodCardProps {
  match: PodMatch;
  /** "page" on Home (bigger, with the overline), "inline" inside a sheet. */
  variant?: "page" | "inline";
  className?: string;
  /** Called after Not now (the card should leave). */
  onSkipped?: () => void;
  /** Called after Join succeeds (with the pod id). */
  onJoined?: (podId: string) => void;
}

/** One match, Join or Not now. After Join it stays as "You're in" with a way into the pod. */
export function NewPodCard({ match, variant = "page", className, onSkipped, onJoined }: NewPodCardProps) {
  const repo = useRepo();
  const router = useRouter();
  const reduce = useReducedMotion();
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const [busy, setBusy] = useState<"join" | "skip" | null>(null);
  const [joined, setJoined] = useState<string | null>(match.status === "joined" ? match.pod_id : null);
  // The colour the pod will wear in Your pods (Home assigns by place: first interest pod blue, second ember, community
  // green), so the circle that arrives here is the same circle you find there.
  const hue = useDb(
    useCallback(
      (db): PodHueKey => {
        if (match.kind !== "interest") return "grove";
        const placed = roomTables(db, minute).find((t) => t.row.pod.id === (joined ?? match.pod_id));
        if (placed) return placed.hue as PodHueKey;
        const live = db.memberships.filter((m) => m.user_id === db.me && !m.left_at && m.activation === "active" && db.pods[m.pod_id]?.type === "interest").length;
        return live + 1 === 2 ? "signal" : "ember";
      },
      [match.kind, match.pod_id, joined, minute],
    ),
  );
  const when = useDb(
    useCallback(
      (db) => {
        const podId = joined ?? match.pod_id;
        if (!db.pods[podId]) return null;
        const v = cardView(db, podId, minute);
        const at = v?.hangout?.starts_at ?? v?.suggestion?.plan_json.starts_at;
        return at ? `${shortDay(at, minute)} ${shortTime(at)}` : null;
      },
      [joined, match.pod_id, minute],
    ),
  );
  const facts = [match.kind === "interest" ? match.label.split(/ & | and /)[0] : null, `${match.size} people`, when].filter(Boolean).join(" · ");

  async function join() {
    setBusy("join");
    const r = await repo.joinPodMatch(match.id);
    setBusy(null);
    if (!r.ok) {
      notify.error(r.error.message ?? "Couldn’t join. Try again.");
      return;
    }
    setJoined(r.data.podId);
    onJoined?.(r.data.podId);
  }
  async function skip() {
    setBusy("skip");
    await repo.skipPodMatch(match.id);
    setBusy(null);
    onSkipped?.();
  }

  const page = variant === "page";
  return (
    <motion.article
      layout={reduce ? false : "position"}
      aria-label={joined ? `You're in ${match.pod_name}` : `New pod for you: ${match.pod_name}`}
      data-new-pod={match.id}
      className={cn(
        "relative w-full min-w-0 rounded-[28px] border border-line bg-lit shadow-[0_1px_0_rgb(255_255_255/.8)_inset,0_18px_40px_-28px_rgb(14_26_34/.45)]",
        page ? "max-w-[440px] p-s6" : "p-s4",
        className,
      )}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
      transition={GENTLE}
    >
      <div className="flex items-center gap-s4">
        <MatchMark hue={hue} people={match.size} size={page ? 72 : 56} joined={!!joined} />
        <div className="min-w-0 flex-1">
          <p className="text-overline text-ink-2">{joined ? "You’re in" : "New pod for you"}</p>
          <p className={cn("truncate font-semibold tracking-[-0.02em] text-ink", page ? "text-[22px] leading-[1.2]" : "text-[19px] leading-[1.2]")}>{match.pod_name}</p>
          <p className="tabular mt-1 text-label text-ink-2 [text-wrap:balance]">{facts}</p>
        </div>
      </div>
      {match.note && !joined && <p className="mt-s3 text-label text-ink-2">{match.note}</p>}
      <AnimatePresence mode="wait" initial={false}>
        {joined ? (
          <motion.div key="in" className={cn("flex items-center", page ? "mt-s6" : "mt-s4")} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={SNAPPY}>
            <Link
              href={`/app/pods/${joined}`}
              onClick={(e) => {
                e.preventDefault();
                router.push(`/app/pods/${joined}`);
              }}
              className="pressable inline-flex min-h-11 items-center gap-s2 text-[16px] font-semibold text-ink underline decoration-select/40 decoration-[1.5px] underline-offset-[5px] outline-offset-2"
            >
              Open {match.pod_name}
              <Icon name="arrow" size={20} />
            </Link>
          </motion.div>
        ) : (
          <motion.div key="ask" className={cn("flex items-center gap-s3", page ? "mt-s6" : "mt-s4")} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            <Button size={page ? "md" : "sm"} loading={busy === "join"} disabled={!!busy} onClick={join}>
              Join
            </Button>
            <Button size={page ? "md" : "sm"} variant="ghost" disabled={!!busy} onClick={skip}>
              Not now
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

/**
 * Home's "New pod for you": the newest open match (or the one a notification linked to with ?match=), one at a time.
 * A second match waits behind the first ("1 more" under it), so Home never stacks cards.
 */
export function NewPodsOnHome({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const open = useDb(useCallback((db) => openMatches(db, db.me), []));
  const [linked] = useState(() => {
    try {
      return typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("match") : null;
    } catch {
      return null;
    }
  });
  // keep the card on screen after Join so "You're in" can show; it leaves when Home re-renders without it
  const [shown, setShown] = useState<PodMatch | null>(null);
  const first = open.find((m) => m.id === linked) ?? open[0] ?? null;
  const current = shown && (shown.id === first?.id || !open.some((m) => m.id === shown.id)) ? shown : first;
  const rest = current ? open.filter((m) => m.id !== current.id).length : 0;
  return (
    <section aria-label="New pod for you" className={cn("w-full min-w-0 empty:hidden", className)} onPointerDownCapture={() => setShown(current)} onKeyDownCapture={() => setShown(current)}>
      <AnimatePresence mode="popLayout" initial={!reduce}>
        {current && <NewPodCard
          key={current.id}
          match={current}
          onSkipped={() => setShown(null)}
          // "You're in" holds for a beat, then the card leaves: the pod itself now sits in Your pods below
          onJoined={() => window.setTimeout(() => setShown(null), 2600)}
        />}
      </AnimatePresence>
      {rest > 0 && <p className="mt-s3 pl-s2 text-label text-ink-2">{rest} more after this</p>}
    </section>
  );
}
