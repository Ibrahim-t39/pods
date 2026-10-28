// TABLE · Doorway: the landing is a saved seat (AW 04, 06, 12; SF 23, 24), and onboarding happens at the same
// table. Each answer closes one arc of your seat's ring (PB 2.7). Writes go through the real Repo at the end.
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { INTERESTS } from "@/config/interests";
import { useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { nowISO } from "@/lib/time/clock";
import type { Slot } from "@/lib/types";
import { IcOn, IcTurn } from "./icons";
import { FREE, onCircle, SHORT } from "./model";
import { Disc, GENTLE, HoldRing, Logo, Paper, SeatArcs, SNAPPY, TableTop, useHold, useWide } from "./ui";

type Step = "door" | "you" | "likes" | "free" | "phone" | "code" | "promise" | "finding";
const ORDER: Step[] = ["door", "you", "likes", "free", "phone", "code", "promise", "finding"];
const PROGRESS: Record<Step, number> = { door: 0, you: 0, likes: 1, free: 2, phone: 3, code: 3, promise: 4, finding: 5 };
const FRIENDS = [
  { deg: 210, color: "var(--tb-ember)" },
  { deg: 270, color: "var(--tb-signal)" },
  { deg: 330, color: "var(--tb-grove)" },
];
const SEATS = [90, 210, 270, 330];
const RING_ANGLES = [165, 215, 270, 325, 15];
const PICK_SPOTS = [
  { deg: 225, r: 0.11 },
  { deg: 315, r: 0.11 },
  { deg: 90, r: 0.1 },
];

function ageOn(dob: string, at: string) {
  const [y, m, d] = dob.split("-").map(Number);
  const [ny, nm, nd] = at.slice(0, 10).split("-").map(Number);
  return ny - y - (nm < m || (nm === m && nd < d) ? 1 : 0);
}

export function Doorway() {
  const router = useRouter();
  const hydrated = useHydrated();
  const me = useMe();
  const repo = useRepo();
  const wide = useWide();
  const [step, setStep] = useState<Step>("door");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [likes, setLikes] = useState<string[]>([]);
  const [turn, setTurn] = useState(0);
  const [free, setFree] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sat, setSat] = useState(false);
  const placed = hydrated && me?.onboarding_step === "done";

  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };
  const back = () => go(ORDER[Math.max(0, ORDER.indexOf(step) - (step === "promise" ? 2 : 1))]);

  // ── derived ──
  const dobISO = useMemo(() => {
    const m = dob.match(/^(\d{2}) \/ (\d{2}) \/ (\d{4})$/);
    if (!m) return null;
    const iso = `${m[3]}-${m[1]}-${m[2]}`;
    return Number.isNaN(Date.parse(iso)) || +m[1] > 12 || +m[2] > 31 ? null : iso;
  }, [dob]);
  const interests = useMemo(() => INTERESTS.filter((i) => i.active), []);
  const pages = Math.ceil(interests.length / RING_ANGLES.length);
  const onRing = interests.filter((i) => !likes.includes(i.id)).slice(turn * RING_ANGLES.length, turn * RING_ANGLES.length + RING_ANGLES.length);

  // ── actions ──
  const youNext = () => {
    if (!name.trim()) return setError("Add your first name.");
    if (!dobISO) return setError("Birthday as MM / DD / YYYY.");
    const age = ageOn(dobISO, nowISO());
    if (age < 18 || age > 29) return setError("Pods is for 18 to 29.");
    go("likes");
  };
  const sendCode = async () => {
    setBusy(true);
    const r = await repo.startPhoneAuth(phone);
    setBusy(false);
    if (!r.ok) return setError("Enter a full number.");
    setChallenge(r.data.challengeId);
    setCode("");
    go("code");
  };
  const verify = async (c: string) => {
    if (!challenge) return;
    setBusy(true);
    const r = await repo.verifyPhoneCode(challenge, c);
    setBusy(false);
    if (!r.ok) {
      setCode("");
      return setError(r.error.code === "UNDERAGE" ? "Pods is for 18 to 29." : "That code didn't match.");
    }
    go("promise");
  };
  const promise = async () => {
    if (busy) return;
    setSat(true);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 650));
    go("finding");
    const slots = FREE.filter((f) => free.includes(f.id)).flatMap((f) => f.slots) as Slot[];
    const steps = [
      () => repo.updateAbout({ first_name: name.trim(), nickname: null, date_of_birth: dobISO!, city: "Huntsville" }),
      () => repo.setInterests(likes),
      () => repo.setAvailability(slots),
      () => repo.acceptPledge(),
      () => repo.submitVerification({}),
      () => repo.runPlacement(),
    ];
    for (const s of steps) {
      const r = await s();
      if (!r.ok) {
        setBusy(false);
        setSat(false);
        setStep("promise");
        setError("Couldn't save. Hold again.");
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 900));
    router.push("/concepts/table/room?arrive=1");
  };
  const hold = useHold(promise);

  // Code auto-submits at 6 digits.
  useEffect(() => {
    if (step === "code" && code.length === 6 && !busy) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  // ── layout ──
  const big = step === "door" || step === "likes" || step === "free" || step === "promise" || step === "finding";
  const S = wide ? (step === "door" ? 600 : big ? 540 : 440) : big ? 340 : 196;
  const seatD = Math.max(48, S * (big ? 0.16 : 0.24));
  const progress = PROGRESS[step];
  const initial = (name.trim()[0] ?? me?.first_name?.[0] ?? "").toUpperCase();

  const question: Record<Step, string> = {
    door: "Saved you a seat.",
    you: "Who's sitting here?",
    likes: "What do you like?",
    free: "When are you free?",
    phone: "Keep your seat.",
    code: "Enter the code.",
    promise: "Show up. Be kind.",
    finding: "Setting your tables.",
  };

  // The table, shared by every step (one object, never replaced).
  const table = (
    <motion.div layout layoutId="tb-door-table" transition={GENTLE} style={{ width: S, height: S, flex: "none" }}>
      <TableTop size={S} seats={SEATS} hue={step === "door" ? "var(--tb-ink)" : "var(--tb-ink)"}>
        {step !== "likes" && step !== "free" && FRIENDS.map((f, i) => (
          <Disc key={f.deg} deg={f.deg} r={0.43} d={S * 0.13} color={f.color} from={{ deg: f.deg - 40, r: 0.7 }} delay={0.25 + i * 0.18} />
        ))}

        {/* Likes: the things around the table; take up to 3 (they move to the middle). */}
        {step === "likes" &&
          onRing.map((it, i) => (
            <RingItem key={it.id} deg={RING_ANGLES[i]} S={S} label={SHORT[it.id] ?? it.label} onClick={() => likes.length < 3 && setLikes([...likes, it.id])} disabled={likes.length >= 3} />
          ))}
        {(step === "likes" || step === "promise") &&
          likes.map((id, i) => (
            <PickedItem key={id} spot={PICK_SPOTS[i]} S={S} label={SHORT[id] ?? id} color={["var(--tb-ember)", "var(--tb-signal)", "var(--tb-grove)"][i]} onClick={step === "likes" ? () => setLikes(likes.filter((x) => x !== id)) : undefined} small={step !== "likes"} />
          ))}

        {/* Free: three arcs around the table. */}
        {step === "free" && <FreeArcs S={S} free={free} toggle={(id) => setFree(free.includes(id) ? free.filter((x) => x !== id) : [...free, id])} />}

        {step === "finding" && (
          <div className="tb-mono tb-t-label tb-muted tb-breathe" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }} aria-live="polite">
            ···
          </div>
        )}

        {/* Your seat, 6 o'clock, near the thumb. */}
        <motion.div
          style={{ position: "absolute", ...onCircle(90, sat ? 0.0 : 0.43), width: seatD, height: seatD, marginLeft: -seatD / 2, marginTop: -seatD / 2, zIndex: 3 }}
          animate={onCircle(90, sat || step === "finding" ? 0.0 : 0.43)}
          transition={SNAPPY}
        >
          {step === "door" ? (
            <button
              className="tb-hit"
              onClick={() => (placed ? router.push("/concepts/table/room") : go("you"))}
              aria-label="Sit"
              style={{ width: "100%", height: "100%", borderRadius: "50%", position: "relative", display: "grid", placeItems: "center", background: placed ? "var(--tb-ink)" : "transparent", color: placed ? "var(--tb-paper-lit)" : "var(--tb-ink)" }}
            >
              {!placed && <span className="tb-pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px dashed var(--tb-ink)" }} />}
              <span className="tb-mono" style={{ fontSize: 14, fontWeight: 500 }}>Sit</span>
            </button>
          ) : step === "promise" ? (
            <button
              className="tb-hit"
              {...hold.bind}
              aria-label="Hold to promise"
              style={{ width: "100%", height: "100%", borderRadius: "50%", position: "relative", display: "grid", placeItems: "center", background: "var(--tb-ink)", color: "var(--tb-paper-lit)", touchAction: "none", userSelect: "none" }}
            >
              <HoldRing d={seatD} progress={hold.progress} />
              <span className="tb-serif" style={{ fontSize: seatD * 0.46 }}>{initial}</span>
            </button>
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", position: "relative", display: "grid", placeItems: "center", background: initial ? "var(--tb-ink)" : "transparent", border: initial ? "none" : "1.5px dashed var(--tb-line-2)", color: "var(--tb-paper-lit)" }}>
              <SeatArcs d={seatD} total={5} done={progress} />
              <span className="tb-serif" style={{ fontSize: seatD * 0.46 }}>{initial}</span>
            </div>
          )}
        </motion.div>
      </TableTop>
    </motion.div>
  );

  const nextBtn = (onClick: () => void, enabled: boolean, label = "Next") => (
    <button className="tb-btn" onClick={onClick} disabled={!enabled || busy} aria-label={label}>
      {label}
      <IcOn size={18} />
    </button>
  );

  const fields = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} style={{ display: "grid", gap: "var(--s8)" }}>
        {step === "you" && (
          <div style={{ display: "grid", gap: "var(--s4)" }}>
            <input className="tb-field" aria-label="First name" placeholder="First name" autoComplete="given-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
            <input
              className="tb-field"
              aria-label="Birthday"
              placeholder="MM / DD / YYYY"
              inputMode="numeric"
              autoComplete="bday"
              value={dob}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                setDob([d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join(" / "));
              }}
              onKeyDown={(e) => e.key === "Enter" && youNext()}
            />
          </div>
        )}
        {step === "phone" && (
          <input
            className="tb-field"
            aria-label="Phone number"
            placeholder="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && phone.replace(/\D/g, "").length >= 10 && void sendCode()}
            autoFocus
          />
        )}
        {step === "code" && (
          <div style={{ display: "grid", gap: "var(--s2)" }}>
            <input
              className="tb-field"
              aria-label="Code"
              placeholder="······"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              maxLength={6}
              style={{ letterSpacing: "0.3em" }}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
            <span className="tb-mono tb-t-cap tb-muted">Sent to ···{phone.replace(/\D/g, "").slice(-4)}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const action =
    step === "you" ? nextBtn(youNext, !!name.trim() && dob.length === 14)
    : step === "likes" ? nextBtn(() => go("free"), likes.length > 0)
    : step === "free" ? nextBtn(() => go("phone"), free.length > 0)
    : step === "phone" ? nextBtn(() => void sendCode(), phone.replace(/\D/g, "").length >= 10, "Text me")
    : step === "code" ? nextBtn(() => void verify(code), code.length === 6)
    : null;

  const errLine = (
    <p className="tb-mono tb-t-label" role="alert" style={{ color: "var(--tb-ember-deep)", minHeight: 18, margin: 0 }}>
      {error ?? ""}
    </p>
  );
  const sub =
    step === "promise" ? (hold.armed ? "Tap again" : "Hold your seat") : step === "likes" ? null : step === "free" ? "Usually" : step === "door" ? null : null;
  const turnBtn = step === "likes" && pages > 1 && (
    <button className="tb-quiet" onClick={() => setTurn((turn + 1) % pages)} aria-label="Turn the table">
      <IcTurn size={22} />
    </button>
  );
  const backBtn =
    step !== "door" && step !== "finding" ? (
      <button className="tb-quiet" onClick={back} aria-label="Back" style={{ marginLeft: -6 }}>
        <IcOn size={20} style={{ transform: "rotate(180deg)" }} />
      </button>
    ) : (
      <Logo height={wide ? 28 : 24} />
    );

  // ── Desktop: text column left, the table right (off-centre, PB 1.1). ──
  if (wide) {
    return (
      <Paper lamp={{ x: "68%", y: "38%" }}>
        <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "minmax(420px, 1fr) minmax(600px, 1.25fr)", padding: "var(--s12) var(--s16)", gap: "var(--s24)" }}>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 96px)" }}>
            <div style={{ height: 48, display: "flex", alignItems: "center" }}>{backBtn}</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: step === "door" ? "flex-end" : "center", gap: "var(--s8)", paddingBottom: step === "door" ? "var(--s12)" : 0 }}>
              <motion.h1 key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={`tb-serif ${step === "door" ? "tb-t-xxl" : "tb-t-xl"}`} style={{ margin: 0, maxWidth: step === "door" ? 560 : 480 }}>
                {question[step]}
              </motion.h1>
              {sub && <p className="tb-mono tb-t-body tb-muted" style={{ margin: 0, marginTop: "calc(var(--s8) * -0.5)" }}>{step === "promise" ? <>Claude plans each hangout.<br />{sub}</> : sub}</p>}
              {!big && <div style={{ maxWidth: 420 }}>{fields}</div>}
              {(action || turnBtn || error) && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s4)", marginTop: "var(--s4)" }}>
                  {action}
                  {turnBtn}
                </div>
              )}
              {errLine}
            </div>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>{table}</div>
        </div>
      </Paper>
    );
  }

  // ── Phone ──
  return (
    <Paper lamp={{ x: "50%", y: big ? "46%" : "18%" }}>
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", padding: "var(--s4) var(--m) var(--m)" }}>
        <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {backBtn}
          {turnBtn}
        </div>

        {big ? (
          <>
            {step !== "door" && (
              <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ marginTop: "var(--s4)", display: "grid", gap: "var(--s2)" }}>
                <h1 className="tb-serif tb-t-l" style={{ margin: 0 }}>{question[step]}</h1>
                {sub && <p className="tb-mono tb-t-label tb-muted" style={{ margin: 0 }}>{step === "promise" ? "Claude plans each hangout." : sub}</p>}
              </motion.div>
            )}
            <div style={{ flex: 1, display: "grid", placeItems: "center", minHeight: 0 }}>{table}</div>
            {step === "door" ? (
              <h1 className="tb-serif tb-t-xl" style={{ margin: 0, marginBottom: "var(--s8)", maxWidth: 300 }}>
                Saved you a seat.
              </h1>
            ) : step === "promise" ? (
              <p className="tb-mono tb-t-label" style={{ margin: 0, textAlign: "center", minHeight: 48, display: "grid", placeItems: "center" }}>
                {error ?? sub}
              </p>
            ) : step === "finding" ? (
              <div style={{ minHeight: 48 }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}>
                {errLine}
                {action}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "grid", placeItems: "center", marginTop: "var(--s2)" }}>{table}</div>
            <div style={{ marginTop: "var(--s8)", display: "grid", gap: "var(--s4)" }}>
              <h1 className="tb-serif tb-t-l" style={{ margin: 0 }}>{question[step]}</h1>
              {fields}
              {errLine}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "var(--s12)" }}>{action}</div>
          </>
        )}
      </div>
    </Paper>
  );
}

