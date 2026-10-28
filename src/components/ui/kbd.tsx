// [U1] Kbd: keyboard hint, desktop only (hidden below md).
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function Kbd({ className, ...rest }: ComponentPropsWithoutRef<"kbd">) {
  return (
    <kbd
      className={cn(
        "hidden h-6 min-w-6 items-center justify-center rounded-xs border border-border bg-surface px-1.5 font-mono text-[12px] font-medium text-fg-muted shadow-[inset_0_-1px_0_var(--color-border)] md:inline-flex",
        className,
      )}
      {...rest}
    />
  );
}
