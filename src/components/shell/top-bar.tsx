// TopBar (compat, v3). Older screens call <TopBar title back actions>. In v3 there is no title in a bar: this renders
// the <Chrome> row (back glyph or the mark on the left, the screen's controls on the right) and then the title as the
// page's serif line, left-anchored at the gutter, 24px under the row (DESIGN.md §5, TEMPLATE "page head").
// New screens use <Chrome> + <Line> directly.
"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Line } from "@/components/brand/line";
import { Chrome } from "./chrome";

export interface TopBarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: string | boolean;
  backHref?: string;
  backLabel?: string;
  leading?: ReactNode;
  actions?: ReactNode;
  large?: boolean;
  children?: ReactNode;
  solid?: boolean;
  className?: string;
}

export function TopBar({ title, subtitle, back, backHref, backLabel = "Back", leading, actions, children, className }: TopBarProps) {
  return (
    <div className={cn("pods-topbar", className)}>
      <Chrome
        left={back ? "back" : leading ? "none" : "mark"}
        backHref={typeof back === "string" ? back : backHref}
        backLabel={backLabel}
        right={actions ? <div className="flex items-center gap-1">{actions}</div> : "none"}
        center={leading}
      />
      {(title != null || subtitle != null) && (
        <div className="px-gutter pt-s6 lg:px-s16">
          {subtitle != null && <p className="text-label text-ink-2">{subtitle}</p>}
          {title != null && (
            <Line size="sm" className={cn(subtitle != null && "mt-s2")}>
              {title}
            </Line>
          )}
        </div>
      )}
      {children && <div className="px-gutter pt-s4 lg:px-s16">{children}</div>}
    </div>
  );
}