function RingItem({ deg, S, label, onClick, disabled }: { deg: number; S: number; label: string; onClick: () => void; disabled: boolean }) {
  const d = Math.max(60, S * 0.21);
  return (
    <motion.button
      className="tb-hit tb-mono"
      onClick={onClick}
      aria-label={`Take ${label}`}
      initial={{ ...onCircle(deg - 50, 0.4), opacity: 0 }}
      animate={{ ...onCircle(deg, 0.4), opacity: disabled ? 0.45 : 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={SNAPPY}
      style={{
        position: "absolute", width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, borderRadius: "50%",
        background: "var(--tb-paper-lit)", border: "1px solid var(--tb-line-2)", display: "grid", placeItems: "center",
        fontSize: 11, lineHeight: "13px", textAlign: "center", padding: 4, color: "var(--tb-ink)", zIndex: 2,
      }}
    >
      {label}
    </motion.button>
  );
}

function PickedItem({ spot, S, label, color, onClick, small }: { spot: { deg: number; r: number }; S: number; label: string; color: string; onClick?: () => void; small?: boolean }) {
  const d = Math.max(small ? 52 : 64, S * (small ? 0.18 : 0.23));
  return (
    <motion.button
      layout
      className="tb-hit tb-mono"
      onClick={onClick}
      disabled={!onClick}
      aria-label={onClick ? `Put back ${label}` : label}
      initial={{ ...onCircle(90, 0.43), opacity: 0, scale: 0.7 }}
      animate={{ ...onCircle(spot.deg, spot.r), opacity: 1, scale: 1 }}
      transition={SNAPPY}
      style={{
        position: "absolute", width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, borderRadius: "50%",
        background: color, mixBlendMode: "multiply", color: "#fff", display: "grid", placeItems: "center",
        fontSize: small ? 9.5 : 10.5, lineHeight: "12px", textAlign: "center", padding: 2, zIndex: 2, overflowWrap: "anywhere",
      }}
    >
      {label}
    </motion.button>
  );
}

function FreeArcs({ S, free, toggle }: { S: number; free: string[]; toggle: (id: string) => void }) {
  const spans: Record<string, [number, number, number]> = { weeknights: [140, 220, 180], saturdays: [230, 310, 270], sundays: [320, 400, 0] };
  const R = 40;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [50 + R * Math.cos((a * Math.PI) / 180), 50 + R * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}`;
  };
  return (
    <>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} aria-hidden>
        {FREE.map((f, i) => {
          const [a0, a1] = spans[f.id];
          const on = free.includes(f.id);
          return (
            <path
              key={f.id}
              d={arc(a0, a1)}
              fill="none"
              stroke={on ? ["var(--tb-signal)", "var(--tb-ember)", "var(--tb-grove)"][i] : "var(--tb-line-2)"}
              strokeWidth={on ? 3.4 : 0.8}
              strokeDasharray={on ? undefined : "1.2 1.6"}
              strokeLinecap="round"
              style={{ transition: "stroke .3s, stroke-width .3s", cursor: "pointer", pointerEvents: "stroke" }}
              onClick={() => toggle(f.id)}
            />
          );
        })}
      </svg>
      {FREE.map((f) => {
        const on = free.includes(f.id);
        const pos = onCircle(spans[f.id][2], 0.24);
        return (
          <button
            key={f.id}
            role="checkbox"
            aria-checked={on}
            className="tb-hit tb-mono"
            onClick={() => toggle(f.id)}
            style={{ position: "absolute", ...pos, transform: "translate(-50%,-50%)", minHeight: 44, minWidth: 44, padding: "0 6px", fontSize: Math.max(12, S * 0.036), fontWeight: on ? 500 : 400, color: on ? "var(--tb-ink)" : "var(--tb-ink-2)", zIndex: 2 }}
          >
            {f.label}
          </button>
        );
      })}
    </>
  );
}
