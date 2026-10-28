// The landing (/): one clear story you can play (PODS/v3/landing/STORY.md).
// Hero (the circles move together: signature motion #1) -> the problem in one line -> Try it (Fit, Pod, Plan,
// I'm in, Repeat; playable, no account; the progress rail is the page's one sticky element) -> built for meeting
// in person -> who it's for -> your seat is saved (the mark assembles) -> footer.
// Founder notes: fewer bubbles (flat circles; colour mixes only inside the mark), fewer icons (none: words and the
// dot), "AI" not "Claude", no city, no counts or testimonials, no demo wording. One filled pill per view: the
// header's pill appears only once the hero's has scrolled away.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { LogoAnimated } from "@/components/brand/logo-animated";
import { SNAPPY, useCalmMotion } from "@/components/brand/motion";
import { Button } from "@/components/ui/button";
import { Converge } from "./converge";
import { TryIt } from "./try-it";
import "./landing.css";

const START = "/app";
const SIGN_IN = "/app/welcome";

export function Landing() {
  const heroCta = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const a = heroCta.current;
    if (!a || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(a);
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp">
      <SiteNav showPill={past} />
      <main id="main">
        <Hero ctaRef={heroCta} />
        <Problem />
        <TryIt />
        <Safe />
        <ForWhom />
        <Close />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteNav({ showPill }: { showPill: boolean }) {
  return (
    <header className="lp-nav">
      <div className="lp-nav-in">
        <Link href="/" aria-label="Pods, home" className="lp-nav-logo pressable">
          <Logo variant="horizontal" title="" className="h-6 w-auto" />
        </Link>
        <nav aria-label="Site" className="lp-nav-mid">
          <a href="#try" className="lp-nav-a">Try it</a>
          <a href="#safe" className="lp-nav-a">Safety</a>
          <a href="#who" className="lp-nav-a">Who it&apos;s for</a>
        </nav>
        <div className="lp-nav-end">
          <Link href={SIGN_IN} className="lp-nav-a">
            Sign in
          </Link>
          <AnimatePresence initial={false}>
            {showPill && (
              <motion.span key="pill" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SNAPPY}>
                <Button asChild size="sm">
                  <Link href={START}>Get started</Link>
                </Button>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

/* ── Hero: the tagline, and three people whose worlds move together into the mark ──────────────────────────── */
function Hero({ ctaRef }: { ctaRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-h">
      <Converge from={0} to={1} duration={2.2} delay={0.35} className="lp-hero-cv" />
      <div className="lp-hero-copy">
        <h1 id="lp-hero-h" className="lp-h1">
          Find your people. <span>Then keep them.</span>
        </h1>
        <p className="lp-lede">Small friend groups that meet again.</p>
        <div ref={ctaRef} className="lp-hero-cta">
          <Button asChild size="xl">
            <Link href={START}>Get started</Link>
          </Button>
          <a href="#fit" className="lp-link">
            Try it first
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── The problem: three people meet once and drift apart ───────────────────────────────────────────────────── */
function Problem() {
  return (
    <section className="lp-sec lp-prob" aria-labelledby="lp-prob-h">
      <div className="lp-drift lp-in" aria-hidden>
        <span className="d1" />
        <span className="d2" />
        <span className="d3" />
      </div>
      <div className="lp-head lp-in">
        <h2 id="lp-prob-h" className="lp-h2">
          New somewhere? You meet people. <span className="lp-mute">They don&apos;t stick.</span>
        </h2>
        <p className="lp-sub">Pods fixes the second part.</p>
      </div>
    </section>
  );
}

/* ── Built for meeting in person: mechanisms only, no "safe" or "verified" claims ──────────────────────────── */
const SAFE = ["Public places, in daylight.", "Check in when you arrive.", "Report or block in one tap.", "18 and up. Leave anytime."];

function Safe() {
  return (
    <section id="safe" className="lp-sec lp-safe" aria-labelledby="lp-safe-h">
      <div className="lp-head lp-in">
        <p className="lp-kicker">Safety</p>
        <h2 id="lp-safe-h" className="lp-h2">
          Built for meeting in person.
        </h2>
        <Link href="/safety" className="lp-link lp-link-start">
          How it works
        </Link>
      </div>
      <ul className="lp-safe-list lp-in">
        {SAFE.map((s) => (
          <li key={s}>
            <i aria-hidden />
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Who it's for: the pods you could be in, as flat names (interest blue, community green) ────────────────── */
const PODS: { name: string; c: "i" | "c" }[] = [
  { name: "Hoopers", c: "i" },
  { name: "Strings", c: "i" },
  { name: "Striders", c: "i" },
  { name: "Wanderers", c: "i" },
  { name: "Page Turners", c: "i" },
  { name: "Kickabout", c: "i" },
  { name: "Southern African", c: "c" },
  { name: "Adventist young adults", c: "c" },
];

function ForWhom() {
  return (
    <section id="who" className="lp-sec lp-who" aria-labelledby="lp-who-h">
      <div className="lp-head lp-in">
        <p className="lp-kicker">Who it&apos;s for</p>
        <h2 id="lp-who-h" className="lp-h2">
          In your twenties. New somewhere.
        </h2>
        <p className="lp-sub">Interest pods. Community pods, if you want them.</p>
      </div>
      <ul className="lp-names lp-in" aria-label="Pods you could join">
        {PODS.map((p) => (
          <li key={p.name} data-c={p.c}>
            <i aria-hidden />
            {p.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Close: the mark assembles (the period lands: the plan, settled), then the one pill ────────────────────── */
function Close() {
  const markRef = useRef<HTMLDivElement>(null);
  const markIn = useInView(markRef, { once: true, amount: 0.8 });
  const calm = useCalmMotion();
  return (
    <section className="lp-sec lp-close" aria-labelledby="lp-close-h">
      <div ref={markRef} className="lp-close-mark" aria-hidden>
        {markIn && !calm ? <LogoAnimated variant="assemble" className="lp-close-logo" title="" /> : <Logo variant="mark" title="" className="lp-close-logo" />}
      </div>
      <h2 id="lp-close-h" className="lp-h2">
        Your seat is saved.
      </h2>
      <div className="lp-close-cta">
        <Button asChild size="xl">
          <Link href={START}>Get started</Link>
        </Button>
        <Link href={SIGN_IN} className="lp-link">
          Sign in
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
        <Link href="/safety" className="lp-foot-a">Safety</Link>
        <Link href="/privacy" className="lp-foot-a">Privacy</Link>
        <Link href="/terms" className="lp-foot-a">Terms</Link>
        <Link href="/waitlist" className="lp-foot-a">Waitlist</Link>
      </nav>
      <p className="lp-foot-c">© 2026 Pods</p>
    </footer>
  );
}
