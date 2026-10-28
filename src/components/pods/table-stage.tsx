// What sits on a pod's table, by phase (V3_SPEC §6.3-6.4; template anatomy B; wireframes D02-D06, E01-E06).
//
// SEAM: this is the one file where the plan meets the page. Core draws the plan as wireframe D03 (head, table, foot)
// with the kit (Line, TableRing) and planner_loop's hook (usePlanActions), so the table works today. planner_loop's
// components (PlanLine, LockMoment, OptionRing, the repeat cards) replace the pieces below one by one, without
// touching the page around them (pod-table.tsx). The repeat loop already renders planner_loop's components.
//
// D03  the plan card at the top, in the halo (beat 4): "Hoopers #1" / "Saturday, 10am." / activity / place · cost /
//      "◐ Planned by AI". One target: it opens the plan (beat 5).
//      table: every seat in the pod (8); the first 4 are the lock arc; your disc waits outside; the Talk cue in the centre
//      foot <InCount> "3 of 8 in" → "4 of 8 in" + "Locked" (beat 6)   [I'm in]
// D05  the 4th yes: the room goes dark, one lamp, the day word as large as fits; stays until "See you there".
// D06  locked: clear light, the table tinted, "4 going" · Add to calendar.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GENTLE, InCount, Line, PlanHalo, Shared, Stage, TableRing, sharedName, tableBox, type PodHueKey, type Seat, type StageLight } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { HangoutCard } from "@/components/planner/hangout-card";
import { downloadIcs } from "@/components/planner/plan-utils";
import { usePlanActions } from "@/components/planner/use-plan-actions";
import { useDb } from "@/lib/db/hooks";
import { cardView, type CardView } from "@/lib/planner/card-state";
import { useClock } from "@/lib/time/clock";
import { BallotCard, CheckInCard, CheckInSheet } from "./check-in-card";
import { RunItBackCard } from "./run-it-back-card";
import { RoundTwo } from "./round-two";
import { dayWord, firstName, hoursTogether, shortTime } from "./model";
import { usePodTable, zoomHandoff, type PodTableApi } from "./table-context";

export interface Stagecraft {
  light: StageLight;
  head: ReactNode;
  object: ReactNode;
  foot: ReactNode;
  /** the moment (D05) covers the page, chrome included */
  overlay?: ReactNode;
  /** overline for Talk and the menu title: "Hoopers #1" */
  title: string;
  view: CardView | null;
}

/** Who made the plan, in one label (the AI is named here and nowhere else on the card; founder: "AI", not "Claude"). */
export function sourceLine(source: string | null | undefined): string {
  return source === "fallback" ? "Planned from free times" : source === "member" ? "Proposed in the pod" : "Planned by AI";
}

const LOOP = new Set(["check_in", "ballot", "waiting_reveal", "planning_next", "vote", "missed"]);

