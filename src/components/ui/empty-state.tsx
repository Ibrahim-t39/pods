// [U1] EmptyState: circle-people illustration + one sentence + one action (BLUEPRINT §3.1, BRAND §8).
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CirclePeople, type CirclePeopleVariant } from "@/components/brand/circle-people";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  art?: CirclePeopleVariant | ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, description, action, art = "seat", compact, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "gap-3 py-8" : "gap-4 py-12 md:py-16", className)}>
      <div className="relative">
        <div aria-hidden className="absolute inset-[-20%] rounded-full bg-[radial-gradient(closest-side,var(--color-primary-soft),transparent)]" />
        <div className="relative">
          {typeof art === "string" ? <CirclePeople variant={art as CirclePeopleVariant} size={compact ? 112 : 152} /> : art}
        </div>
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="line text-heading-lg text-ink">{title}</h3>
        {description && <p className="text-body text-fg-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
