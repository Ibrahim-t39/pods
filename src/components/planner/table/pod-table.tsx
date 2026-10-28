// planner_loop · usePlanStage / <PodTable>: one pod's table, from the plan to hangout #2 (V3_SPEC §6.4; anatomy B).
// Wireframes: D01 planning · D02/D03 plan · D04 in + undo · D04o not sent · D05 lock · D06/D07 locked · D08 give up ·
// D10 rain plan · D13 error · D15 today · E01 okay? · E02 run it back? · E03 waiting · E04 reveal · E05 vote ·
// E06 #2 is on · E07 not this round. Sheets: M01, S01, S02 (sheets.tsx).
//
// Core's page (components/pods/pod-table.tsx) owns the chrome, swipe, Talk and the menu. It fills its <Page> from
//   const stage = usePlanStage(podId, { onTalk: api.openTalk, unread: api.unread });   // same shape as Stagecraft
// Until it does, core's stage renders the legacy names (HangoutCard, CheckInCard, ...) which now wrap <InlineStage>.
// <PodTable> frames the same stage on its own (preview: /app/pods/[id]/plan/[sid]?table=1).
// The light is a state (DESIGN §2): dawn while planning or choosing, clear when locked, night for the lock moment
// only, dusk after the hangout. One bold line, one object, one filled primary per state. Colour (COLOR_LIFE §6-§8):
// the commit is the plan's blue, ember is you and the warm yes (I'm in, Run it back? Yes, Vote once picked).
"use client";

import "./table.css";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Line, SNAPPY, Stage, TableRing, type Seat, type StageLight } from "@/components/brand";
import { Chrome } from "@/components/shell/chrome";
import { Page, type PageProps } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toast";
import { useIsDesktop } from "@/components/ui/use-media-query";
import { Icon } from "@/components/icons";
import { useHydrated, useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import type { CardPhase, CardView } from "@/lib/planner/card-state";
import type { RunItBackAnswer, Venue } from "@/lib/types";
import { usePlanActions } from "../use-plan-actions";
import { downloadIcs } from "../plan-utils";
import { LockMoment } from "./lock-moment";
import { OptionRing, type VoteOption } from "./option-ring";
import { PlanCard } from "./plan-card";
import { GiveUpSheet, PlaceSheet, PlanMenu, WhySheet, type SheetId } from "./sheets";
import { freeCount, hm, placeWord, rainWord, placesCount, seatsFor, useTable, wd3, weekday, type TableModel } from "./model";
import { tableSizeFor, useFit } from "./use-fit";

export interface PlanStageOpts {
  /** opens Talk (core's sheet). The whole table is this one target. */
  onTalk?: () => void;
  unread?: number;
  /** M01's risky rows (Report someone, Leave), owned by core/profile_safety */
  risky?: ReactNode;
  /** open a sheet on arrival (the /plan/[id] deep link opens "why") */
  initialSheet?: SheetId;
  /** core renders its own menu: leave false. The standalone <PodTable> renders M01 itself. */
  ownMenu?: boolean;
  /** framed by another page that already shows the overline (InlineStage) */
  inline?: boolean;
}

/** The seam core's page fills (components/pods/table-stage.tsx `Stagecraft`): one light, head, object, foot, and an
 *  overlay that carries the lock moment and the planner's sheets. */
export interface PlanStage {
  light: StageLight;
  head: ReactNode;
  object: ReactNode;
  foot: ReactNode;
  overlay?: ReactNode;
  /** overline for Talk and the menu title: "Hoopers #1" */
  title: string;
  view: CardView | null;
  /** phone only: the line sits under the object (E01) */
  headLow?: boolean;
  openSheet: (s: SheetId) => void;
}

export interface PodTableProps extends PlanStageOpts {
  podId: string;
}

type Kind =
  | "loading"
  | "laying"
  | "empty"
  | "review"
  | "error"
  | "plan"
  | "locked"
  | "today"
  | "okay"
  | "thanks"
  | "ballot"
  | "waiting"
  | "reveal"
  | "planning2"
  | "vote"
  | "notagain"
  | "missed";

const LIGHT: Record<Kind, StageLight> = {
  loading: "paper",
  laying: "dawn",
  empty: "paper",
  review: "paper",
  error: "paper",
  plan: "dawn",
  locked: "clear",
  today: "clear",
  okay: "clear",
  thanks: "dusk",
  ballot: "dusk",
  waiting: "dusk",
  reveal: "clear",
  planning2: "dawn",
  vote: "dawn",
  notagain: "dusk",
  missed: "dusk",
};

/** Plans already laid in front of you this session (the beats play once per plan). */
const laid = new Set<string>();
/** Hangouts whose reveal you have seen ("Pick a time" tapped). */
const revealed = new Set<string>();
const SKIP_KEY = "pods.skipRound";
function readSkip(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function addSkip(id: string) {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...new Set([...readSkip(), id])]));
  } catch {
    /* private mode: skip for this visit only */
  }
}