/** "Pickup basketball, rotating 5-on-5 games" → "Pickup basketball" (the activity, as a label). */
function activityWord(event: string) {
  const w = event.split(/[,:;(—–]/)[0].trim();
  return w.length > 28 ? `${w.slice(0, 27).trimEnd()}…` : w;
}

/** Venue names step down to the place word ("Brahan Spring Rec Center" → "Brahan Spring"), T5. */
function placeWord(name: string) {
  return name.replace(/\s+(Rec(reation)? Center|Community Center|Public Library|Library|Park|Center|Courts?)$/i, "").trim() || name;
}

export function useTableStage(podId: string, name: string, hue: PodHueKey, api?: PodTableApi | null): Stagecraft {
  const now = useClock(15_000);
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const view = useDb(useCallback((db) => cardView(db, podId, minute), [podId, minute]));
  const actions = usePlanActions(podId);
  const ctx = usePodTable();
  const table = api ?? ctx;
  const meInitial = useDb((db) => (db.me ? (db.users[db.me]?.first_name ?? "").slice(0, 1).toUpperCase() : ""));
  const going = useDb(
    useCallback((db) => (view?.going ?? []).filter((id) => id !== db.me).map((id) => ({ id, name: firstName(db, id) })), [view?.going]),
  );
  const hours = useDb((db) => hoursTogether(db, podId));
  // hangouts held at this table: the table's wash deepens and wears one ring per hangout (COLOR_LIFE §6.3)
  const held = useDb(
    useCallback((db) => Object.values(db.hangouts).filter((h) => h.pod_id === podId && h.status !== "cancelled" && Date.parse(h.ends_at) <= minute).length, [podId, minute]),
  );
  const worn = Math.min(3, held + 1);
  const [moment, setMoment] = useState(false);
  const [sheetFor, setSheetFor] = useState<string | null>(null);

  // D05: the 4th yes while you are here turns the lights off.
  const wasLocked = useRef<boolean | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const locked = !!view?.locked && (view.phase === "locked" || view.phase === "starting_soon");
    const prev = wasLocked.current;
    wasLocked.current = locked;
    if (prev === false && locked) {
      // beat 6 first: "3 of 8" ticks to "4 of 8" and "Locked" lands on the card, then the lights go down
      lockTimer.current = setTimeout(() => setMoment(true), 1600);
    }
  }, [view?.locked, view?.phase]);
  useEffect(() => () => clearTimeout(lockTimer.current), []);

  // Round two: a vote watched on this table that closes with a winner.
  const openVote = view?.vote ?? null;
  const [watchedId, setWatchedId] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the store
    if (openVote && openVote.id !== watchedId) setWatchedId(openVote.id);
  }, [openVote, watchedId]);
  const closed = useDb((db) => (watchedId ? db.votes[watchedId] : undefined));
  const winner = useDb((db) => (closed?.winner_id ? Object.values(db.hangouts).find((h) => h.suggestion_id === closed.winner_id) : undefined));
  const winnerGoing = useDb((db) => (winner ? db.rsvps.filter((r) => r.hangout_id === winner.id && r.status === "going").length : 0));
  const [round2, setRound2] = useState<{ startsAt: string; going: number; round: number } | null>(null);
  useEffect(() => {
    if (closed?.status === "closed" && winner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the store
      setRound2({ startsAt: winner.starts_at, going: winnerGoing, round: winner.sequence });
      setWatchedId(null);
    }
  }, [closed, winner, winnerGoing]);

  const round = view?.round ?? 1;
  const title = `${name} #${round}`;
  const r2 = round2 && <RoundTwo open onClose={() => setRound2(null)} startsAt={round2.startsAt} going={round2.going} hours={hours} round={round2.round} />;

  if (!view) return { light: "paper", head: <Line>{name}.</Line>, object: null, foot: null, title, view };

  // ── the repeat loop and live planning: planner_loop's components, framed by the page ──
  if (actions.genKind || LOOP.has(view.phase)) {
    const h = view.lastHangout;
    let card: ReactNode;
    if (actions.genKind) card = <HangoutCard podId={podId} />;
    else if (view.phase === "check_in" && h) card = <CheckInCard hangout={h} podName={name} ended={now.getTime() >= Date.parse(h.ends_at)} onWent={() => setSheetFor(h.id)} />;
    else if (view.phase === "ballot" && h) card = <BallotCard hangout={h} />;
    else if (view.phase === "waiting_reveal") card = <RunItBackCard revealed={null} />;
    else if (view.phase === "missed") card = <p className="font-display text-[32px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">See you at the next one.</p>;
    else card = <HangoutCard podId={podId} />;
    const after = view.phase === "check_in" || view.phase === "ballot" || view.phase === "waiting_reveal";
    return {
      light: actions.genKind || view.phase === "vote" || view.phase === "planning_next" ? "dawn" : after ? "dusk" : "paper",
      head: <p className="text-overline text-ink-2">{title}</p>,
      object: (
        <div className="w-full max-w-[520px] self-center">
          {card}
          {h && sheetFor === h.id && <CheckInSheet hangout={h} mode="went" onClose={() => setSheetFor(null)} onMissed={() => undefined} />}
          {r2}
        </div>
      ),
      foot: null,
      title,
      view,
    };
  }

  // ── the plan on the table (D02-D06) ──
  const s = view.suggestion;
  const venue = view.venue;
  const locked = view.locked;
  // every seat in the pod (6 to 10); the first `threshold` seats are the lock arc (COLOR_LIFE §13)
  const n = Math.min(10, Math.max(view.threshold, view.size));
  const others = going.slice(0, n - 1);
  const seats: (Seat | null)[] = [
    { initial: meInitial, name: "you", in: view.imIn },
    ...others.map((p) => ({ initial: p.name.slice(0, 1).toUpperCase(), name: p.name, in: true })),
    ...Array.from({ length: Math.max(0, n - 1 - others.length) }, () => ({ open: true })),
  ];
  const count = view.going.length;
  const need = Math.max(0, view.threshold - count);
  const startsAt = view.hangout?.starts_at ?? s?.plan_json.starts_at ?? null;
  const live = view.phase === "happening_now";

  const center = (
    <span className="flex items-center gap-s1 text-select">
      <Icon name="talk" size={26} />
      {table && table.unread > 0 && (
        <span className="fig grid h-6 min-w-6 place-items-center rounded-full bg-select px-1.5 text-[13px] font-semibold text-on-select">{table.unread}</span>
      )}
    </span>
  );

  const object = (
    <FitTable podId={podId}>
      {(size) => (
        <Shared name={sharedName.pod(podId)}>
        <TableRing
          size={size}
          seats={seats}
          n={n}
          hue={hue}
          fill={locked}
          worn={worn}
          dim={view.phase === "empty" || view.phase === "pending_review"}
          center={center}
          onClick={table?.openTalk}
          label={table && table.unread ? `Talk, ${table.unread} new` : "Talk"}
        />
        </Shared>
      )}
    </FitTable>
  );

  if (view.phase === "empty" || view.phase === "pending_review" || !s || !startsAt) {
    const review = view.phase === "pending_review";
    return {
      light: "paper",
      head: (
        <>
          <p className="text-overline text-ink-2">{title}</p>
          <Line className="mt-s2">{review ? "Almost planned." : "Nothing planned yet."}</Line>
        </>
      ),
      object,
      foot: review ? (
        <p className="text-label text-ink-2">We&apos;ll text you.</p>
      ) : (
        <>
          <span className="text-label text-ink-2">Takes a minute</span>
          <Button size="xl" onClick={() => void actions.planNow()}>
            Plan one
          </Button>
        </>
      ),
      title,
      view,
    };
  }

  const place = venue ? placeWord(venue.short_name ?? venue.name) : null;
  const longPlace = (place?.length ?? 0) > 13;
  const day = dayWord(startsAt, minute);
  const whyHref = `/app/pods/${podId}/plan/${s.id}`;

  // Beat 4: the plan is a card at the top of the table, wearing the halo (logo hues, one lap, then a slow drift;
  // still and blue once locked). The whole card is one target: it opens the plan (beat 5). Facts only:
  // activity · day, time · place · cost. The AI is named once, on the card's last line.
  const activity = activityWord(s.plan_json.event || s.summary);
  const placeName = venue ? (venue.short_name ?? venue.name) : null;
  const cost = (s.plan_json.cost ?? "").trim();
  const head = (
    <Shared name={sharedName.plan(s.id)}>
      <PlanHalo state={locked ? "locked" : "waiting"} radius={24} className="w-full max-w-[440px]">
        <Link
          href={whyHref}
          aria-label={`${activity}, ${day} ${shortTime(startsAt)}${placeName ? `, ${placeName}` : ""}${cost ? `, ${cost}` : ""}. Open the plan.`}
          className="pressable glass block rounded-[24px] px-s6 pt-s4 pb-s4 outline-offset-4"
        >
          <span className="block text-overline text-ink-2">{live ? `${title} · now` : title}</span>
          <span className="mt-s2 block font-display text-[clamp(34px,10vw,44px)] leading-[1] font-semibold tracking-[-0.03em] text-ink tabular">
            {day}, {shortTime(startsAt)}.
          </span>
          <span className="mt-s3 block text-[17px] leading-[1.35] font-semibold text-ink">{activity}</span>
          <span className="block text-[17px] leading-[1.35] text-ink-2">
            {[longPlace ? place : placeName, cost].filter(Boolean).join(" · ")}
          </span>
          <span className="mt-s3 flex items-center gap-s2 text-label text-ink-2">
            <Icon name="why" size={18} className="text-select" />
            <span className="flex-1">{sourceLine(s.source)}</span>
            <Icon name="arrow" size={20} className="text-ink" />
          </span>
        </Link>
      </PlanHalo>
    </Shared>
  );

  let foot: ReactNode;
  if (locked) {
    foot = (
      <>
        <InCount n={count} of={view.size} locked className="text-[17px] whitespace-nowrap text-ink" />
        <Button
          variant={view.imIn ? "secondary" : "spark"}
          size="xl"
          onClick={() =>
            view.imIn
              ? downloadIcs({ id: view.hangout?.id ?? s.id, title: s.summary, starts_at: startsAt, ends_at: view.hangout?.ends_at ?? s.plan_json.ends_at, venue })
              : void actions.rsvp(view.targetId!, "going", { when: startsAt })
          }
        >
          {view.imIn ? "Add to calendar" : "I'm in"}
        </Button>
      </>
    );
  } else if (view.imIn) {
    foot = (
      <>
        <InCount n={count} of={view.size} className="text-[17px] whitespace-nowrap text-ink" />
        <Button variant="secondary" size="xl" onClick={table?.openTalk}>
          Talk
        </Button>
      </>
    );
  } else {
    foot = (
      <>
        {count === 0 ? <span className="text-[17px] text-ink">Be the first in</span> : <InCount n={count} of={view.size} className="text-[17px] whitespace-nowrap text-ink" />}
        <Button size="xl" variant="spark" loading={actions.busy} onClick={() => view.targetId && void actions.rsvp(view.targetId, "going", { when: startsAt, silent: need <= 1 })}>
          I&apos;m in
        </Button>
      </>
    );
  }

  const overlay = moment ? (
    <LockMoment
      day={day}
      when={`${shortTime(startsAt)}${place ? ` · ${place}` : ""}`}
      seats={seats.map((st) => (st && st.open ? null : st))}
      n={n}
      hue={hue}
      worn={worn}
      onDone={() => setMoment(false)}
    />
  ) : null;

  return { light: locked || live ? "clear" : "dawn", head, object, foot, overlay, title, view };
}

