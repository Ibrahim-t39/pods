// Sentence concept: landing → onboarding → reveal, as ONE sentence on one page.
// Landing: "Three friends, one court, a seat for you." The three logo circles sit cropped by the right edge with a
// dashed fourth circle: the seat (AW 04, 06, 12; SF 23, 24; IL 22, 05). Tapping "you" starts writing your clause.
// Onboarding: a typewriter. The sentence so far is small; the clause you are writing is huge; each blank raises a
// one-row ribbon of choices from the word itself (AW 06, 58 sentence-as-interface; CM 114 Ahead fill-in, rethought).
// Progress = circles filling (PB 2.7; SF 19, 24). Reveal: your pods arrive as lines of a poem.
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useDb, useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { INTERESTS } from "@/config/interests";
import { FAITH_NODES, HERITAGE_NODES } from "@/data/taxonomy";
import type { Slot } from "@/lib/types";
import { Glyph, Logo, PenName, Stage, Stop, Typeset, ease } from "./ui";
import { podWord } from "./model";

type Phase = "landing" | "write" | "placing" | "found";
type ClauseId = "name" | "age" | "into" | "free" | "roots" | "faith" | "phone" | "kind";
const ORDER: ClauseId[] = ["name", "age", "into", "free", "roots", "faith", "phone", "kind"];

const INTEREST_WORDS = INTERESTS.filter((i) => i.active).map((i) => ({ id: i.id, w: i.label.split(" & ")[0].toLowerCase() }));
const SLOT_WORDS: { id: Slot; w: string }[] = [
  { id: "wednesday-evening", w: "weeknights" },
  { id: "saturday-morning", w: "saturday mornings" },
  { id: "saturday-afternoon", w: "saturday afternoons" },
  { id: "saturday-evening", w: "saturday nights" },
  { id: "sunday-morning", w: "sunday mornings" },
  { id: "sunday-afternoon", w: "sunday afternoons" },
  { id: "sunday-evening", w: "sunday nights" },
];
const ROOT_WORDS = HERITAGE_NODES.filter((n) => n.level === "country").map((n) => ({ id: n.code, w: n.label }));
const FAITH_WORDS = FAITH_NODES.filter((n) => n.level === "denomination").map((n) => ({
  id: n.code,
  w: n.label.replace("Seventh-day ", "").replace("Non-denominational Christian", "Non-denominational").replace("Muslim (Sunni)", "Sunni").replace("Muslim (Shia)", "Shia"),
}));
const AGES = Array.from({ length: 12 }, (_, i) => 18 + i);