const BEATS = ["free times", "places", "sky", "check"] as const;
const BEAT_STEP: Record<string, (typeof BEATS)[number]> = { time: "free times", venues: "places", weather: "sky", validate: "check", retry: "check" };

/**
 * Everything that sits on a pod's table, by phase. Core's page (components/pods/pod-table.tsx) calls this in place of
 * its own useTableStage and keeps the chrome, swipe, Talk and the menu:
 *   const stage = usePlanStage(podId, { onTalk: api.openTalk, unread: api.unread });
 */
export function usePlanStage(podId: string, opts: PlanStageOpts = {}): PlanStage {
  const { onTalk, unread = 0, risky, initialSheet = null, ownMenu = false, inline = false } = opts;
  const hydrated = useHydrated();
  const m = useTable(podId);
  const repo = useRepo();
  const router = useRouter();
  const actions = usePlanActions(podId);
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const [sheet, setSheet] = useState<SheetId | "help">(initialSheet);
  const [lock, setLock] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [skip, setSkip] = useState<string[]>([]);
  const [revealFor, setRevealFor] = useState<{ id: string; yes: number; answered: number; round: number; seats: Seat[]; n: number } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSkip(readSkip()), []);

  const view = m?.view;
  const phase = view?.phase ?? null;
  const talk = useCallback(() => (onTalk ? onTalk() : router.push(`/app/pods/${podId}`)), [onTalk, router, podId]);

  // ── D01: Claude lays the plan in beats, once per plan per session ──
  const sid = view?.suggestion?.id;
  const layable = phase === "proposed" || phase === "in";
  useEffect(() => {
    if (!layable || !sid || laid.has(sid)) return;
    laid.add(sid);
    if (reduce) return;
    let k = 0;
    setBeat(0);
    const t = setInterval(() => {
      k++;
      if (k > BEATS.length) {
        clearInterval(t);
        setBeat(null);
      } else setBeat(k);
    }, 560);
  }, [layable, sid, reduce]);

  // ── D05 / E06: the lock moment on the transition into locked ──
  const prev = useRef<CardPhase | null>(null);
  useEffect(() => {
    const p = phase;
    const from = prev.current;
    if (from && p && (from === "in" || from === "proposed" || from === "vote") && (p === "locked" || p === "starting_soon")) {
      if (from === "vote" || view?.imIn) setLock(true);
    }
    prev.current = p;
  }, [phase, view?.imIn]);

  // ── E04: the reveal; Claude drafts #2's options while you look at it ──
  const lastId = view?.lastHangout?.id ?? null;
  const rv = view?.revealed;
  const again = !!rv && (rv.yes >= 3 || (rv.answered >= 3 && rv.yes / rv.answered >= 0.6));
  useEffect(() => {
    if (phase === "planning_next" && again && lastId && rv && m && !revealed.has(lastId)) setRevealFor({ id: lastId, yes: rv.yes, answered: rv.answered, round: view?.round ?? 1, ...seatsFor(m, { all: true }) });
  }, [phase, again, lastId]);
  useEffect(() => {
    if (phase === "planning_next" && again && view) void actions.planNextRound(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, again]);

  useEffect(() => setPicked(view?.myVote ?? null), [view?.myVote]);

  const fit = useFit<HTMLDivElement>();
  const venues = useStore((st) => st.db.venues);
  const openSheet = useCallback((x: SheetId) => setSheet(x), []);

  if (!hydrated || !m || !view) {
    return {
      light: "paper",
      head: null,
      object: <Breathe><div aria-label="Loading" role="status" style={{ width: 200, height: 200, borderRadius: 999, border: "1.5px dashed var(--ink-3)", background: "var(--table)" }} /></Breathe>,
      foot: null,
      title: "",
      view: null,
      openSheet,
    };
  }

  // ── Which screen ──
  const generating = actions.genKind !== null;
  const lastHid = view.lastHangout?.id ?? "";
  let kind: Kind;
  if (revealFor) kind = "reveal";
  else if (generating && actions.genKind === "next") kind = "planning2";
  else if (generating || beat !== null) kind = "laying";
  else if (failed && phase === "empty") kind = "error";
  else
    switch (phase) {
      case "empty":
        kind = "empty";
        break;
      case "pending_review":
        kind = "review";
        break;
      case "proposed":
      case "in":
        kind = "plan";
        break;
      case "locked":
        kind = "locked";
        break;
      case "starting_soon":
      case "happening_now":
        kind = "today";
        break;
      case "check_in":
        kind = "okay";
        break;
      case "ballot":
        kind = skip.includes(lastHid) ? "thanks" : "ballot";
        break;
      case "waiting_reveal":
        kind = skip.includes(lastHid) ? "thanks" : editing ? "ballot" : "waiting";
        break;
      case "planning_next":
        kind = again ? "planning2" : "notagain";
        break;
      case "vote":
        kind = "vote";
        break;
      case "missed":
        kind = "missed";
        break;
      default:
        kind = "empty";
    }
  const light: StageLight = lock ? "night" : LIGHT[kind];

  // ── Actions ──
  const target = view.targetId;
  const imIn = async () => {
    if (!target || busy) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      notify("Not sent. You're offline.", { retry: () => void imIn(), duration: 6000 });
      return;
    }
    setBusy(true);
    const r = await repo.rsvp(target, "going");
    setBusy(false);
    if (!r.ok) {
      notify("Not sent.", { retry: () => void imIn(), duration: 6000 });
      return;
    }
    if (!r.data.locked) notify("You're in.", { undo: () => void repo.rsvp(target, "not_going"), duration: 6000 });
  };
  const giveUp = async () => {
    setSheet(null);
    const t = view.hangout?.id ?? target;
    if (!t) return;
    const r = await repo.rsvp(t, "not_going");
    if (r.ok) notify("Seat given back.", { undo: () => void repo.rsvp(t, "going"), duration: 6000 });
  };
  const planOne = async () => {
    setFailed(false);
    await actions.planNow();
    const has = Object.values(useStore.getState().db.suggestions).some((s) => s.pod_id === podId && s.status !== "replaced");
    if (!has) setFailed(true);
  };
  const okay = async (fine: boolean) => {
    const h = view.lastHangout;
    if (!h || busy) return;
    setBusy(true);
    await repo.checkIn(h.id);
    setBusy(false);
    if (!fine) {
      addSkip(h.id);
      setSkip(readSkip());
      setSheet("help");
    }
  };
  const answer = async (a: RunItBackAnswer) => {
    const h = view.lastHangout;
    if (!h || busy) return;
    setBusy(true);
    const r = await repo.castRunItBack(h.id, a);
    setBusy(false);
    setEditing(false);
    if (!r.ok) notify("Saved. Sends when you're back online.", { duration: 6000 });
  };
  const castVote = async () => {
    if (!view.vote || !picked || busy) return;
    setBusy(true);
    const r = await repo.voteNextOption(view.vote.id, picked);
    setBusy(false);
    if (!r.ok) notify("Not sent.", { retry: () => void castVote(), duration: 6000 });
  };
  const runningLate = async () => {
    await repo.sendMessage(podId, "Running a few minutes late.", `late_${Date.now().toString(36)}`);
    notify("Told the pod.", { duration: 4000 });
  };
  const hereNow = async () => {
    const h = view.hangout;
    if (!h || busy) return;
    setBusy(true);
    const r = await repo.checkIn(h.id);
    setBusy(false);
    if (!r.ok) notify(r.error.message ?? "Not yet.", { duration: 4000 });
  };

  // ── Lock moment (anatomy E) ──
  if (lock && view.hangout) {
    const h = view.hangout;
    const { seats } = seatsFor(m, { all: true });
    return {
      light: "night",
      head: null,
      object: null,
      foot: null,
      overlay: (
        <motion.div className="fixed inset-0 z-overlay bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0.16 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
          <LockMoment round={h.sequence} day={weekday(h.starts_at)} when={`${hm(h.starts_at)} · ${placeWord(m.venue)}`} seats={seats} hue={m.hue} onDone={() => setLock(false)} />
        </motion.div>
      ),
      title: `${m.name} #${h.sequence}`,
      view,
      openSheet,
    };
  }

  const menu = <Chrome left="mark" right="menu" onMenu={() => setSheet("menu")} menuLabel={`${m.name} menu`} />;
  const bare = <Chrome left="mark" right="none" />;
  const round = view.round;
  // Inside core's page the overline is the page's own ("Hoopers #1"), so the stage drops its copy.
  const over = (t: string) => (inline ? null : <p className="pt-over">{t}</p>);
  const lineSize = (place: string) => (desktop ? (place.length > 16 ? 64 : 80) : place.length > 16 ? 44 : 56);

  // the plan line: Sunday. / 1pm. / Brahan Spring. (the place word opens S02)
  const planLine = (iso: string, today = false) => {
    const place = placeWord(m.venue);
    return (
      <Line size="xl" className="pt-line" style={{ fontSize: lineSize(place) }}>
        <span>{today ? "Today." : `${weekday(iso)}.`}</span>
        <span>{hm(iso)}.</span>
        <button type="button" className="u" onClick={() => setSheet("place")} aria-label={`${place}, the place`}>
          {place}.
        </button>
      </Line>
    );
  };
  const f = freeCount(m.plan);
  const outdoorRain = !!m.venue && !m.venue.indoor && !!m.rainVenue;
  const detailsHref = view.suggestion ? `/app/pods/${podId}/plan/${view.suggestion.id}` : undefined;
  const calendar = () =>
    view.hangout && downloadIcs({ id: view.hangout.id, title: `${m.name} #${round}`, starts_at: view.hangout.starts_at, ends_at: view.hangout.ends_at, venue: m.venue });

  // the table object, measured to fit
  const table = (seats: Seat[], n: number, o: { fill?: boolean; dim?: boolean; names?: boolean; worn?: number; center?: ReactNode; roof?: boolean; waiting?: boolean; onClick?: () => void; label?: string; max?: number } = {}) => (
    <div ref={fit[0]} className="pt-obj">
      {fit[1] && (
        <motion.div initial={reduce ? false : { scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 170, damping: 26 }}>
          <TableRing
            size={tableSizeFor(fit[1], { waiting: o.waiting, roof: o.roof, max: o.max ?? (desktop ? 380 : 260) })}
            seats={seats}
            n={n}
            hue={m.hue}
            fill={o.fill}
            dim={o.dim}
            worn={o.worn ?? Math.max(1, round)}
            center={o.center}
            roof={o.roof && m.rainVenue ? { label: `rain: ${rainWord(m.rainVenue)}` } : undefined}
            onClick={o.onClick}
            label={o.label}
            names={o.names ?? true}
          />
        </motion.div>
      )}
    </div>
  );
  const cue = (
    <span className="pt-cue" aria-hidden>
      <Icon name="talk" size={20} />
      {unread > 0 && <span className="fig" style={{ fontSize: 14 }}>{unread}</span>}
    </span>
  );

  let page: ReactNode;
  switch (kind) {
    case "laying": {
      const live = actions.genSteps.map((s) => BEAT_STEP[s.id]).filter(Boolean);
      const at = beat ?? new Set(live).size;
      const n = placesCount(m.plan);
      const vals: Record<(typeof BEATS)[number], string> = {
        "free times": f ? `${f.free >= f.of ? `all ${f.of}` : `${f.free} of ${f.of}`}${m.iso ? `, ${wd3(m.iso)} ${hm(m.iso)}` : ""}` : "",
        places: n ? `${n} near everyone` : "",
        sky: m.venue ? (m.venue.indoor ? "indoors" : m.rainVenue ? "rain plan ready" : "open air") : "",
        check: "public, daytime",
      };
      const showVals = beat !== null && !!m.plan;
      page = (
        <Page
          chrome={menu}
          head={
            <div className="pt-head">
              {over(`${m.name} #${round}`)}
              <Line size="lg">Planning {m.name}.</Line>
              <div className="pt-beats" aria-live="polite">
                {BEATS.map((b, i) => (
                  <div key={b} className="pt-beat" data-on={i < at ? "" : undefined}>
                    <span className="pt-beat-k">
                      <span className="pt-beat-dot" />
                      {b}
                    </span>
                    <motion.span className="pt-beat-v" data-nc initial={false} animate={{ opacity: showVals && i < at ? 1 : 0 }}>
                      {vals[b]}
                    </motion.span>
                  </div>
                ))}
              </div>
            </div>
          }
          object={
            <Breathe>{table([{ initial: m.me?.initial, name: "you" }, { open: true }, { open: true }, { open: true }], 4, { waiting: true, worn: 1 })}</Breathe>
          }
        />
      );
      break;
    }
    case "empty":
    case "error":
      page = (
        <Page
          chrome={menu}
          head={
            <div className="pt-head">
              {over(`${m.name} #${round}`)}
              <Line size="lg">{kind === "error" ? "Couldn't plan this one." : "Nothing planned yet."}</Line>
              {kind === "error" && <p className="pt-sub">Nothing changed.</p>}
            </div>
          }
          object={table([{ initial: m.me?.initial, name: "you" }, { open: true }, { open: true }, { open: true }], 4, { waiting: true, dim: true, center: kind === "error" ? <Icon name="turn" size={28} /> : undefined })}
          foot={
            <>
              <span />
              <Button size="xl" onClick={() => void planOne()}>
                {kind === "error" ? "Try again" : "Plan one"}
              </Button>
            </>
          }
        />
      );
      break;
    case "review":
      page = (
        <Page
          chrome={menu}
          head={
            <div className="pt-head">
              {over(`${m.name} #${round}`)}
              <Line size="lg">Being checked.</Line>
              <p className="pt-sub">A person looks at this plan first.</p>
            </div>
          }
          object={table([{ initial: m.me?.initial, name: "you" }, { open: true }, { open: true }, { open: true }], 4, { waiting: true, dim: true })}
        />
      );
      break;
    case "plan":
    case "locked": {
      // Video beats 4 and 6: the planned hangout is a card at the top of the pod, in the three-hue halo; the table
      // below holds the pod's 8 seats (the first 4 are the lock arc). One filled primary: the card's "I'm in".
      const { seats, n } = seatsFor(m);
      page = (
        <Page
          chrome={menu}
          head={
            <div className="pt-head">
              {over(m.name)}
              <PlanCard m={m} href={detailsHref} onImIn={() => void imIn()} onCalendar={calendar} busy={busy} lap={round > 1} />
            </div>
          }
          object={table(seats, n, { fill: kind === "locked", waiting: false, roof: outdoorRain, center: cue, onClick: talk, label: unread ? `Talk, ${unread} new` : "Talk", max: desktop ? 360 : 220 })}
        />
      );
      break;
    }
    case "today": {
      const { seats, n } = seatsFor(m, { here: true });
      const live = phase === "happening_now";
      const meHere = !!m.me && m.hereIds.includes(m.me.id);
      page = (
        <Page
          chrome={menu}
          head={
            <div className="pt-head">
              {over(`${m.name} #${round}`)}
              {m.iso && planLine(m.iso, true)}
              <p className="pt-sub">{live ? `${m.hereCount} here` : `Starts at ${hm(m.iso ?? "")}`}</p>
            </div>
          }
          object={table(seats, n, { fill: true, waiting: !view.imIn, center: cue, onClick: talk, label: "Talk" })}
          foot={
            meHere ? (
              <>
                <span className="pt-status">You&apos;re here</span>
                <span />
              </>
            ) : (
              <>
                <Button variant="link" onClick={() => void runningLate()}>
                  Running late
                </Button>
                {live ? (
                  <Button size="xl" onClick={() => void hereNow()} loading={busy}>
                    I&apos;m here
                  </Button>
                ) : (
                  <span />
                )}
              </>
            )
          }
        />
      );
      break;
    }
    case "okay":
      page = (
        <Page
          chrome={bare}
          headLow={!desktop}
          head={
            <div className="pt-head">
              {over(`${m.name} #${round}`)}
              <Line size="lg">Everything okay?</Line>
              <p className="pt-sub">Only you see this.</p>
            </div>
          }
          object={
            <div className="pt-answers" style={{ gap: "var(--s4)" }}>
              <AnswerDisc i={0} k="ok" label="Yes" size={desktop ? 128 : 112} onClick={() => void okay(true)} disabled={busy} />
              <AnswerDisc i={1} k="no" label="Not really" size={desktop ? 112 : 96} onClick={() => void okay(false)} disabled={busy} />
            </div>
          }
          foot={desktop ? undefined : <span />}
        />
      );
      break;
    case "thanks":
      page = (
        <Page
          chrome={bare}
          head={
            <div className="pt-head">
              {over(m.name)}
              <Line size="lg">Thanks for telling us.</Line>
              <p className="pt-sub">Only you see this.</p>
            </div>
          }
          object={table(seatsFor(m).seats, seatsFor(m).n, { dim: true, onClick: talk, label: "Talk" })}
          foot={
            <>
              <Button variant="link" onClick={() => setSheet("help")}>
                If something&apos;s off
              </Button>
              <span />
            </>
          }
        />
      );
      break;
    case "ballot":
    case "waiting": {
      const { seats, n } = seatsFor(m);
      const waiting = kind === "waiting";
      const dots = Math.max(m.went, m.answered);
      page = (
        <Page
          chrome={bare}
          head={
            <div className="pt-head">
              {over(`${m.name} · after #${round}`)}
              <Line size={desktop ? "xl" : "lg"}>{waiting ? "Sent." : "Run it back?"}</Line>
              <p className="pt-sub">{waiting ? `${m.answered} of ${dots} answered. Maybe isn't a yes.` : "Only you see your answer."}</p>
            </div>
          }
          object={table(seats, n, {
            fill: false,
            names: waiting || desktop,
            max: waiting ? undefined : desktop ? 340 : 168,
            center: waiting ? (
              <span className="pt-dots" aria-label={`${m.answered} of ${dots} answered`}>
                {Array.from({ length: dots }, (_, i) => (
                  <span key={i} data-off={i >= m.answered ? "" : undefined} />
                ))}
              </span>
            ) : undefined,
          })}
          foot={
            waiting ? (
              <>
                <Button variant="link" onClick={() => setEditing(true)}>
                  Change answer
                </Button>
                <span />
              </>
            ) : (
              <div className="pt-answers" role="radiogroup" aria-label="Run it back?">
                <AnswerDisc i={0} k="yes" label="Yes" size={desktop ? 112 : 96} onClick={() => void answer("yes")} pressed={view.myBallot === "yes"} disabled={busy} />
                <AnswerDisc i={1} k="maybe" label="Maybe" size={desktop ? 80 : 72} onClick={() => void answer("not_sure")} pressed={view.myBallot === "not_sure"} disabled={busy} />
                <AnswerDisc i={2} k="no" label="No" size={desktop ? 64 : 56} onClick={() => void answer("no")} pressed={view.myBallot === "no"} disabled={busy} />
              </div>
            )
          }
        />
      );
      break;
    }
    case "reveal": {
      const yes = revealFor?.yes ?? 0;
      const of = revealFor?.answered ?? 0;
      const held = revealFor?.round ?? round;
      const { seats, n } = revealFor ?? seatsFor(m, { all: true });
      page = (
        <Page
          chrome={bare}
          head={
            <div className="pt-head">
              <p className="pt-over">{inline ? `${yes} of ${of} said yes` : `${m.name} · ${yes} of ${of} said yes`}</p>
              <Line size="xxl">
                <span className="fig pt-big text-logo" style={{ fontSize: desktop ? 220 : 152 }}>
                  #{held + 1}
                </span>
              </Line>
            </div>
          }
          object={table(seats, n, {
            fill: true,
            worn: 2,
            center: (
              <motion.span className="pt-worn" data-pod-hue={m.hue} initial={reduce ? false : { scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} style={{ width: "62%", height: "62%", border: "1.5px solid color-mix(in srgb, var(--pod) 45%, transparent)" }}>
                <span className="fig">#{held}</span>
              </motion.span>
            ),
          })}
          foot={
            <>
              <span />
              <Button
                size="xl"
                onClick={() => {
                  if (revealFor) revealed.add(revealFor.id);
                  setRevealFor(null);
                }}
              >
                Pick a time
              </Button>
            </>
          }
        />
      );
      break;
    }
    case "planning2":
      page = (
        <Page
          chrome={bare}
          head={
            <div className="pt-head">
              {over(m.name)}
              <Line size="lg">
                Planning <span className="fig">#{round + 1}</span>.
              </Line>
              <p className="pt-sub">Same people, a new time.</p>
            </div>
          }
          object={<Breathe>{table(seatsFor(m, { all: true }).seats, seatsFor(m, { all: true }).n, { worn: 2 })}</Breathe>}
        />
      );
      break;
    case "vote":
      page = voteFrame({ inline, m, chrome: menu, picked, setPicked, onVote: () => void castVote(), busy, desktop, fit, venues });
      break;
    case "notagain":
    case "missed":
      page = (
        <Page
          chrome={bare}
          head={
            <div className="pt-head">
              {over(m.name)}
              <Line size="lg">{kind === "missed" ? "Next time." : "Not this round."}</Line>
              <p className="pt-sub">{kind === "missed" ? "Your seat stays." : "The pod stays."}</p>
            </div>
          }
          object={table(seatsFor(m, { all: true }).seats, seatsFor(m, { all: true }).n, { dim: true, onClick: talk, label: "Talk", center: cue })}
          foot={
            <>
              <Button variant="link" onClick={talk}>
                Talk
              </Button>
              <Button variant="link" onClick={() => router.push("/app/pods")} trailingIcon={<Icon name="arrow" size={18} />}>
                Your pods
              </Button>
            </>
          }
        />
      );
      break;
    default:
      page = <Page />;
  }

  // The frame's parts, each keyed by the state so one hands off to the next (fade and a 1.5% settle, DESIGN §7).
  const parts = (page as ReactElement<PageProps>).props;
  // Repeat made visible (COLOR_LIFE §6.3): the pod's wash deepens one step per hangout held.
  const AFTER: Kind[] = ["okay", "thanks", "ballot", "waiting", "reveal", "planning2", "vote", "notagain", "missed"];
  const depth = Math.min(3, Math.max(1, AFTER.includes(kind) ? round + 1 : round));
  const t = { duration: reduce ? 0.16 : 0.32, ease: [0.2, 0.8, 0.2, 1] as const };
  const enter = reduce ? { opacity: 0 } : { opacity: 0, y: 6 };
  const wrap = (node: ReactNode, k: string, cls?: string) =>
    node ? (
      <motion.div key={`${kind}-${k}`} className={cls} initial={enter} animate={{ opacity: 1, y: 0 }} transition={t}>
        {node}
      </motion.div>
    ) : null;
  return {
    light,
    head: wrap(parts.head, "head"),
    object: (
      <div className="contents" data-depth={depth}>
        {wrap(parts.object, "obj", "grid h-full w-full place-items-center")}
      </div>
    ),
    foot: parts.foot ? <div key={`${kind}-foot`} className="contents">{parts.foot}</div> : null,
    headLow: parts.headLow,
    title: `${m.name} #${round}`,
    view,
    openSheet,
    overlay: (
      <>
        {ownMenu && <PlanMenu m={m} open={sheet === "menu"} onOpenChange={(o) => setSheet(o ? "menu" : null)} go={setSheet} risky={risky} />}
        <WhySheet m={m} open={sheet === "why"} onOpenChange={(o) => setSheet(o ? "why" : null)} />
        <PlaceSheet m={m} open={sheet === "place"} onOpenChange={(o) => setSheet(o ? "place" : null)} />
        <GiveUpSheet open={sheet === "giveup"} onOpenChange={(o) => setSheet(o ? "giveup" : null)} onGiveUp={() => void giveUp()} />
        <HelpSheet open={sheet === "help"} onOpenChange={(o) => setSheet(o ? "help" : null)} />
      </>
    ),
  };
}

