// Call concept first run. The same grammar as a pod: Pods sends a call, you answer in the line itself.
// Inputs live inside the sentence (AW 06, 58 sentence as interface), choices are word fields you tap (AW 37 field,
// not chips or cards; counter-examples Discord c5bc0219, Brilliant a4620b17), progress is circles filling (PB 2.7).
// Steps: I'm __, __. · Into… · Free… · Roots or faith? · My number is __ · Code? · Public places. Kind, always. → Your people.
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDb, useMe, useRepo } from "@/lib/db/hooks";
import { INTERESTS } from "@/config/interests";
import { FAITH_NODES, HERITAGE_NODES } from "@/data/taxonomy";
import type { Slot } from "@/lib/types";
import { Answer, Disc, Dots, MarkButton, Sheet, Stage, ease, useWidth } from "./kit";
import { On } from "./icons";
import { INTEREST_WORDS, SLOT_WORDS, podHue, podWord } from "./words";

type Step = "me" | "into" | "free" | "roots" | "phone" | "code" | "pledge" | "placing" | "placed";
const PROGRESS: Record<Step, number> = { me: 0, into: 1, free: 2, roots: 3, phone: 4, code: 4, pledge: 5, placing: 5, placed: 5 };

const ROOTS = HERITAGE_NODES.filter((n) => n.level === "region").map((n) => ({ id: n.code, w: n.label }));
const FAITHS = FAITH_NODES.filter((n) => n.level === "denomination").map((n) => ({
  id: n.code,
  w: n.label.replace("Seventh-day Adventist", "Adventist").replace("Non-denominational Christian", "Non-denominational").replace("Muslim (Sunni)", "Sunni").replace("Muslim (Shia)", "Shia"),
}));
const AGES = Array.from({ length: 12 }, (_, i) => 18 + i);

