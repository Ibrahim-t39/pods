// Measures the object box so the table takes what is left of the screen (template §1: "object takes the rest").
// A callback ref, so a remounted box (a new state of the table) is measured again.
"use client";

import { useCallback, useEffect, useState } from "react";

export function useFit<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const ref = useCallback((node: T | null) => setEl(node), []);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setBox((b) => (b && Math.abs(b.w - width) < 2 && Math.abs(b.h - height) < 2 ? b : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [ref, box] as const;
}

/** Table diameter that fits a box: the ring box is 1.34S + 40, plus room for your waiting disc (0.17S + 10) below. */
export function tableSizeFor(box: { w: number; h: number } | null, opts: { waiting?: boolean; roof?: boolean; max?: number } = {}) {
  if (!box) return 0;
  const extraH = (opts.waiting ? 0.17 : 0) + (opts.roof ? 0.17 : 0);
  const byH = (box.h - 40 - (opts.waiting ? 10 : 0) - (opts.roof ? 24 : 0)) / (1.34 + extraH);
  const byW = (box.w - 40) / 1.34;
  return Math.max(120, Math.floor(Math.min(byH, byW, opts.max ?? 420)));
}
