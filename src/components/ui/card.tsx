// Card (v3, compat). Pods groups by distance, not boxes (DESIGN.md §4 rule 2): prefer no card. When one is needed it is
// lit paper with a printed shadow, never a border plus padding plus shadow. New screens should not add cards.
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import "@/components/brand/brand.css";

export const cardVariants = cva("relative rounded-card text-fg", {
  variants: {
    elevation: {
      flat: "bg-transparent",
      e1: "bg-lit shadow-sm",
      e2: "bg-lit shadow-md",
      ai: "bg-lit shadow-sm",
      pod: "bg-[color-mix(in_srgb,var(--pod)_10%,var(--lit))]",
      sunken: "bg-sunken",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4 md:p-5",
      lg: "p-5 md:p-6",
    },
    interactive: {
      true: [
        "cursor-pointer outline-offset-2 transition-[box-shadow,transform,border-color] duration-fast ease-standard",
        "hover:shadow-md active:scale-[.985]",
        "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
      ],
      false: "",
    },
  },
  defaultVariants: { elevation: "e1", padding: "md", interactive: false },
});

export interface CardProps extends ComponentPropsWithoutRef<"div">, VariantProps<typeof cardVariants> {
  asChild?: boolean;
  orbit?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ asChild, elevation, padding, interactive, orbit, className, ...rest }, ref) {
  const Comp = asChild ? Slot.Root : "div";
  return <Comp ref={ref} className={cn(cardVariants({ elevation, padding, interactive }), orbit && "pods-orbit-ring", className)} {...rest} />;
});

export function CardHeader({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mb-3 flex items-center justify-between gap-3", className)} {...rest} />;
}
export function CardTitle({ className, ...rest }: ComponentPropsWithoutRef<"h3">) {
  return <h3 className={cn("text-heading-sm text-fg", className)} {...rest} />;
}
export function CardDescription({ className, ...rest }: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-body-sm text-fg-muted", className)} {...rest} />;
}
