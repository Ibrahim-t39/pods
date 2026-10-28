// Call concept kit: the stage, the mark (hidden Director on long press), the answer, discs, popups.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Close, Mark } from "./icons";

export const ease = [0.2, 0.8, 0.2, 1] as const;
export const DIRECTOR_EVENT = "pods:director";

/** Long-press the mark (800 ms) to open the shared Director panel; a tap goes home. */
export function MarkButton({ href = "/concepts/call/pods" }: { href?: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const down = () => {
    long.current = false;
    timer.current = setTimeout(() => {
      long.current = true;
      window.dispatchEvent(new Event(DIRECTOR_EVENT));
    }, 800);
  };
  const up = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <button
      type="button"
      className="call-mark"
      aria-label="Pods"
      data-testid="call-mark"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (long.current) return;
        router.push(href);
      }}
    >
      <Mark size={26} />
    </button>
  );
}

export function Stage({ hue = "signal", children, className = "" }: { hue?: string; children: ReactNode; className?: string }) {
  return (
    <main className={`call ${className}`} data-hue={hue}>
      <div className="call-grain" aria-hidden />
      {children}
    </main>
  );
}

/** The only filled element on a screen. Its dot is the seat that becomes your disc. */
export function Answer({
  children, onClick, disabled, icon, layoutId, testId,
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; icon?: ReactNode; layoutId?: string; testId?: string }) {
  return (
    <motion.button
      type="button"
      className="call-answer"
      aria-disabled={disabled || undefined}
      data-testid={testId}
      onClick={() => !disabled && onClick?.()}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
      transition={{ duration: 0.36, ease }}
    >
      <motion.span className="dot" layoutId={layoutId}>{icon}</motion.span>
      <span>{children}</span>
    </motion.button>
  );
}

export function Disc({ label, tone, kind, size, layoutId, delay = 0, title }: {
  label?: string; tone?: string; kind?: "seat" | "me"; size?: number; layoutId?: string; delay?: number; title?: string;
}) {
  return (
    <motion.span
      className="call-disc"
      data-tone={tone}
      data-kind={kind}
      role="img"
      aria-label={title ?? label}
      title={title}
      style={size ? ({ "--d": `${size}px` } as React.CSSProperties) : undefined}
      layoutId={layoutId}
      initial={layoutId ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 26 }}
    >
      {label}
    </motion.span>
  );
}

/** A clean popup. Bottom sheet on phones, margin card on desktop. Escape or the scrim closes it. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="call-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="call-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <button type="button" className="call-link" onClick={onClose} aria-label="Close" style={{ position: "absolute", right: 16, top: 8, width: 44, justifyContent: "center" }}>
              <Close size={20} />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Progress as circles filling (PB 2.7; SF 19, 24). */
export function Dots({ n, at }: { n: number; at: number }) {
  return (
    <div role="progressbar" aria-valuemin={1} aria-valuemax={n} aria-valuenow={at + 1} aria-label="Progress" style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: n }, (_, i) => (
        <motion.i
          key={i}
          style={{ width: 8, height: 8, borderRadius: 99, display: "block", border: "1.5px solid var(--c-ink-3)" }}
          animate={{ backgroundColor: i <= at ? "var(--hue)" : "transparent", borderColor: i <= at ? "var(--hue)" : "var(--c-ink-3)" }}
        />
      ))}
    </div>
  );
}

export function useWidth(): number {
  const [w, setW] = useState(390);
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return w;
}

export function useHeight(): number {
  const [h, setH] = useState(844);
  useEffect(() => {
    const f = () => setH(window.innerHeight);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return h;
}
