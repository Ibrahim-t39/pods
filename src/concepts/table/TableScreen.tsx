// TABLE · one pod as a round table seen from above. Your seat is at 6 o'clock. Claude lays the table (time, place,
// sky, rain plan) in at most 6 beats; hold your seat to sit in; at 4 the room dims and the lamp falls (PB 4.4, 7.2).
// After the hangout: the chairs sit pushed back and a private card asks "Same table?" (CM 127; PB 2.6).
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlanActions } from "@/components/planner/use-plan-actions";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { cardView, type CardView } from "@/lib/planner/card-state";
import { useClock } from "@/lib/time/clock";
import { formatTime, formatWeekday } from "@/lib/time/format";
import type { HangoutSuggestion, ID, PlannerStep } from "@/lib/types";
import { IcClose, IcFlip, IcPlace, IcRain, IcRoom, IcSend, IcSky, IcTalk } from "./icons";
import { captions, HUE_VAR, myTables, onCircle, people, shortVenue, type Person } from "./model";
import { Disc, GENTLE, HoldRing, Paper, SNAPPY, TableTop, useHold, useWide } from "./ui";

const BEAT: Record<PlannerStep["id"], string> = {
  pod: "Reading the table",
  context: "Remembering last time",
  time: "Finding a time",
  venues: "Picking a place",
  weather: "Checking the sky",
  repeat: "Keeping it fresh",
  draft: "Writing it up",
  validate: "Checking the rules",
  retry: "Checking the rules",
};
const CITY_WORD = /\b(Huntsville|Alabama|Madison|Decatur|AAMU|Rocket City)\b/i;
const SLOT_ANGLES = [270, 180, 0, 225, 315, 135, 45];
const seen = new Set<string>(); // plans already laid in front of you this session

const hm = (iso: string) => formatTime(iso).replace(":00", "").toLowerCase();
const day = (iso: string) => formatWeekday(iso);

