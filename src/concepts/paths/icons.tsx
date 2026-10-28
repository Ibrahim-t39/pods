// Paths concept glyphs. 24 grid, 1.75 stroke, round caps (PB 6.3; IL 75, 44, 45). Built only from circles, dots and
// one curved stroke: the path (PB 6.1, 6.2; IL 40, 24, 11). No stock icon set.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75,
  strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false,
});

/** Pull back: a path that curls back to where you stood. */
export const PullBack = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M19 18c0-6-3.5-10-9-10H6" />
    <path d="M8.5 5 5.5 8l3 3" />
    <circle cx="19" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

/** Step: a dot landing on the path ("I'm in"). */
export const Step = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 17c4-1 6-6 9-6s5 4 9 3" opacity=".45" />
    <circle cx="12" cy="8" r="3.2" fill="currentColor" stroke="none" />
  </svg>
);

/** Why: three lines bending into one point. */
export const Why = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 5c4 1 6 4 9 7" />
    <path d="M3 19c4-1 6-4 9-7" />
    <path d="M21 12h-9" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
  </svg>
);

export const Sky = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="4" />
    {[0, 60, 120, 180, 240, 300].map((a) => {
      const r = (a * Math.PI) / 180;
      return <circle key={a} cx={12 + Math.cos(r) * 8} cy={12 + Math.sin(r) * 8} r=".9" fill="currentColor" stroke="none" />;
    })}
  </svg>
);

export const Rain = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12a8 8 0 0 1 16 0Z" />
    <circle cx="8" cy="17" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r=".9" fill="currentColor" stroke="none" />
    <circle cx="16" cy="17" r=".9" fill="currentColor" stroke="none" />
  </svg>
);

export const Clock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12c1.5 0 3 .8 3.5 2.5" />
  </svg>
);

/** Place: a clearing with one seat dot. */
export const Place = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8" strokeDasharray="2.4 2.6" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </svg>
);

/** Again: two clearings on one path. */
export const Again = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 19c3 0 4-3 6-6s4-6 8-6" />
    <circle cx="7" cy="16" r="3" />
    <circle cx="17.5" cy="7" r="3" fill="currentColor" />
  </svg>
);

/** Knot: two trails tied (lock). */
export const Knot = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 18c5 0 6-12 11-12a3.5 3.5 0 0 1 0 7c-5 0-6-7-11-7" />
    <path d="M14 13c3 0 4 5 7 5" />
  </svg>
);

export const Close = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6c4 3 8 9 12 12" />
    <path d="M18 6c-4 3-8 9-12 12" />
  </svg>
);

/** Onward: a short path ending in an open seat (used inside the primary capsule). */
export const Onward = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 15c3-1 5-6 9-6s4 3 5 3" />
    <circle cx="19.5" cy="12" r="2.5" />
  </svg>
);
