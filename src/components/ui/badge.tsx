// [U1] Badge: small status pill. Status is always icon + text, never colour alone (BLUEPRINT §2.2).
// Tones: neutral, verified, admin, ai, success, warning, info, danger, pod. v3: prefer a plain label to a pill.
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-medium tabular [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface text-fg-muted",
        muted: "border-transparent bg-sunken text-fg-muted",
        verified: "border-signal-soft-border bg-primary-soft text-primary-soft-text",
        admin: "border-border-strong bg-sunken text-fg",
        ai: "border-signal-soft-border bg-primary-soft text-primary-soft-text",
        success: "border-success-border bg-success-soft text-success-text",
        warning: "border-warning-border bg-warning-soft text-warning-text",
        info: "border-info-border bg-info-soft text-info-text",
        danger: "border-danger-border bg-danger-soft text-danger-text",
        pod: "border-pod-soft-border bg-pod-soft text-pod-text",
        solid: "border-transparent bg-ink text-lit",
      },
      size: {
        xs: "h-5 px-2 text-[12px] [&_svg]:size-3",
        sm: "h-6 px-2.5 text-[12px] [&_svg]:size-3.5",
        md: "h-7 px-3 text-[13px] [&_svg]:size-4",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export interface BadgeProps extends ComponentPropsWithoutRef<"span">, VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
}

export function Badge({ tone, size, icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}
