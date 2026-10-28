// Shared bits for the Paths concept: the paper root, the logo (long-press = Director), the hidden Director, discs.
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Close } from "./icons";
import { usePaths } from "./store";

export const EASE_WARP = [0.7, 0, 0.2, 1] as const;
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

export function Paper({ children, mood, hue, className = "", style }: { children: ReactNode; mood?: "dusk"; hue?: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`pth ${className}`} data-mood={mood} data-hue={hue} style={style}>
      {children}
      <Director />
    </div>
  );
}

/** The fixed brand asset: three overlapping circles + "pods" wordmark. Long-press (700 ms) opens the Director. */
export function Logo({ size = 28, href = "/concepts/paths", tone = "ink" }: { size?: number; href?: string; tone?: "ink" | "paper" }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const down = () => {
    long.current = false;
    timer.current = setTimeout(() => {
      long.current = true;
      window.dispatchEvent(new Event("paths:director"));
    }, 700);
  };
  const up = () => timer.current && clearTimeout(timer.current);
  return (
    <a
      href={href}
      aria-label="Pods home"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        if (!long.current) router.push(href);
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.28, minHeight: 44, color: tone === "ink" ? "var(--ink)" : "var(--paper)", WebkitTouchCallout: "none", userSelect: "none" }}
    >
      <Mark size={size} />
      <span style={{ font: `700 ${size * 0.82}px/1 var(--p-sans)`, letterSpacing: "-0.04em", fontStretch: "100%" }}>pods</span>
    </a>
  );
}

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.92} viewBox="211 234 386 356" aria-hidden>
      <defs>
        <clipPath id="pth-o"><circle cx="404" cy="355" r="97" /></clipPath>
        <clipPath id="pth-s"><circle cx="332" cy="469" r="97" /></clipPath>
        <clipPath id="pth-os" clipPath="url(#pth-o)"><circle cx="332" cy="469" r="97" /></clipPath>
      </defs>
      <circle cx="404" cy="355" r="97" fill="#FD6123" />
      <circle cx="332" cy="469" r="97" fill="#1B78FE" />
      <circle cx="476" cy="469" r="97" fill="#19C185" />
      <g clipPath="url(#pth-o)"><circle cx="332" cy="469" r="97" fill="#40313F" /><circle cx="476" cy="469" r="97" fill="#315B26" /></g>
      <g clipPath="url(#pth-s)"><circle cx="476" cy="469" r="97" fill="#01627E" /></g>
      <g clipPath="url(#pth-os)"><circle cx="476" cy="469" r="97" fill="#0B2F26" /></g>
      <circle cx="404" cy="317" r="24" fill="#fff" /><circle cx="300" cy="484" r="24" fill="#fff" /><circle cx="508" cy="484" r="24" fill="#fff" />
    </svg>
  );
}

/** A person: flat disc with an initial (PB 6.4; IL 41, 24). */
export function Disc({ initial, size = 36, hue, filled = true, ring = false, style }: { initial: string; size?: number; hue?: string; filled?: boolean; ring?: boolean; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-grid", placeItems: "center", width: size, height: size, borderRadius: 999, flex: "none",
        background: filled ? (hue ? `var(--${hue})` : "var(--ink)") : "transparent",
        color: filled ? (hue ? "var(--ink)" : "var(--paper)") : "var(--ink-2)",
        border: filled ? "none" : "1.5px dashed var(--ink-3)",
        boxShadow: ring ? "0 0 0 3px var(--paper)" : undefined,
        font: `600 ${Math.round(size * 0.4)}px/1 var(--p-sans)`, ...style,
      }}
    >
      {initial}
    </span>
  );
}

/** Hidden Director: long-press the logo, Ctrl/Cmd + . , or ?director=1. Never visible otherwise. */
function Director() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const recs = usePaths((s) => s.recs);
  useEffect(() => {
    const on = () => setOpen(true);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") setOpen((o) => !o);
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("paths:director", on);
    window.addEventListener("keydown", key);
    if (new URLSearchParams(window.location.search).get("director") === "1") setOpen(true);
    return () => {
      window.removeEventListener("paths:director", on);
      window.removeEventListener("keydown", key);
    };
  }, []);

  const after = useCallback(() => {
    const st = usePaths.getState();
    const locked = Object.values(st.recs).find((r) => r.stage === "locked");
    if (locked) {
      st.patch(locked.id, (r) => ({ ...r, stage: "after", walks: r.walks + 1 }));
      router.push(`/concepts/paths/pod/${locked.id}`);
    }
    setOpen(false);
  }, [router]);

  const hasLocked = Object.values(recs).some((r) => r.stage === "locked");
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Director"
          data-paths-director
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          style={{ position: "fixed", left: 16, bottom: 16, zIndex: 80, width: 240, padding: 8, borderRadius: 20, background: "var(--ink)", color: "var(--paper)", boxShadow: "0 20px 40px -20px rgb(0 0 0 / .6)" }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="pth-icon" style={{ color: "var(--paper)" }} aria-label="Close" onClick={() => setOpen(false)}><Close size={20} /></button>
          </div>
          <DirBtn disabled={!hasLocked} onClick={after}>After the hangout</DirBtn>
          <DirBtn
            onClick={() => {
              usePaths.getState().reset();
              setOpen(false);
              router.push("/concepts/paths");
            }}
          >
            Start over
          </DirBtn>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DirBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ display: "block", width: "100%", minHeight: 44, textAlign: "left", padding: "0 12px", borderRadius: 12, background: "transparent", color: "inherit", border: 0, font: "500 15px/1 var(--p-sans)", opacity: disabled ? 0.35 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </button>
  );
}