export function TableScreen() {
  const { podId } = useParams<{ podId: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const wide = useWide();
  const reduce = useReducedMotion();
  const repo = useRepo();
  const now = useClock(15_000);
  const nowMs = now.getTime();
  const sel = useCallback((db: Parameters<typeof cardView>[0]) => cardView(db, podId, nowMs), [podId, nowMs]);
  const view = useDb(sel);
  const ppl = useDb(useCallback((db: Parameters<typeof people>[0]) => people(db, podId), [podId]));
  const tables = useDb(myTables);
  const meId = useDb((db) => db.me);
  const s = view?.suggestion ?? null;
  const shownS = useDb(useCallback((db: Parameters<typeof captions>[0]) => (view?.lastHangout && view.phase !== "vote" && view.phase !== "proposed" && view.phase !== "in" ? db.suggestions[view.lastHangout.suggestion_id] ?? s : s), [view?.lastHangout, view?.phase, s]));
  const cap = useDb(useCallback((db: Parameters<typeof captions>[0]) => captions(db, shownS ?? null), [shownS]));
  const venues = useDb((db) => db.venues);
  const actions = usePlanActions(podId);
  const table = tables.find((t) => t.pod.id === podId);
  const hue = table ? HUE_VAR[table.hue] : "var(--tb-ink)";
  const open = tables.filter((t) => t.open);
  const idx = open.findIndex((t) => t.pod.id === podId);

  const [flip, setFlip] = useState(false);
  const [talk, setTalk] = useState(false);
  const [lockShow, setLockShow] = useState<null | { iso: string; venue: string; round: number; going: number }>(null);
  const [pending, setPending] = useState(false);
  const [beat, setBeat] = useState<{ k: number; labels: string[] } | null>(null);

  // ── Lay the table (beats) the first time a plan is in front of you ──
  const layable = !!s && !!view && (view.phase === "proposed" || view.phase === "in" || view.phase === "vote");
  const trace = s?.trace;
  const sid = s?.id;
  useEffect(() => {
    if (!layable || !sid || !trace || seen.has(sid)) return;
    seen.add(sid);
    const ids = trace.map((t) => t.id).filter((id, i, a) => a.indexOf(id) === i && BEAT[id]);
    let labels = [...new Set(ids.map((id) => BEAT[id]))];
    if (labels.length > 6) labels = labels.filter((l) => l !== BEAT.context && l !== BEAT.repeat);
    labels = labels.slice(0, 6);
    if (reduce || !labels.length) return;
    let k = 0;
    setBeat({ k, labels });
    const t = setInterval(() => {
      k++;
      if (k >= labels.length) {
        clearInterval(t);
        setBeat(null);
      } else setBeat({ k, labels });
    }, 620);
    // no cleanup on re-render: the beats finish even if the store ticks
  }, [layable, sid, trace, reduce]);

  // ── Round two: when the table says "run it back", Claude lays the next options ──
  useEffect(() => {
    if (view?.phase === "planning_next") void actions.planNextRound(view as CardView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.phase]);

  // ── Lock moment on the transition into "locked" (I'm in, or the 4th vote) ──
  const prev = useRef<string | null>(null);
  useEffect(() => {
    const p = view?.phase ?? null;
    if (prev.current && (prev.current === "in" || prev.current === "proposed" || prev.current === "vote") && p === "locked" && view?.hangout) {
      const h = view.hangout;
      setLockShow({ iso: h.starts_at, venue: venues[h.venue_id] ? shortVenue(venues[h.venue_id]) : "", round: h.sequence, going: view.going.length });
    }
    prev.current = p;
  }, [view, venues]);

  // ── Walk sideways to the next table (swipe, arrows) ──
  const walk = useCallback(
    (dir: 1 | -1) => {
      if (open.length < 2 || idx < 0) return;
      const t = open[(idx + dir + open.length) % open.length];
      router.replace(`/concepts/table/t/${t.pod.id}`);
    },
    [open, idx, router],
  );
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") walk(1);
      if (e.key === "ArrowLeft") walk(-1);
      if (e.key === "Escape") {
        if (flip) setFlip(false);
        else if (!talk && !lockShow) router.push("/concepts/table/room");
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [walk, flip, talk, lockShow, router]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // ── Actions ──
  const sitIn = useCallback(async () => {
    if (!view?.targetId || pending) return;
    setPending(true);
    const r = await repo.rsvp(view.targetId, "going");
    setPending(false);
    if (r.ok && r.data.locked && view.phase !== "locked") {
      // the transition effect shows the moment; nothing else to do
    }
  }, [view, repo, pending]);
  const cantMake = async () => {
    if (!view?.targetId) return;
    await repo.rsvp(view.targetId, "not_going");
  };
  const answer = async (a: "yes" | "not_sure" | "no") => {
    const h = view?.lastHangout;
    if (!h || pending) return;
    setPending(true);
    if (!view.checkedIn) await repo.checkIn(h.id);
    await repo.castRunItBack(h.id, a);
    setPending(false);
  };
  const vote = async (o: HangoutSuggestion) => {
    if (!view?.vote || pending) return;
    setPending(true);
    await repo.voteNextOption(view.vote.id, o.id);
    setPending(false);
  };
  const hold = useHold(() => void sitIn());

  if (!hydrated || !view) {
    return <Paper><div style={{ minHeight: "100dvh" }} /></Paper>;
  }

  // ── Geometry ──
  const S = wide ? 600 : 350;
  const chairD = Math.max(44, S * 0.13);
  const slotD = S * 0.105;
  const visible = ppl.slice(0, 8);
  const extra = ppl.length - visible.length;
  const N = Math.max(4, visible.length);
  const chairDeg = (k: number) => 90 + (k * 360) / N;
  const phase = view.phase;
  const after = phase === "check_in" || phase === "ballot" || phase === "waiting_reveal" || phase === "planning_next" || phase === "missed";
  const locked = phase === "locked" || phase === "starting_soon" || phase === "happening_now";
  const planOn = phase === "proposed" || phase === "in" || locked;
  const going = new Set(view.going);
  const imIn = !!meId && going.has(meId);
  const others = visible.filter((p) => !p.me && going.has(p.id));
  const slotOf = new Map<ID, number>();
  others.forEach((p, i) => slotOf.set(p.id, SLOT_ANGLES[i % SLOT_ANGLES.length]));
  const openSlots = Math.max(0, view.threshold - view.going.length);
  const iso = view.hangout?.starts_at ?? s?.starts_at ?? null;
  const laying = !!beat || (actions.genKind !== null && phase !== "locked");
  const beatK = beat?.k ?? 99;
  const shows = (n: number) => !beat || beatK >= n; // which dealt object is on the table yet
  const pushBack = after ? 0.47 : 0.43;

  // ── The moment line (one line, one hint) ──
  let line = "";
  let hint: React.ReactNode = null;
  if (laying) {
    line = actions.genKind === "next" ? "Laying #2." : "Laying the table.";
    hint = <span className="tb-breathe">{beat ? beat.labels[beat.k] : actions.genSteps.at(-1) ? BEAT[actions.genSteps.at(-1)!.id] : "Claude"}</span>;
  } else if (phase === "empty") {
    line = "Quiet table.";
  } else if (phase === "proposed" || phase === "in") {
    line = imIn ? (openSlots ? `${openSlots === 1 ? "One seat" : `${openSlots} seats`} to go.` : "You're in.") : openSlots === 1 ? "One seat left." : `${view.going.length} in.`;
    hint = imIn ? <button className="tb-quiet tb-muted" onClick={cantMake}>Can&apos;t make it</button> : hold.armed ? "Tap again" : "Hold your seat";
  } else if (locked) {
    line = imIn ? "You're in." : `${view.going.length} in.`;
    hint = imIn ? <button className="tb-quiet tb-muted" onClick={cantMake}>Can&apos;t make it</button> : "Hold your seat to join";
  } else if (phase === "vote") {
    line = view.myVote ? "Waiting on the table." : "Pick the next one.";
    hint = `First to ${view.threshold}`;
  } else if (phase === "check_in" || phase === "ballot") {
    line = "Same table?";
    hint = "Only you see this";
  } else if (phase === "waiting_reveal") {
    line = "Waiting on the table.";
    hint = "Answers stay private";
  } else if (phase === "planning_next") {
    line = "Laying #2.";
  } else if (phase === "missed") {
    line = "Next time.";
  } else if (phase === "pending_review") {
    line = "Being checked.";
  }

  // ── The table ──
  const centreR = flip ? 0.31 : 0.15;
  const tableEl = (
    <motion.div
      initial={reduce ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={GENTLE}
      style={{ width: S, height: S, position: "relative", flex: "none" }}
    >
      <TableTop size={S} seats={visible.map((_, k) => chairDeg(k))} hue={hue}>
        {/* chairs: people who haven't sat in yet; empty chairs where someone moved in */}
        {visible.map((p, k) => {
          const deg = chairDeg(k);
          if (p.me) return null;
          const inNow = going.has(p.id) && (planOn || phase === "vote");
          return inNow ? (
            <Disc key={`c-${p.id}`} deg={deg} r={pushBack} d={chairD * 0.5} dashed />
          ) : (
            <Disc key={`c-${p.id}`} deg={deg} r={pushBack} d={chairD} color={p.color} initial={p.initial} label={p.name} z={2} />
          );
        })}
        {extra > 0 && (
          <span className="tb-mono tb-t-cap tb-muted" style={{ position: "absolute", ...onCircle(chairDeg(visible.length - 1) + 360 / N / 2, 0.5), transform: "translate(-50%,-50%)" }}>
            +{extra}
          </span>
        )}

        {/* hands in: people who are in, around the plan */}
        {(planOn || phase === "vote") &&
          phase !== "vote" &&
          others.map((p) => <Disc key={`s-${p.id}`} deg={slotOf.get(p.id)!} r={locked ? 0.235 : 0.255} d={slotD} color={p.color} initial={p.initial} label={`${p.name}, in`} z={3} from={{ deg: slotOf.get(p.id)!, r: 0.43 }} />)}
        {planOn &&
          !locked &&
          !laying &&
          Array.from({ length: Math.max(0, openSlots - (imIn ? 0 : 1)) }, (_, i) => (
            <Disc key={`o-${i}`} deg={SLOT_ANGLES[(others.length + i) % SLOT_ANGLES.length]} r={0.255} d={slotD} dashed />
          ))}
        {planOn && !locked && !imIn && !laying && openSlots >= 1 && <Disc key="o-me" deg={90} r={0.255} d={slotD} dashed pulse={openSlots === 1} />}

        {/* the centre: what's on the table */}
        <AnimatePresence>
          {phase !== "vote" && !(phase === "check_in" || phase === "ballot") && (
            <motion.button
              key="centre"
              className="tb-hit"
              onClick={() => iso && !laying && setFlip(!flip)}
              aria-label={flip ? "Close why" : "Why this plan"}
              aria-expanded={flip}
              disabled={!iso || laying}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: shows(1) || !iso ? 1 : 0, width: S * centreR * 2, height: S * centreR * 2, marginLeft: -S * centreR, marginTop: -S * centreR }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={SNAPPY}
              style={{
                position: "absolute", left: "50%", top: "50%", borderRadius: "50%", zIndex: flip ? 6 : 4,
                background: "var(--tb-paper-lit)", boxShadow: `0 0 0 1px var(--tb-line), 0 0 0 ${flip ? 0 : 5}px var(--tb-table), 0 0 0 ${flip ? 0 : 6}px ${hue}`,
                display: "grid", placeItems: "center", textAlign: "center", padding: flip ? "14%" : 0,
              }}
            >
              {flip && shownS ? (
                <span className="tb-mono" style={{ display: "grid", gap: 10, fontSize: wide ? 14 : 12, lineHeight: 1.4 }}>
                  <span>{(shownS.plan_json.reason || shownS.summary).replace(/\.$/, "")}.</span>
                  <span className="tb-muted">{venues[shownS.venue_id]?.cost_per_person ? `$${venues[shownS.venue_id].cost_per_person} each` : "Free"} · {venues[shownS.venue_id]?.indoor ? "inside" : "outside"} · public</span>
                  <span className="tb-muted">Laid by Claude</span>
                </span>
              ) : iso && !(phase === "planning_next" || laying && actions.genKind) ? (
                <span style={{ display: "grid", gap: 4 }}>
                  <span className="tb-serif" style={{ fontSize: S * 0.1, lineHeight: 0.9 }}>{day(iso).slice(0, 3)}</span>
                  <span className="tb-mono" style={{ fontSize: wide ? 14 : 12 }}>{hm(iso)}</span>
                  {(view.round ?? 1) > 1 && <span className="tb-mono tb-t-cap tb-muted">#{view.round}</span>}
                </span>
              ) : (
                <span className="tb-mono tb-t-cap tb-muted tb-breathe">{laying || phase === "planning_next" ? "···" : "—"}</span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* vote: options as discs on the table; votes gather as people's discs (J #2) */}
        {phase === "vote" &&
          view.options.map((o, i) => {
            const n = view.options.length;
            const deg = n === 2 ? [180, 0][i] : [210, 330, 90][i];
            const r = n === 2 ? 0.15 : 0.17;
            const d = S * (n === 2 ? 0.27 : 0.24);
            const voters = Object.entries(view.vote?.votes ?? {}).filter(([, sid]) => sid === o.id).map(([uid]) => ppl.find((p) => p.id === uid)).filter(Boolean) as Person[];
            const mine = view.myVote === o.id;
            return (
              <motion.button
                key={o.id}
                className="tb-hit"
                onClick={() => void vote(o)}
                aria-pressed={mine}
                aria-label={`${day(o.starts_at)} ${hm(o.starts_at)}, ${venues[o.venue_id] ? shortVenue(venues[o.venue_id]) : ""}`}
                initial={{ ...onCircle(90, 0.43), opacity: 0, scale: 0.5 }}
                animate={{ ...onCircle(deg, r), opacity: 1, scale: 1 }}
                transition={{ ...SNAPPY, delay: 0.1 + i * 0.12 }}
                style={{ position: "absolute", width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, borderRadius: "50%", background: mine ? "var(--tb-ink)" : "var(--tb-paper-lit)", color: mine ? "var(--tb-paper-lit)" : "var(--tb-ink)", boxShadow: `0 0 0 1px ${mine ? "var(--tb-ink)" : "var(--tb-line-2)"}`, display: "grid", placeContent: "center", gap: 3, textAlign: "center", zIndex: 4 }}
              >
                <span className="tb-serif" style={{ fontSize: d * 0.26, lineHeight: 0.9 }}>{day(o.starts_at).slice(0, 3)}</span>
                <span className="tb-mono" style={{ fontSize: 11 }}>{hm(o.starts_at)}</span>
                <span className="tb-mono" style={{ fontSize: 10, opacity: 0.7, maxWidth: d * 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venues[o.venue_id] ? shortVenue(venues[o.venue_id]) : ""}</span>
                {voters.map((p, k) => {
                  const a = ((-90 + (k - (voters.length - 1) / 2) * 26) * Math.PI) / 180;
                  const vd = Math.max(14, d * 0.17);
                  return <span key={p.id} aria-hidden style={{ position: "absolute", left: d / 2 + (d / 2) * Math.cos(a) - vd / 2, top: d / 2 + (d / 2) * Math.sin(a) - vd / 2, width: vd, height: vd, borderRadius: "50%", background: p.me ? "var(--tb-ember)" : p.color, border: "2px solid var(--tb-table)" }} />;
                })}
              </motion.button>
            );
          })}

        {/* Same table? A private card on the table (CM 127-130, 182) */}
        {(phase === "check_in" || phase === "ballot") && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SNAPPY}
            role="radiogroup"
            aria-label="Same table?"
            style={{ position: "absolute", left: "50%", top: "50%", width: S * 0.6, height: S * 0.6, marginLeft: -S * 0.3, marginTop: -S * 0.3, borderRadius: "50%", background: "var(--tb-paper-lit)", boxShadow: "0 0 0 1px var(--tb-line)", display: "flex", alignItems: "center", justifyContent: "center", gap: S * 0.025, zIndex: 5 }}
          >
            {(
              [
                ["yes", "Yes"],
                ["not_sure", "Maybe"],
                ["no", "No"],
              ] as const
            ).map(([k, l], i) => {
              // Answers are discs, not pills: the yes disc is the big one (CM 127-130; PB 6.4).
              const d = Math.max(56, S * (k === "yes" ? 0.2 : 0.14));
              return (
                <motion.button
                  key={k}
                  role="radio"
                  aria-checked={false}
                  aria-label={l}
                  className="tb-hit tb-mono"
                  disabled={pending}
                  onClick={() => void answer(k)}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ ...SNAPPY, delay: 0.15 + i * 0.08 }}
                  style={{ width: d, height: d, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: k === "yes" ? 15 : 13, fontWeight: 500, background: k === "yes" ? "var(--tb-ink)" : "transparent", color: k === "yes" ? "var(--tb-paper-lit)" : "var(--tb-ink)", boxShadow: k === "yes" ? "none" : "inset 0 0 0 1px var(--tb-line-2)" }}
                >
                  {l}
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* your seat, 6 o'clock, near the thumb */}
        {(() => {
          const meP = visible.find((p) => p.me);
          if (!meP) return null;
          const inside = imIn && (planOn || phase === "vote") && phase !== "vote";
          const canHold = !imIn && (phase === "proposed" || locked) && !laying;
          return (
            <motion.div
              key="me"
              style={{ position: "absolute", width: inside ? slotD : chairD, height: inside ? slotD : chairD, zIndex: 5 }}
              animate={{ ...onCircle(90, inside ? (locked ? 0.235 : 0.255) : pushBack), marginLeft: -(inside ? slotD : chairD) / 2, marginTop: -(inside ? slotD : chairD) / 2, width: inside ? slotD : chairD, height: inside ? slotD : chairD }}
              transition={SNAPPY}
            >
              <button
                className="tb-hit"
                disabled={!canHold}
                aria-label={canHold ? "Hold your seat to sit in" : `${meP.name}, you`}
                {...(canHold ? hold.bind : {})}
                style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--tb-ink)", color: "var(--tb-paper-lit)", display: "grid", placeItems: "center", position: "relative", touchAction: "none", userSelect: "none", cursor: canHold ? "pointer" : "default" }}
              >
                {canHold && <HoldRing d={inside ? slotD : chairD} progress={hold.progress} />}
                {canHold && hold.progress === 0 && <span className="tb-pulse" aria-hidden style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1.5px solid var(--tb-ember)" }} />}
                <span className="tb-serif" style={{ fontSize: (inside ? slotD : chairD) * 0.5 }}>{meP.initial}</span>
              </button>
            </motion.div>
          );
        })()}
      </TableTop>
    </motion.div>
  );

  // ── Margin captions (PB 1.4): place · sky / laid by · rain ──
  const capItem = (icon: React.ReactNode, text: string, n: number, align: "left" | "right" = "left") => (
    <motion.span
      className="tb-mono tb-t-cap"
      initial={false}
      animate={{ opacity: shows(n) ? 1 : 0, y: shows(n) ? 0 : 6 }}
      transition={{ duration: 0.3 }}
      style={{ display: "inline-flex", alignItems: "center", gap: "var(--s1)", justifyContent: align === "right" ? "flex-end" : "flex-start", color: "var(--tb-ink-2)", minHeight: 20 }}
    >
      {icon}
      {text}
    </motion.span>
  );
  const showCaps = cap && planOn && !flip;
  const capsTop = (
    <div style={{ display: "flex", justifyContent: "space-between", width: S, minHeight: 20 }}>
      {showCaps ? capItem(<IcPlace size={14} />, cap.place, 2) : <span />}
      {showCaps ? capItem(<IcSky size={14} />, cap.sky, 3, "right") : <span />}
    </div>
  );
  const capsBottom = (
    <div style={{ display: "flex", justifyContent: "space-between", width: S, minHeight: 20 }}>
      {showCaps && iso ? (
        <button className="tb-quiet tb-mono tb-t-cap" onClick={() => setFlip(!flip)} aria-label="Why this plan" style={{ minHeight: 44, marginBlock: -12, padding: 0, color: "var(--tb-ink-2)", opacity: shows(5) ? 1 : 0 }}>
          <IcFlip size={14} /> Why
        </button>
      ) : (
        <span />
      )}
      {showCaps && cap.rain !== "Rain-proof" ? capItem(<IcRain size={14} />, cap.rain, 4, "right") : <span />}
    </div>
  );

  const dots = open.length > 1 && (
    <div style={{ display: "flex", gap: 6 }} aria-label={`Table ${idx + 1} of ${open.length}`}>
      {open.map((t) => (
        <span key={t.pod.id} style={{ width: 6, height: 6, borderRadius: "50%", background: t.pod.id === podId ? "var(--tb-ink)" : "var(--tb-line-2)" }} />
      ))}
    </div>
  );
  const topBar = (
    <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button className="tb-quiet" onClick={() => router.push("/concepts/table/room")} aria-label="Room" style={{ marginLeft: -8 }}>
        <IcRoom size={24} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s4)" }}>
        {dots}
        <button className="tb-quiet" onClick={() => setTalk(true)} aria-label="Talk" style={{ marginRight: -8 }}>
          <IcTalk size={24} />
        </button>
      </div>
    </div>
  );
  const title = (
    <div style={{ display: "grid", gap: "var(--s1)" }}>
      <h1 className={`tb-serif ${wide ? "tb-t-xl" : "tb-t-l"}`} style={{ margin: 0 }}>{table?.name ?? ""}</h1>
    </div>
  );
  const moment = (
    <div style={{ display: "grid", gap: "var(--s2)", minHeight: wide ? 120 : 88 }}>
      <AnimatePresence mode="wait">
        <motion.p key={line} className={`tb-serif ${wide ? "tb-t-xl" : "tb-t-l"}`} style={{ margin: 0 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {line}
        </motion.p>
      </AnimatePresence>
      <div className="tb-mono tb-t-label tb-muted" style={{ minHeight: 24, display: "flex", alignItems: "center" }} aria-live="polite">{hint}</div>
    </div>
  );

  const mood = after ? "dusk" : "day";
  const content = wide ? (
    <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "minmax(380px, 1fr) auto", padding: "var(--s12) var(--s16)", gap: "var(--s24)" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {topBar}
        <div style={{ marginTop: "var(--s8)" }}>{title}</div>
        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: "var(--s12)" }}>{moment}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "var(--s4)", paddingRight: "var(--s8)" }}>
        {capsTop}
        {tableEl}
        {capsBottom}
      </div>
    </div>
  ) : (
    <div
      style={{ height: "100dvh", display: "flex", flexDirection: "column", padding: "var(--s4) var(--m) var(--m)" }}
      onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const st = swipe.current;
        swipe.current = null;
        if (!st) return;
        const dx = e.clientX - st.x;
        if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(e.clientY - st.y)) walk(dx < 0 ? 1 : -1);
      }}
    >
      {topBar}
      <div style={{ marginTop: "var(--s2)" }}>{title}</div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", alignContent: "center", justifyItems: "center", gap: "var(--s2)" }}>
        {capsTop}
        {tableEl}
        {capsBottom}
      </div>
      <div style={{ marginTop: "var(--s4)" }}>{moment}</div>
    </div>
  );

  return (
    <Paper mood={mood} lamp={wide ? { x: "70%", y: "48%" } : { x: "50%", y: "62%" }} label={table?.name}>
      {content}
      <AnimatePresence>{talk && <Talk podId={podId} onClose={() => setTalk(false)} wide={wide} />}</AnimatePresence>
      <AnimatePresence>{lockShow && <LockMoment {...lockShow} S={S} wide={wide} ppl={ppl.filter((p) => going.has(p.id))} hue={hue} onClose={() => setLockShow(null)} />}</AnimatePresence>
    </Paper>
  );
}

/** The lock: the room dims, the lamp falls on the table, one serif word cropped by the edge (AW 04, 42; TS 9). */
function LockMoment({ iso, venue, round, ppl, S, wide, hue, onClose }: { iso: string; venue: string; round: number; going: number; ppl: Person[]; S: number; wide: boolean; hue: string; onClose: () => void }) {
  const reduce = useReducedMotion();
  const word = `${day(iso)}.`;
  const shown = ppl.slice(0, 8);
  return (
    <motion.div
      role="dialog"
      aria-label="Locked"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.16 : 0.6 }}
      className="tb"
      data-mood="night"
      style={{ position: "fixed", inset: 0, zIndex: 50, minHeight: "100dvh", overflow: "hidden" }}
    >
      {/* the lamp pool */}
      <motion.div aria-hidden initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.9 }} style={{ position: "absolute", left: wide ? "62%" : "50%", top: wide ? "50%" : "40%", width: S * 1.5, height: S * 1.5, marginLeft: -S * 0.75, marginTop: -S * 0.75, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(247,230,196,.30), rgba(247,230,196,0))" }} />
      <div style={{ position: "absolute", left: wide ? "62%" : "50%", top: wide ? "50%" : "40%", transform: "translate(-50%,-50%)" }}>
        <TableTop size={S * 0.8} seats={shown.map((_, k) => 90 + (k * 360) / Math.max(4, shown.length))} hue={hue} night>
          {shown.map((p, k) => {
            const deg = 90 + (k * 360) / Math.max(4, shown.length);
            return <Disc key={p.id} deg={deg + 25} r={0.06} d={S * 0.8 * 0.15} color={p.me ? "var(--tb-lamp)" : p.color} from={{ deg, r: 0.26 }} delay={0.5 + k * 0.07} z={10 - k} />;
          })}
          {round > 1 && (
            <motion.span initial={{ y: 30, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: -6 }} transition={{ ...SNAPPY, delay: 1.1 }} className="tb-serif" style={{ position: "absolute", right: "6%", bottom: "8%", fontSize: S * 0.13, color: "var(--tb-lamp)" }}>
              #{round}
            </motion.span>
          )}
        </TableTop>
      </div>
      {/* the cropped word */}
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ ...GENTLE, delay: 0.9 }}
        className="tb-serif"
        aria-hidden
        style={{ position: "absolute", left: wide ? "var(--s16)" : "var(--m)", bottom: wide ? 150 : 150, fontSize: wide ? 380 : 168, lineHeight: 0.8, letterSpacing: "-0.04em", whiteSpace: "nowrap", color: "var(--tb-lamp)" }}
      >
        {word}
      </motion.div>
      <div style={{ position: "absolute", left: wide ? "var(--s16)" : "var(--m)", right: wide ? "var(--s16)" : "var(--m)", bottom: wide ? "var(--s12)" : "var(--m)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--s4)" }}>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="tb-mono tb-t-label" style={{ margin: 0, color: "var(--tb-lamp)", opacity: 0.8 }}>
          {hm(iso)} · {venue}
        </motion.p>
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="tb-btn" onClick={onClose} autoFocus>
          See you there
        </motion.button>
      </div>
      <h2 className="tb-serif" style={{ position: "absolute", left: wide ? "var(--s16)" : "var(--m)", top: wide ? "var(--s12)" : "calc(var(--s4) + 8px)", margin: 0, fontSize: wide ? 30 : 24, color: "var(--tb-lamp)" }}>
        {round > 1 ? "Again." : "It's on."}
      </h2>
    </motion.div>
  );
}

