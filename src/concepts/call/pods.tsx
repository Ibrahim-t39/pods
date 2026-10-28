// Call concept: your pods. One page per pod, one call per page, turned vertically (PB 3; SF 09, 10; never more pages
// than pods). The call is the plan; the pod answers it as discs (AW 01, 19; IL 41); underlined words are the controls
// (AW 06, 58). The line counts up, locks with a full stop in the pod's hue, rewrites itself after the hangout and asks
// "Again?" (CM 127–130 one question). Chat is "the room", pulled down from the top. Real store, repo and planner.
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useDb, useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { nowISO, useClock } from "@/lib/time/clock";
import { cardView, type CardView } from "@/lib/planner/card-state";
import { buildPlannerInput, optionToSuggestion, planToSuggestion } from "@/lib/planner/adapt";
import { usePlanner, type TraceStep } from "@/lib/planner/client";
import type { DbState, ID, PlannerStep, Pod, ReportReason, Venue } from "@/lib/types";
import { Answer, Disc, MarkButton, Sheet, Stage, ease, useHeight, useWidth } from "./kit";
import { Again, In, Room as RoomGlyph, Send } from "./icons";
import { dayWord, firstName, fitSize, freeLine, hourWord, initial, noCity, ordinal, placeWord, podHue, podWord, tone, traceLine, venueWord } from "./words";

