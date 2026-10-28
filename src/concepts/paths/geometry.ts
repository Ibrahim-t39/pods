// Paths concept geometry: soft desire-path curves and a size hook (pixel-true SVG, so circles stay circles).
"use client";

import { useEffect, useRef, useState } from "react";

export interface Pt { x: number; y: number }

/** A desire path: a cubic that leaves `a` going up/right and arrives at `b` with a lazy sideways bend. */
export function trail(a: Pt, b: Pt, bend = 0.3): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const c1 = { x: a.x + dx * 0.15 + dy * bend * 0.6, y: a.y + dy * 0.45 };
  const c2 = { x: a.x + dx * 0.55 - dy * bend * 0.4, y: b.y - dy * 0.12 + dx * bend * 0.15 };
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

/** Point where a segment from `a` toward circle centre `c` meets the circle edge (so paths stop at the clearing). */
export function edge(a: Pt, c: Pt, r: number): Pt {
  const dx = a.x - c.x;
  const dy = a.y - c.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: c.x + (dx / d) * r, y: c.y + (dy / d) * r };
}

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Path stroke for a pod by how many times it has been walked (0 = new). Never numeric on screen. */
export function wear(walks: number): { w: number; dash?: string; halo: number; alpha: number } {
  if (walks <= 0) return { w: 1.25, dash: "2 7", halo: 0, alpha: 0.5 };
  if (walks === 1) return { w: 2.25, halo: 10, alpha: 0.7 };
  if (walks === 2) return { w: 3.5, halo: 18, alpha: 0.82 };
  return { w: 5, halo: 26, alpha: 0.9 };
}
