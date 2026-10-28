// [U1] Tabs (Radix): underline tabs with a sliding indicator (desktop), or `variant="segmented"` pill tabs
// (mobile). Same Radix semantics either way.
"use client";

import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Tabs as RTabs } from "radix-ui";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export const Tabs = RTabs.Root;
export const TabsContent = ({ className, ...rest }: ComponentPropsWithoutRef<typeof RTabs.Content>) => (
  <RTabs.Content className={cn("outline-none focus-visible:outline-2", className)} {...rest} />
);

export interface TabsListProps {
  tabs: { value: string; label: ReactNode; count?: number }[];
  value: string;
  variant?: "underline" | "segmented";
  className?: string;
  label?: string;
}

export function TabsList({ tabs, value, variant = "underline", className, label }: TabsListProps) {
  const id = useId();
  if (variant === "segmented") {
    return (
      <RTabs.List aria-label={label} className={cn("relative inline-flex rounded-pill bg-sunken p-1 shadow-[inset_0_0_0_1px_var(--color-border)]", className)}>
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className="relative z-0 inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-pill px-4 text-[14px] font-semibold text-fg-muted transition-colors outline-offset-1 hover:text-fg data-[state=active]:text-fg"
          >
            {value === t.value && (
              <motion.span layoutId={id} className="absolute inset-0 -z-10 rounded-pill bg-surface shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--color-border)] dark:bg-raised" />
            )}
            {t.label}
            {t.count != null && <span className="tabular text-fg-subtle">{t.count}</span>}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
    );
  }
  return (
    <RTabs.List aria-label={label} className={cn("relative flex gap-6 border-b border-border", className)}>
      {tabs.map((t) => (
        <RTabs.Trigger
          key={t.value}
          value={t.value}
          className="relative -mb-px inline-flex h-11 items-center gap-1.5 text-[15px] font-semibold text-fg-muted transition-colors outline-offset-2 hover:text-fg data-[state=active]:text-fg"
        >
          {t.label}
          {t.count != null && <span className="tabular rounded-pill bg-sunken px-1.5 text-[12px] text-fg-muted">{t.count}</span>}
          {value === t.value && <motion.span layoutId={id} className="absolute inset-x-0 bottom-0 h-0.5 rounded-pill bg-primary" />}
        </RTabs.Trigger>
      ))}
    </RTabs.List>
  );
}