/** Standalone table page (chrome + the stage), for routes that are not inside core's table page. */
export function PodTable({ podId, ...opts }: PodTableProps) {
  const st = usePlanStage(podId, { ...opts, ownMenu: true });
  return (
    <>
      <Stage light={st.light} />
      {st.light !== "night" && (
        <Page
          chrome={<Chrome left="mark" right="menu" onMenu={() => st.openSheet("menu")} menuLabel={`${st.title} menu`} />}
          head={st.head}
          object={st.object}
          foot={st.foot}
          headLow={st.headLow}
        />
      )}
      {st.overlay}
    </>
  );
}

/** A disc is the button (E01, E02). Discs spring in one by one (COLOR_LIFE §8: stiffness 420, damping 32, 60 ms stagger). */
function AnswerDisc({ i = 0, k, label, size, onClick, pressed, disabled }: { i?: number; k: "yes" | "ok" | "maybe" | "no"; label: string; size: number; onClick: () => void; pressed?: boolean; disabled?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={!!pressed}
      className="pt-ans pressable"
      data-k={k}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.93 }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0.16 } : { ...SNAPPY, delay: 0.12 + i * 0.06 }}
      style={{ width: size, height: size, fontSize: Math.round(size * (label.length > 5 ? 0.2 : label.length > 3 ? 0.22 : 0.28)), padding: label.length > 5 ? "0 14%" : 0 }}
    >
      {label}
    </motion.button>
  );
}

