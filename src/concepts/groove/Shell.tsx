// Groove shell: the paper surface, the logo (long-press = Director), the hidden Director panel.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DEMO } from "@/config/demo";
import { jumpTo } from "@/lib/time/clock";
import { useGroove, useGrooveReady } from "./store";
import { IClose } from "./icons";

let openDirector: (() => void) | null = null;

export function Surface({ field, children, className }: { field?: "paper" | "ember" | "signal" | "grove" | "ink"; children: ReactNode; className?: string }) {
  const ready = useGrooveReady();
  return (
    <main className={`groove ${className ?? ""}`} data-field={field ?? "paper"}>
      {ready ? children : null}
      <Director />
    </main>
  );
}

export function Logo({ dark, href = "/concepts/groove" }: { dark?: boolean; href?: string }) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const start = () => {
    long.current = false;
    t.current = setTimeout(() => {
      long.current = true;
      openDirector?.();
    }, 800);
  };
  const end = () => t.current && clearTimeout(t.current);
  return (
    <Link
      href={href}
      aria-label="Pods home"
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onClick={(e) => long.current && e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ display: "inline-flex", WebkitTouchCallout: "none", userSelect: "none" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark ? "/brand/logo-on-dark-transparent.svg" : "/brand/logo-horizontal.svg"} alt="pods" draggable={false} style={{ height: 26, width: "auto" }} />
    </Link>
  );
}

function Director() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const reset = useGroove((s) => s.reset);
  useEffect(() => {
    openDirector = () => setOpen(true);
    if (new URLSearchParams(window.location.search).get("director") === "1") setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openDirector = null;
    };
  }, []);
  const btn: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "10px 0", background: "none", border: 0, color: "inherit", cursor: "pointer", borderTop: "1px solid rgba(236,229,214,.15)" };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          className="g-mono" data-testid="groove-director"
          style={{ position: "fixed", left: 16, bottom: 16, zIndex: 80, width: 248, padding: "14px 16px 6px", background: "#161310", color: "#ece5d6", borderRadius: 18, boxShadow: "6px 8px 0 rgba(22,19,16,.2)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
            <span>Director</span>
            <button aria-label="Close" onClick={() => setOpen(false)} style={{ background: "none", border: 0, color: "inherit", cursor: "pointer" }}><IClose size={18} /></button>
          </div>
          <button style={btn} onClick={() => jumpTo(DEMO.directorJump.at)}>Jump: after the hangout</button>
          <button style={btn} onClick={() => jumpTo("2026-11-08T12:40:00-06:00")}>Jump: hangout day</button>
          <button
            style={btn}
            onClick={() => {
              reset();
              jumpTo(DEMO.anchor);
              router.push("/concepts/groove");
            }}
          >
            Reset to start
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
