// [U1] Static Pods logo: horizontal lockup, stacked lockup, mark, wordmark (BRAND §2).
// Solid overlap fills (never blend modes) so the mark looks identical on every surface.
// The wordmark follows --color-text, so it flips with the theme; `onDark` forces white for ink/aurora surfaces.
import { useId, type SVGProps } from "react";
import { cn } from "@/lib/cn";
import { CIRCLES, DOTS, DOT_R, FILL, HUES, LETTERS, OVERLAP, PERIOD, R, VIEWBOX } from "./logo-geometry";

type SvgProps = Omit<SVGProps<SVGSVGElement>, "ref" | "children">;

export type LogoVariant = "horizontal" | "stacked" | "mark" | "wordmark";

export interface LogoProps extends SvgProps {
  variant?: LogoVariant;
  /** White wordmark for ink / aurora backgrounds. */
  onDark?: boolean;
  /** One-colour version (white on brand colour or photo, BRAND §2.3). */
  mono?: "white" | "black";
  /** Accessible name. Pass "" to hide the logo from assistive tech (decorative). */
  title?: string;
}

function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

/** The three circles, the solid overlaps and the three white dots, in master coordinates. */
export function MarkShapes({ id, mono }: { id: string; mono?: "white" | "black" }) {
  const c = (k: (typeof HUES)[number], fill?: string, className?: string) => (
    <circle key={k} className={className} cx={CIRCLES[k].x} cy={CIRCLES[k].y} r={R} fill={fill} />
  );
  if (mono) {
    const ink = mono === "white" ? "var(--neutral-0)" : "var(--pods-ink)";
    return (
      <g>
        <defs>
          <mask id={`${id}-mm`}>
            <rect x="0" y="0" width="1000" height="1000" fill="white" />
            {HUES.map((k) => (
              <circle key={k} cx={DOTS[k].x} cy={DOTS[k].y} r={DOT_R} fill="black" />
            ))}
          </mask>
        </defs>
        <g mask={`url(#${id}-mm)`} fill={ink}>
          {HUES.map((k) => c(k, undefined))}
        </g>
      </g>
    );
  }
  return (
    <g className="pods-mark">
      <defs>
        <clipPath id={`${id}-o`}>{c("ember")}</clipPath>
        <clipPath id={`${id}-s`}>{c("signal")}</clipPath>
        <clipPath id={`${id}-os`} clipPath={`url(#${id}-o)`}>
          {c("signal")}
        </clipPath>
      </defs>
      {HUES.map((k) => c(k, FILL[k], `pods-c pods-c-${k}`))}
      <g className="pods-ov">
        <g clipPath={`url(#${id}-o)`}>
          {c("signal", OVERLAP.emberSignal)}
          {c("grove", OVERLAP.emberGrove)}
        </g>
        <g clipPath={`url(#${id}-s)`}>{c("grove", OVERLAP.signalGrove)}</g>
        <g clipPath={`url(#${id}-os)`}>{c("grove", OVERLAP.all)}</g>
      </g>
      {HUES.map((k) => (
        <circle key={k} className={`pods-d pods-d-${k}`} cx={DOTS[k].x} cy={DOTS[k].y} r={DOT_R} fill="var(--neutral-0)" />
      ))}
    </g>
  );
}

export function WordmarkShapes({ ink, period = "var(--pods-signal)" }: { ink: string; period?: string }) {
  return (
    <>
      <g className="pods-wordmark" fill={ink}>
        {LETTERS.map((d, i) => (
          <path key={i} className={`pods-l pods-l${i}`} d={d} />
        ))}
      </g>
      <rect className="pods-period" x={PERIOD.x} y={PERIOD.y} width={PERIOD.w} height={PERIOD.h} rx={PERIOD.rx} fill={period} />
    </>
  );
}

function a11y(title: string | undefined) {
  return title === "" ? ({ "aria-hidden": true } as const) : ({ role: "img", "aria-label": title ?? "Pods" } as const);
}

export function Logo({ variant = "horizontal", onDark, mono, title, className, ...rest }: LogoProps) {
  const id = useSvgId();
  const ink = mono === "white" ? "var(--neutral-0)" : mono === "black" ? "var(--pods-ink)" : onDark ? "var(--neutral-0)" : "var(--color-text)";
  const period = mono ? ink : "var(--pods-signal)";

  if (variant === "mark") return <LogoMark title={title} mono={mono} className={className} {...rest} />;

  if (variant === "wordmark") {
    return (
      <svg viewBox={VIEWBOX.wordmark} className={cn("block h-8 w-auto", className)} {...a11y(title)} {...rest}>
        <WordmarkShapes ink={ink} period={period} />
      </svg>
    );
  }

  if (variant === "stacked") {
    return (
      <svg viewBox={VIEWBOX.stacked} className={cn("block h-24 w-auto", className)} {...a11y(title)} {...rest}>
        <g transform="translate(527.6 -585.1) scale(1.35)">
          <MarkShapes id={id} mono={mono} />
        </g>
        <WordmarkShapes ink={ink} period={period} />
      </svg>
    );
  }

  return (
    <svg viewBox={VIEWBOX.horizontal} className={cn("block h-7 w-auto", className)} {...a11y(title)} {...rest}>
      <MarkShapes id={id} mono={mono} />
      <WordmarkShapes ink={ink} period={period} />
    </svg>
  );
}

export interface LogoMarkProps extends SvgProps {
  mono?: "white" | "black";
  title?: string;
  /** Pixel size (width = height). Below 32px the favicon geometry would be better; keep ≥ 20 (BRAND §2.3). */
  size?: number;
}

export function LogoMark({ mono, title, size, className, style, ...rest }: LogoMarkProps) {
  const id = useSvgId();
  return (
    <svg
      viewBox={VIEWBOX.mark}
      className={cn("block shrink-0", !size && "size-8", className)}
      style={size ? { width: size, height: size, ...style } : style}
      {...a11y(title)}
      {...rest}
    >
      <MarkShapes id={id} mono={mono} />
    </svg>
  );
}

export function Wordmark(props: Omit<LogoProps, "variant">) {
  return <Logo variant="wordmark" {...props} />;
}
