// <TryIt />: the landing's playable story (STORY.md §2, beats 2-6). No account, nothing stored.
// Fit (pick interests) -> Pod (circles move together, the pod lands) -> Plan (AI shows its work, the card assembles)
// -> I'm in (3 of 8 ticks to 4, Locked, the four move together) -> Repeat (run it back, overlaps deepen).
// Every beat plays as you scroll to it; nothing waits for a tap (picking interests only changes which pod you see).
// Every beat also plays on its own: no interest picked = Basketball, the demo pod. Plan facts come from the seed
// (data/plans TOPICS + venues), so the page and the app agree. The one sticky element is the progress rail.
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { InCount } from "@/components/brand/in-count";
import { PlanHalo } from "@/components/brand/plan-halo";
import { SNAPPY, useCalmMotion } from "@/components/brand/motion";
import { TOPICS, VENUE_BY_ID } from "@/data/plans";
import { PodSphere } from "@/components/brand/pod-sphere";
import { PERSON_COLORS } from "@/components/brand/disc";
import { lockRule } from "@/lib/planner/lock";
import { lockLine } from "./film-data";

type Key = "basketball" | "guitar" | "running" | "hiking" | "books" | "soccer";

const INTERESTS: { k: Key; label: string; pod: string; what: string; when: string; free: string; rain: string; next: string }[] = [
  { k: "basketball", label: "Basketball", pod: "Hoopers", what: "Pickup basketball", when: "Sat 10am", free: "7 of 8 free Saturday morning", rain: "", next: "Sat, Nov 21 · 10am" },
  { k: "guitar", label: "Guitar", pod: "Strings", what: "Acoustic hang", when: "Thu 7pm", free: "6 of 8 free Thursday evening", rain: "Indoors already", next: "Thu, Nov 19 · 7pm" },
  { k: "running", label: "Running", pod: "Striders", what: "Easy run or walk", when: "Sun 8am", free: "6 of 8 free Sunday morning", rain: "", next: "Sun, Nov 22 · 8am" },
  { k: "hiking", label: "Hiking", pod: "Wanderers", what: "Trail walk", when: "Sat 9am", free: "6 of 8 free Saturday morning", rain: "Moves to Sunday", next: "Sat, Nov 21 · 9am" },
  { k: "books", label: "Books", pod: "Page Turners", what: "Book swap", when: "Sun 2pm", free: "7 of 8 free Sunday afternoon", rain: "Indoors already", next: "Sun, Nov 22 · 2pm" },
  { k: "soccer", label: "Soccer", pod: "Kickabout", what: "Pickup soccer", when: "Sat 4pm", free: "6 of 8 free Saturday afternoon", rain: "Moves to Sunday", next: "Sat, Nov 21 · 4pm" },
];
const MEMBERS = ["Jordan", "Amara", "Theo", "Nia", "Malik", "Sofia", "Dev"];
const STEPS = [
  { id: "fit", label: "Fit" },
  { id: "pod", label: "Pod" },
  { id: "plan", label: "Plan" },
  { id: "in", label: "I'm in" },
  { id: "repeat", label: "Repeat" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

function factsFor(k: Key) {
  const i = INTERESTS.find((x) => x.k === k)!;
  const t = TOPICS[k];
  const place = VENUE_BY_ID[t.venue]?.short_name ?? "";
  const rainVenue = t.rainVenue ? VENUE_BY_ID[t.rainVenue]?.short_name : null;
  // the plan's own lock number, from the same rule the app uses (Hoopers: 4 for 2v2)
  const lockAt = lockRule({ key: k, size: 8 }).min_to_lock;
  return { ...i, place, bring: t.bring.slice(0, 2).join(" · "), rain: rainVenue ?? i.rain, lockAt };
}

interface Try {
  picked: Key[];
  toggle: (k: Key) => void;
  pod: ReturnType<typeof factsFor>;
  others: string[];
  run: number;
  done: Record<StepId, boolean>;
  mark: (s: StepId) => void;
  /** people in: everyone but you before you tap, the lock number after */
  n: number;
  locked: boolean;
  imIn: () => void;
  votes: ("yes" | "no")[];
  vote: (v: "yes" | "no") => void;
}
const Ctx = createContext<Try | null>(null);
const useTry = () => useContext(Ctx)!;

export function TryIt() {
  const calm = useCalmMotion();
  const [picked, setPicked] = useState<Key[]>([]);
  const [run] = useState(0);
  const [done, setDone] = useState<Record<StepId, boolean>>({ fit: false, pod: false, plan: false, in: false, repeat: false });
  const [inn, setIn] = useState(false);
  const [locked, setLocked] = useState(false);
  const [votes, setVotes] = useState<("yes" | "no")[]>([]);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, calm ? 0 : ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const mark = useCallback((s: StepId) => setDone((d) => (d[s] ? d : { ...d, [s]: true })), []);
  const toggle = (k: Key) =>
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length >= 3 ? [...p.slice(1), k] : [...p, k]));
  const lead = picked[0] ?? "basketball";
  const pod = useMemo(() => factsFor(lead), [lead]);
  const others = picked.slice(1).map((k) => INTERESTS.find((i) => i.k === k)!.pod);

  const n = pod.lockAt - 1 + (inn ? 1 : 0);
  const imIn = () => {
    if (inn) return;
    setIn(true);
    later(() => {
      setLocked(true);
      mark("in");
    }, 700);
  };
  const vote = (v: "yes" | "no") => {
    if (votes.length) return;
    // you first, then the other three answer; one of them can't say yes, and it still goes ahead at 3 of 4
    const seq: ("yes" | "no")[] = v === "yes" ? ["yes", "yes", "yes", "yes"] : ["no", "yes", "yes", "yes"];
    seq.forEach((x, i) => later(() => setVotes((cur) => [...cur, x]), 250 + i * 420));
    later(() => mark("repeat"), 250 + 4 * 420);
  };

  const value: Try = { picked, toggle, pod, others, run, done, mark, n, locked, imIn, votes, vote };
  return (
    <Ctx.Provider value={value}>
      <section id="try" className="tr" aria-labelledby="tr-h">
        <h2 id="tr-h" className="sr-only">
          Try it
        </h2>
        <Rail />
        <Fit />
        <Pod />
        <Plan />
        <ImIn />
        <Repeat />
      </section>
    </Ctx.Provider>
  );
}

