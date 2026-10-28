// IconButton v3: 44x44 hit area at every size, glyphs from @/components/icons. Variants ghost, surface (outlined), primary (ink).
// Always pass `label` (becomes aria-label + tooltip title). Optional badge dot.
"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

const iconButton = cva(
  "pressable relative inline-flex shrink-0 items-center justify-center rounded-full text-current outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost: "bg-transparent hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)]",
        surface: "bg-transparent shadow-[inset_0_0_0_1.5px_var(--line-2)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)]",
        glass: "bg-lit shadow-sm",
        primary: "bg-ink text-lit hover:bg-neutral-800",
        "on-dark": "bg-transparent text-lamp hover:bg-[color-mix(in_srgb,var(--lamp)_10%,transparent)]",
      },
      size: {
        sm: "size-11 [&_svg]:size-[18px]",
        md: "size-11 [&_svg]:size-5",
        lg: "size-12 [&_svg]:size-6",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">, VariantProps<typeof iconButton> {
  label: string;
  icon: ReactNode;
  badge?: boolean;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, badge, loading, variant, size, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      aria-busy={loading || undefined}
      className={cn(iconButton({ variant, size }), size === "sm" && "after:absolute after:-inset-1 after:content-['']", className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {badge && <span aria-hidden className="absolute top-2 right-2 size-2.5 rounded-full bg-ember ring-2 ring-[var(--stage)]" />}
    </button>
  );
});