export function Begin() {
  const params = useSearchParams();
  const router = useRouter();
  const repo = useRepo();
  const me = useMe();
  const reduce = useReducedMotion();
  const w = useWidth();
  const desk = w >= 1024;
  const signIn = params.get("at") === "phone";

  const [step, setStep] = useState<Step>(signIn ? "phone" : "me");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [agesOpen, setAgesOpen] = useState(false);
  const [into, setInto] = useState<string[]>([]);
  const [free, setFree] = useState<Slot[]>([]);
  const [root, setRoot] = useState<string | null>(null);
  const [faith, setFaith] = useState<string | null>(null);
  const [pick, setPick] = useState<"roots" | "faith" | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  const pods = useDb((db) =>
    db.me
      ? db.memberships
          .filter((m) => m.user_id === db.me && !m.left_at)
          .map((m) => db.pods[m.pod_id])
          .filter(Boolean)
      : [],
  );
  const activeIds = useDb((db) => (db.me ? db.memberships.filter((m) => m.user_id === db.me && !m.left_at && m.activation === "active").map((m) => m.pod_id) : []));

  useEffect(() => {
    if (step === "me" || step === "phone" || step === "code") {
      const t = setTimeout(() => field.current?.focus({ preventScroll: true }), 380);
      return () => clearTimeout(t);
    }
  }, [step]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const digits = phone.replace(/\D/g, "");

  const valid: Record<Step, boolean> = {
    me: name.trim().length >= 2 && age !== null,
    into: into.length > 0,
    free: free.length > 0,
    roots: true,
    phone: digits.length === 10,
    code: code.length === 6,
    pledge: true,
    placing: false,
    placed: true,
  };

  async function sendCode() {
    setBusy(true);
    setError(null);
    const r = await repo.startPhoneAuth(digits);
    setBusy(false);
    if (!r.ok) return setError("that number didn't work");
    setChallenge(r.data.challengeId);
    setStep("code");
  }

  async function verify(c: string) {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    const r = await repo.verifyPhoneCode(challenge, c);
    setBusy(false);
    if (!r.ok) {
      setCode("");
      return setError(r.error.code === "VALIDATION" && r.error.field === "locked" ? "too many tries" : "that code isn't right");
    }
    if (r.data.onboarding_step === "done") return router.push("/concepts/call/pods");
    setStep(name ? "pledge" : "me");
  }

  async function finish() {
    setStep("placing");
    const fail = (m: string, back: Step) => {
      setError(m);
      setStep(back);
    };
    const dob = `${2026 - (age ?? 22)}-01-15`;
    // City is functional (placement is metro-bound); it is never shown as copy.
    const r1 = await repo.updateAbout({ first_name: name.trim(), nickname: null, date_of_birth: dob, city: "Huntsville" });
    if (!r1.ok) return fail("check your age", "me");
    await repo.setInterests(into);
    await repo.setIdentity({
      heritage: root ? { level: "region", code: root } : null,
      faith: faith ? { level: "denomination", code: faith } : null,
      consent: !!(root || faith),
    });
    await repo.setAvailability(free, []);
    await repo.acceptPledge();
    await repo.submitVerification({});
    const run = await repo.runPlacement();
    if (!run.ok) return fail("we couldn't place you yet", "pledge");
    setTimeout(() => setStep("placed"), reduce ? 0 : 900);
  }

  const next = () => {
    if (!valid[step] || busy) return;
    setError(null);
    if (step === "me") setStep("into");
    else if (step === "into") setStep("free");
    else if (step === "free") setStep("roots");
    else if (step === "roots") setStep(me ? "pledge" : "phone");
    else if (step === "phone") void sendCode();
    else if (step === "code") void verify(code);
    else if (step === "pledge") void finish();
    else if (step === "placed") router.push("/concepts/call/pods");
  };

  const size = desk ? 112 : 56;
  const HUES = ["ember", "signal", "grove"] as const;
  const hue = HUES[PROGRESS[step] % 3];
  const big = { ["--size" as string]: `${size}px` } as React.CSSProperties;

  // ── The call for each step ────────────────────────────────────────
  let call: ReactNode = null;
  let body: ReactNode = null;
  let answer = "Next";
  if (step === "me") {
    call = (
      <h1 className="call-line" style={big}>
        <span className="row">
          I&rsquo;m{" "}
          <input
            ref={field}
            className="call-input"
            aria-label="Your first name"
            placeholder="name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value.replace(/[^\p{L}\s'-]/gu, ""))}
            onKeyDown={(e) => e.key === "Enter" && (age === null ? setAgesOpen(true) : next())}
            style={{ fontSize: "inherit", fontWeight: "inherit", letterSpacing: "inherit", fieldSizing: "content", minWidth: "2.4em", maxWidth: "6.5em" } as React.CSSProperties}
          />
          ,
        </span>
        <span className="row">
          <button type="button" className="call-word" aria-expanded={agesOpen} aria-label={age ? `Age ${age}, change` : "Your age"} onClick={() => setAgesOpen((v) => !v)}>
            {age ?? <span style={{ color: "var(--c-ink-3)" }}>age</span>}
          </button>
          .
        </span>
      </h1>
    );
    body = (
      <AnimatePresence>
        {agesOpen && (
          <motion.div role="radiogroup" aria-label="Age" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexWrap: "wrap", gap: "0 var(--s2)", maxWidth: 360 }}>
            {AGES.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={age === a} className="call-link" style={{ minWidth: 44, justifyContent: "center", color: age === a ? "var(--c-ink)" : undefined, textDecorationThickness: age === a ? 2 : 1 }} onClick={() => { setAge(a); setAgesOpen(false); }}>
                {a}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
    answer = "That's me";
  } else if (step === "into" || step === "free" || step === "roots") {
    const words =
      step === "into"
        ? INTERESTS.filter((i) => i.active).map((i) => ({ id: i.id, w: INTEREST_WORDS[i.id] ?? i.label.toLowerCase(), on: into.includes(i.id), tap: () => setInto((l) => toggle(l, i.id)) }))
        : step === "free"
          ? SLOT_WORDS.map((s) => ({ id: s.id, w: s.w, on: free.includes(s.id), tap: () => setFree((l) => toggle(l, s.id)) }))
          : [];
    call = (
      <h1 className="call-line" style={big}>
        <span className="row">{step === "into" ? "Into…" : step === "free" ? "Free…" : "Roots or faith?"}</span>
      </h1>
    );
    body =
      step === "roots" ? (
        <div style={{ display: "grid", gap: "var(--s6)" }}>
          <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: desk ? 40 : 30, lineHeight: 1.5, letterSpacing: "-0.01em", fontVariationSettings: '"opsz" 36', display: "flex", flexWrap: "wrap", columnGap: "0.6em" }}>
            <button type="button" className={`call-word ${root ? "" : "quiet"}`} aria-haspopup="dialog" onClick={() => setPick("roots")} style={{ minHeight: 44, color: root ? "var(--c-ink)" : "var(--c-ink-2)" }} data-testid="call-roots">
              {ROOTS.find((r) => r.id === root)?.w ?? "my roots"}
            </button>
            <button type="button" className={`call-word ${faith ? "" : "quiet"}`} aria-haspopup="dialog" onClick={() => setPick("faith")} style={{ minHeight: 44, color: faith ? "var(--c-ink)" : "var(--c-ink-2)" }} data-testid="call-faith">
              {FAITHS.find((f) => f.id === faith)?.w ?? "my faith"}
            </button>
          </p>
          <p className="call-mono sm" style={{ margin: 0 }}>optional · only your pod sees it</p>
        </div>
      ) : (
        <WordField words={words} size={desk ? 40 : 30} />
      );
    answer = step === "roots" ? (root || faith ? "Next" : "Not now") : step === "into" ? "Those" : "Then";
  } else if (step === "phone") {
    call = (
      <h1 className="call-line" style={big}>
        <span className="row">My number</span>
        <span className="row">
          is{" "}
          <input
            ref={field}
            className="call-input"
            aria-label="Your mobile number"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="···"
            value={phone}
            onChange={(e) => setPhone(fmtPhone(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && next()}
            style={{ fontSize: "0.72em", fieldSizing: "content", minWidth: "4em" } as React.CSSProperties}
          />
        </span>
      </h1>
    );
    answer = busy ? "Sending" : "Send code";
  } else if (step === "code") {
    call = (
      <h1 className="call-line" style={big}>
        <span className="row">Code?</span>
      </h1>
    );
    body = (
      <div>
        <input
          ref={field}
          className="call-input"
          aria-label="Six-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="······"
          value={code}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(c);
            if (c.length === 6) void verify(c);
          }}
          style={{ fontSize: desk ? 64 : 44, letterSpacing: "0.3em", width: "4.4em", fontVariantNumeric: "tabular-nums" }}
        />
        <p className="call-mono sm" style={{ margin: "var(--s3) 0 0" }}>sent to ··· {digits.slice(-4)}</p>
      </div>
    );
    answer = busy ? "Checking" : "Next";
  } else if (step === "pledge") {
    call = (
      <h1 className="call-line" style={big}>
        <span className="row">Public places.</span>
        <span className="row">Kind, always.</span>
      </h1>
    );
    answer = "I'm in";
  } else {
    const placed = step === "placed";
    call = (
      <h1 className="call-line" style={big}>
        <span className="row">Your people.</span>
      </h1>
    );
    body = (
      <div className="call-discs" style={{ gap: "var(--s6) var(--s4)", alignItems: "flex-start", flexWrap: "wrap", maxWidth: desk ? 720 : 300 }} aria-live="polite">
        {placed
          ? pods.map((p, i) => {
              const open = activeIds.includes(p.id);
              return (
                <motion.div key={p.id} data-hue={podHue(pods, p)} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduce ? 0 : i * 0.12, type: "spring", stiffness: 260, damping: 26 }} style={{ display: "grid", justifyItems: "start", gap: "var(--s2)" }}>
                  <span className="call-disc" data-kind={open ? undefined : "seat"} style={{ ["--d" as string]: desk ? "88px" : "64px", background: open ? "var(--hue)" : undefined, marginLeft: 0 }} />
                  <span className="call-mono" style={{ color: "var(--c-ink)", whiteSpace: "nowrap" }}>{podWord(p).toLowerCase()}<br /><span style={{ color: "var(--c-ink-3)" }}>{open ? "now" : "soon"}</span></span>
                </motion.div>
              );
            })
          : [0, 1, 2].map((i) => (
              <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }}>
                <Disc kind="seat" size={desk ? 88 : 72} />
              </motion.span>
            ))}
      </div>
    );
    answer = "Meet them";
  }

  return (
    <Stage hue={hue}>
      <motion.div className="call-sun" aria-hidden animate={{ backgroundColor: "var(--hue-field)" }} transition={{ duration: 0.6 }} />
      <header className="call-top">
        <MarkButton href="/concepts/call" />
        <Dots n={6} at={PROGRESS[step]} />
      </header>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -16, transition: { duration: 0.16 } }}
          transition={{ duration: 0.42, ease }}
          style={{ position: "relative", zIndex: 1, padding: desk ? "18svh var(--gutter) 160px" : "17svh var(--gutter) 140px", display: "grid", gap: "var(--s8)", maxWidth: desk ? 980 : undefined }}
        >
          {call}
          {body}
          {error && <p role="alert" className="call-mono" style={{ margin: 0, color: "var(--hue-ink)" }}>{error}</p>}
        </motion.section>
      </AnimatePresence>

      <Sheet open={pick !== null} onClose={() => setPick(null)} label={pick === "faith" ? "Faith" : "Roots"}>
        <p className="call-mono sm" style={{ margin: "0 0 var(--s4)" }}>{pick === "faith" ? "faith" : "roots"}</p>
        {pick && (
          <WordField
            single
            size={desk ? 26 : 24}
            words={(pick === "roots" ? ROOTS : FAITHS).map((x) => {
              const on = (pick === "roots" ? root : faith) === x.id;
              const set = pick === "roots" ? setRoot : setFaith;
              return { id: x.id, w: x.w, on, tap: () => { set(on ? null : x.id); setTimeout(() => setPick(null), reduce ? 0 : 260); } };
            })}
          />
        )}
      </Sheet>

      <footer style={{ position: "fixed", zIndex: 2, right: 0, bottom: 0, padding: desk ? "0 var(--gutter) var(--s12)" : "0 var(--gutter) calc(var(--s8) + env(safe-area-inset-bottom))" }}>
        <AnimatePresence mode="wait">
          {step !== "placing" && step !== "code" && (
            <Answer key={step} onClick={next} disabled={!valid[step] || busy} icon={<On size={20} />} testId="call-next">
              {answer}
            </Answer>
          )}
        </AnimatePresence>
      </footer>
    </Stage>
  );
}

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** Words you tap. A chosen word gets a small disc of the hue before it (the circle echoes back). */
function WordField({ words, size, label, single }: { words: { id: string; w: string; on: boolean; tap: () => void }[]; size: number; label?: string; single?: boolean }) {
  const list = useMemo(() => words, [words]);
  return (
    <div role="group" aria-label={label} style={{ maxWidth: 720 }}>
      {label && <p className="call-mono sm" style={{ margin: "0 0 var(--s2)" }}>{label}</p>}
      <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: size, lineHeight: 1.5, letterSpacing: "-0.01em", fontVariationSettings: '"opsz" 36' }}>
        {list.map((x) => (
          <span key={x.id} style={{ whiteSpace: "nowrap", marginRight: "0.55em", display: "inline-flex", alignItems: "center" }}>
            <AnimatePresence initial={false}>
              {x.on && (
                <motion.i
                  initial={{ scale: 0, width: 0 }}
                  animate={{ scale: 1, width: "0.4em" }}
                  exit={{ scale: 0, width: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  style={{ display: "inline-block", height: "0.4em", marginRight: "0.16em", borderRadius: 99, background: "var(--hue)", flex: "none" }}
                  aria-hidden
                />
              )}
            </AnimatePresence>
            <button type="button" className={`call-word ${x.on ? "" : "quiet"}`} role={single ? "radio" : "checkbox"} aria-checked={x.on} onClick={x.tap} style={{ minHeight: 44, color: x.on ? "var(--c-ink)" : "var(--c-ink-2)" }}>
              {x.w}
            </button>
          </span>
        ))}
      </p>
    </div>
  );
}