/** Sizes the table to the space the page gives the object (phone and laptop are two layouts). */
function FitTable({ podId, children }: { podId: string; children: (size: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const reduce = useReducedMotion();
  // grown from the Room: keep growing, then settle
  const [fromRoom] = useState(() => zoomHandoff.podId === podId);
  useEffect(() => {
    if (zoomHandoff.podId === podId) zoomHandoff.podId = null;
  }, [podId]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      // box = 1.34 × size + 40, plus your waiting disc below (0.17 × size + 10)
      const byH = (height - 50) / 1.51;
      const byW = (width - 40) / 1.34;
      setSize(Math.round(Math.max(140, Math.min(width >= 600 ? 400 : 260, byH, byW))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="grid h-full min-h-[300px] w-full place-items-center">
      {size > 0 && (
        <motion.div
          style={{ width: tableBox(size) }}
          initial={fromRoom && !reduce ? { scale: 1.35, opacity: 0.4 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={GENTLE}
        >
          {children(size)}
        </motion.div>
      )}
    </div>
  );
}

/** D05: the room goes dark, one lamp on the table, the day word set as large as fits (never cropped: "Wednesday"
 *  fits at 390). Stays until tapped. Phone: "It's on." top-left, the table in the lamp pool, the day, the foot.
 *  Laptop: the text column on the left (line, day, foot), the table in the lamp pool on the right (PB 1.1). */
function LockMoment({ day, when, seats, n, hue, worn, onDone }: { day: string; when: string; seats: (Seat | null)[]; n: number; hue: PodHueKey; worn: number; onDone: () => void }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal
        aria-label="It's on"
        className="fixed inset-0 z-overlay overflow-hidden bg-night text-lamp"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.16 : 0.7 }}
      >
        <Stage light="night" />
        <div className="mx-auto grid h-full max-w-[1440px] grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto_auto] px-gutter pt-[calc(env(safe-area-inset-top)+76px)] lg:grid-cols-[520px_minmax(0,1fr)] lg:grid-rows-[auto_1fr_auto] lg:gap-x-s24 lg:px-s16 lg:pt-[160px] lg:pb-s16">
          <p className="font-display text-[32px] leading-none font-semibold tracking-[-0.03em] lg:col-start-1 lg:row-start-1">It&apos;s on.</p>
          <motion.div
            className="relative grid place-items-center lg:col-start-2 lg:row-span-3 lg:row-start-1"
            initial={reduce ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...GENTLE, delay: reduce ? 0 : 0.15 }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-[-20%]" style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--lamp) 16%, transparent), transparent)" }} />
            <span className="lg:hidden">
              <TableRing size={200} seats={seats} n={n} hue={hue} worn={worn} fill night youWaiting={false} />
            </span>
            <span className="hidden lg:block">
              <TableRing size={340} seats={seats} n={n} hue={hue} worn={worn} fill night youWaiting={false} />
            </span>
          </motion.div>
          <motion.p
            aria-hidden
            className="font-display self-end text-[16vw] leading-[0.9] font-semibold tracking-[-0.035em] whitespace-nowrap text-lamp lg:col-start-1 lg:row-start-2 lg:text-[min(6.2vw,88px)]"
            initial={reduce ? false : { x: 160, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...GENTLE, delay: reduce ? 0 : 0.45 }}
          >
            {day}
          </motion.p>
          <div className="flex min-h-[120px] items-center justify-between gap-s4 pt-s8 pb-[calc(32px+env(safe-area-inset-bottom))] lg:col-start-1 lg:row-start-3 lg:min-h-0 lg:flex-row-reverse lg:justify-end lg:gap-s8 lg:pt-s12 lg:pb-0">
            <span className="text-[17px] lg:text-[20px]">{when}</span>
            <Button variant="glass" size="xl" onClick={onDone} autoFocus>
              See you there
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
