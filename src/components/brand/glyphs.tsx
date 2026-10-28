// [U1] Custom glyphs that lucide doesn't have (BLUEPRINT §2.7). Same 24 grid, 1.75 stroke, round caps.
import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

type GlyphProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number; strokeWidth?: number };

function base({ size = 24, strokeWidth = 1.75, className, ...rest }: GlyphProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("shrink-0", className),
    ...rest,
  };
}

/** Pods tab icon: three overlapping circles (outline), filled variant for the active tab. */
export function PodsGlyph({ filled, ...props }: GlyphProps & { filled?: boolean }) {
  return (
    <svg {...base(props)}>
      {filled ? (
        <g stroke="none" fill="currentColor">
          <circle cx="12" cy="8.2" r="5.2" opacity=".9" />
          <circle cx="8.1" cy="14.6" r="5.2" opacity=".72" />
          <circle cx="15.9" cy="14.6" r="5.2" opacity=".55" />
        </g>
      ) : (
        <>
          <circle cx="12" cy="8.2" r="5.2" />
          <circle cx="8.1" cy="14.6" r="5.2" />
          <circle cx="15.9" cy="14.6" r="5.2" />
        </>
      )}
    </svg>
  );
}

/**
 * Verified seal: the logo's rounded-square period with a check (BLUEPRINT §2.7 "rounded-square period + check"),
 * scalloped edge so it reads as a seal at 14-22px. Colour is --color-verified only.
 */
export function VerifiedSeal({ size = 16, className, title = "Verified", ...rest }: Omit<GlyphProps, "strokeWidth"> & { title?: string }) {
  // 12-lobe scallop around a rounded square-ish body.
  const lobes = 12;
  const pts: string[] = [];
  for (let i = 0; i <= lobes * 2; i++) {
    const a = (i / (lobes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 11.2 : 9.7;
    pts.push(`${(12 + Math.cos(a) * r).toFixed(2)},${(12 + Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn("shrink-0 text-verified", className)}
      {...rest}
    >
      <polygon points={pts.join(" ")} fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M7.6 12.3l2.9 2.9 5.9-6" fill="none" stroke="var(--neutral-0)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Widened: concentric rings (the pod grew its circle to include you). */
export function WidenGlyph(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9.6" strokeDasharray="2.2 2.6" />
    </svg>
  );
}

/** Repeat: two circles overlapping (run it back). */
export function RepeatGlyph(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </svg>
  );
}
