// [U1] ProgressRing: ring with a centre label (waitlist "4 of 6", forming pods). Gloss stroke, rounded cap.
"use client";

import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  tone?: "signal" | "grove" | "ember" | "pod";
  label?: ReactNode;
  sublabel?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

const STOPS = {
  signal: ["var(--signal-400)", "var(--signal-700)"],
  grove: ["var(--grove-300)", "var(--grove-600)"],
  ember: ["var(--ember-300)", "var(--ember-600)"],
  pod: ["var(--pod)", "var(--pod)"],
};

export function ProgressRing({ value, max, size = 88, stroke = 8, tone = "signal", label, sublabel, ariaLabel, className }: ProgressRingProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel ?? `${value} of ${max}`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={STOPS[tone][0]} />
            <stop offset="1" stopColor={STOPS[tone][1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sunken)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={1} opacity={0.6} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id}-g)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </svg>
      <div aria-hidden className="absolute inset-0 grid place-content-center text-center">
        {label != null && <span className="font-display text-[clamp(14px,calc(var(--s)*0.24),30px)] leading-none font-extrabold tabular [font-stretch:112%]" style={{ ["--s" as string]: `${size}px` }}>{label}</span>}
        {sublabel != null && <span className="mt-1 text-[11px] font-medium text-fg-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
