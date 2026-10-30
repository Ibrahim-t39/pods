"use client";
// First run. One question per screen, the answer is the headline (PB 1.2, TS 8/5/49), and your pole already stands on
// the horizon with your initial at its foot from the first letter you type. Progress = circles filling (PB 2.7).
// Inputs are not chips or grids (Mobbin check: Reddit/X/Swiggy/Phantom pickers): interests are words you light,
// free time is seven bands of light across the week, age is your disc slid along the horizon.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { INTERESTS } from "@/config/interests";
import { HERITAGE_NODES } from "@/data/taxonomy";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import type { Slot } from "@/lib/types";
import { Surface, Top } from "./Frame";
import { INext } from "./icons";
import { myGrounds, WEEK, type GroundRef } from "./model";

type Step = "name" | "age" | "into" | "free" | "roots" | "phone" | "code" | "pledge" | "placing" | "hold";
const ORDER: Step[] = ["name", "age", "into", "free", "roots", "phone", "code", "pledge"];
const DOTS: Step[] = ["name", "age", "into", "free", "roots", "phone"];

const SHORT: Record<string, string> = {
  running: "Running", climbing: "Climbing", guitar: "Guitar", music_making: "Making music", board_games: "Board games", art: "Art", disc_golf: "Disc golf",
};
const COUNTRIES = HERITAGE_NODES.filter((n) => n.level === "country");

