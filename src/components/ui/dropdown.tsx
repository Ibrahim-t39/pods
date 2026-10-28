// [U1] Dropdown menu (Radix): raised menu, 44px rows on touch / 38px on desktop, icon + label, destructive tone,
// separators, shortcut hints.
"use client";

import "./ui.css";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { cn } from "@/lib/cn";

export const Dropdown = DropdownMenu.Root;
export const DropdownTrigger = DropdownMenu.Trigger;

export function DropdownContent({ className, sideOffset = 6, align = "end", ...rest }: ComponentPropsWithoutRef<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={12}
        className={cn("pods-pop z-tooltip min-w-52 rounded-md border border-border bg-raised p-1.5 text-fg shadow-lg outline-none", className)}
        {...rest}
      />
    </DropdownMenu.Portal>
  );
}

export function DropdownItem({
  icon,
  shortcut,
  tone = "default",
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<typeof DropdownMenu.Item> & { icon?: ReactNode; shortcut?: ReactNode; tone?: "default" | "danger" }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-[15px] outline-none select-none md:h-[38px] md:text-[14px]",
        "data-highlighted:bg-sunken data-disabled:pointer-events-none data-disabled:opacity-45 [&_svg]:size-[18px] [&_svg]:shrink-0",
        tone === "danger" ? "text-danger-text data-highlighted:bg-danger-soft" : "text-fg [&_svg]:text-fg-muted",
        className,
      )}
      {...rest}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="font-mono text-[11px] text-fg-subtle">{shortcut}</span>}
    </DropdownMenu.Item>
  );
}

export function DropdownSeparator() {
  return <DropdownMenu.Separator className="-mx-1.5 my-1.5 h-px bg-border" />;
}

export function DropdownLabel({ className, ...rest }: ComponentPropsWithoutRef<typeof DropdownMenu.Label>) {
  return <DropdownMenu.Label className={cn("px-3 pt-1.5 pb-1 text-overline text-fg-subtle", className)} {...rest} />;
}
