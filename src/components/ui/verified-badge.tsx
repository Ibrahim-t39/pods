// [U1] VerifiedBadge: the scalloped VerifiedSeal (period shape + check, --color-verified only) with an
// optional "Verified" label and a popover explaining what it means (demo-honest, BLUEPRINT D12/D15).
"use client";

import { Popover } from "radix-ui";
import { cn } from "@/lib/cn";
import { VerifiedSeal } from "@/components/brand/glyphs";

export { VerifiedSeal };

export interface VerifiedBadgeProps {
  size?: 14 | 16 | 22;
  withLabel?: boolean;
  /** Tap / hover opens the explainer popover. */
  interactive?: boolean;
  className?: string;
}

export function VerifiedBadge({ size = 16, withLabel, interactive = true, className }: VerifiedBadgeProps) {
  const visual = (
    <span className={cn("inline-flex items-center gap-1 align-middle", className)}>
      <VerifiedSeal size={size} title={withLabel ? "" : "Verified"} aria-hidden={withLabel || undefined} />
      {withLabel && <span className="text-caption font-semibold text-primary-soft-text">Verified</span>}
    </span>
  );
  if (!interactive) return visual;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" aria-label="Verified. What this means" className="-m-1.5 inline-flex rounded-pill p-1.5 outline-offset-0 hover:bg-sunken">
          {visual}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          collisionPadding={16}
          className="z-tooltip w-72 animate-rise-in rounded-lg border border-border bg-raised p-4 text-body-sm text-fg shadow-lg outline-none"
        >
          <div className="mb-1.5 flex items-center gap-2 text-heading-sm">
            <VerifiedSeal size={22} title="" aria-hidden />
            Verified
          </div>
          <p className="text-fg-muted">
            Checked before joining a pod.
          </p>
          <Popover.Arrow className="fill-[var(--color-raised)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
