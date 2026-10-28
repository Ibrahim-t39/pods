// Call concept icon set. 24 grid, 1.5 px round stroke, circle grammar only (PB 6.1–6.3; IL 40, 24, 11, 75).
// seat = a circle with a notch where one more person fits; in = filled circle; room = two overlapping circles;
// again = two circles re-overlapping with a return arc; rain = circle over three drops; place = circle + centre dot;
// on = the arrow is a circle travelling right; close = two arcs crossing.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const Seat = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14.6 4.3A8 8 0 1 0 19.7 9.4" />
    <circle cx="18" cy="6" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
export const In = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="7" fill="currentColor" stroke="none" />
  </svg>
);
export const Room = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="9.5" cy="12" r="5.5" />
    <circle cx="14.5" cy="12" r="5.5" />
  </svg>
);
export const Again = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="9" cy="13" r="5" />
    <circle cx="15" cy="13" r="5" />
    <path d="M7 5.5A7 7 0 0 1 17 5.5" />
    <path d="M17 5.5l-2.2-.4M17 5.5l.3-2.2" />
  </svg>
);
export const Rain = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="9" r="5" />
    <circle cx="8" cy="19" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="20.5" r=".9" fill="currentColor" stroke="none" />
    <circle cx="16" cy="19" r=".9" fill="currentColor" stroke="none" />
  </svg>
);
export const Place = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
  </svg>
);
export const On = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12h9" />
    <circle cx="16.5" cy="12" r="3.5" fill="currentColor" stroke="none" />
  </svg>
);
export const Close = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6c4 3 8 9 12 12" />
    <path d="M18 6c-4 3-8 9-12 12" />
  </svg>
);
export const Send = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 16V8M8.8 11.2 12 8l3.2 3.2" />
  </svg>
);

/** The Pods mark, drawn from the logo geometry (three overlapping circles with white seats). Colours are tokens. */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.92} viewBox="211 234 386 356" aria-hidden>
      <defs>
        <clipPath id="cm-o"><circle cx="404" cy="355" r="97" /></clipPath>
        <clipPath id="cm-s"><circle cx="332" cy="469" r="97" /></clipPath>
        <clipPath id="cm-os" clipPath="url(#cm-o)"><circle cx="332" cy="469" r="97" /></clipPath>
      </defs>
      <circle cx="404" cy="355" r="97" fill="var(--ember-500)" />
      <circle cx="332" cy="469" r="97" fill="var(--signal-500)" />
      <circle cx="476" cy="469" r="97" fill="var(--grove-500)" />
      <g clipPath="url(#cm-o)">
        <circle cx="332" cy="469" r="97" fill="var(--pods-overlap-ember-signal)" />
        <circle cx="476" cy="469" r="97" fill="var(--pods-overlap-ember-grove)" />
      </g>
      <g clipPath="url(#cm-s)"><circle cx="476" cy="469" r="97" fill="var(--pods-overlap-signal-grove)" /></g>
      <g clipPath="url(#cm-os)"><circle cx="476" cy="469" r="97" fill="var(--pods-overlap-all)" /></g>
      <circle cx="404" cy="317" r="24" fill="var(--neutral-0)" />
      <circle cx="300" cy="484" r="24" fill="var(--neutral-0)" />
      <circle cx="508" cy="484" r="24" fill="var(--neutral-0)" />
    </svg>
  );
}
