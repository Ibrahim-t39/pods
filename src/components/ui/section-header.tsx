// [U1] SectionHeader: overline + count + optional action ("INTEREST PODS · 2   See all").
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeader({ title, count, action, className, as: As = "h2" }: { title: ReactNode; count?: number; action?: ReactNode; className?: string; as?: "h2" | "h3" }) {
  return (
    <div className={cn("flex min-h-8 items-center justify-between gap-3", className)}>
      <As className="text-overline text-fg-muted">
        {title}
        {count != null && <span className="tabular text-fg-subtle"> · {count}</span>}
      </As>
      {action && <div className="text-label text-link">{action}</div>}
    </div>
  );
}
