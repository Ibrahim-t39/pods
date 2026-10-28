// [U1] Stat: label + big number (ticker) + optional delta / caption. Admin KPIs, profile counts.
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { NumberTicker } from "./number-ticker";

export interface StatProps {
  label: ReactNode;
  value: number | string;
  suffix?: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Stat({ label, value, suffix, caption, icon, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="flex items-center gap-1.5 text-overline text-fg-subtle [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className="flex items-baseline gap-1 font-display text-[34px] leading-none font-black tracking-[-0.03em] text-fg [font-stretch:112%]">
        {typeof value === "number" ? <NumberTicker value={value} /> : value}
        {suffix && <span className="text-[18px] font-bold text-fg-muted">{suffix}</span>}
      </span>
      {caption && <span className="text-caption text-fg-muted">{caption}</span>}
    </div>
  );
}
