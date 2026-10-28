"use client";
// The app is a row of grounds, one per pod, each under its own sky. No home list, no tab bar (PB 3; SF 01/07/19):
// it opens on the ground that needs you; swipe, arrow keys or the hue dots walk sideways and the next pod's light
// wipes across like a weather front (PB 4.2; AW 20/25). Everything a pod is doing is told by the canopy and the light.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePlanActions } from "@/components/planner/use-plan-actions";
import { useForecast } from "@/components/planner/weather-chip";
import { mapsUrl } from "@/components/ui";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { nowMs, useClock } from "@/lib/time/clock";
import type { ID, ReportReason, RunItBackAnswer } from "@/lib/types";
import { Canopy, type Pole } from "./Canopy";
import { Sheet, Surface, Top } from "./Frame";
import { IAgain, ICheck, IIndoor, IPeople, IPlace, IRain, ISky, IWhy } from "./icons";
import {
  dateShort, dayWord, ground, groundThatNeedsYou, lightOf, myGrounds, placeKind, slotOf, timeShort, venueName, WEEK,
  type Ground, type GroundRef,
} from "./model";

const BASE = "/concepts/canopy";

export function Grounds({ podId }: { podId?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const now = useClock(15_000);
  const refs = useDb(myGrounds);
  const needs = useDb(useCallback((db) => groundThatNeedsYou(db, nowMs()), []));
  const [current, setCurrent] = useState<string | null>(podId ?? null);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (!hydrated) return;
    if (!refs.length) {
      router.replace(`${BASE}/begin`);
      return;
    }
    if (!current || !refs.some((r) => r.id === current)) setCurrent(podId && refs.some((r) => r.id === podId) ? podId : needs);
  }, [hydrated, refs, current, podId, needs, router]);

  // Keep the address bar honest without remounting (the transition lives in this component).
  useEffect(() => {
    if (current && typeof window !== "undefined" && !window.location.pathname.endsWith(`/pod/${current}`)) {
      window.history.replaceState(null, "", `${BASE}/pod/${current}${window.location.search}`);
    }
  }, [current]);

  const idx = refs.findIndex((r) => r.id === current);
  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= refs.length || to === idx) return;
      setDir(to > idx ? 1 : -1);
      setCurrent(refs[to].id);
    },
    [refs, idx],
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,textarea,[role=dialog]")) return;
      if (e.key === "ArrowRight") go(idx + 1);
      if (e.key === "ArrowLeft") go(idx - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go, idx]);

  const ref = refs[idx];
  if (!hydrated || !ref) return <Surface light="dawn" hue="ember" label="Pods"><span /></Surface>;

  return (
    <div style={{ position: "relative", minHeight: "100dvh", overflow: "hidden" }}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={ref.id}
          custom={dir}
          variants={{
            enter: (d: number) => ({ clipPath: d > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }),
            center: { clipPath: "inset(0 0% 0 0%)" },
            exit: { zIndex: 0 },
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <PodGround key={ref.id} refG={ref} refs={refs} idx={idx} go={go} nowAt={now.getTime()} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function PodGround({ refG, refs, idx, go, nowAt }: { refG: GroundRef; refs: GroundRef[]; idx: number; go: (i: number) => void; nowAt: number }) {
  const repo = useRepo();
  const reduce = useReducedMotion();
  const minute = Math.floor(nowAt / 60_000);
  const g = useDb(useCallback((db) => ground(db, refG, nowMs()), [refG, minute])); // eslint-disable-line react-hooks/exhaustive-deps
  const actions = usePlanActions(refG.id);
  const v = g.view;
  const phase = refG.onDeck ? "on_deck" : v?.phase ?? "empty";
  const light = lightOf(v, refG.onDeck);
  const [sheet, setSheet] = useState<null | "why" | "people">(null);
  const [whisper, setWhisper] = useState<ReactNode>(null);
  const [up, setUp] = useState(false);
  const wasLocked = useRef<boolean | null>(null);

  // The lock moment: when the target locks while you watch, one word, then stillness (PB 7.3; CM 124/175).
  const lockedNow = !!v && ["locked", "starting_soon", "happening_now"].includes(v.phase);
  useEffect(() => {
    if (wasLocked.current === false && lockedNow) {
      setUp(true);
      const t = setTimeout(() => setUp(false), 2400);
      return () => clearTimeout(t);
    }
    wasLocked.current = lockedNow;
  }, [lockedNow]);
  useEffect(() => {
    if (!up) wasLocked.current = lockedNow;
  }, [up, lockedNow]);

  // After the reveal, Claude drafts the next options (same guarded call the product uses).
  const planned = useRef(false);
  useEffect(() => {
    if (phase === "planning_next" && v && !planned.current) {
      planned.current = true;
      void actions.planNextRound(v);
    }
  }, [phase, v, actions]);

  // Swipe sideways between grounds.
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,a,input")) return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(idx + (dx < 0 ? 1 : -1));
  };

  const s = g.s;
  const going = g.going;
  const imIn = !!v?.imIn || (v?.locked && going.includes(g.people.find((p) => p.me)?.id ?? "")) || false;
  const forecast = useForecast(s ? s.starts_at.slice(0, 10) : null, g.venue?.lat, g.venue?.lng);
  const wet = !!forecast && forecast.precipChance >= 50;
  const moved = lockedNow && wet && !!g.rainVenue;

  const poles = useMemo(() => polesFor(g, going), [g, going]);
  const lift = Math.min(going.length, 4) / 4;
  const folded = ["check_in", "ballot", "waiting_reveal", "planning_next", "missed", "vote", "empty", "on_deck", "pending_review"].includes(phase);
  const myAnswer = v?.myBallot ?? null;
  const corners = phase === "planning_next" ? 4 : phase === "waiting_reveal" && myAnswer === "yes" ? 1 : 0;

  const say = (n: ReactNode, ms = 5000) => {
    setWhisper(n);
    if (ms) setTimeout(() => setWhisper((w: ReactNode) => (w === n ? null : w)), ms);
  };

  const imInTap = async () => {
    if (!v?.targetId) return;
    const r = await actions.rsvp(v.targetId, "going", { silent: true });
    if (r && !r.locked) say(<>In. <button type="button" className="cn-link" onClick={() => void actions.rsvp(v.targetId!, "not_going", { silent: true })}>undo</button></>, 8000);
  };
  const cant = async () => {
    if (!v?.targetId) return;
    await actions.rsvp(v.targetId, "not_going", { silent: true });
    say(<>Your spot goes back. <button type="button" className="cn-link" onClick={() => void actions.rsvp(v.targetId!, "going", { silent: true })}>undo</button></>, 8000);
  };

  const top = (
    <Top
      dark={light === "dusk"}
      href={BASE}
      right={
        <nav className="cn-dots" aria-label="Your pods">
          {refs.map((r, i) => (
            <button key={r.id} type="button" className="cn-dot" aria-label={r.word} aria-current={i === idx} onClick={() => go(i)} style={{ ["--dot" as string]: `var(--pods-${r.hue})` }}>
              <i />
            </button>
          ))}
        </nav>
      }
    />
  );

  return (
    <Surface light={light} hue={refG.hue} horizon={64} label={refG.word}>
      <div onPointerDown={onDown} onPointerUp={onUp} style={{ position: "absolute", inset: 0, touchAction: "pan-y" }} />
      {top}

      <div className="cn-stage" aria-hidden={phase !== "vote"}>
        <Canopy
          poles={poles}
          lift={lift}
          folded={folded}
          extra={Math.max(0, going.length - 4)}
          corners={corners}
          rain={g.rainVenue && !folded ? { label: venueName(g.rainVenue) } : null}
          moved={moved}
          showSeats={!folded || phase === "vote"}
        />
      </div>

      {phase === "vote" && v ? <Spots g={g} onVote={(sid) => v.vote && void repo.voteNextOption(v.vote.id, sid)} /> : null}

      <div className="cn-foot">
        <p className="cn-tag" style={{ margin: "0 0 8px" }}>
          <button type="button" className="cn-link" style={{ minHeight: 32, textDecoration: "none", color: "var(--fg-3)", fontSize: 11, letterSpacing: ".06em" }} onClick={() => setSheet("people")} aria-label={`${refG.word}: people`}>
            <IPeople size={14} /> {refG.word.toLowerCase()} · {g.size}
            {v && (v.round ?? 1) > 1 && !folded ? ` · no. ${v.round}` : ""}
          </button>
        </p>
        <Body phase={phase} g={g} up={up} imIn={imIn} wet={wet} moved={moved} forecast={forecast} genSteps={actions.genSteps} genKind={actions.genKind}
          onIn={imInTap} onCant={cant} onWhy={() => setSheet("why")}
          onWent={async () => { if (v?.lastHangout) { await repo.checkIn(v.lastHangout.id); } }}
          onMissed={async () => { if (v?.lastHangout) { await repo.rsvp(v.lastHangout.id, "not_going"); } }}
          onAnswer={async (a: RunItBackAnswer) => { if (v?.lastHangout) await repo.castRunItBack(v.lastHangout.id, a); }}
          onPlan={() => void actions.planNow()}
          whisper={whisper}
          reduce={!!reduce}
        />
      </div>

      <WhySheet open={sheet === "why"} onClose={() => setSheet(null)} g={g} forecast={forecast} />
      <PeopleSheet open={sheet === "people"} onClose={() => setSheet(null)} g={g} />
    </Surface>
  );
}

function polesFor(g: Ground, going: ID[]): Pole[] {
  const me = g.people.find((p) => p.me);
  const others = g.people.filter((p) => !p.me && going.includes(p.id)).sort((a, b) => going.indexOf(a.id) - going.indexOf(b.id));
  const slots: (Pole | null)[] = [null, null, null, null];
  const order = [0, 3, 1];
  others.slice(0, 3).forEach((p, i) => (slots[order[i]] = { key: p.id, initial: p.initial, tone: p.tone, me: false, standing: true }));
  const meIn = !!me && going.includes(me.id);
  if (!meIn && others.length >= 4) slots[2] = { key: others[3].id, initial: others[3].initial, tone: others[3].tone, me: false, standing: true };
  else slots[2] = { key: "me", initial: g.meInitial, tone: 0, me: true, standing: meIn };
  return slots.map((p, i) => p ?? { key: `open${i}`, initial: "", tone: 0, me: false, standing: false });
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
type Fx = { highF: number; precipChance: number } | null;

function Body(props: {
  phase: string; g: Ground; up: boolean; imIn: boolean; wet: boolean; moved: boolean; forecast: Fx;
  genSteps: { id: string; label: string }[]; genKind: string | null;
  onIn: () => void; onCant: () => void; onWhy: () => void; onWent: () => void; onMissed: () => void; onAnswer: (a: RunItBackAnswer) => void; onPlan: () => void;
  whisper: ReactNode; reduce: boolean;
}) {
  const { phase, g, up, imIn, forecast, whisper } = props;
  const s = g.s;
  const v = g.view;
  const h = v?.lastHangout ?? v?.hangout ?? null;
  const n = Math.min(g.going.length, 4);
  const sky = g.venue?.indoor ? "indoors" : forecast ? `${forecast.highF}° · ${forecast.precipChance}% rain` : "sky checked";
  const big = (t: ReactNode, k: string) => (
    <motion.h1 key={k} className="cn-day" style={{ margin: 0 }} initial={{ opacity: 0, y: props.reduce ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 20 }}>
      {t}
    </motion.h1>
  );
  const row = (left: ReactNode, right: ReactNode) => (
    <div className="cn-split" style={{ marginTop: 24, alignItems: "center", minHeight: 56 }}>
      <div className="cn-row" style={{ gap: 16 }}>{whisper ? <span className="cn-whisper" role="status">{whisper}</span> : left}</div>
      {right}
    </div>
  );

  if (phase === "on_deck")
    return (<>{big("Soon.", "soon")}<p className="cn-cap" style={{ margin: "12px 0 0" }}>Opens after your first hangout.</p></>);

  if (phase === "empty" || phase === "pending_review")
    return props.genKind ? (
      <Beats title="Planning." steps={props.genSteps} />
    ) : (
      <>
        {big("Quiet.", "quiet")}
        {row(null, phase === "empty" ? <button type="button" className="cn-act" onClick={props.onPlan}>Plan one</button> : <span className="cn-cap">Checking a spot</span>)}
      </>
    );

  if (phase === "proposed" || phase === "in") {
    if (!s) return null;
    return (
      <Proposed g={g} reduce={props.reduce}>
        {big(dayWord(s.starts_at), `d${s.id}`)}
        <p className="cn-cap" style={{ margin: "12px 0 0" }}>
          <b>{timeShort(s.starts_at)}</b> · {placeKind(g.venue)} · {sky}
          <br />
          <b>{n} of 4</b> in{g.rainVenue ? <> · else, {placeKind(g.rainVenue)}</> : null}
        </p>
        {row(
          <>
            <button type="button" className="cn-link" onClick={props.onWhy}><IWhy size={16} />why</button>
            {imIn ? null : <button type="button" className="cn-link" onClick={props.onCant}>can&apos;t</button>}
          </>,
          imIn ? (
            <span className="cn-cap">Waiting on {Math.max(0, 4 - n)}</span>
          ) : (
            <button type="button" className="cn-act" data-hue onClick={props.onIn} data-testid="cn-in">I&apos;m in</button>
          ),
        )}
      </Proposed>
    );
  }

  if (phase === "locked" || phase === "starting_soon" || phase === "happening_now") {
    const at = h ?? null;
    const v2 = g.venue;
    if (up) return big(<span className="cn-it">Up.</span>, "up");
    const where = props.moved ? g.rainVenue : v2;
    return (
      <>
        {big(phase === "happening_now" ? "Now." : dayWord(at?.starts_at ?? s?.starts_at ?? ""), `l${at?.id}`)}
        <p className="cn-cap" style={{ margin: "12px 0 0" }}>
          <b>{timeShort(at?.starts_at ?? "")}–{timeShort(at?.ends_at ?? "")}</b> · {dateShort(at?.starts_at ?? "")} · <b>{venueName(where)}</b>
          <br />
          {where?.address?.split(",")[0]}{props.moved ? " · moved for rain" : null}
        </p>
        {row(
          <>
            <button type="button" className="cn-link" onClick={props.onWhy}><IWhy size={16} />why</button>
            {where ? <a className="cn-link" href={mapsUrl(`${where.name}, ${where.address}`)} target="_blank" rel="noreferrer">directions</a> : null}
          </>,
          at ? <button type="button" className="cn-act" onClick={() => ics(at.id, s?.summary ?? "Hangout", at.starts_at, at.ends_at, where)}>Calendar</button> : null,
        )}
      </>
    );
  }

  if (phase === "check_in")
    return (
      <>
        {big(<>Made <span className="cn-it">it?</span></>, "made")}
        <p className="cn-cap" style={{ margin: "12px 0 0" }}>{h ? `${dayWord(h.starts_at)} · ${venueName(g.venue)}` : ""}</p>
        {row(<button type="button" className="cn-link" onClick={props.onMissed}>couldn&apos;t</button>, <button type="button" className="cn-act" onClick={props.onWent} data-testid="cn-went">I went</button>)}
      </>
    );

  if (phase === "ballot")
    return (
      <>
        {big(<>Again<span className="cn-it">?</span></>, "again")}
        <p className="cn-cap" style={{ margin: "12px 0 0" }}>Only the pod&apos;s total is shown.</p>
        {row(
          <>
            <button type="button" className="cn-link" onClick={() => props.onAnswer("not_sure")}>not sure</button>
            <button type="button" className="cn-link" onClick={() => props.onAnswer("no")}>not this time</button>
          </>,
          <button type="button" className="cn-act" data-hue onClick={() => props.onAnswer("yes")} data-testid="cn-yes"><IAgain size={18} />Yes</button>,
        )}
      </>
    );

  if (phase === "waiting_reveal")
    return (<>{big("Sealed.", "sealed")}<p className="cn-cap" style={{ margin: "12px 0 0" }}>Opens when 4 say yes.</p></>);

  if (phase === "missed")
    return (<>{big("Next one.", "next")}<p className="cn-cap" style={{ margin: "12px 0 0" }}>We&apos;ll plan around you.</p></>);

  if (phase === "planning_next") {
    const r = v?.revealed;
    return <Beats title={<><span className="cn-it">Again.</span></>} lead={r ? `${r.yes} of ${r.answered} said yes` : undefined} steps={props.genSteps} />;
  }

  if (phase === "vote") {
    const r = v?.round ?? 2;
    return (
      <>
        {big(<span className="cn-it">#{r}</span>, "vote")}
        <p className="cn-cap" style={{ margin: "12px 0 0" }}><b>First to 4</b> goes up.</p>
        {whisper ? row(null, null) : null}
      </>
    );
  }
  return null;
}

/** Plan replay (PB 3.6 flip-to-reason, inline): a band of light sweeps the week and stops where people are free,
 *  then the plan sets in as at most 6 mono beats. Plays once per plan per session. */
const swept = new Map<string, number>();
function shouldSweep(key: string): boolean {
  let at = swept.get(key) ?? 0;
  try { at = at || Number(sessionStorage.getItem(key) ?? 0); } catch { /* storage blocked */ }
  if (at && Date.now() - at > 2500) return false;
  if (!at) {
    swept.set(key, Date.now());
    try { sessionStorage.setItem(key, String(Date.now())); } catch { /* storage blocked */ }
  }
  return true;
}

/** The plan sets in where the day will stand: once per plan per session, then the day lands. */
function Proposed({ g, reduce, children }: { g: Ground; reduce: boolean; children: ReactNode }) {
  const key = `cn-swept:${g.s!.id}`;
  const [sweeping, setSweeping] = useState(() => !reduce && shouldSweep(key));
  return sweeping ? <Sweep g={g} onDone={() => setSweeping(false)} /> : <>{children}</>;
}

/** Plan replay: a band of light sweeps the week and stops where people are free, then at most 6 mono beats. */
function Sweep({ g, onDone }: { g: Ground; onDone: () => void }) {
  const s = g.s!;
  const [beat, setBeat] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timers = [1100, 1600, 2100, 2600, 3100].map((ms, i) => setTimeout(() => setBeat(i + 1), ms));
    timers.push(setTimeout(() => done.current(), 4300));
    return () => timers.forEach(clearTimeout);
  }, []);
  const slot = slotOf(s.starts_at);
  const at = WEEK.findIndex((w) => w.slot === slot);
  const beats = [
    `${g.free[slot]} of ${g.size} free`,
    g.fits > 0 ? `${g.fits} public places fit` : "public place picked",
    g.venue?.indoor ? "indoors" : "sky checked",
    g.rainVenue ? `else, ${placeKind(g.rainVenue)}` : "rain-proof",
    "public · daytime · checked",
  ];
  return (
    <div role="status" aria-live="polite" aria-label="Planning">
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, height: 56, alignItems: "center" }}>
        <motion.div
          initial={{ left: "0%", opacity: 0.4 }}
          animate={{ left: `${(at / 7) * 100}%`, opacity: 1 }}
          transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          style={{ position: "absolute", top: 0, bottom: 0, width: `${100 / 7}%`, borderRadius: 999, background: "var(--hue-soft)" }}
        />
        {WEEK.map((w, i) => (
          <span key={w.slot} className="cn-tag" style={{ position: "relative", textAlign: "center", lineHeight: 1.3, fontSize: 12, color: i === at ? "var(--fg)" : undefined }}>
            {w.day}<br />{w.part}
          </span>
        ))}
      </div>
      <ul style={{ listStyle: "none", margin: "24px 0 0", padding: 0, display: "grid", gap: 4, minHeight: 112 }}>
        {beats.slice(0, beat).map((b) => (
          <motion.li key={b} className="cn-cap" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>{b}</motion.li>
        ))}
      </ul>
    </div>
  );
}

const BEAT_WORD: Record<string, string> = {
  context: "reading the last one", pod: "reading the pod", time: "finding the time", venues: "checking places", weather: "checking the sky", draft: "Claude drafts", validate: "checking the rules",
};
function Beats({ title, lead, steps }: { title: ReactNode; lead?: string; steps: { id: string; label: string }[] }) {
  return (
    <div role="status" aria-live="polite">
      <h1 className="cn-day" style={{ margin: 0 }}>{title}</h1>
      {lead ? <p className="cn-cap" style={{ margin: "12px 0 0" }}><b>{lead}</b></p> : null}
      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 4, minHeight: 80 }}>
        {steps.slice(-3).map((st) => (
          <motion.li key={st.id} className="cn-cap" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>{BEAT_WORD[st.id] ?? "planning"}</motion.li>
        ))}
      </ul>
    </div>
  );
}

