// [U1] Tooltip (Radix): ink pill, 12.5px, 400ms delay. Desktop helper only; never the only way to get info.
"use client";

import "./ui.css";
import type { ReactNode } from "react";
import { Tooltip as RTooltip } from "radix-ui";
import { cn } from "@/lib/cn";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {children}
    </RTooltip.Provider>
  );
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  shortcut?: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, side = "top", shortcut, className }: TooltipProps) {
  return (
    <RTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            side={side}
            sideOffset={8}
            collisionPadding={12}
            className={cn("pods-pop z-tooltip flex max-w-64 items-center gap-2 rounded-sm bg-ink px-2.5 py-1.5 text-[13px] font-medium text-white shadow-md dark:bg-neutral-800", className)}
          >
            {content}
            {shortcut && <span className="font-mono text-[12px] text-neutral-400">{shortcut}</span>}
            <RTooltip.Arrow width={10} height={5} className="fill-[var(--pods-ink)] dark:fill-[var(--neutral-800)]" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
