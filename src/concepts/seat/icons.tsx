// SEAT icon set, drawn for this concept. 24 grid, 1.75 stroke, round caps. Built only from circles, arcs and the
// notch (PB 6.1-6.3; IL 40, 24, 11, 41, 75, 44). No stock icons anywhere in the concept.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...rest,
});

/** The Seat: a circle with a notch at 6 o'clock where one more person fits. */
export function IconSeat({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <path d="M10.2 19.75A8 8 0 1 1 13.8 19.75" />
      <circle cx="12" cy="19.6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Room: one table with three seats around it. Zoom out. */
export function IconRoom({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="3.6" r="1.5" />
      <circle cx="4.7" cy="16.2" r="1.5" />
      <circle cx="19.3" cy="16.2" r="1.5" />
    </svg>
  );
}

/** Walk: an arc with a dot travelling along it (next table). */
export function IconWalk({ size, flip, ...rest }: P & { flip?: boolean }) {
  return (
    <svg {...base(size, rest)} style={{ transform: flip ? "scaleX(-1)" : undefined, ...(rest.style ?? {}) }}>
      <path d="M4 15a8.5 8.5 0 0 1 14.5-6" />
      <circle cx="19.2" cy="9.6" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Go: a disc with a short arc arrow inside (used on the ink go-disc). */
export function IconGo({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5.5 12h11" />
      <path d="M12.5 7.5 17 12l-4.5 4.5" />
    </svg>
  );
}

/** Flip: a card with a turning arc (why). */
export function IconFlip({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <rect x="6.5" y="5" width="11" height="14" rx="1.6" />
      <path d="M3 9.5a9 9 0 0 1 3.5-4" />
      <path d="M21 14.5a9 9 0 0 1-3.5 4" />
    </svg>
  );
}

/** Again: two circles re-overlapping (run it back). */
export function IconAgain({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </svg>
  );
}

/** Light: a lamp pool, an arc over a disc. */
export function IconLight({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <path d="M7 9a5 5 0 0 1 10 0" />
      <path d="M12 4V2.5" />
      <ellipse cx="12" cy="18" rx="7" ry="2.5" />
    </svg>
  );
}

/** Indoors: a disc under a roof arc (weather coaster). */
export function IconIndoors({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <path d="M4 12.5a8 8 0 0 1 16 0" />
      <circle cx="12" cy="15.5" r="3" />
    </svg>
  );
}

/** Sky: a sun disc with a cloud arc crossing it. */
export function IconSky({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="10" cy="10" r="4.5" />
      <path d="M8 18.5h9a3.2 3.2 0 0 0 0-6.4 4.5 4.5 0 0 0-1 .1" />
    </svg>
  );
}

/** Rain plan: two drops that are circles with a notch, landing under an arc. */
export function IconRain({ size, ...rest }: P) {
  return (
    <svg {...base(size, rest)}>
      <path d="M4.5 10.5a7.5 7.5 0 0 1 15 0" />
      <circle cx="9" cy="16" r="1.6" />
      <circle cx="15" cy="18.5" r="1.6" />
    </svg>
  );
}