/** Talk: the table's conversation, from the right edge. Kept plain: names as discs, words in mono. */
function Talk({ podId, onClose, wide }: { podId: string; onClose: () => void; wide: boolean }) {
  const repo = useRepo();
  const msgs = useDb(useCallback((db: Parameters<typeof people>[0]) => (db.messages[podId] ?? []).slice(-40), [podId]));
  const ppl = useDb(useCallback((db: Parameters<typeof people>[0]) => people(db, podId), [podId]));
  const byId = useMemo(() => new Map(ppl.map((p) => [p.id, p])), [ppl]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Chrome now returns a Promise from scrollIntoView; never hand it back to React as a cleanup.
    void end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await repo.sendMessage(podId, t, `tb_${Math.random().toString(36).slice(2)}`);
  };
  return (
    <>
      <motion.div aria-hidden onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(29,26,23,.18)", zIndex: 40 }} />
      <motion.aside
        role="dialog"
        aria-label="Talk"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={GENTLE}
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: wide ? 440 : "100%", zIndex: 41, background: "var(--tb-paper)", display: "flex", flexDirection: "column", padding: wide ? "var(--s8)" : "var(--s4) var(--m) var(--m)", boxShadow: "-1px 0 0 var(--tb-line)" }}
      >
        <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="tb-serif tb-t-l" style={{ margin: 0 }}>Talk</h2>
          <button className="tb-quiet" onClick={onClose} aria-label="Close" style={{ marginRight: -8 }}>
            <IcClose size={24} />
          </button>
        </div>
        <div className="tb-sheet-scroll" style={{ flex: 1, display: "grid", alignContent: "end", gap: "var(--s4)", paddingTop: "var(--s8)" }}>
          {msgs
            .filter((m) => m.kind === "text" || m.kind === "host")
            .map((m) => (m.kind === "host" ? { ...m, text: m.text.split(/(?<=[.!?])\s+/).filter((x) => !CITY_WORD.test(x)).join(" ") } : m))
            .filter((m) => m.text.trim())
            .map((m) => {
              const p = m.user_id ? byId.get(m.user_id) : null;
              return (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: "var(--s2)", alignItems: "start" }}>
                  <span aria-hidden style={{ width: 28, height: 28, borderRadius: "50%", background: p ? p.color : "transparent", border: p ? "none" : "1px solid var(--tb-line-2)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--tb-serif)", fontSize: 15 }}>{p?.initial ?? ""}</span>
                  <div>
                    <div className="tb-mono tb-t-cap tb-muted">{p ? (p.me ? "You" : p.name) : "Pods"}</div>
                    <div className="tb-mono tb-t-body">{m.text}</div>
                  </div>
                </div>
              );
            })}
          <div ref={end} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          style={{ display: "flex", gap: "var(--s2)", alignItems: "center", paddingTop: "var(--s4)", borderTop: "1px solid var(--tb-line)", marginTop: "var(--s4)" }}
        >
          <input className="tb-field" style={{ fontSize: 20 }} aria-label="Message" placeholder="Say something" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          <button className="tb-btn" type="submit" aria-label="Send" disabled={!text.trim()} style={{ padding: 0, width: 48 }}>
            <IcSend size={20} />
          </button>
        </form>
      </motion.aside>
    </>
  );
}
