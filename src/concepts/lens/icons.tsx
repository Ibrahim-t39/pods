// Lens glyphs. Drawn for this concept on a 24 grid, 1.6 stroke, round caps (PB 6.3). The only grammar is the
// logo's: circles, overlaps and the seat notch (PB 6.1, 6.2; IL 40/41). No stock set.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...rest,
});

/** Step out of a lens: a small circle leaving a big one. */
export function GOut({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <circle cx="13.5" cy="13.5" r="7" />
      <circle cx="6.5" cy="6.5" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Go on: a dot passing through the seat notch into the ring. */
export function GOn({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <path d="M8.6 5.7A7.5 7.5 0 1 1 5.7 8.6" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <path d="M3.5 3.5 9 9" />
    </svg>
  );
}

/** I'm in: the seat, filled. */
export function GIn({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Again: two circles re-crossing, one carrying the turn. */
export function GAgain({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <circle cx="9" cy="12" r="5.5" />
      <path d="M12.6 7.2A5.5 5.5 0 1 1 11 16.6" />
      <path d="M12.4 4.6 12.6 7.2 10 7.6" />
    </svg>
  );
}

/** An empty seat: dashed ring, open at the top-left where someone fits. */
export function GSeat({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <path d="M9.2 4.5A8 8 0 1 1 4.5 9.2" strokeDasharray="2.2 2.6" />
    </svg>
  );
}

/** Sky, clear: a disc ringed by dots. */
export function GSun({ size = 24, ...r }: P) {
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return <circle key={i} cx={12 + Math.cos(a) * 8} cy={12 + Math.sin(a) * 8} r="0.9" fill="currentColor" stroke="none" />;
  });
  return (
    <svg {...base(size, r)}>
      <circle cx="12" cy="12" r="3.6" />
      {dots}
    </svg>
  );
}

/** Sky, wet: a half disc over three falling dots. */
export function GRain({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <path d="M5 13a7 7 0 0 1 14 0Z" />
      <circle cx="8" cy="17" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A place: a ring with its centre marked. */
export function GPlace({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Indoors: a ring under a roof line. */
export function GRoof({ size = 24, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <path d="M3.5 10 12 4l8.5 6" />
      <circle cx="12" cy="14.5" r="4.5" />
    </svg>
  );
}
