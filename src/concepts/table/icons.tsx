// TABLE concept icon set (PB 6.1-6.3; IL 40, 24, 11). 24 grid, 1.75 round stroke, built only from circles, arcs and
// the seat notch. No stock icons.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24) =>
  ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }) satisfies SVGProps<SVGSVGElement>;

/** Room: three overlapping rings (the logo's grammar). */
export const IcRoom = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8.6" r="4.6" />
    <circle cx="8.4" cy="14.6" r="4.6" />
    <circle cx="15.6" cy="14.6" r="4.6" />
  </svg>
);

/** Seat: a ring with a notch where one more person fits. */
export const IcSeat = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14.6 19.2A7.6 7.6 0 1 1 19.3 14.6" />
    <circle cx="18.2" cy="18.2" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

/** Turn the table: a ring with one arrow arc. */
export const IcTurn = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M19.4 12A7.4 7.4 0 1 1 15.6 5.5" />
    <path d="M15.4 2.6l.6 3.1-3.1.7" />
  </svg>
);

/** Sky: a disc rising over an arc. */
export const IcSky = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="10" r="3.4" />
    <path d="M4 17.5a8 8 0 0 1 16 0" />
  </svg>
);

/** Rain plan: an arc with three falling dots. */
export const IcRain = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 12a7.5 7.5 0 0 1 15 0" />
    <circle cx="8" cy="16.5" r=".9" fill="currentColor" />
    <circle cx="12" cy="19" r=".9" fill="currentColor" />
    <circle cx="16" cy="16.5" r=".9" fill="currentColor" />
  </svg>
);

/** Place: a ring with a centre dot. */
export const IcPlace = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
  </svg>
);

/** Talk: two overlapping rings, one left open. */
export const IcTalk = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="9.5" cy="11" r="5.5" />
    <path d="M12.6 6.6A5.5 5.5 0 1 1 16.6 18.4" />
  </svg>
);

/** Close: two crossing arcs. */
export const IcClose = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6q6 4 12 12" />
    <path d="M18 6q-4 6-12 12" />
  </svg>
);

/** Why: a ring flipping (half filled). */
export const IcFlip = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none" />
  </svg>
);

/** Next: a disc with an arc arrow (onward). */
export const IcOn = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12h12.5" />
    <path d="M13 7.5l4.5 4.5-4.5 4.5" />
  </svg>
);

/** Send: a dot leaving a ring. */
export const IcSend = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 18.5V6.5" />
    <path d="M7.5 11 12 6.5l4.5 4.5" />
  </svg>
);
