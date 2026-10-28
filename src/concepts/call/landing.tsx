// Call concept landing: one hero moment. The call is set huge, left-anchored, cropped by the right edge (AW 06, 58;
// TS 9). Three answers slide in a beat apart and the line counts them ("1 in." → "3 in."); your seat waits dashed
// (SF 23, 24; IL 22). Answering it is the sign-up. No nav row, no subtitle, no feature list (PB 8).
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useHydrated, useMe } from "@/lib/db/hooks";
import { Answer, Disc, MarkButton, Stage, ease, useHeight, useWidth } from "./kit";

const PEOPLE = [
  { k: "a", l: "A", t: "0" },
  { k: "d", l: "D", t: "2" },
  { k: "t", l: "T", t: "1" },
];

export function Landing() {
  const router = useRouter();
  const hydrated = useHydrated();
  const me = useMe();
  const reduce = useReducedMotion();
  const w = useWidth();
  const desk = w >= 1024;
  const [n, setN] = useState(reduce ? 3 : 0);
  const [mine, setMine] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const ts = [900, 1500, 2100].map((ms, i) => setTimeout(() => setN(i + 1), ms));
    return () => ts.forEach(clearTimeout);
  }, [reduce]);

  const go = () => {
    if (mine) return;
    setMine(true);
    const done = me?.onboarding_step === "done";
    setTimeout(() => router.push(done ? "/concepts/call/pods" : "/concepts/call/begin"), reduce ? 0 : 900);
  };

  const h = useHeight();
  const size = desk ? Math.min(176, Math.round(w * 0.11), Math.round((h * 0.58) / 4)) : Math.round(w * 0.2);
  const count = n + (mine ? 1 : 0);

  return (
    <Stage hue="ember">
      <div className="call-sun" aria-hidden />
      <header className="call-top">
        <MarkButton href="/concepts/call" />
        {hydrated && me?.onboarding_step !== "done" && (
          <button type="button" className="call-link" onClick={() => router.push("/concepts/call/begin?at=phone")}>sign in</button>
        )}
      </header>

      <section
        style={{
          position: "relative", zIndex: 1, minHeight: "100svh",
          padding: desk ? "15svh var(--gutter) 0" : "19svh 0 0 var(--gutter)",
        }}
      >
        <h1 className="call-line" style={{ ["--size" as string]: `${size}px`, margin: 0, whiteSpace: "nowrap" }} aria-label={`Sunday. 1pm. The courts. ${count} in.`}>
          <span className="row">Sunday.</span>
          <span className="row">1pm.</span>
          <span className="row">The courts.</span>
          <span className="row" style={{ fontStyle: "italic", color: "var(--c-ink-2)", minHeight: "1em" }} aria-hidden>
            <AnimatePresence mode="popLayout" initial={false}>
              {count > 0 && (
                <motion.span key={count} style={{ display: "inline-block" }} initial={{ y: "0.4em", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-0.4em", opacity: 0 }} transition={{ duration: 0.32, ease }}>
                  {count} in.
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </h1>

        <div className="call-discs" style={{ marginTop: "var(--s6)", minHeight: 56 }} aria-label="Who's in">
          {PEOPLE.slice(0, n).map((p, i) => (
            <Disc key={p.k} label={p.l} tone={p.t} size={desk ? 56 : 48} delay={reduce ? 0 : i * 0.02} />
          ))}
          {mine ? (
            <Disc key="me" label="Y" tone="me" size={desk ? 56 : 48} layoutId="landing-seat" title="You" />
          ) : (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: n >= 3 ? 1 : 0.4 }} transition={{ duration: 0.4 }}>
              <Disc label="you" kind="seat" size={desk ? 56 : 48} />
            </motion.span>
          )}
        </div>
      </section>

      <footer
        style={{
          position: "fixed", zIndex: 2, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--s4)",
          padding: desk ? "0 var(--gutter) var(--s12)" : "0 var(--gutter) calc(var(--s8) + env(safe-area-inset-bottom))",
        }}
      >
        <p className="call-mono" style={{ margin: 0, maxWidth: 160, paddingBottom: 4 }}>
          find your people.<br />then keep them.
        </p>
        <AnimatePresence>
          {!mine && (
            <Answer onClick={go} layoutId="landing-seat" testId="call-landing-in">I&rsquo;m in</Answer>
          )}
        </AnimatePresence>
      </footer>
    </Stage>
  );
}