/** S11 (planner part): If something's off. Help stays one tap away from the after screens. */
function HelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="If something's off">
      <div className="pt-rows">
        <a className="pt-mrow pressable" data-k="call" href="tel:911">
          <Icon name="help" size={22} />
          Call 911
        </a>
        <a className="pt-mrow pressable" href="mailto:support@pods.example">
          <Icon name="send" size={22} />
          Write to us
        </a>
      </div>
    </ResponsiveSheet>
  );
}

/** E05 · Pick a time. Options as circles; discs gather; Vote stays off until you pick (E05b). */
function voteFrame({ inline, m, chrome, picked, setPicked, onVote, busy, desktop, fit, venues }: { inline: boolean; m: TableModel; chrome: ReactNode; picked: string | null; setPicked: (id: string) => void; onVote: () => void; busy: boolean; desktop: boolean; fit: ReturnType<typeof useFit<HTMLDivElement>>; venues: Record<string, Venue> }) {
  const view = m.view;
  // Dedupe identical options (judges' fix): same minute, same place. Votes on a duplicate count on its twin.
  const { options, canon } = (() => {
    const byKey = new Map<string, VoteOption>();
    const canon: Record<string, string> = {};
    const votes = view.vote?.votes ?? {};
    for (const o of view.options) {
      const key = `${Math.round(Date.parse(o.starts_at) / 60000)}|${placeWord(venues[o.venue_id])}`;
      const first = byKey.get(key);
      canon[o.id] = first?.id ?? o.id;
      const voters = m.people.filter((p) => votes[p.id] === o.id);
      if (first) first.voters = [...first.voters, ...voters];
      else byKey.set(key, { id: o.id, iso: o.starts_at, place: "", voters });
    }
    return { options: [...byKey.values()], canon };
  })();
  const showPlace = new Set(options.map((o) => placeWord(venues[view.options.find((x) => x.id === o.id)?.venue_id ?? ""]))).size > 1;
  const withPlace = options.map((o) => ({ ...o, place: showPlace ? placeWord(venues[view.options.find((x) => x.id === o.id)?.venue_id ?? ""]) : "" }));
  const voted = Object.keys(view.vote?.votes ?? {}).length;
  const pickedOpt = withPlace.find((o) => o.id === (picked ? (canon[picked] ?? picked) : null));
  const mine = view.myVote ? (canon[view.myVote] ?? view.myVote) : null;
  const changed = !!picked && (canon[picked] ?? picked) !== mine;
  const closes = view.vote?.closes_at;
  // never let a short slot crush the circles (inline on a laptop the slot can be ~120px tall): floor at 260/300
  const size = fit[1] ? Math.max(desktop ? 300 : 260, Math.min(fit[1].w - 8, (fit[1].h - 8) / 1.02, desktop ? 520 : 360)) : 0;
  // "two weeks later": from the hangout just held to the first option, in whole weeks (data, never a promise)
  const last = view.lastHangout?.starts_at;
  const first = options.length ? Math.min(...options.map((o) => Date.parse(o.iso))) : NaN;
  const weeks = last && Number.isFinite(first) ? Math.round((first - Date.parse(last)) / (7 * 86_400_000)) : 0;
  const later = weeks >= 2 ? `${weeks} weeks later` : weeks === 1 ? "a week later" : "";
  return (
    <Page
      chrome={chrome}
      head={
        <div className="pt-head">
          <p className="pt-over" hidden={inline}>
            {m.name} #{view.round}
            {closes ? ` · closes ${wd3(closes)}` : ""}
          </p>
          <Line size={desktop && !inline ? "xl" : "lg"}>Pick a time.</Line>
          {later && <p className="pt-sub">Same people · {later}</p>}
        </div>
      }
      object={
        <div ref={fit[0]} className="pt-obj">
          {size > 0 && <OptionRing options={withPlace} picked={picked ? (canon[picked] ?? picked) : null} onPick={setPicked} me={m.me} hue={m.hue} size={size} showPlace={showPlace} />}
        </div>
      }
      foot={
        <>
          <span className="pt-status" aria-live="polite">
            {changed && pickedOpt ? `${wd3(pickedOpt.iso)} ${hm(pickedOpt.iso)}` : `${voted} of ${view.size} voted`}
          </span>
          <Button size="xl" variant={changed ? "spark" : "primary"} onClick={onVote} disabled={!changed} loading={busy}>
            Vote
          </Button>
        </>
      }
    />
  );
}

/** The one breathing thing while Claude works (MOTION_SYSTEM §8: at most one infinite animation per screen). */
function Breathe({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="grid h-full w-full place-items-center"
      animate={reduce ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.985, 1, 0.985] }}
      transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
