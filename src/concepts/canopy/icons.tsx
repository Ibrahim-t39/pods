// CANOPY icon set, drawn for Pods (not a stock set). Grammar: circles, overlaps and the notch where one more person
// fits (PB 6.1-6.3, IL 40/24/11). 24 grid, 1.75 stroke, round caps, currentColor; weight matches the mono label.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20, p: P) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

/** The seat: a circle with a notch where one more fits. */
export const ISeat = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M15.5 4.2A8.5 8.5 0 1 0 19.8 8.5" /><circle cx="18.6" cy="5.4" r="1.6" fill="currentColor" stroke="none" /></svg>
);
/** Why: a circle crossed by the arc of the week (Claude's reasoning). */
export const IWhy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="8" /><path d="M4.5 14.5c4-4.5 11-4.5 15 0" /><circle cx="15.5" cy="11.2" r="1.3" fill="currentColor" stroke="none" /></svg>
);
/** People: three circles, the logo's overlap. */
export const IPeople = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="8.5" r="4.2" /><circle cx="8.3" cy="14.6" r="4.2" /><circle cx="15.7" cy="14.6" r="4.2" /></svg>
);
/** Rain plan: the dashed second ring. */
export const IRain = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="8" strokeDasharray="2.6 3" /><path d="M12 9v4.5" /></svg>
);
/** Indoors: a circle with a lid, never a house or a tent. */
export const IIndoor = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 10.5h16" /><path d="M5.6 10.5a6.5 6.5 0 0 0 12.8 0" /><path d="M12 5.5v5" /></svg>
);
/** Sky: an open half circle on the horizon. */
export const ISky = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3.5 16.5h17" /><path d="M7 16.5a5 5 0 0 1 10 0" /><path d="M12 6.5v2M5.6 9.2l1.3 1.3M18.4 9.2l-1.3 1.3" /></svg>
);
/** Again: two circles re-overlapping (run it back). */
export const IAgain = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="9.5" cy="12" r="5.5" /><path d="M14.5 6.9A5.5 5.5 0 1 1 10.9 17" /><path d="M15.6 4.6l-1.1 2.3 2.4.8" /></svg>
);
/** Close: two arcs that meet, from the notch. */
export const IClose = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M7 7l10 10M17 7L7 17" /></svg>
);
/** Next: a dot moving into a circle. */
export const INext = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="15" cy="12" r="5.5" /><path d="M3.5 12h7" /><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
);
/** Checked: a circle closed by a pole (rules passed). */
export const ICheck = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="8" /><path d="M8.5 12.3l2.4 2.4 4.8-5" /></svg>
);
/** Place: a ring on the ground. */
export const IPlace = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><ellipse cx="12" cy="17" rx="7.5" ry="2.5" /><path d="M12 17V5.5" /><circle cx="12" cy="5.5" r="1.6" fill="currentColor" stroke="none" /></svg>
);

/** The logo is the only fixed asset; it is used as published. */
export function Logo({ dark, size = 26 }: { dark?: boolean; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dark ? "/brand/logo-on-dark-transparent.svg" : "/brand/logo-horizontal.svg"} alt="Pods" height={size} style={{ height: size, width: "auto" }} draggable={false} />
  );
}
