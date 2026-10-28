// Landing: a seat, not a hero (AW 04/06/12, SF 23/24). One blank record with one seed groove, one line, one action.
// Side B: the whole idea in three grooves, then the same action.
"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Logo, Surface } from "./Shell";
import { Record } from "./Record";
import { IGo } from "./icons";

export function Landing() {
  return (
    <Surface>
      <div className="g-snap" data-testid="landing">
        <SideA />
        <SideB />
      </div>
    </Surface>
  );
}

function SideA() {
  return (
    <section>
      <div className="g-top">
        <Logo />
        <span className="g-mono g-soft">Side A</span>
      </div>

      <motion.div
        className="g-record-crop"
        style={{ ["--crop" as string]: 0.46 }}
        initial={{ x: 220, rotate: 40, opacity: 0 }}
        animate={{ x: 0, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
      >
        <Record hue="ember" next="seed" arcLabel="Saved for you · Side A · #1" seats={4} dots={[]} labelLabel="A blank record" />
      </motion.div>

      <div className="g-left">
        <h1 className="g-slab" style={{ fontSize: "clamp(56px, 9.4vw, 148px)", margin: 0 }}>
          Find your
          <br />
          people.
        </h1>
        <p className="g-slab" style={{ fontSize: "clamp(28px, 3.6vw, 56px)", margin: "18px 0 30px", color: "var(--g-ember)" }}>
          Then keep them.
        </p>
        <Link href="/concepts/groove/press" className="g-act" data-testid="start">
          <IGo size={22} /> Find my pods
        </Link>
      </div>
    </section>
  );
}

const ROWS = [
  { n: "#1", w: "Meet", came: 4 },
  { n: "#2", w: "Again", came: 6 },
  { n: "#3", w: "Yours", came: 7 },
];

function SideB() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const rot = useTransform(scrollYProgress, [0, 1], [-90, 0]);
  const g = useTransform(scrollYProgress, (v) => Math.max(0, Math.min(3, Math.floor(v * 3.6))));
  return (
    <section ref={ref} data-testid="side-b">
      <div className="g-top">
        <span />
        <span className="g-mono g-soft">Side B</span>
      </div>
      <motion.div className="g-record-crop" style={{ ["--crop" as string]: 0.46, rotate: rot }}>
        <GrooveCount value={g} />
      </motion.div>
      <div className="g-left">
        <p className="g-slab" style={{ fontSize: "clamp(40px, 6vw, 92px)", margin: "0 0 28px" }}>
          Every hangout
          <br />
          cuts a groove.
        </p>
        <ol style={{ listStyle: "none", padding: 0, margin: "0 0 30px", display: "flex", gap: 26 }}>
          {ROWS.map((r) => (
            <li key={r.n}>
              <div className="g-mono g-soft">{r.n}</div>
              <div className="g-slab" style={{ fontSize: 28 }}>{r.w}</div>
            </li>
          ))}
        </ol>
        <Link href="/concepts/groove/press" className="g-act">
          <IGo size={22} /> Find my pods
        </Link>
      </div>
    </section>
  );
}

import { useMotionValueEvent, type MotionValue } from "motion/react";
import { useState } from "react";
function GrooveCount({ value }: { value: MotionValue<number> }) {
  const [n, setN] = useState(0);
  useMotionValueEvent(value, "change", (v) => setN(v));
  return <Record hue="signal" history={ROWS.slice(0, n).map((r) => ({ came: r.came }))} next={n < 3 ? "hollow" : "none"} arcLabel="Side B · keep them" seats={0} labelWord={n ? `#${n}` : ""} />;
}