/* ── the rail: progress, always visible while trying (the page's one sticky element) ──────────────────────── */
function Rail() {
  const { done } = useTry();
  const [active, setActive] = useState<StepId>("fit");
  useEffect(() => {
    const els = STEPS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(e.target.id as StepId);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <nav className="tr-rail" aria-label="Try it, steps">
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="tr-step" data-on={active === s.id ? "" : undefined} data-done={done[s.id] ? "" : undefined} aria-current={active === s.id ? "step" : undefined}>
              <i aria-hidden />
              <span>
                <span className="tr-num tabular">{i + 1}</span>
                {s.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Head({ k, line, sub }: { k: string; line: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="tr-head">
      <p className="tr-k">{k}</p>
      <h3 className="tr-line">{line}</h3>
      {sub && <p className="tr-sub">{sub}</p>}
    </div>
  );
}

/* ── 1 Fit ─────────────────────────────────────────────────────────────────────────────────────────────────── */
function Fit() {
  const { picked, toggle } = useTry();
  return (
    <div id="fit" className="tr-beat">
      <Head k="Fit" line="What do you like?" sub="Pick a few. Add more anytime." />
      <div className="tr-obj tr-fit">
        <div className="tr-chips" role="group" aria-label="Interests">
          {INTERESTS.map((i) => {
            const on = picked.includes(i.k);
            return (
              <button key={i.k} type="button" className="tr-chip pressable" aria-pressed={on} onClick={() => toggle(i.k)}>
                <i aria-hidden />
                {i.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 2 Pod: "Finding your pods" — the circles move together and the pod lands in the centre ───────────────── */
function Pod() {
  const { pod, others, picked, mark, run } = useTry();
  const calm = useCalmMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { amount: 0.5 });
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (seen && !played) {
      setPlayed(true);
      mark("fit");
      mark("pod");
    }
  }, [seen, played, mark]);
  useEffect(() => setPlayed(false), [run]);
  const key = `${pod.k}-${run}-${played}`;
  return (
    <div id="pod" className="tr-beat">
      <Head k="Pod" line={<>Your pod: <span className="tr-pod">{pod.pod}</span>.</>} sub={others.length ? `And ${others.join(", ")}.` : "Placed by what you like and when you're free."} />
      <div className="tr-obj tr-podobj" ref={ref}>
        <motion.div
          key={key}
          className="tr-sphere"
          initial={calm ? false : { opacity: 0, scale: 0.7 }}
          animate={played ? { opacity: 1, scale: 1 } : { opacity: 0.4, scale: 0.85 }}
          transition={calm ? { duration: 0 } : { ...SNAPPY, delay: 0.15 }}
        >
          <PodSphere hue="ember" people={8} inCount={played ? 8 : 1} size={200} float />
          <span className="tr-sphere-l">{pod.pod}</span>
        </motion.div>
        <div className="tr-facewrap">
          <ul className="tr-faces" aria-label={`${pod.pod}, 8 people`}>
            <li className="tr-face" data-you="" aria-label="You">
              You
            </li>
            {MEMBERS.map((m, i) => (
              <motion.li
                key={`${m}-${key}`}
                className="tr-face"
                style={{ background: PERSON_COLORS[i % 3].bg, color: PERSON_COLORS[i % 3].fg }}
                aria-label={m}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={played ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={calm ? { duration: 0 } : { ...SNAPPY, delay: 0.6 + i * 0.07 }}
              >
                {m[0]}
              </motion.li>
            ))}
          </ul>
          <p className="tr-faces-l">8 people. Same pod each time.</p>
        </div>
        {!picked.length && <p className="tr-note">Showing basketball. Pick yours above.</p>}
      </div>
    </div>
  );
}

/* ── 3 Plan: AI shows its work in three lines, then the card assembles ─────────────────────────────────────── */
const WORK = ["Finding when you're free", "Picking a public place", "Checking the weather"];

function Plan() {
  const { pod, mark, run, locked } = useTry();
  const calm = useCalmMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { amount: 0.4 });
  const [t, setT] = useState(0); // 0 idle, 1..3 work lines, 4 card
  const [go, setGo] = useState(0);
  useEffect(() => setT(0), [run, pod.k]);
  // start once per run/pod when the card is in view; the timers live outside t so ticking never cancels them
  useEffect(() => {
    if (seen && t === 0) setGo((g) => g + 1);
  }, [seen, t]);
  useEffect(() => {
    if (!go) return;
    if (calm) {
      setT(4);
      mark("plan");
      return;
    }
    const ids = [1, 2, 3, 4].map((s) =>
      window.setTimeout(() => {
        setT(s);
        if (s === 4) mark("plan");
      }, s * 520),
    );
    return () => ids.forEach(clearTimeout);
  }, [go, calm, mark]);

  const rows: [string, string][] = [
    ["When", pod.when],
    ["Where", `${pod.place} · Free`],
    ["Bring", pod.bring],
    ["If it rains", pod.rain || "Same place"],
  ];
  return (
    <div id="plan" className="tr-beat">
      <Head k="Plan" line="The AI plans it." sub="You just say yes." />
      <div className="tr-obj" ref={ref}>
        <PlanHalo state={t < 4 ? "off" : locked ? "locked" : "waiting"} radius={28} className="tr-card-wrap">
          <div className="tr-card">
            <AnimatePresence mode="wait" initial={false}>
              {t < 4 ? (
                <motion.ul key="work" className="tr-work" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} aria-live="polite">
                  {WORK.map((w, i) => (
                    <li key={w} data-on={t > i ? "" : undefined} data-now={t === i + 1 ? "" : undefined}>
                      <i aria-hidden />
                      {w}
                    </li>
                  ))}
                </motion.ul>
              ) : (
                <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                  <p className="tr-card-over">
                    <span>{pod.pod}</span>
                    <span className="tr-ai">Planned by AI</span>
                  </p>
                  <p className="tr-card-what">{pod.what}</p>
                  <p className="tr-card-why">{pod.free}</p>
                  <dl className="tr-rows">
                    {rows.map(([a, b], i) => (
                      <motion.div
                        key={a}
                        className="tr-row"
                        initial={calm ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...SNAPPY, delay: 0.15 + i * 0.12 }}
                      >
                        <dt>{a}</dt>
                        <dd className={a === "When" ? "tabular" : undefined}>{b}</dd>
                      </motion.div>
                    ))}
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PlanHalo>
      </div>
    </div>
  );
}

/* ── 4 I'm in: you tap it; the count ticks to the plan's lock number (Hoopers: 3 of 8 to 4) and it locks ──────────────────────────── */
function ImIn() {
  const { n, locked, imIn, pod, run } = useTry();
  const wait = lockLine(pod.lockAt);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { amount: 0.6 });
  // scroll plays it: a beat after it's in view, you say yes and it locks
  useEffect(() => {
    if (!seen || n >= pod.lockAt) return;
    const id = window.setTimeout(imIn, 900);
    return () => clearTimeout(id);
  }, [seen, n, pod.lockAt, imIn, run]);
  return (
    <div id="in" className="tr-beat" ref={ref}>
      <Head k="I'm in" line={locked ? "Locked. It's on." : wait.line} sub={locked ? `${pod.what}, ${pod.when}.` : wait.sub} />
      <div className="tr-obj tr-inobj">
        <div className="tr-sphere" data-locked={locked ? "" : undefined}>
          <PodSphere hue="ember" people={8} inCount={n} size={220} float={locked} />
        </div>
        <Faces names={["You", ...MEMBERS.slice(0, pod.lockAt - 1)]} youIn={n >= pod.lockAt} />
        <div className="tr-in-row">
          <InCount n={n} of={8} locked={locked} className="tr-count" />
          {!locked && <span className="tr-auto">{n >= pod.lockAt ? "You're in" : "Saying yes for you…"}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── 5 Repeat: run it back; the other three answer; same people again, overlaps deepen ─────────────────────── */
function Repeat() {
  const { votes, vote, pod } = useTry();
  const yes = votes.filter((v) => v === "yes").length;
  const all = votes.length === 4;
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { amount: 0.6 });
  // scroll plays it: Pods asks, the four answer
  useEffect(() => {
    if (!seen || votes.length) return;
    const id = window.setTimeout(() => vote("yes"), 900);
    return () => clearTimeout(id);
  }, [seen, votes.length, vote]);
  return (
    <div id="repeat" className="tr-beat" ref={ref}>
      <Head k="Repeat" line={all ? "Hangout #2 is on." : "Afterwards: run it back?"} sub={all ? `Same people. ${pod.next}.` : "Pods asks for you, so nobody has to."} />
      <div className="tr-obj tr-repobj">
        <div className="tr-sphere">
          <PodSphere hue="ember" people={8} inCount={all ? 8 : 4} size={180} float={all} />
        </div>
        <div className="tr-vote">
          <span className="tr-votes" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <motion.i key={i} initial={false} animate={i < votes.length ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0.25 }} transition={SNAPPY} data-no={votes[i] === "no" ? "" : undefined} />
            ))}
          </span>
          <span className="tr-vote-n tabular" role="status">
            {votes.length ? `${yes} of 4 yes` : "0 of 4"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* the people it locks with: one distinct colour and initial each (you first) */
function Faces({ names, youIn }: { names: string[]; youIn: boolean }) {
  // the others already said yes; you light up when you tap
  const lit = names.length - (youIn ? 0 : 1);
  return (
    <ul className="tr-faces" aria-label={`${lit} in`}>
      {names.map((m, i) => (
        <li
          key={m}
          className="tr-face"
          data-you={m === "You" ? "" : undefined}
          aria-label={m}
          style={m === "You" ? { opacity: youIn ? 1 : 0.3 } : { background: PERSON_COLORS[(i - 1) % 3].bg, color: PERSON_COLORS[(i - 1) % 3].fg }}
        >
          {m === "You" ? "You" : m[0]}
        </li>
      ))}
    </ul>
  );
}
