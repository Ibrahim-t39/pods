// Sentence concept: shared pieces. Stage (surface by state), Logo (long-press opens the hidden Director), the
// circle-grammar glyph set, Word (a word that is a control), Blank (the seat), Stop (the lock), Ribbon, Notes.
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

export type Hue = "ember" | "grove" | "signal";

export function Stage({
  children,
  hue = "ember",
  tint = false,
  flood = false,
  dusk = false,
  label,
}: {
  children: ReactNode;
  hue?: Hue;
  tint?: boolean;
  flood?: boolean;
  dusk?: boolean;
  label?: string;
}) {
  return (
    <main
      className="snt"
      data-hue={hue}
      data-tint={tint ? "1" : undefined}
      data-flood={flood ? "1" : undefined}
      data-dusk={dusk ? "1" : undefined}
      aria-label={label}
    >
      <div className="snt-room" aria-hidden />
      {children}
    </main>
  );
}

/** The logo is the only fixed asset. Long-press (700 ms) opens the hidden Director (also ?director=1, Ctrl/Cmd+.). */
export function Logo({ href = "/concepts/sentence", light = false }: { href?: string; light?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = () => {
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      window.dispatchEvent(new Event("pods:director"));
    }, 700);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <Link
      href={href}
      className="snt-btn"
      aria-label="Pods"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (fired.current) e.preventDefault();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="snt-logo" src={light ? "/brand/logo-on-dark-transparent.svg" : "/brand/logo-horizontal.svg"} alt="" draggable={false} />
    </Link>
  );
}

// ── Glyphs: one 24 grid, 1.6 stroke, round caps; built only from circles, overlaps and the notch (IL 40, 24, 11) ──
type G = "back" | "seat" | "stop" | "again" | "place" | "time" | "sky" | "proof" | "pods" | "next";
export function Glyph({ name, size = 20, title }: { name: G; size?: number; title?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      {name === "back" && (
        <g {...p}>
          <circle cx="15.5" cy="12" r="5" />
          <path d="M10.5 12H3.5M6.5 9l-3 3 3 3" />
        </g>
      )}
      {name === "next" && (
        <g {...p}>
          <circle cx="8.5" cy="12" r="5" />
          <path d="M13.5 12h7M17.5 9l3 3-3 3" />
        </g>
      )}
      {name === "seat" && (
        <g {...p}>
          {/* a circle with a notch where one more person fits */}
          <path d="M9.2 4.5A8 8 0 1 0 14.8 4.5" />
          <circle cx="12" cy="4.6" r="2.1" fill="currentColor" stroke="none" />
        </g>
      )}
      {name === "stop" && <circle cx="12" cy="12" r="5.5" fill="currentColor" />}
      {name === "again" && (
        <g {...p}>
          <circle cx="9" cy="12" r="5.6" />
          <circle cx="15" cy="12" r="5.6" />
        </g>
      )}
      {name === "place" && (
        <g {...p}>
          <circle cx="12" cy="10" r="5.4" />
          <circle cx="12" cy="10" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="20" r="1.2" fill="currentColor" stroke="none" />
        </g>
      )}
      {name === "time" && (
        <g {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 12V7.5M12 12l3.2 2" />
        </g>
      )}
      {name === "sky" && (
        <g {...p}>
          <path d="M5 15a7 7 0 0 1 14 0" />
          <path d="M3 18.5h18" />
        </g>
      )}
      {name === "proof" && (
        <g {...p}>
          <circle cx="12" cy="12" r="6" />
          <path d="M4 18L20 6" />
        </g>
      )}
      {name === "pods" && (
        <g {...p}>
          <circle cx="12" cy="9" r="4.4" />
          <circle cx="9" cy="14.4" r="4.4" />
          <circle cx="15" cy="14.4" r="4.4" />
        </g>
      )}
    </svg>
  );
}

/** A word that is a control. Tapping toggles a footnote; the superscript numeral ties word to note. */
export function Word({
  children,
  open,
  onToggle,
  n,
  label,
  className,
}: {
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
  n?: number;
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" className={`snt-w ${className ?? ""}`} aria-expanded={open} aria-label={label} onClick={onToggle}>
      {children}
      {n !== undefined && open && <span className="snt-sup">{n}</span>}
    </button>
  );
}

/** The full stop that locks a plan. Drops in with weight (AW 01, 19; CM 124, 175). `two` = round two: two overlapping circles. */
export function Stop({ show, two = false, delay = 0 }: { show: boolean; two?: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  if (!show) return null;
  const drop = reduce
    ? {}
    : {
        initial: { y: "-1.6em", scaleY: 1.25, scaleX: 0.8, opacity: 0 },
        animate: { y: 0, scaleY: [1.25, 0.72, 1.08, 1], scaleX: [0.8, 1.26, 0.96, 1], opacity: 1 },
        transition: { delay, duration: 0.62, times: [0, 0.55, 0.8, 1], ease: [0.6, 0, 0.3, 1] as [number, number, number, number] },
      };
  return (
    <span aria-hidden style={{ whiteSpace: "nowrap" }}>
      <motion.span className="snt-stop" {...drop} />
      {two && (
        <motion.span
          className="snt-stop"
          style={{ marginLeft: "-0.09em", mixBlendMode: "multiply", opacity: 0.9 }}
          {...(reduce ? {} : { initial: { x: "0.5em", opacity: 0 }, animate: { x: 0, opacity: 0.9 }, transition: { delay: delay + 0.55, type: "spring", stiffness: 260, damping: 14 } })}
        />
      )}
    </span>
  );
}

/** Your name written with a pen stroke: the text reveals left to right while an ink line draws under it. */
export function PenName({ name, delay = 0 }: { name: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span style={{ position: "relative", display: "inline-block" }} className="snt-i snt-hueText">
      <motion.span
        style={{ display: "inline-block" }}
        initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ delay, duration: 0.9, ease: [0.3, 0.1, 0.2, 1] }}
      >
        {name}
      </motion.span>
      <svg className="snt-pen" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M1 6 C 20 2, 40 9, 60 5 S 90 4, 99 6"
          fill="none"
          stroke="var(--hue)"
          strokeWidth="2.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.15, duration: 0.85, ease: "easeInOut" }}
        />
      </svg>
    </span>
  );
}

/** Characters set one at a time (Claude typesetting a phrase). */
export function Typeset({ text, delay = 0, speed = 0.028, onDone }: { text: string; delay?: number; speed?: number; onDone?: () => void }) {
  const reduce = useReducedMotion();
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const t = setTimeout(() => done.current?.(), reduce ? 0 : (delay + text.length * speed) * 1000 + 120);
    return () => clearTimeout(t);
  }, [text, delay, speed, reduce]);
  if (reduce) return <>{text}</>;
  return (
    <span aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: "0.18em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * speed, duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function Notes({ items }: { items: { n: number; glyph?: G; lines: ReactNode[] }[] }) {
  if (!items.length) return null;
  return (
    <motion.ol className="snt-notes snt-m" style={{ listStyle: "none", padding: 0 }} aria-live="polite" layout>
      {items.map((it) => (
        <motion.li
          key={it.n}
          className="snt-note"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <b>{it.n}</b>
          <span>
            {it.lines.map((l, i) => (
              <span key={i} style={{ display: "block" }}>
                {l}
              </span>
            ))}
          </span>
        </motion.li>
      ))}
    </motion.ol>
  );
}

export const ease = [0.2, 0.7, 0.2, 1] as [number, number, number, number];