/** Round two: the options are spots on the ground; your pole goes where you tap (CM 127-130 one-question card,
 *  rendered as places instead of percentages; J: circles, not percentages). */
function Spots({ g, onVote }: { g: Ground; onVote: (sid: ID) => void }) {
  const v = g.view!;
  const opts = v.options.slice(0, 2);
  const counts = opts.map((o) => Object.values(v.vote?.votes ?? {}).filter((x) => x === o.id).length);
  const venues = useDb(useCallback((db) => opts.map((o) => db.venues[o.venue_id] ?? null), [opts.map((o) => o.id).join()])); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="radiogroup" aria-label="Pick the next one" className="cn-spots" style={{ position: "absolute", top: "calc(64% - 250px)", height: 190, zIndex: 4, display: "flex", justifyContent: "center", gap: 16 }}>
      {opts.map((o, i) => {
        const mine = v.myVote === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={mine}
            aria-pressed={mine}
            className="cn-spot"
            onClick={() => onVote(o.id)}
            style={{ position: "relative", width: "min(42%, 200px)", aspectRatio: "1", height: "auto", alignSelf: i === 0 ? "flex-start" : "flex-end" }}
          >
            <span className="cn-mid">{dayWord(o.starts_at).slice(0, 3)} {timeShort(o.starts_at)}</span>
            <span className="cn-tag">{placeKind(venues[i])}</span>
            <span className="cn-row" style={{ gap: 4 }} aria-label={`${counts[i]} of 4`}>
              {Array.from({ length: 4 }).map((_, k) => (
                <i key={k} style={{ width: 10, height: 10, borderRadius: "50%", background: k < counts[i] ? "var(--hue)" : "transparent", boxShadow: "inset 0 0 0 1.25px var(--fg-2)" }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
function WhySheet({ open, onClose, g, forecast }: { open: boolean; onClose: () => void; g: Ground; forecast: Fx }) {
  const s = g.s;
  if (!s) return null;
  const slot = slotOf(s.starts_at);
  const w = WEEK.find((x) => x.slot === slot);
  const lines: [ReactNode, ReactNode][] = [
    [<IPeople key="i" size={18} />, <><b>{g.size} people</b> · {g.ref.word.toLowerCase()}</>],
    [<IWhy key="i" size={18} />, <><b>{w?.day} {w?.part}</b> · {g.free[slot]} of {g.size} free</>],
    [<IPlace key="i" size={18} />, g.fits > 0 ? <><b>{g.fits} public places</b> fit · under $15</> : <><b>public place</b> · under $15</>],
    [g.venue?.indoor ? <IIndoor key="i" size={18} /> : <ISky key="i" size={18} />, g.venue?.indoor ? <><b>indoors</b> · rain can&apos;t cancel</> : forecast ? <><b>{forecast.highF}°</b> · {forecast.precipChance}% rain</> : <><b>forecast</b> · checked the day before</>],
    ...(g.rainVenue ? ([[<IRain key="i" size={18} />, <><b>rain plan</b> · {venueName(g.rainVenue)}</>]] as [ReactNode, ReactNode][]) : []),
    [<ICheck key="i" size={18} />, <><b>public</b> · daytime · no alcohol</>],
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Why this plan">
      <ul className="cn-lines">
        {lines.map(([i, t], k) => (
          <li key={k} className="cn-cap"><span style={{ color: "var(--ink)" }}>{i}</span><span>{t}</span></li>
        ))}
      </ul>
      <p className="cn-tag" style={{ margin: "24px 0 0" }}>Planned by Claude</p>
    </Sheet>
  );
}

const REASONS: [ReportReason, string][] = [["unsafe", "made me feel unsafe"], ["harassment", "harassment"], ["spam", "spam"]];
function PeopleSheet({ open, onClose, g }: { open: boolean; onClose: () => void; g: Ground }) {
  const repo = useRepo();
  const [who, setWho] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const tones = ["var(--pods-ember)", "var(--pods-signal)", "var(--pods-grove)", "var(--pods-overlap-ember-signal)", "var(--pods-overlap-signal-grove)", "var(--pods-overlap-ember-grove)"];
  return (
    <Sheet open={open} onClose={() => { setWho(null); setNote(null); onClose(); }} title={g.ref.word}>
      <ul className="cn-lines" style={{ maxHeight: "52vh", overflow: "auto" }}>
        {g.people.map((p) => (
          <li key={p.id} style={{ gridTemplateColumns: "32px 1fr auto", alignItems: "center" }}>
            <span style={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", background: p.me ? "var(--ink)" : tones[p.tone], color: p.me || p.tone > 0 ? "var(--neutral-0)" : "var(--ink)", font: "500 12px var(--mono)" }}>{p.initial}</span>
            <span className="cn-cap"><b>{p.me ? "You" : p.name}</b>{g.going.includes(p.id) ? " · in" : ""}</span>
            {p.me ? <span /> : who === p.id ? (
              <span className="cn-row" style={{ gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {REASONS.map(([r, l]) => (
                  <button key={r} type="button" className="cn-link" onClick={async () => { await repo.report({ reportedUserId: p.id, podId: g.ref.id, reason: r }); setWho(null); setNote("Reported. A person reviews it."); }}>{l}</button>
                ))}
                <button type="button" className="cn-link" onClick={async () => { await repo.block(p.id); setWho(null); setNote(`${p.name} blocked.`); }}>block</button>
              </span>
            ) : (
              <button type="button" className="cn-link" onClick={() => setWho(p.id)} aria-label={`Report or block ${p.name}`}>···</button>
            )}
          </li>
        ))}
      </ul>
      {note ? <p className="cn-whisper" role="status" style={{ marginTop: 16 }}>{note}</p> : null}
    </Sheet>
  );
}

function ics(id: string, title: string, start: string, end: string, v: { name: string; address: string } | null | undefined) {
  const d = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pods//Hangout//EN", "BEGIN:VEVENT", `UID:${id}@pods.app`, `DTSTAMP:${d(new Date().toISOString())}`,
    `DTSTART:${d(start)}`, `DTEND:${d(end)}`, `SUMMARY:${title}`, v ? `LOCATION:${v.name}, ${v.address}` : "", "END:VEVENT", "END:VCALENDAR"].filter(Boolean);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  a.download = "pods-hangout.ics";
  a.click();
}
