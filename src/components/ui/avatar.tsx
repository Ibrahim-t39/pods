// Avatar (v3): photo (circle) or one serif initial on a flat disc: ink for you, the pod hue for everyone else.
// Sizes 24/28/36/44/64/96/120. Extras: VerifiedSeal corner, status dot, "you" ring, dashed open seat.
"use client";

import { personColor, YOU_COLOR } from "@/components/brand/disc";
import { forwardRef, type CSSProperties } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";
import { initials as toInitials } from "@/lib/utils";
import { VerifiedSeal } from "@/components/brand/glyphs";

export type AvatarSize = 24 | 28 | 32 | 36 | 44 | 56 | 64 | 96 | 120 | (number & {});

/** People are flat discs in their own logo colour (COLOR_LIFE §4, same as <Disc>); you are the ember spark. */
export function avatarGradient(seed: string, you = false): string {
  const c = you ? YOU_COLOR.bg : personColor(seed).bg;
  return `linear-gradient(${c}, ${c})`;
}

export interface AvatarProps extends Omit<HTMLMotionProps<"span">, "children"> {
  name?: string;
  /** Stable seed for the gradient (user id). Defaults to name. */
  seed?: string;
  src?: string | null;
  size?: AvatarSize;
  verified?: boolean;
  status?: "online" | "in" | null;
  you?: boolean;
  /** Dashed "open seat" circle (empty slot). */
  open?: boolean;
  ring?: boolean;
  /** Hide from AT (when a parent provides the text alternative). */
  decorative?: boolean;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { name = "", seed, src, size = 36, verified, status, you, open, ring = false, decorative, className, style, ...rest },
  ref,
) {
  const label = you ? "You" : name;
  const fs = Math.max(10, Math.round(size * 0.4));
  const seal = size >= 96 ? 22 : size >= 44 ? 16 : 14;
  const base: CSSProperties = { width: size, height: size, ...(style as CSSProperties) };

  if (open) {
    return (
      <motion.span
        ref={ref}
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : "Open seat"}
        role={decorative ? undefined : "img"}
        className={cn("relative inline-grid shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-line-2 bg-transparent text-ink-2", className)}
        style={base}
        {...rest}
      >
        <span style={{ fontSize: fs * 0.9 }} className="leading-none">+</span>
      </motion.span>
    );
  }

  return (
    <motion.span
      ref={ref}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full font-semibold select-none",
        you ? "text-on-spark" : "",
        ring && "shadow-[0_0_0_2px_var(--stage)]",
        you && "shadow-[0_0_0_2px_var(--stage),0_0_0_3.5px_var(--spark)]",
        className,
      )}
      style={{ ...base, color: you ? undefined : personColor(seed ?? name).fg, backgroundImage: src ? undefined : avatarGradient(seed ?? name, you) }}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full rounded-full object-cover" draggable={false} />
      ) : (
        <span aria-hidden style={{ fontSize: fs, letterSpacing: "-0.01em" }} className="font-serif leading-none">
          {toInitials(name).slice(0, 1)}
        </span>
      )}
      
      {verified && (
        <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-[var(--stage)] p-[1.5px]">
          <VerifiedSeal size={seal} title="Verified" />
        </span>
      )}
      {status && (
        <span
          aria-hidden
          className={cn(
            "absolute right-0 bottom-0 rounded-full ring-2 ring-surface",
            status === "online" ? "bg-success" : "bg-primary",
          )}
          style={{ width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24) }}
        />
      )}
    </motion.span>
  );
});
