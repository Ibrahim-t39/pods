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
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LockMoment } from "@/components/planner/table/lock-moment";
import { InCount, Line, Shared, sharedName, type PodHueKey, type Seat, type StageLight } from "@/components/brand";
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
import { WhoIn } from "./who-in";
import { RoundTwo } from "./round-two";
import { dayWord, firstName, hoursTogether, shortTime } from "./model";
import { usePodTable, type PodTableApi } from "./table-context";

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
  // the plan card has room for two lines: cut at a word, never mid-word ("a slow loop arou…")
  const w = event.split(/[,:;(—–]/)[0].trim();
  if (w.length <= 48) return w;
  const cut = w.slice(0, 48);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 20)).trimEnd()}…`;
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
      // the vote card carries its own "Same people · hangout #N" line; one label, not two
      head: view.phase === "vote" && !actions.genKind ? null : <p className="text-overline text-ink-2">{`Hangout #${round}`}</p>,
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

  const whoIn = (
    <Shared name={sharedName.pod(podId)}>
      <WhoIn seats={seats} hue={hue} count={count} need={need} locked={locked} onMembers={table?.openMembers} className="h-full" />
    </Shared>
  );

  if (view.phase === "empty" || view.phase === "pending_review" || !s || !startsAt) {
    const review = view.phase === "pending_review";
    return {
      light: "paper",
      head: (
        <PlanCard
          top={
            <div className="px-s5 pt-s5 pb-s4">
              <span className="block text-overline text-ink-2">{title}</span>
              <span className="mt-s2 block font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] text-ink">{review ? "Almost planned." : "Nothing planned yet."}</span>
              <span className="mt-s2 block text-[15px] leading-[1.4] text-ink-2">
                {review ? "The plan is being checked. We'll text you." : "The AI finds a time most of the pod is free and a place nearby."}
              </span>
            </div>
          }
          foot={
            review ? null : (
              <>
                <span className="text-label text-ink-2">Takes a minute</span>
                <Button size="md" onClick={() => void actions.planNow()}>
                  Plan one
                </Button>
              </>
            )
          }
        />
      ),
      object: whoIn,
      foot: true,
      title,
      view,
    };
  }

  const place = venue ? placeWord(venue.short_name ?? venue.name) : null;
  const longPlace = (place?.length ?? 0) > 13;
  const day = dayWord(startsAt, minute);
  const whyHref = `/app/pods/${podId}/plan/${s.id}`;

  // Beat 4: the plan is the first card on the page (flat; founder r3: gloss only as a rare accent). The top opens the
  // plan (beat 5); the bottom row carries the in-count and the one action (beat 6). Facts only:
  // activity · day, time · place · cost. The AI is named once, on the card's last line.
  const activity = activityWord(s.plan_json.event || s.summary);
  const placeName = venue ? (venue.short_name ?? venue.name) : null;
  const cost = (s.plan_json.cost ?? "").trim();

  let tally: ReactNode;
  let action: ReactNode;
  if (locked && !view.imIn && count >= view.size) {
    // founder r1029: locked and full without you. Say so plainly; the one action is to ask the pod.
    tally = <span className="text-[15px] font-semibold text-ink">Full with {count}</span>;
    action = (
      <Button variant="secondary" size="md" onClick={table?.openTalk} leadingIcon={<Icon name="talk" size={18} />}>
        Ask the pod
      </Button>
    );
  } else if (locked) {
    tally = view.imIn ? (
      <InCount n={count} of={view.size} locked className="text-[16px] whitespace-nowrap text-ink" />
    ) : (
      // locked without you, seats left: no "See you there" beside "I'm in"; you can still join
      <span className="text-[15px] leading-tight text-ink">
        <span className="font-semibold">Locked with {count}.</span> <span className="text-ink-2">Room for you.</span>
      </span>
    );
    action = (
      <Button
        variant={view.imIn ? "secondary" : "spark"}
        size="md"
        onClick={() =>
          view.imIn
            ? downloadIcs({ id: view.hangout?.id ?? s.id, title: s.summary, starts_at: startsAt, ends_at: view.hangout?.ends_at ?? s.plan_json.ends_at, venue })
            : void actions.rsvp(view.targetId!, "going", { when: startsAt })
        }
      >
        {view.imIn ? "Add to calendar" : "I'm in"}
      </Button>
    );
  } else if (view.imIn) {
    tally = <InCount n={count} of={view.size} className="text-[16px] whitespace-nowrap text-ink" />;
    action = (
      <Button variant="secondary" size="md" onClick={table?.openTalk} leadingIcon={<Icon name="talk" size={18} />}>
        Talk
      </Button>
    );
  } else {
    tally = count === 0 ? <span className="text-[16px] font-semibold text-ink">Be the first in</span> : <InCount n={count} of={view.size} className="text-[16px] whitespace-nowrap text-ink" />;
    action = (
      <Button size="md" variant="spark" loading={actions.busy} onClick={() => view.targetId && void actions.rsvp(view.targetId, "going", { when: startsAt, silent: need <= 1 })}>
        I&apos;m in
      </Button>
    );
  }

  const head = (
    <Shared name={sharedName.plan(s.id)}>
      <PlanCard
        top={
          <Link
            href={whyHref}
            aria-label={`${activity}, ${day} ${shortTime(startsAt)}${placeName ? `, ${placeName}` : ""}${cost ? `, ${cost}` : ""}. Open the plan.`}
            className="pressable block px-s5 pt-s5 pb-s4 outline-offset-[-2px] hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] active:scale-100!"
          >
            <span className="flex items-center justify-between gap-s3">
              <span className="text-overline text-ink-2">{live ? `Hangout #${round} · now` : `Hangout #${round}`}</span>
              <span className="inline-flex items-center gap-0.5 text-[14px] font-semibold text-select">
                Details <Icon name="arrow" size={16} stroke={2} />
              </span>
            </span>
            <span className="mt-s2 block font-display text-[30px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink tabular lg:text-[34px]">
              {day}, {shortTime(startsAt)}.
            </span>
            <span className="mt-s2 line-clamp-2 block text-[17px] leading-[1.35] font-semibold text-ink">{activity}</span>
            <span className="block text-[16px] leading-[1.35] text-ink-2">{[longPlace ? place : placeName, cost].filter(Boolean).join(" · ")}</span>
            <span className="mt-s3 flex items-center gap-s2 text-[14px] text-ink-2">
              <Icon name="why" size={16} className="text-select" />
              {sourceLine(s.source)}
            </span>
          </Link>
        }
        foot={
          <>
            {tally}
            {action}
          </>
        }
      />
    </Shared>
  );
  const foot = true;
  const object = whoIn;

  const overlay = moment ? (
    <LockMoment
      day={day}
      when={`${shortTime(startsAt)}${placeName ? ` · ${placeName}` : ""}`}
      seats={seats.map((st) => (st && st.open ? null : st))}
      n={n}
      hue={hue}
      worn={worn}
      onDone={() => setMoment(false)}
    />
  ) : null;

  return { light: locked || live ? "clear" : "dawn", head, object, foot, overlay, title, view };
}

/** The plan as a flat card: a top that opens the plan and a bottom row with the in-count and the one action. */
function PlanCard({ top, foot }: { top: ReactNode; foot: ReactNode }) {
  return (
    <div className="pods-card flex flex-col overflow-hidden">
      <div className="flex-1">{top}</div>
      {foot && <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-x-s3 gap-y-s2 border-t border-line px-s5 py-s3 [&>*:last-child]:ml-auto">{foot}</div>}
    </div>
  );
}
