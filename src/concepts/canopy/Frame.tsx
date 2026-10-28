"use client";
// Frame: the light system (sky, one light, ground, grain), the top line (logo + pager) and the one popup shape.
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { IClose, Logo } from "./icons";
import type { Hue, Light } from "./model";

export function Surface({
  light,
  hue,
  horizon = 64,
  children,
  label,
}: {
  light: Light;
  hue: Hue;
  horizon?: number;
  children: ReactNode;
  label?: string;
}) {
  return (
    <main className="cnp" data-light={light} data-hue={hue} style={{ "--horizon": `${horizon}%` } as CSSProperties} aria-label={label}>
      <div className="cn-light" />
      <div className="cn-ground" />
      <div className="cn-grain" />
      {children}
    </main>
  );
}

/** Logo: tap = threshold; long-press 700 ms = the hidden Director (also ?director=1 and Ctrl/Cmd+.). */
export function LogoButton({ dark, href = "/concepts/canopy" }: { dark?: boolean; href?: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  return (
    <button
      type="button"
      className="cn-logo"
      aria-label="Pods"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={() => {
        fired.current = false;
        clear();
        timer.current = setTimeout(() => {
          fired.current = true;
          window.dispatchEvent(new Event("pods:director"));
        }, 700);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onClick={() => {
        if (fired.current) return;
        router.push(href);
      }}
    >
      <Logo dark={dark} size={24} />
    </button>
  );
}

export function Top({ dark, right, href }: { dark?: boolean; right?: ReactNode; href?: string }) {
  return (
    <header className="cn-top">
      <LogoButton dark={dark} href={href} />
      {right}
    </header>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div key="scrim" className="cn-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="cn-sheet cnp-sheet"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="cn-split" style={{ alignItems: "center", marginBottom: 24 }}>
              <h2 className="cn-mid" style={{ margin: 0 }}>{title}</h2>
              <button type="button" className="cn-link" onClick={onClose} aria-label="Close" style={{ textDecoration: "none", width: 44, justifyContent: "center" }}>
                <IClose size={20} />
              </button>
            </div>
            {children}
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}