export function Begin() {
  const router = useRouter();
  const repo = useRepo();
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const grounds = useDb(myGrounds);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [age, setAge] = useState(22);
  const [into, setInto] = useState<string[]>([]);
  const [free, setFree] = useState<Slot[]>([]);
  const [roots, setRoots] = useState<string | null>(null);
  const [rootsQ, setRootsQ] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  const started = useRef(false);

  // Already placed: the threshold is behind you.
  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    if (grounds.length) setStep("hold");
  }, [hydrated, grounds.length]);

  const initial = (name.trim()[0] ?? "").toUpperCase();
  const valid: Partial<Record<Step, boolean>> = {
    name: name.trim().length >= 1,
    age: age >= 18 && age <= 29,
    into: into.length >= 1,
    free: free.length >= 1,
    roots: true,
    phone: phone.replace(/\D/g, "").length >= 10,
    code: /^\d{6}$/.test(code),
    pledge: true,
  };

  const next = async () => {
    if (!valid[step] || busy) return;
    setWhisper(null);
    if (step === "phone") {
      setBusy(true);
      const r = await repo.startPhoneAuth(phone);
      setBusy(false);
      if (!r.ok) return setWhisper("That number didn't work.");
      setChallenge(r.data.challengeId);
      return setStep("code");
    }
    if (step === "code") {
      if (!challenge) return setStep("phone");
      setBusy(true);
      const r = await repo.verifyPhoneCode(challenge, code);
      setBusy(false);
      if (!r.ok) return setWhisper("That code didn't match.");
      return setStep("pledge");
    }
    if (step === "pledge") return void finish();
    const n = ORDER[ORDER.indexOf(step) + 1];
    if (n) setStep(n);
  };

  async function finish() {
    setStep("placing");
    const t0 = Date.now();
    const back = (m: string, s: Step) => {
      setWhisper(m);
      setStep(s);
    };
    const r1 = await repo.updateAbout({ first_name: name.trim(), nickname: null, date_of_birth: `${2026 - age}-01-15`, city: "Seattle" });
    if (!r1.ok) return back("Check your age.", "age");
    await repo.setInterests(into);
    await repo.setIdentity({ heritage: roots ? { level: "country", code: roots } : null, faith: null, consent: !!roots });
    await repo.setAvailability(free, []);
    await repo.acceptPledge();
    await repo.submitVerification({});
    const run = await repo.runPlacement();
    if (!run.ok) return back("We couldn't place you yet.", "into");
    const wait = Math.max(0, 2600 - (Date.now() - t0));
    setTimeout(() => setStep("hold"), wait);
  }

  // Auto-advance the code once six digits are in.
  useEffect(() => {
    if (step === "code" && /^\d{6}$/.test(code)) void next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const hold = (g: GroundRef) => {
    if (held) return;
    setHeld(g.id);
    setTimeout(() => router.push(`/concepts/canopy/pod/${g.id}`), reduce ? 0 : 900);
  };

  const dotAt = step === "pledge" ? DOTS.length : DOTS.indexOf(step === "code" ? "phone" : step);
  const progress = Math.max(0, Math.min(1, (dotAt + (valid[step] ? 1 : 0)) / (DOTS.length + 1)));
  const horizon = step === "hold" ? 46 : step === "placing" ? 58 : 34;
  const light = step === "hold" ? "dawn" : "dawn";
  const words = useMemo(() => INTERESTS.filter((i) => i.active), []);
  const rootsHits = rootsQ.trim().length >= 2 ? COUNTRIES.filter((c) => c.label.toLowerCase().startsWith(rootsQ.trim().toLowerCase())).slice(0, 3) : [];

  return (
    <Surface light={light} hue="ember" horizon={horizon} label="Begin">
      <Top />

      {/* Progress is the canopy filling in over your pole (PB 2.7 circles filling; SF 19/24): the cloth goes from a
          dashed outline to the full hue, step by step, and your initial stands at its foot from the first letter. */}
      {step !== "hold" && step !== "placing" ? (
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 56, height: `calc(${horizon}% - 56px + 34px)`, display: "flex", justifyContent: "flex-end", paddingRight: "var(--m)" }}>
          <svg viewBox="0 0 300 220" style={{ height: "100%", width: "auto", overflow: "visible" }}>
            <ellipse cx={150} cy={60} rx={128} ry={34} fill="none" style={{ stroke: "var(--fg-3)" }} strokeWidth={1.25} strokeDasharray="4 5" />
            <motion.ellipse cx={150} cy={60} rx={128} ry={34} style={{ fill: "var(--hue)" }} initial={false} animate={{ opacity: progress * 0.9 }} transition={{ duration: 0.6 }} />
            {[{ x: 52, y: 196 }, { x: 108, y: 212 }, { x: 248, y: 196 }].map((f, i) => (
              <circle key={i} cx={f.x} cy={f.y} r={12} fill="none" style={{ stroke: "var(--fg-3)" }} strokeWidth={1.25} strokeDasharray="3 3" />
            ))}
            <line x1={192} x2={192} y1={88} y2={196} style={{ stroke: "var(--fg)" }} strokeWidth={1.25} strokeLinecap="round" />
            <ellipse cx={192} cy={227} rx={15} ry={3.5} style={{ fill: "var(--pods-ink)" }} opacity={0.12} />
            {initial ? (
              <g>
                <circle cx={192} cy={212} r={16} style={{ fill: "var(--fg)" }} />
                <text x={192} y={216.5} textAnchor="middle" style={{ fill: "var(--sky)", font: "500 13px var(--mono)" }}>{initial}</text>
              </g>
            ) : (
              <circle cx={192} cy={212} r={15.25} fill="none" style={{ stroke: "var(--fg)" }} strokeWidth={1.5} strokeDasharray="3.5 3.5" />
            )}
          </svg>
        </div>
      ) : null}
      <p className="cn-sr" role="status">{`Step ${Math.max(1, dotAt + 1)} of ${DOTS.length}`}</p>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -10 }}
          transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
          style={{ position: "absolute", left: "var(--m)", right: "var(--m)", top: `calc(${horizon}% + 28px)`, bottom: 112, maxWidth: 720 }}
          className="cn-step"
        >
          {step === "name" ? (
            <>
              <label className="cn-tag" htmlFor="cn-name">first name</label>
              <input id="cn-name" className="cn-input" autoFocus autoComplete="given-name" placeholder="Your name" value={name} maxLength={24}
                onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void next()} style={{ marginTop: 8 }} />
            </>
          ) : null}

          {step === "age" ? (
            <>
              <label className="cn-tag" htmlFor="cn-age">age</label>
              <p className="cn-day" style={{ margin: "8px 0 24px" }} aria-hidden>{age}</p>
              <input id="cn-age" type="range" min={18} max={29} step={1} value={age} onChange={(e) => setAge(Number(e.target.value))} className="cn-range" aria-valuetext={`${age}`} />
              <div className="cn-split cn-tag" style={{ marginTop: 8 }}><span>18</span><span>29</span></div>
            </>
          ) : null}

          {step === "into" ? (
            <>
              <p className="cn-tag" style={{ margin: 0 }}>into · up to 3</p>
              <div className="cn-words" style={{ marginTop: 12 }} role="group" aria-label="Interests">
                {words.map((w, i) => {
                  const on = into.includes(w.id);
                  return (
                    <span key={w.id}>
                      <button type="button" className="cn-word" aria-pressed={on}
                        onClick={() => setInto((cur) => (on ? cur.filter((x) => x !== w.id) : cur.length >= 3 ? [...cur.slice(1), w.id] : [...cur, w.id]))}>
                        {SHORT[w.id] ?? w.label}
                      </button>
                      {i < words.length - 1 ? <span className="cn-sep" aria-hidden>·</span> : null}
                    </span>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "free" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <p className="cn-tag" style={{ margin: 0 }}>free · usually</p>
              <div className="cn-week" style={{ marginTop: 16, flex: 1, maxHeight: 340 }} role="group" aria-label="When you're usually free">
                {WEEK.map((w) => {
                  const on = free.includes(w.slot);
                  return (
                    <button key={w.slot} type="button" className="cn-band" aria-pressed={on} aria-label={`${w.day} ${w.part}`}
                      onClick={() => setFree((cur) => (on ? cur.filter((x) => x !== w.slot) : [...cur, w.slot]))}>
                      <span>{w.day}<br />{w.part}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === "roots" ? (
            <>
              <label className="cn-tag" htmlFor="cn-roots">roots · optional · private</label>
              {roots ? (
                <p className="cn-big" style={{ margin: "8px 0 0" }}>
                  {COUNTRIES.find((c) => c.code === roots)?.label}
                  <button type="button" className="cn-link" style={{ marginLeft: 12, verticalAlign: "middle" }} onClick={() => { setRoots(null); setRootsQ(""); }}>change</button>
                </p>
              ) : (
                <>
                  <input id="cn-roots" className="cn-input" placeholder="Where from?" value={rootsQ} onChange={(e) => setRootsQ(e.target.value)} style={{ marginTop: 8 }} autoComplete="off" />
                  <div className="cn-words" style={{ marginTop: 12 }}>
                    {rootsHits.map((c) => (
                      <button key={c.code} type="button" className="cn-word" aria-pressed={false} style={{ color: "var(--fg)" }} onClick={() => setRoots(c.code)}>{c.label}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}

          {step === "phone" ? (
            <>
              <label className="cn-tag" htmlFor="cn-phone">phone · for a code</label>
              <input id="cn-phone" className="cn-input mono" inputMode="tel" autoComplete="tel" placeholder="(000) 000-0000" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d()+\-\s]/g, ""))} onKeyDown={(e) => e.key === "Enter" && void next()} style={{ marginTop: 12 }} />
            </>
          ) : null}

          {step === "code" ? (
            <>
              <label className="cn-tag" htmlFor="cn-code">code · sent by text</label>
              <input id="cn-code" className="cn-input mono" inputMode="numeric" autoComplete="one-time-code" placeholder="······" maxLength={6} value={code} autoFocus
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ marginTop: 12, letterSpacing: ".4em" }} />
            </>
          ) : null}

          {step === "pledge" ? (
            <p className="cn-big" style={{ margin: 0, maxWidth: "11ch" }}>
              Public places. Kind words. <span className="cn-it">Show up.</span>
            </p>
          ) : null}

          {step === "placing" ? <Placing /> : null}

          {step === "hold" ? <Hold grounds={grounds} held={held} onHold={hold} /> : null}
        </motion.section>
      </AnimatePresence>

      {step !== "placing" && step !== "hold" ? (
        <div className="cn-foot">
          <div className="cn-split" style={{ alignItems: "center" }}>
            <span className="cn-whisper" role="status" aria-live="polite">
              {whisper ?? (step === "roots" && !roots ? (
                <button type="button" className="cn-link" onClick={() => setStep("phone")}>skip</button>
              ) : step === "code" ? (
                <button type="button" className="cn-link" onClick={() => { setCode(""); setStep("phone"); }}>new number</button>
              ) : null)}
            </span>
            <button type="button" className="cn-act" onClick={() => void next()} disabled={!valid[step] || busy} data-testid="cn-next">
              {step === "pledge" ? "I'm in" : "Next"}
              {step === "pledge" ? null : <INext size={18} />}
            </button>
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

function Placing() {
  const reduce = useReducedMotion();
  const hues = ["var(--pods-ember)", "var(--pods-signal)", "var(--pods-grove)"];
  return (
    <div role="status" aria-live="polite">
      <div style={{ position: "absolute", left: 0, right: 0, top: -150, height: 120 }} aria-hidden>
        <svg viewBox="0 0 360 120" width="100%" height="120" preserveAspectRatio="xMidYMax meet">
          {hues.map((h, i) => (
            <motion.ellipse key={i} cx={70 + i * 110} rx={46} ry={7} style={{ fill: h }}
              initial={{ cy: -40, opacity: 0 }} animate={{ cy: 112, opacity: 1 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 14, delay: 0.3 + i * 0.45 }} />
          ))}
        </svg>
      </div>
      <p className="cn-big" style={{ margin: 0 }}>Finding <span className="cn-it">your people.</span></p>
    </div>
  );
}

function Hold({ grounds, held, onHold }: { grounds: GroundRef[]; held: string | null; onHold: (g: GroundRef) => void }) {
  const reduce = useReducedMotion();
  const active = grounds.filter((g) => !g.onDeck);
  const later = grounds.length - active.length;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <h1 className="cn-big" style={{ margin: 0 }}>Hold <span className="cn-it">one.</span></h1>
      <div style={{ display: "flex", gap: 24, marginTop: 32, flexWrap: "wrap" }}>
        {active.map((g, i) => (
          <motion.button
            key={g.id}
            type="button"
            className="cn-fold"
            data-hue={g.hue}
            onClick={() => onHold(g)}
            initial={{ opacity: 0, y: reduce ? 0 : -30 }}
            animate={held === g.id ? { opacity: 1, y: 0, scale: reduce ? 1 : 1.12 } : { opacity: held ? 0.25 : 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: held ? 0 : 0.15 + i * 0.18 }}
            aria-label={`Hold ${g.word}`}
            style={{ ["--fold" as string]: `var(--pods-${g.hue})` }}
          >
            <svg viewBox="0 0 150 40" width={150} height={40} aria-hidden>
              <ellipse cx={75} cy={28} rx={70} ry={9} style={{ fill: "var(--fold)" }} />
              <path d="M30 27 q 22 5 44 0 M80 29 q 22 -5 46 0" fill="none" stroke="var(--pods-ink)" strokeOpacity={0.2} />
            </svg>
            <span className="cn-mid">{g.word}</span>
          </motion.button>
        ))}
      </div>
      {later ? (
        <p className="cn-cap" style={{ marginTop: "auto", marginBottom: 0 }}>
          +{later} more after your first hangout
        </p>
      ) : null}
    </div>
  );
}
