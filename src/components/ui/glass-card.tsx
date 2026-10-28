// [U1] GlassCard: E3 floating glass (BLUEPRINT §2.6): glass gradient + blur 18 saturate 1.4 + hairline border
// + shadow-lg, with solid fallbacks (no backdrop-filter / reduced transparency). `tone="dark"` for ink / aurora
// surfaces (landing hero, splash) regardless of theme.
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export interface GlassCardProps extends ComponentPropsWithoutRef<"div"> {
  tone?: "auto" | "dark";
  radius?: "lg" | "xl" | "2xl" | "pill";
  padding?: "none" | "sm" | "md" | "lg";
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { tone = "auto", radius = "xl", padding = "md", className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative isolate overflow-hidden",
        tone === "auto"
          ? "glass"
          : "border border-white/10 bg-[linear-gradient(180deg,rgb(27_29_35/0.72),rgb(19_20_25/0.56))] text-white shadow-[0_20px_48px_rgb(0_0_0/0.45)] backdrop-blur-[18px] backdrop-saturate-[1.4]",
        radius === "lg" ? "rounded-lg" : radius === "xl" ? "rounded-xl" : radius === "2xl" ? "rounded-2xl" : "rounded-pill",
        padding === "none" ? "" : padding === "sm" ? "p-3" : padding === "md" ? "p-4 md:p-5" : "p-6 md:p-8",
        className,
      )}
      {...rest}
    >
      {/* Specular top edge: a 1px highlight that fades out toward the sides. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.85),transparent)] opacity-80 dark:opacity-25"
      />
      {children}
    </div>
  );
});
