// [U1] Popover (Radix): raised surface, shadow-lg, 14px radius, pop-in from the trigger side.
"use client";

import "./ui.css";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Popover as RPopover } from "radix-ui";
import { cn } from "@/lib/cn";

export const Popover = RPopover.Root;
export const PopoverTrigger = RPopover.Trigger;
export const PopoverClose = RPopover.Close;
export const PopoverAnchor = RPopover.Anchor;

export function PopoverContent({ className, children, sideOffset = 8, arrow, ...rest }: ComponentPropsWithoutRef<typeof RPopover.Content> & { arrow?: boolean; children?: ReactNode }) {
  return (
    <RPopover.Portal>
      <RPopover.Content
        sideOffset={sideOffset}
        collisionPadding={16}
        className={cn("pods-pop z-tooltip w-72 rounded-md border border-border bg-raised p-4 text-body-sm text-fg shadow-lg outline-none", className)}
        {...rest}
      >
        {children}
        {arrow && <RPopover.Arrow width={14} height={7} className="fill-[var(--color-raised)]" />}
      </RPopover.Content>
    </RPopover.Portal>
  );
}
