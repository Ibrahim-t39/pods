// [U1] ConfettiCircles (M9): a ≤ 60-particle burst of logo circles in ember / signal / grove, 900ms.
// canvas-confetti is lazy-loaded on first use. Skipped entirely under prefers-reduced-motion.
"use client";

export interface ConfettiOptions {
  /** Viewport-relative origin (0-1). Pass an element to burst from its centre. */
  origin?: { x: number; y: number } | HTMLElement | null;
  particles?: number;
  spread?: number;
}

function tokenColor(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export async function fireConfettiCircles({ origin, particles = 56, spread = 70 }: ConfettiOptions = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  let o = { x: 0.5, y: 0.6 };
  if (origin instanceof HTMLElement) {
    const r = origin.getBoundingClientRect();
    o = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
  } else if (origin) o = origin;
  const colors = ["--pods-ember", "--pods-signal", "--pods-grove"].map(tokenColor).filter(Boolean);
  const n = Math.min(60, particles);
  const base = { origin: o, colors, shapes: ["circle" as const], ticks: 90, gravity: 1.1, decay: 0.9, scalar: 1.1, disableForReducedMotion: true, zIndex: 80 };
  confetti({ ...base, particleCount: Math.round(n * 0.6), spread, startVelocity: 34 });
  confetti({ ...base, particleCount: Math.round(n * 0.4), spread: spread * 1.6, startVelocity: 22, scalar: 0.8 });
}

/** Haptic patterns (BLUEPRINT §2.10). No-ops where unsupported (iOS Safari). */
export const haptic = {
  light: () => vibrate(8),
  soft: () => vibrate(10),
  success: () => vibrate([12, 40, 18]),
};
function vibrate(p: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
  } catch {
    /* ignore */
  }
}
