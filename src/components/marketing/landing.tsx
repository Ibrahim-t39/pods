// The landing (/), a real product site (PLATFORM_SPEC §6 marketing; MOTION_SYSTEM §10 marketing; COLOR_LIFE §15).
// Order follows the person, not a template: the tagline at a table with your seat saved (hero) -> the story told
// with the product (<LandingStory/>: people, Fit, Plan, I'm in, Repeat) -> how it works (a loop that returns to the
// start, because Repeat is the point) -> where you meet (the real plan sheet) -> who it's for (pods as bubbles) ->
// the mark lands and your seat is open (the one closing CTA) -> footer.
// QA round 1: the header is one fixed 64px bar (consistent height, glass over the page so text never collides with
// it), with How it works / If something's off / Privacy on laptop; the hero leads with the tagline (the video's
// closing line) and the open seat carries "Saved you a seat." and is itself a way in; one ending, not two.
// One filled pill per view: the header's pill only appears once the hero's pill has scrolled away, and leaves when
// the closing pill arrives. Copy: labels and short lines; "AI", never "Claude"; no counts, testimonials, press or city.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { LogoAnimated } from "@/components/brand/logo-animated";
import { Bubble, type BubbleHue } from "@/components/brand/bubble";
import { GENTLE, SNAPPY, useCalmMotion } from "@/components/brand/motion";
import { RepeatGlyph } from "@/components/brand/glyphs";
import { Stage } from "@/components/brand/stage";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { LandingStory, PLAN_FACTS } from "./story";
import "./landing.css";

const START = "/app";
const SIGN_IN = "/app/welcome";

export function Landing() {
  const heroCta = useRef<HTMLDivElement>(null);
  const closeCta = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const a = heroCta.current;
    const b = closeCta.current;
    if (!a || !b || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === a) setPast(!e.isIntersecting && e.boundingClientRect.top < 0);
        else setClosing(e.isIntersecting || e.boundingClientRect.top < 0);
      }
    });
    io.observe(a);
    io.observe(b);
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp">
      <Stage light="paper" />
      <SiteNav showPill={past && !closing} />
      <main id="main">
        <Hero ctaRef={heroCta} />
        <LandingStory />
        <Loop />
        <MeetUp />
        <ForWhom />
        <Open ctaRef={closeCta} />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Header: one fixed bar, always 64px. Laptop: three quiet anchors in the middle. ─────────────────────────── */