function join(words: string[]) {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
const wOf = <T extends { id: string; w: string }>(list: T[], ids: string[]) => ids.map((id) => list.find((x) => x.id === id)?.w ?? id);

export function Begin({ start = "landing" }: { start?: Phase }) {
  const hydrated = useHydrated();
  const me = useMe();
  const repo = useRepo();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(start);
  const [at, setAt] = useState<ClauseId>("name");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [into, setInto] = useState<string[]>([]);
  const [free, setFree] = useState<Slot[]>([]);
  const [roots, setRoots] = useState<string | null | "skip">(null);
  const [faith, setFaith] = useState<string | null | "skip">(null);
  const [phone, setPhone] = useState("");
  const [kind, setKind] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ active: string[]; later: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const done = me?.onboarding_step === "done";
  const myPods = useDb((db) =>
    db.me
      ? db.memberships
          .filter((m) => m.user_id === db.me && !m.left_at)
          .map((m) => ({ id: m.pod_id, word: podWord(db.pods[m.pod_id]), active: m.activation === "active", hue: db.pods[m.pod_id]?.hue }))
      : [],
  );

  useEffect(() => {
    if (phase === "write" && (at === "name" || at === "phone")) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 420);
      return () => clearTimeout(t);
    }
  }, [phase, at]);

  const valid: Record<ClauseId, boolean> = {
    name: name.trim().length > 0 && name.trim().length <= 30,
    age: age !== null,
    into: into.length > 0,
    free: free.length > 0,
    roots: roots !== null,
    faith: faith !== null,
    phone: phone.replace(/\D/g, "").length >= 10,
    kind,
  };
  const idx = ORDER.indexOf(at);
  const filled = ORDER.filter((c) => valid[c]).length;

  const next = () => {
    if (!valid[at]) return;
    setError(null);
    const n = ORDER[idx + 1];
    if (n) setAt(n);
    else void finish();
  };

  async function finish() {
    setPhase("placing");
    const fail = (m: string) => {
      setError(m);
      setPhase("write");
    };
    const digits = phone.replace(/\D/g, "");
    const r1 = await repo.startPhoneAuth(digits);
    if (!r1.ok) return fail("that number didn't work");
    const r2 = await repo.verifyPhoneCode(r1.data.challengeId, "123456");
    if (!r2.ok) return fail("that number can't join");
    const dob = `${2026 - (age ?? 22)}-01-15`;
    // City is functional (placement is metro-bound); it is never shown as copy.
    const r3 = await repo.updateAbout({ first_name: name.trim(), nickname: null, date_of_birth: dob, city: "Seattle" });
    if (!r3.ok) return fail("check your age");
    await repo.setInterests(into);
    const h = roots && roots !== "skip" ? { level: "country" as const, code: roots } : null;
    const f = faith && faith !== "skip" ? { level: "denomination" as const, code: faith } : null;
    await repo.setIdentity({ heritage: h, faith: f, consent: !!(h || f) });
    await repo.setAvailability(free, []);
    await repo.acceptPledge();
    await repo.submitVerification({});
    const run = await repo.runPlacement();
    if (!run.ok) return fail("we couldn't place you yet");
    setPhase("found");
  }

  useEffect(() => {
    if (phase !== "found") return;
    const active = myPods.filter((p) => p.active).map((p) => p.word);
    setPlaced({ active, later: myPods.length - active.length });
  }, [phase, myPods]);

  // ── LANDING ───────────────────────────────────────────────────────────────
  if (phase === "landing") {
    const go = () => (done ? router.push("/concepts/sentence/home") : setPhase("write"));
    return (
      <Stage hue="ember" label="Pods">
        <div className="snt-page">
          <header className="snt-top">
            <Logo />
          </header>
          <section style={{ alignSelf: "center", position: "relative", paddingTop: "4vh" }}>
            <Trio />
            <h1 className="snt-d" style={{ maxWidth: "9.2em" }}>
              <Line i={0}>Three friends,</Line>
              <Line i={1}>one court,</Line>
              <Line i={2}>a seat for </Line>
              <motion.button
                type="button"
                className="snt-w snt-plain"
                onClick={go}
                aria-label={done ? "Go to your pods" : "Take your seat"}
                style={{ position: "relative" }}
              >
                {hydrated ? <PenName name={done && me ? me.first_name : "you"} delay={reduce ? 0 : 1.1} /> : <span className="snt-i snt-hueText">you</span>}
              </motion.button>
              <span className="snt-blank" data-idle={hydrated ? undefined : "1"} style={{ minWidth: 0, width: "0.08em", border: 0 }} aria-hidden />
            </h1>
          </section>
          <footer className="snt-foot">
            <p className="snt-m" style={{ margin: 0, maxWidth: "20ch" }}>
              find your people.
              <br />
              then keep them.
            </p>
            <button type="button" className="snt-btn" onClick={go} aria-label={done ? "Go to your pods" : "Take your seat"} style={{ color: "var(--hue-ink)" }}>
              <Glyph name="next" size={30} />
            </button>
          </footer>
        </div>
      </Stage>
    );
  }

  // ── WRITE (onboarding) ────────────────────────────────────────────────────
  const clauseText: Record<ClauseId, string | null> = {
    name: valid.name ? `I'm ${name.trim()},` : null,
    age: age !== null ? `${age},` : null,
    into: into.length ? `into ${join(wOf(INTEREST_WORDS, into))}.` : null,
    free: free.length ? `Free ${join(wOf(SLOT_WORDS, free))}.` : null,
    roots: roots === "skip" ? null : roots ? `${wOf(ROOT_WORDS, [roots])[0]} roots,` : null,
    faith: faith === "skip" ? null : faith ? `${wOf(FAITH_WORDS, [faith])[0]}.` : null,
    phone: valid.phone ? `Text me at ${phone}.` : null,
    kind: kind ? "I'll show up kind." : null,
  };

  const so_far = ORDER.slice(0, phase === "write" ? idx : ORDER.length)
    .map((c) => ({ c, t: clauseText[c] }))
    .filter((x) => x.t);

  const toggle = <T,>(list: T[], v: T, max: number) => (list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? [...list.slice(1), v] : [...list, v]);

  const clause: Record<ClauseId, { big: ReactNode; ribbon?: ReactNode; note?: string }> = {
    name: {
      big: (
        <>
          I&apos;m{" "}
          <input
            ref={inputRef}
            className="snt-input"
            aria-label="Your first name"
            placeholder="name"
            value={name}
            maxLength={30}
            autoComplete="given-name"
            enterKeyHint="next"
            onChange={(e) => setName(e.target.value.replace(/[^\p{L}\p{M}' -]/gu, ""))}
            onKeyDown={(e) => e.key === "Enter" && next()}
            style={{ width: name ? undefined : "2.6em" }}
          />
          ,
        </>
      ),
    },
    age: {
      big: (
        <>
          {name.trim()}, <Blank v={age !== null ? String(age) : null} />,
        </>
      ),
      ribbon: AGES.map((a) => (
        <Choice key={a} on={age === a} onClick={() => { setAge(a); setTimeout(() => setAt("into"), reduce ? 0 : 380); }}>
          {a}
        </Choice>
      )),
    },
    into: {
      big: (
        <>
          into <Blank v={into[0] ? wOf(INTEREST_WORDS, [into[0]])[0] : null} />
          {into.length > 0 && (
            <>
              {" "}and <Blank v={into[1] ? wOf(INTEREST_WORDS, [into[1]])[0] : null} />
            </>
          )}
          .
        </>
      ),
      ribbon: INTEREST_WORDS.map((i) => (
        <Choice
          key={i.id}
          on={into.includes(i.id)}
          onClick={() => {
            const n = toggle(into, i.id, 2);
            setInto(n);
            if (n.length === 2) setTimeout(() => setAt("free"), reduce ? 0 : 520);
          }}
        >
          {i.w}
        </Choice>
      )),
    },
    free: {
      big: (
        <>
          Free <Blank v={free.length ? join(wOf(SLOT_WORDS, free)) : null} />.
        </>
      ),
      ribbon: SLOT_WORDS.map((s) => (
        <Choice key={s.id} on={free.includes(s.id)} onClick={() => setFree(toggle(free, s.id, 3))}>
          {s.w}
        </Choice>
      )),
    },
    roots: {
      big: (
        <>
          <Blank v={roots && roots !== "skip" ? wOf(ROOT_WORDS, [roots])[0] : roots === "skip" ? "—" : null} /> roots,
        </>
      ),
      note: "private · only used to place you",
      ribbon: [
        <Choice key="skip" on={roots === "skip"} onClick={() => { setRoots("skip"); setTimeout(() => setAt("faith"), reduce ? 0 : 300); }}>
          skip
        </Choice>,
        ...ROOT_WORDS.map((r) => (
          <Choice key={r.id} on={roots === r.id} onClick={() => { setRoots(r.id); setTimeout(() => setAt("faith"), reduce ? 0 : 380); }}>
            {r.w}
          </Choice>
        )),
      ],
    },
    faith: {
      big: (
        <>
          <Blank v={faith && faith !== "skip" ? wOf(FAITH_WORDS, [faith])[0] : faith === "skip" ? "—" : null} />.
        </>
      ),
      note: "private · only used to place you",
      ribbon: [
        <Choice key="skip" on={faith === "skip"} onClick={() => { setFaith("skip"); setTimeout(() => setAt("phone"), reduce ? 0 : 300); }}>
          skip
        </Choice>,
        ...FAITH_WORDS.map((r) => (
          <Choice key={r.id} on={faith === r.id} onClick={() => { setFaith(r.id); setTimeout(() => setAt("phone"), reduce ? 0 : 380); }}>
            {r.w}
          </Choice>
        )),
      ],
    },
    phone: {
      big: (
        <>
          Text me at{" "}
          <input
            ref={inputRef}
            className="snt-input"
            aria-label="Your phone number"
            placeholder="number"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            maxLength={16}
            enterKeyHint="next"
            onChange={(e) => setPhone(e.target.value.replace(/[^\d\s()+-]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && next()}
            style={{ width: phone ? undefined : "3.6em" }}
          />
          .
        </>
      ),
      note: "never shown to anyone",
    },
    kind: {
      big: (
        <>
          I&apos;ll show up{" "}
          <button type="button" className={kind ? "snt-w snt-plain" : "snt-w"} aria-pressed={kind} aria-label="Promise to show up kind" onClick={() => setKind(true)}>
            {kind ? <PenName name="kind" /> : "kind"}
          </button>
          .
        </>
      ),
      note: "tap kind to sign",
    },
  };

  const active = clause[at];

  return (
    <Stage hue="ember" label="Start">
      <div className="snt-page">
        <header className="snt-top">
          <Logo />
          {phase === "write" && idx > 0 && (
            <button type="button" className="snt-btn snt-m" onClick={() => setAt(ORDER[idx - 1])} aria-label="Previous">
              <Glyph name="back" />
            </button>
          )}
        </header>

        <section style={{ alignSelf: "start", paddingTop: "clamp(28px, 9vh, 120px)", minWidth: 0 }}>
          {/* the sentence so far: small, quiet, tappable to revise */}
          <AnimatePresence initial={false}>
            {(phase === "write" ? so_far.length > 0 : true) && phase !== "found" && (
              <motion.p
                key="sofar"
                className="snt-s snt-verse-small"
                style={{ margin: "0 0 0.6em", maxWidth: "26em" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {so_far.map(({ c, t }) => (
                  <button key={c} type="button" className="snt-w snt-plain" onClick={() => phase === "write" && setAt(c)} style={{ marginRight: "0.28em" }}>
                    {t}
                  </button>
                ))}
              </motion.p>
            )}
          </AnimatePresence>

          {phase === "write" && (
            <AnimatePresence mode="wait">
              <motion.div
                key={at}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24, scale: 0.96, transition: { duration: 0.22 } }}
                transition={{ duration: 0.5, ease }}
                style={{ transformOrigin: "0 0" }}
              >
                <h1 className="snt-d" style={{ overflowWrap: "anywhere" }}>
                  {active.big}
                </h1>
                {active.note && (
                  <p className="snt-m" style={{ margin: "14px 0 0" }}>
                    {active.note}
                  </p>
                )}
                {active.ribbon && (
                  <motion.div
                    className="snt-ribbon"
                    role="listbox"
                    aria-label="Choices"
                    initial={reduce ? false : { opacity: 0, y: -14, clipPath: "inset(0 0 100% 0)" }}
                    animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
                    transition={{ delay: 0.18, duration: 0.5, ease }}
                  >
                    {active.ribbon}
                  </motion.div>
                )}
                {error && (
                  <p className="snt-m" role="alert" style={{ color: "var(--hue-ink)", marginTop: 14 }}>
                    {error}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {phase === "placing" && (
            <h1 className="snt-d" aria-live="polite">
              <Typeset text="Finding your people" speed={0.04} />
              <motion.span animate={reduce ? {} : { opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                …
              </motion.span>
            </h1>
          )}

          {phase === "found" && placed && <Found active={placed.active} later={placed.later} name={name.trim() || me?.first_name || ""} />}
        </section>

        <footer className="snt-foot">
          {phase === "write" ? (
            <>
              <Progress n={ORDER.length} filled={filled} at={idx} />
              <button
                type="button"
                className="snt-btn"
                onClick={next}
                disabled={!valid[at]}
                aria-label={at === "kind" ? "Find my people" : "Next"}
                style={{ color: valid[at] ? "var(--hue-ink)" : "var(--ink-4)", transition: "color .2s" }}
              >
                {at === "kind" ? (
                  <span className="snt-s" style={{ fontStyle: "italic" }}>
                    Find my people<Stop show={kind} />
                  </span>
                ) : (
                  <Glyph name="next" size={30} />
                )}
              </button>
            </>
          ) : phase === "found" ? (
            <>
              <span />
              <button type="button" className="snt-btn" onClick={() => router.push("/concepts/sentence/home")} aria-label="Meet them" style={{ color: "var(--hue-ink)" }}>
                <span className="snt-s snt-i">Meet them</span>
                <Glyph name="next" size={30} />
              </button>
            </>
          ) : (
            <span />
          )}
        </footer>
      </div>
    </Stage>
  );
}

function Line({ children, i }: { children: ReactNode; i: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      style={{ display: "block", paddingLeft: i % 2 === 1 ? "0.9em" : 0 }}
      initial={reduce ? false : { opacity: 0, y: "0.3em", filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay: 0.15 + i * 0.22, duration: 0.7, ease }}
    >
      {children}
    </motion.span>
  );
}

/** The three logo circles (three friends) and a dashed fourth: the seat. Cropped by the right edge. */
function Trio() {
  const reduce = useReducedMotion();
  const c = (cx: number, cy: number, fill: string, d: number) => (
    <motion.circle
      cx={cx}
      cy={cy}
      r="96"
      fill={fill}
      style={{ mixBlendMode: "multiply" }}
      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.94 }}
      transition={{ delay: d, type: "spring", stiffness: 140, damping: 16 }}
    />
  );
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 420"
      style={{ position: "absolute", zIndex: -1, right: "calc(var(--gutter) * -1 - 18%)", top: "-12%", width: "min(92vw, 760px)", height: "auto", overflow: "visible" }}
    >
      {c(200, 120, "var(--ember)", 0.2)}
      {c(128, 234, "var(--signal)", 0.36)}
      {c(272, 234, "var(--grove)", 0.52)}
      <motion.circle
        cx="200"
        cy="350"
        r="60"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeDasharray="6 8"
        initial={reduce ? false : { opacity: 0, rotate: -40 }}
        animate={{ opacity: 0.55, rotate: 0 }}
        transition={{ delay: 0.9, duration: 1.2, ease }}
        style={{ transformOrigin: "200px 350px" }}
      />
    </svg>
  );
}

function Blank({ v }: { v: string | null }) {
  if (v) return <span className="snt-i snt-hueText">{v}</span>;
  return <span className="snt-blank" role="presentation" />;
}

function Choice({ children, on, onClick }: { children: ReactNode; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="option" aria-selected={on} aria-pressed={on} className="snt-btn" onClick={onClick}>
      {children}
    </button>
  );
}

function Progress({ n, filled, at }: { n: number; filled: number; at: number }) {
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={filled} aria-label="Your sentence" style={{ display: "flex", gap: 6, alignItems: "center", minHeight: 44 }}>
      {Array.from({ length: n }, (_, i) => (
        <motion.span
          key={i}
          animate={{ backgroundColor: i < filled ? "var(--hue)" : "rgba(0,0,0,0)", scale: i === at ? 1.25 : 1 }}
          style={{ width: 9, height: 9, borderRadius: 99, border: "1.5px solid var(--hue)", display: "block" }}
        />
      ))}
    </div>
  );
}

function Found({ active, later, name }: { active: string[]; later: number; name: string }) {
  const reduce = useReducedMotion();
  const lines = [...active.map((a, i) => `${a}${i === active.length - 1 && !later ? "." : ","}`), ...(later ? [later === 1 ? "and one more soon." : `and ${later === 2 ? "two" : later} more soon.`] : [])];
  return (
    <div>
      <motion.p className="snt-m" style={{ margin: "0 0 18px" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {name ? `${name.toLowerCase()} · your pods` : "your pods"}
      </motion.p>
      <h1 className="snt-d" aria-label={lines.join(" ")}>
        {lines.map((l, i) => (
          <motion.span
            key={l}
            className={i >= active.length ? "snt-faint" : undefined}
            style={{ display: "block", paddingLeft: i % 2 ? "0.9em" : 0 }}
            initial={reduce ? false : { opacity: 0, y: "0.4em", filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.3 + i * 0.45, duration: 0.8, ease }}
          >
            {l}
          </motion.span>
        ))}
      </h1>
    </div>
  );
}
