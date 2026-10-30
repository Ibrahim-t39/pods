// [U1] Countdown: "In 4 days" → "Tomorrow" → "Today · in 3h" → "Happening now" → "Done".
// Driven by the app clock (useClock), Chicago calendar days. Deterministic before hydration.
"use client";

import { formatInTimeZone } from "date-fns-tz";
import { Icon } from "@/components/icons";
import { useClock, TZ } from "@/lib/time/clock";
import { cn } from "@/lib/cn";

export function countdownLabel(startISO: string, endISO: string | undefined, now: Date): string {
  const t = now.getTime();
  const start = Date.parse(startISO);
  const end = endISO ? Date.parse(endISO) : start + 2 * 3600_000;
  if (t >= end) return "Done";
  if (t >= start) return "Happening now";
  const day = (x: number) => formatInTimeZone(x, TZ, "yyyy-MM-dd");
  const days = Math.round((Date.parse(day(start)) - Date.parse(day(t))) / 86_400_000);
  if (days <= 0) {
    const mins = Math.max(1, Math.round((start - t) / 60_000));
    return mins < 60 ? `Today · in ${mins}m` : `Today · in ${Math.round(mins / 60)}h`;
  }
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export interface CountdownProps {
  start: string;
  end?: string;
  className?: string;
  icon?: boolean;
  /** Pill styling (success when happening now). */
  pill?: boolean;
}

export function Countdown({ start, end, className, icon = true, pill }: CountdownProps) {
  const now = useClock(30_000);
  const label = countdownLabel(start, end, now);
  const live = label === "Happening now";
  const soon = label.startsWith("Today");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 tabular",
        pill && "h-7 rounded-pill border px-2.5 text-[13px] font-semibold",
        pill && (live ? "border-success-border bg-success-soft text-success-text" : soon ? "border-warning-border bg-warning-soft text-warning-text" : "border-border bg-surface text-fg"),
        !pill && "text-body-sm text-fg-muted",
        className,
      )}
    >
      {live ? (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
          <span className="relative size-2 rounded-full bg-success" />
        </span>
      ) : (
        icon && <Icon name="clock" size={16} />
      )}
      {label}
    </span>
  );
}