function SiteNav({ showPill }: { showPill: boolean }) {
  return (
    <header className="lp-nav">
      <div className="lp-nav-in">
        <Link href="/" aria-label="Pods, home" className="lp-nav-logo pressable">
          <Logo variant="horizontal" title="" className="h-6 w-auto" />
        </Link>
        <nav aria-label="Site" className="lp-nav-mid">
          <a href="#how" className="lp-nav-a">How it works</a>
          <Link href="/safety" className="lp-nav-a">If something&apos;s off</Link>
          <Link href="/privacy" className="lp-nav-a">Privacy</Link>
        </nav>
        <div className="lp-nav-end">
          <Link href={SIGN_IN} className="lp-nav-a lp-nav-sign">
            Sign in
          </Link>
          <AnimatePresence initial={false}>
            {showPill && (
              <motion.span
                key="pill"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={SNAPPY}
              >
                <Button asChild size="sm">
                  <Link href={START}>Take your seat</Link>
                </Button>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

/* ── Hero: the tagline beside a table of three, and one open seat, saved for you. The seat is a way in too
   (pointer only; the pill is the keyboard path). Pointing at either previews you dropping into the seat. ──────── */
const TABLE: { hue: BubbleHue; cls: string; from: [number, number] }[] = [
  { hue: "signal", cls: "lp-s1", from: [-60, -40] },
  { hue: "grove", cls: "lp-s2", from: [70, -50] },
  { hue: "signal", cls: "lp-s3", from: [60, 70] },
];

function Hero({ ctaRef }: { ctaRef: React.RefObject<HTMLDivElement | null> }) {
  const calm = useCalmMotion();
  const [hot, setHot] = useState(false);
  const on = () => setHot(true);
  const off = () => setHot(false);
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-h">
      <div className="lp-table">
        {TABLE.map((t, i) => (
          <motion.span
            key={t.cls}
            aria-hidden
            className={`lp-seat ${t.cls}`}
            initial={calm ? false : { opacity: 0, x: t.from[0], y: t.from[1], scale: 0.7 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            transition={{ ...GENTLE, delay: 0.15 + i * 0.12 }}
          >
            <Bubble hue={t.hue} size="100%" dot="center" buoy={i * 1.9} />
          </motion.span>
        ))}
        <Link
          href={START}
          tabIndex={-1}
          aria-hidden
          className="lp-seat lp-you"
          data-hot={hot ? "" : undefined}
          onPointerEnter={on}
          onPointerLeave={off}
        >
          <span className="lp-open" />
          <motion.span
            className="lp-you-b"
            initial={false}
            animate={hot ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: calm ? 0 : 24 }}
            transition={calm ? { duration: 0.16 } : SNAPPY}
          >
            <Bubble hue="ember" size="100%" dot="center" />
          </motion.span>
          <span className="lp-you-tag">Saved you a seat.</span>
        </Link>
      </div>

      <div className="lp-hero-copy">
        <h1 id="lp-hero-h" className="lp-h1">
          Find your people. <span>Then keep them.</span>
        </h1>
        <p className="lp-lede">Small friend groups that meet again.</p>
        <div ref={ctaRef} className="lp-hero-cta">
          <Button asChild size="xl" onPointerEnter={on} onPointerLeave={off} onFocus={on} onBlur={off}>
            <Link href={START}>Take your seat</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ── How it works: four steps on one loop; step 4 points back to step 1. ─────────────────────────────────── */
const STEPS: { n: string; hue: BubbleHue; label: string; line: string }[] = [
  { n: "1", hue: "ember", label: "Your likes", line: "And when you're free." },
  { n: "2", hue: "signal", label: "Your pods", line: "6 to 10 people who fit." },
  { n: "3", hue: "grove", label: "I'm in", line: "Four in. Locked." },
  { n: "4", hue: "signal", label: "Run it back", line: "Same people, again." },
];

function Loop() {
  return (
    <section id="how" className="lp-sec lp-loop" aria-labelledby="lp-loop-h">
      <div className="lp-head lp-in">
        <p className="lp-kicker">How it works</p>
        <h2 id="lp-loop-h" className="lp-h2">
          Four steps. Then again.
        </h2>
      </div>
      <ol className="lp-steps lp-in">
        {STEPS.map((s) => (
          <li key={s.n} className="lp-step">
            <Bubble hue={s.hue} size="var(--sb)" dot="none" solo label={<span className="lp-step-n tabular">{s.n}</span>} />
            <span className="lp-step-t">
              <b>{s.label}</b>
              <span>{s.line}</span>
            </span>
          </li>
        ))}
        <li className="lp-again" aria-label="Back to step 1">
          <RepeatGlyph size={20} aria-hidden />
        </li>
      </ol>
    </section>
  );
}

/* ── Where you meet: the real plan sheet's place block and the report/block rows (not controls here). ─────── */
function MeetUp() {
  return (
    <section className="lp-sec lp-meet" aria-labelledby="lp-meet-h">
      <div className="lp-head lp-in">
        <p className="lp-kicker">Where you meet</p>
        <h2 id="lp-meet-h" className="lp-h2">
          Public. Daytime. No alcohol.
        </h2>
        <p className="lp-sub">Leave anytime. Report or block in one tap.</p>
        <Link href="/safety" className="lp-go pressable">
          If something&apos;s off <Icon name="arrow" size={18} aria-hidden />
        </Link>
      </div>
      <div className="lp-sheet lp-in" aria-hidden>
        <span className="lp-grab" />
        <div className="lp-row">
          <span className="lp-ico">
            <Icon name="place" size={20} />
          </span>
          <span className="lp-row-t">
            <b>{PLAN_FACTS.place}</b>
            <span>{PLAN_FACTS.placeLine}</span>
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-ico">
            <Icon name="day" size={20} />
          </span>
          <span className="lp-row-t">
            <b className="tabular">{PLAN_FACTS.when}</b>
            <span>Daylight</span>
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-ico">
            <Icon name="rain" size={20} />
          </span>
          <span className="lp-row-t">
            <b>Rain backup</b>
            <span>{PLAN_FACTS.rain}</span>
          </span>
        </div>
        <div className="lp-pair">
          <span className="lp-chip">
            <Icon name="flag" size={18} /> Report
          </span>
          <span className="lp-chip">
            <Icon name="block" size={18} /> Block
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Who it's for: your pods, as glass bubbles, in the colours the app draws them (first interest pod blue,
   second orange, community pods green: tokens.css pod hues). ─────────────────────────────────────────────── */
const PODS: { name: string; hue: BubbleHue; k: string }[] = [
  { name: "Hoopers", hue: "signal", k: "a" },
  { name: "Strings", hue: "ember", k: "b" },
  { name: "Striders", hue: "signal", k: "c" },
  { name: "Page Turners", hue: "ember", k: "d" },
  { name: "Southern African", hue: "grove", k: "e" },
  { name: "Adventist young adults", hue: "grove", k: "f" },
];

function ForWhom() {
  return (
    <section className="lp-sec lp-who" aria-labelledby="lp-who-h">
      <div className="lp-head lp-in">
        <p className="lp-kicker">Who it&apos;s for</p>
        <h2 id="lp-who-h" className="lp-h2">
          Your twenties. Somewhere new.
        </h2>
        <p className="lp-sub">18 and up. Interest pods, and community pods if you want them.</p>
      </div>
      <div className="lp-field lp-in" aria-label="Pods you could join">
        {PODS.map((p, i) => (
          <span key={p.k} className={`lp-pod lp-pod-${p.k}`}>
            <Bubble hue={p.hue} size="100%" dot="none" buoy={i * 1.3} label={<span className="lp-pod-n">{p.name}</span>} />
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── Close: the mark assembles (the period lands: the plan, settled), then the one closing pill. The animated
   mark mounts only once in view and the slot is sized up front, so no still frame shows a half-drawn wordmark
   under other content. ─────────────────────────────────────────────────────────────────────────────────── */
function Open({ ctaRef }: { ctaRef: React.RefObject<HTMLDivElement | null> }) {
  const markRef = useRef<HTMLDivElement>(null);
  const markIn = useInView(markRef, { once: true, amount: 0.8 });
  const calm = useCalmMotion();
  return (
    <section className="lp-sec lp-open-sec" aria-labelledby="lp-open-h">
      <div ref={markRef} className="lp-close-mark" aria-hidden>
        {markIn && !calm ? <LogoAnimated variant="assemble" className="lp-close-logo" title="" /> : <Logo variant="mark" title="" className="lp-close-logo" />}
      </div>
      <h2 id="lp-open-h" className="lp-h2 lp-in">
        Your seat is open.
      </h2>
      <div ref={ctaRef} className="lp-open-cta lp-in">
        <Button asChild size="xl">
          <Link href={START}>Take your seat</Link>
        </Button>
        <Link href="/waitlist" className="lp-link pressable">
          Not near you?
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="lp-foot">
      <Link href="/" aria-label="Pods, home" className="lp-nav-logo pressable">
        <Logo variant="horizontal" title="" className="h-6 w-auto" />
      </Link>
      <nav aria-label="Footer" className="lp-foot-links">
        <Link href="/privacy" className="lp-foot-a">Privacy</Link>
        <Link href="/terms" className="lp-foot-a">Terms</Link>
        <Link href="/safety" className="lp-foot-a">If something&apos;s off</Link>
        <Link href="/waitlist" className="lp-foot-a">Waitlist</Link>
      </nav>
      <p className="lp-foot-c">© 2026 Pods</p>
    </footer>
  );
}