const NUM = ["no one", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const toStored = (steps: TraceStep[]): PlannerStep[] => steps.map((s) => ({ id: s.id, label: s.label, detail: s.detail, status: s.status === "warn" ? "warn" : "done" }));
const inflight = new Set<string>();

type PodRow = { pod: Pod; active: boolean; hue: "ember" | "signal" | "grove" };

export function Pods() {
  const hydrated = useHydrated();
  const me = useMe();
  const router = useRouter();
  const w = useWidth();
  const desk = w >= 1024;
  const pagesRef = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [room, setRoom] = useState<ID | null>(null);

  const rows = useDb((db): PodRow[] => {
    if (!db.me) return [];
    const ms = db.memberships.filter((m) => m.user_id === db.me && !m.left_at && db.pods[m.pod_id]);
    ms.sort((a, b) => Number(b.activation === "active") - Number(a.activation === "active"));
    const pods = ms.map((m) => db.pods[m.pod_id]);
    return ms.map((m, i) => ({ pod: pods[i], active: m.activation === "active", hue: podHue(pods, pods[i]) }));
  });

  useEffect(() => {
    if (hydrated && (!me || me.onboarding_step !== "done")) router.replace("/concepts/call");
  }, [hydrated, me, router]);

  const onScroll = () => {
    const el = pagesRef.current;
    if (!el) return;
    setAt(Math.round(el.scrollTop / el.clientHeight));
  };
  const turn = (i: number) => pagesRef.current?.scrollTo({ top: i * (pagesRef.current?.clientHeight ?? 0), behavior: "smooth" });

  const cur = rows[at] ?? rows[0];
  if (!hydrated || !cur) {
    return (
      <Stage hue="signal">
        <header className="call-top"><MarkButton /></header>
      </Stage>
    );
  }

  return (
    <Stage hue={cur.hue}>
      <header className="call-top">
        <MarkButton />
        {cur.active && (
          <button type="button" className="call-link" onClick={() => setRoom(cur.pod.id)} aria-label={`Open the room for ${podWord(cur.pod)}`} style={{ gap: 8 }} data-testid="call-room-open">
            <RoomGlyph size={18} /> the room
          </button>
        )}
      </header>

      {rows.length > 1 && (
        <nav className="call-index" aria-label="Your pods">
          {rows.map((r, i) => (
            <button key={r.pod.id} type="button" data-hue={r.hue} aria-current={i === at} aria-label={podWord(r.pod)} onClick={() => turn(i)} style={{ marginTop: i ? -6 : 0 }}>
              <i data-open={r.active} />
            </button>
          ))}
        </nav>
      )}

      <div className="call-pages" ref={pagesRef} onScroll={onScroll}>
        {rows.map((r) => (
          <section key={r.pod.id} className="call-page" data-hue={r.hue} aria-label={podWord(r.pod)}>
            {r.active ? <PodCall pod={r.pod} desk={desk} /> : <Later pod={r.pod} desk={desk} />}
          </section>
        ))}
      </div>

      <AnimatePresence>{room && <TheRoom podId={room} onClose={() => setRoom(null)} />}</AnimatePresence>
    </Stage>
  );
}

// ── A pod that opens later (on deck): a seat, not an empty state ───────
function Later({ pod, desk }: { pod: Pod; desk: boolean }) {
  return (
    <div style={{ position: "relative", zIndex: 1, padding: desk ? "22svh var(--gutter) 0" : "20svh var(--gutter) 0" }}>
      <p className="call-mono" style={{ margin: "0 0 var(--s6)" }}>{podWord(pod).toLowerCase()}</p>
      <h2 className="call-line" style={{ ["--size" as string]: desk ? "136px" : "64px", margin: 0, color: "var(--c-ink-2)" }}>
        <span className="row">Soon.</span>
      </h2>
      <div style={{ marginTop: "var(--s6)" }}><Disc kind="seat" label="you" size={desk ? 56 : 48} /></div>
      <p className="call-mono" style={{ margin: "var(--s6) 0 0" }}>opens after your first hangout</p>
    </div>
  );
}

// ── The call for one pod ─────────────────────────────────────────────
function PodCall({ pod, desk }: { pod: Pod; desk: boolean }) {
  const repo = useRepo();
  const reduce = useReducedMotion();
  const t = useClock(15_000).getTime();
  const w = useWidth();
  const h = useHeight();
  const view = useDb((db) => cardView(db, pod.id, t));
  const names = useDb((db) => Object.fromEntries(Object.keys(db.users).map((id) => [id, firstName(db, id)])) as Record<ID, string>);
  const meId = useDb((db) => db.me);
  const minYes = useDb((db) => db.config.planner.runItBackRevealMin);
  const checkedIn = useDb((db) => (view?.lastHangout ? db.rsvps.filter((r) => r.hangout_id === view.lastHangout!.id && r.checked_in).map((r) => r.user_id) : []));
  const answered = useDb((db) => (view?.lastHangout ? Object.keys(db.runItBack[view.lastHangout.id]?.responses ?? {}).length : 0));
  const [hourOpen, setHourOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [okOpen, setOkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const planner = usePlanner();
  const [beats, setBeats] = useState<TraceStep[]>([]);

  // Lock moment: only animate when the lock happens while you are looking.
  const wasLocked = useRef<boolean | null>(null);
  const [justLocked, setJustLocked] = useState(false);
  useEffect(() => {
    if (!view) return;
    const lockedNow = view.locked && (view.phase === "locked" || view.phase === "starting_soon");
    if (wasLocked.current === false && lockedNow) {
      setJustLocked(true);
      const id = setTimeout(() => setJustLocked(false), 1600);
      return () => clearTimeout(id);
    }
    wasLocked.current = lockedNow;
  }, [view]);

  // Round two: once the pod says "again", plan the options live (≤6 beats) and open the vote.
  const planNext = useCallback(async (v: CardView) => {
    const last = v.lastHangout;
    if (!last) return;
    const db = useStore.getState().db;
    const round = last.sequence + 1;
    const key = `${pod.id}:${round}`;
    if (inflight.has(key) || Object.values(db.suggestions).some((s) => s.pod_id === pod.id && s.round === round)) return;
    inflight.add(key);
    try {
      const input = buildPlannerInput(db, pod.id, { nowISO: nowISO(), afterHangoutId: last.id });
      const res = await planner.run("next_options", input, { podLabel: podWord(pod), dwellMs: db.config.planner.stepDwellMs, onSteps: setBeats });
      if (res.options) {
        const trace = toStored(res.steps);
        for (const [i, o] of res.options.options.slice(0, db.config.planner.maxOptions).entries()) await repo.saveSuggestion(optionToSuggestion(pod.id, o, trace, round, i as 0 | 1 | 2));
      }
    } finally {
      inflight.delete(key);
    }
  }, [planner, pod, repo]);

  const planFirst = useCallback(async () => {
    const db = useStore.getState().db;
    const round = Object.values(db.hangouts).filter((x) => x.pod_id === pod.id && x.status !== "cancelled").length + 1;
    const key = `${pod.id}:${round}:plan`;
    if (inflight.has(key)) return;
    inflight.add(key);
    try {
      const input = buildPlannerInput(db, pod.id, { nowISO: nowISO() });
      const res = await planner.run("plan", input, { podLabel: podWord(pod), dwellMs: db.config.planner.stepDwellMs, onSteps: setBeats });
      if (res.plan) await repo.saveSuggestion(planToSuggestion(pod.id, res.plan.plan, res.plan.source, toStored(res.steps), round, 0));
    } finally {
      inflight.delete(key);
    }
  }, [planner, pod, repo]);

  const revealedYes = !!view?.revealed && view.revealed.yes >= minYes;
  useEffect(() => {
    if (view?.phase === "planning_next" && revealedYes) void planNext(view);
  }, [view, revealedYes, planNext]);

  if (!view) return null;
  const v = view;
  const s = v.suggestion;
  const venue = v.venue;
  const planning = planner.status === "running";
  const word = podWord(pod).toLowerCase();
  const after = ["check_in", "ballot", "waiting_reveal", "planning_next", "missed"].includes(v.phase);
  const lockedNow = v.locked && !after && v.phase !== "vote";

  const rsvp = async (status: "going" | "not_going") => {
    if (!v.targetId || busy) return;
    setBusy(true);
    await repo.rsvp(v.targetId, status);
    setBusy(false);
  };
  const ballot = async (a: "yes" | "not_sure" | "no") => {
    const hid = v.lastHangout?.id;
    if (!hid || busy) return;
    setBusy(true);
    if (!v.checkedIn) await repo.checkIn(hid);
    await repo.castRunItBack(hid, a);
    setBusy(false);
  };

  // Geometry: one size for the call, chosen so the longest row fits (long venue names step down).
  const avail = desk ? Math.min(w * 0.62, 900) : w - 32;
  const maxSize = desk ? Math.min(150, (h * 0.56) / 4) : 64;

  let overline = `${word} · #${v.round}`;
  let call: ReactNode = null;
  let responses: ReactNode = null;
  let margin: ReactNode = null;
  let answer: ReactNode = null;
  let leftLinks: ReactNode = null;

  if (planning || (v.phase === "planning_next" && revealedYes)) {
    // ── Claude typesets the next call (≤6 beats, then still) ──
    const done = beats.filter((b) => b.status !== "running").length;
    const lastBeat = beats[beats.length - 1];
    const size = fitSize(["Again."], avail, maxSize);
    call = (
      <h2 className="call-line" style={{ ["--size" as string]: `${size}px`, margin: 0 }}>
        <span className="row">{v.phase === "planning_next" ? <>Again<span className="call-stop" /></> : "Next one"}</span>
      </h2>
    );
    responses = (
      <div aria-live="polite" style={{ display: "grid", gap: "var(--s2)" }}>
        <div style={{ display: "flex", gap: 6 }} aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <motion.i key={i} style={{ width: 8, height: 8, borderRadius: 99, display: "block", border: "1.5px solid var(--hue)" }} animate={{ backgroundColor: i < done ? "var(--hue)" : "transparent" }} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={lastBeat?.id ?? "start"} className="call-mono" style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            {lastBeat ? traceLine({ ...lastBeat, detail: "" }) : "reading the pod"}
          </motion.p>
        </AnimatePresence>
      </div>
    );
    overline = `${word} · claude is planning`;
  } else if (after && v.lastHangout) {
    // ── After: the line in past tense, then one question ──
    const lh = v.lastHangout;
    const n = Math.max(checkedIn.length, v.going.length);
    const past = n > 1 ? `${dayWord(lh.starts_at)}, ${placeWord(venue, pod.topic_key)}, the ${NUM[n] ?? n} of you.` : `${dayWord(lh.starts_at)}, ${placeWord(venue, pod.topic_key)}.`;
    const q = v.phase === "missed" ? "Next one." : v.revealed && !revealedYes ? "Next time." : "Again?";
    const size = fitSize([q], avail, maxSize);
    call = (
      <>
        <p style={{ margin: "0 0 var(--s6)", fontFamily: "var(--serif)", fontSize: desk ? 32 : 24, lineHeight: 1.15, color: "var(--c-ink-2)", fontStyle: "italic", maxWidth: 520, letterSpacing: "-0.01em" }}>{past}</p>
        <h2 className="call-line" style={{ ["--size" as string]: `${size}px`, margin: 0 }}>
          <motion.span className="row" key={q} initial={reduce ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }}>{q}</motion.span>
        </h2>
      </>
    );
    overline = `${word} · #${lh.sequence} · done`;
    if (v.phase === "check_in" || v.phase === "ballot") {
      answer = <Answer key="again" onClick={() => void ballot("yes")} icon={<Again size={20} />} testId="call-again">Run it back</Answer>;
      leftLinks = (
        <>
          <button type="button" className="call-link" onClick={() => void ballot("not_sure")}>not sure</button>
          <button type="button" className="call-link" onClick={() => void ballot("no")}>pass</button>
        </>
      );
    } else if (v.phase === "waiting_reveal") {
      responses = (
        <div style={{ display: "grid", gap: "var(--s2)" }}>
          <div className="call-discs" aria-label={`${answered} of ${n} answered`}>
            {Array.from({ length: Math.max(n, answered) }, (_, i) => (
              <Disc key={i} tone={i < answered ? "private" : "private-empty"} size={14} delay={i * 0.06} />
            ))}
          </div>
          <p className="call-mono sm" style={{ margin: 0 }}>answers stay private</p>
        </div>
      );
    }
    leftLinks = (
      <>
        {leftLinks}
        <button type="button" className="call-link" onClick={() => setOkOpen(true)}>everything okay?</button>
      </>
    );
  } else if (v.phase === "vote") {
    // ── Pick the next one: options as lines, voters as discs (circles, not percentages; J2) ──
    const opts = v.options;
    const size = fitSize(opts.map((o) => `${dayWord(o.starts_at)} the ${ordinal(o.starts_at)},`), avail, Math.min(desk ? 76 : 48, Math.floor(((h - 300) / opts.length - 72) / 1.96)), 32);
    const voters = (id: ID) => Object.entries(v.vote?.votes ?? {}).filter(([, sid]) => sid === id).map(([u]) => u);
    overline = `${word} · #${v.round} · pick one`;
    call = (
      <div role="radiogroup" aria-label="Pick the next one" style={{ display: "grid", gap: desk ? "var(--s8)" : "var(--s6)" }}>
        {opts.map((o, i) => {
          const mine = v.myVote === o.id;
          const vs = voters(o.id);
          const ov = useStore.getState().db.venues[o.venue_id];
          return (
            <motion.div key={o.id} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, duration: 0.45, ease }} style={{ display: "grid", gap: "var(--s2)" }}>
              <button type="button" role="radio" aria-checked={mine} aria-label={`${dayWord(o.starts_at)} the ${ordinal(o.starts_at)}, ${hourWord(o.starts_at)}, ${venueWord(ov)}`} className="call-line" data-testid={`call-option-${i}`} onClick={() => v.vote && void repo.voteNextOption(v.vote.id, o.id)} style={{ all: "unset", cursor: "pointer", display: "block", fontFamily: "var(--serif)", fontSize: size, lineHeight: 0.98, letterSpacing: "-0.025em", fontWeight: mine ? 520 : 360, fontVariationSettings: '"opsz" 72', color: mine || !v.myVote ? "var(--c-ink)" : "var(--c-ink-2)", transition: "font-weight 400ms, color 200ms" }}>
                <span className="call-word" style={{ textDecorationThickness: mine ? 3 : 2 }}>{dayWord(o.starts_at)} the {ordinal(o.starts_at)},</span>
                <span style={{ display: "block", paddingLeft: "0.62em", fontStyle: "italic" }}>{hourWord(o.starts_at)}.</span>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", minHeight: 28 }}>
                <div className="call-discs" data-testid={`call-voters-${i}`} data-count={vs.length} style={{ display: vs.length ? "flex" : "none" }}>
                  {vs.map((u, j) => <Disc key={u} label={u === meId ? "Y" : initial(names[u] ?? "")} tone={u === meId ? "me" : tone(u)} size={28} delay={j * 0.06} title={u === meId ? "You" : names[u]} />)}
                </div>
                <span className="call-mono sm">{venueWord(ov).toLowerCase()}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
    leftLinks = <span className="call-mono sm">first to {v.threshold} wins</span>;
  } else if (s && venue) {
    // ── The call ──
    const day = v.round >= 2 ? `${dayWord(s.starts_at)} the ${ordinal(s.starts_at)}.` : `${dayWord(s.starts_at)}.`;
    const hour = `${hourWord(s.starts_at)}.`;
    const placeText = lockedNow ? callVenue(venue) : placeWord(venue, pod.topic_key);
    const place = placeText.charAt(0).toUpperCase() + placeText.slice(1) + ".";
    const ending = v.phase === "happening_now" ? "Now." : lockedNow ? "We're on" : `${v.going.length} in.`;
    const size = fitSize([day, hour, place, ending], avail, maxSize, 40, lockedNow ? 0.53 : 0.47);
    const freeWhy = freeLine(s.trace);
    const end = hourWord(s.plan_json.ends_at);
    call = (
      <h2 className="call-line" data-weight={lockedNow ? "on" : undefined} style={{ ["--size" as string]: `${size}px`, margin: 0 }} aria-live="polite">
        <span className="row">{day}</span>
        <span className="row">
          <button type="button" className="call-word" aria-expanded={hourOpen} onClick={() => setHourOpen((x) => !x)} data-testid="call-hour">{hour.slice(0, -1)}</button>.
        </span>
        <span className="row">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={placeText} style={{ display: "inline-block" }} initial={{ opacity: 0, y: "0.3em" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "-0.3em" }} transition={{ duration: 0.4, ease, delay: justLocked ? 0.5 : 0 }}>
              <button type="button" className="call-word" onClick={() => setPlaceOpen(true)} data-testid="call-place">{place.slice(0, -1)}<span style={{ textDecoration: "none", display: "inline-block" }}>.</span></button>
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="row" style={{ fontStyle: lockedNow ? "normal" : "italic", color: lockedNow ? "var(--c-ink)" : "var(--c-ink-2)" }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={ending} style={{ display: "inline-block" }} initial={{ opacity: 0, y: "0.4em" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "-0.4em" }} transition={{ duration: 0.32, ease, delay: justLocked ? 0.25 : 0 }}>
              {ending}
              {lockedNow && (
                <motion.span
                  className="call-stop"
                  initial={justLocked && !reduce ? { y: "-2.2em", scale: 2.4, opacity: 0 } : false}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                  aria-hidden
                />
              )}
              
            </motion.span>
          </AnimatePresence>
        </span>
      </h2>
    );
    const others = v.going.filter((u) => u !== meId);
    const seats = Math.max(0, v.threshold - others.length - 1);
    responses = (
      <div className="call-discs" aria-label={`${v.going.length} in`}>
        {others.map((u, i) => <Disc key={u} label={initial(names[u] ?? "")} tone={String(i % 4)} size={desk ? 56 : 48} delay={reduce ? 0 : 0.2 + i * 0.12} title={names[u]} />)}
        {v.imIn ? (
          <Disc key="me" label="Y" tone="me" size={desk ? 56 : 48} layoutId={`seat-${pod.id}`} title="You" />
        ) : (
          <Disc key="seat" label="you" kind="seat" size={desk ? 56 : 48} />
        )}
        {!lockedNow && Array.from({ length: seats }, (_, i) => <Disc key={`open${i}`} kind="seat" size={desk ? 56 : 48} title="Open seat" />)}
      </div>
    );
    const hourNote = `${hourWord(s.starts_at)}–${end}${freeWhy ? ` · ${freeWhy}` : ""}`;
    const placeNote = `${venueWord(venue).toLowerCase()}${venue.indoor ? " · indoors" : " · rain plan ready"}`;
    if (desk) {
      margin = (
        <div style={{ display: "grid", gap: "var(--s6)" }}>
          <Caption k="when" v={hourNote} hot={hourOpen} />
          <Caption k="where" v={placeNote} />
        </div>
      );
    } else {
      margin = (
        <AnimatePresence>
          {hourOpen && (
            <motion.p className="call-mono" style={{ margin: 0 }} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease }}>
              {hourNote}
            </motion.p>
          )}
        </AnimatePresence>
      );
    }
    if (v.phase === "proposed") {
      answer = <Answer key="in" onClick={() => void rsvp("going")} layoutId={`seat-${pod.id}`} icon={<In size={14} />} disabled={busy} testId="call-in">I&rsquo;m in</Answer>;
    } else if (v.phase === "in" || v.phase === "locked" || v.phase === "starting_soon") {
      answer = <button key="out" type="button" className="call-link" onClick={() => void rsvp("not_going")}>can&rsquo;t make it</button>;
    }
    leftLinks = (
      <button type="button" className="call-link" onClick={() => setWorkOpen(true)} data-testid="call-work" style={{ whiteSpace: "nowrap" }}>
        planned by {s.source === "claude" ? "claude" : "pods"} · {s.trace.length} checks
      </button>
    );
  } else if (v.phase === "pending_review") {
    call = <h2 className="call-line" style={{ ["--size" as string]: `${maxSize}px`, margin: 0 }}><span className="row">Almost.</span></h2>;
  } else {
    call = <h2 className="call-line" style={{ ["--size" as string]: `${maxSize}px`, margin: 0 }}><span className="row">Next one?</span></h2>;
    answer = <Answer key="plan" onClick={() => void planFirst()} icon={<In size={14} />} testId="call-plan">Plan it</Answer>;
  }

  return (
    <>
      <motion.div
        className="call-sun"
        aria-hidden
        animate={{ scale: lockedNow ? 1.18 : after ? 0.82 : 1, backgroundColor: lockedNow ? "var(--hue-deep)" : "var(--hue-field)", opacity: after ? 0.6 : 1 }}
        transition={{ duration: reduce ? 0 : 0.9, ease }}
      />
      {after && <div aria-hidden data-surface="dusk" style={{ position: "absolute", inset: 0, zIndex: 0, mixBlendMode: "multiply" }} />}

      <div
        style={{
          position: "relative", zIndex: 1, height: "100%", boxSizing: "border-box",
          padding: desk ? "max(120px, 16svh) var(--gutter) 0" : "max(96px, 14svh) var(--gutter) 0",
          display: "grid", gridTemplateColumns: desk ? "minmax(0, 1fr) 300px" : "1fr", columnGap: "var(--s24)", alignContent: "start",
        }}
      >
        <div style={{ display: "grid", gap: "var(--s6)", alignContent: "start" }}>
          <p className="call-mono" style={{ margin: 0 }}>{overline}</p>
          {call}
          {!desk && margin}
          {responses && <div style={{ marginTop: "var(--s2)" }}>{responses}</div>}
        </div>
        {desk && <div style={{ paddingTop: 40 }}>{margin}</div>}
      </div>

      <div
        style={{
          position: "absolute", zIndex: 2, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--s4)",
          padding: desk ? "0 var(--gutter) var(--s12)" : "0 var(--gutter) calc(var(--s6) + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: "var(--s4)", alignItems: "center", maxWidth: desk ? 520 : 230 }}>{leftLinks}</div>
        <AnimatePresence mode="wait">{answer}</AnimatePresence>
      </div>

      <Sheet open={placeOpen && !!venue} onClose={() => setPlaceOpen(false)} label="The place">
        {venue && s && (
          <>
            <p className="call-mono sm" style={{ margin: "0 0 var(--s2)" }}>{lockedNow ? "where" : placeWord(venue, pod.topic_key)}</p>
            <h2>{venueWord(venue)}</h2>
            <dl>
              <dt>address</dt><dd>{noCity(venue.address).replace(/,\s*$/, "")}</dd>
              {venue.meet_note && (<><dt>find us</dt><dd>{venue.meet_note}</dd></>)}
              <dt>rain</dt><dd>{rainWord(s.plan_json.rain_plan, venue.indoor)}</dd>
              <dt>cost</dt><dd>{s.plan_json.cost.toLowerCase()}</dd>
              {s.plan_json.bring.length > 0 && (<><dt>bring</dt><dd>{s.plan_json.bring.slice(0, 3).join(", ").toLowerCase()}</dd></>)}
            </dl>
          </>
        )}
      </Sheet>

      <Sheet open={workOpen && !!s} onClose={() => setWorkOpen(false)} label="How it was planned">
        {s && (
          <>
            <p className="call-mono sm" style={{ margin: "0 0 var(--s2)" }}>planned by {s.source === "claude" ? "claude" : "pods"}</p>
            <h2>{s.trace.length} checks</h2>
            <ol style={{ margin: "var(--s6) 0 0", padding: 0, listStyle: "none", display: "grid", gap: "var(--s3)" }}>
              {s.trace.slice(0, 6).map((r, i) => (
                <li key={r.id + i} className="call-mono" style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: "var(--s2)", color: "var(--c-ink)" }}>
                  <span aria-hidden style={{ width: 8, height: 8, marginTop: 4, borderRadius: 99, background: r.status === "warn" ? "var(--amber-500)" : "var(--hue)" }} />
                  <span>{traceLine(r)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </Sheet>

      <Sheet open={okOpen} onClose={() => setOkOpen(false)} label="Everything okay?">
        <OkSheet podId={pod.id} people={(checkedIn.length ? checkedIn : v.going).filter((u) => u !== meId)} names={names} onDone={() => setOkOpen(false)} />
      </Sheet>
    </>
  );
}

/** The venue as it sits in the call: its name without the generic suffix ("Brahan Spring"). Full name in the sheet. */
function callVenue(v: Venue): string {
  const n = venueWord(v).replace(/\s+(Rec Center|Recreation Center|Community Center|Public Library|Library|Courts?)$/i, "");
  return n || venueWord(v);
}

function Caption({ k, v, hot }: { k: string; v: string; hot?: boolean }) {
  return (
    <div style={{ borderTop: "1px solid var(--c-rule)", paddingTop: "var(--s2)" }}>
      <p className="call-mono sm" style={{ margin: 0, color: "var(--c-ink-3)" }}>{k}</p>
      <p className="call-mono" style={{ margin: "var(--s1) 0 0", color: hot ? "var(--c-ink)" : undefined }}>{v}</p>
    </div>
  );
}

function rainWord(plan: string, indoor: boolean): string {
  if (indoor) return "indoors, so it stays on";
  const m = /moves it to ([^.]+?) and/i.exec(plan);
  if (m) return `moves to ${noCity(m[1])}`;
  return "new time, same week";
}

// ── Private check after a hangout: report or block, one tap each ─────
function OkSheet({ podId, people, names, onDone }: { podId: ID; people: ID[]; names: Record<ID, string>; onDone: () => void }) {
  const repo = useRepo();
  const [who, setWho] = useState<ID | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const report = async (reason: ReportReason) => {
    if (!who) return;
    await repo.report({ reportedUserId: who, podId, reason });
    setSent("reported. only our team sees this.");
  };
  const block = async () => {
    if (!who) return;
    await repo.block(who);
    setSent(`blocked ${names[who]?.toLowerCase()}.`);
  };
  if (sent) return (<><h2>Thanks.</h2><p className="call-mono" style={{ margin: "var(--s4) 0 0" }}>{sent}</p><button type="button" className="call-link" onClick={onDone}>done</button></>);
  return (
    <>
      <p className="call-mono sm" style={{ margin: "0 0 var(--s2)" }}>private</p>
      <h2>{who ? names[who] : "About someone?"}</h2>
      {!who ? (
        <p style={{ margin: "var(--s6) 0 0", fontSize: 24, lineHeight: 1.6 }}>
          {people.map((u) => (
            <span key={u}><button type="button" className="call-word quiet" onClick={() => setWho(u)} style={{ minHeight: 44 }}>{names[u]}</button>{"  "}</span>
          ))}
        </p>
      ) : (
        <div style={{ marginTop: "var(--s6)", display: "grid", gap: "var(--s2)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: "var(--s4)" }}>
            <button type="button" className="call-link" onClick={() => void report("unsafe")}>felt unsafe</button>
            <button type="button" className="call-link" onClick={() => void report("harassment")}>harassment</button>
            <button type="button" className="call-link" onClick={() => void report("other")}>something else</button>
          </div>
          <button type="button" className="call-link" onClick={() => void block()} style={{ color: "var(--c-ink)" }}>block</button>
        </div>
      )}
    </>
  );
}

// ── The room: the pod's chat, pulled down from the top ───────────────
function TheRoom({ podId, onClose }: { podId: ID; onClose: () => void }) {
  const repo = useRepo();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const msgs = useDb((db: DbState) =>
    (db.messages[podId] ?? [])
      .filter((m) => m.kind === "text" && m.user_id && !db.blocks.some((b) => b.blocker_id === db.me && b.blocked_id === m.user_id))
      .slice(-60)
      .map((m) => ({ id: m.id, who: m.user_id === db.me ? "you" : firstName(db, m.user_id!), text: m.text, mine: m.user_id === db.me })),
  );
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await repo.sendMessage(podId, t, `call-${podId}-${msgs.length}-${t.length}-${t.slice(0, 6)}`);
  };
  return (
    <>
      <motion.div className="call-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="call-room"
        role="dialog"
        aria-modal="true"
        aria-label="The room"
        initial={{ y: "-100%" }}
        animate={{ y: 0 }}
        exit={{ y: "-100%", transition: { duration: 0.22 } }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        onDragEnd={(_, i) => i.offset.y < -80 && onClose()}
      >
        <div style={{ padding: "var(--s4) var(--gutter) 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="call-mono" style={{ margin: 0 }}>the room</p>
          <button type="button" className="call-link" onClick={onClose}>close</button>
        </div>
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "var(--s4) var(--gutter)", display: "grid", alignContent: "end", gap: "var(--s4)" }}>
          {msgs.length === 0 && <p className="call-mono" style={{ margin: 0 }}>quiet so far</p>}
          {msgs.map((m) => (
            <div key={m.id} style={{ maxWidth: 440, justifySelf: m.mine ? "end" : "start", textAlign: m.mine ? "right" : "left" }}>
              <p className="call-mono sm" style={{ margin: "0 0 2px" }}>{m.who.toLowerCase()}</p>
              <p style={{ margin: 0, fontSize: 19, lineHeight: 1.35, letterSpacing: "-0.005em" }}>{m.text}</p>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          style={{ display: "flex", alignItems: "center", gap: "var(--s3)", padding: "var(--s3) var(--gutter) var(--s6)" }}
        >
          <input className="call-input" aria-label="Say something" placeholder="say something" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1, fontSize: 20 }} />
          <button type="submit" className="call-link" aria-label="Send" style={{ width: 44, justifyContent: "center", color: "var(--c-ink)" }}><Send size={24} /></button>
        </form>
        <div aria-hidden style={{ width: 40, height: 4, borderRadius: 4, background: "var(--c-rule)", margin: "0 auto var(--s3)" }} />
      </motion.div>
    </>
  );
}
