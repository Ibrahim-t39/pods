// Groove glyphs. 24 grid, 2px round caps, drawn from the record's own geometry: circles, the needle, the spindle dot.
// No stock set. (IL 40/41 glyphs from brand geometry; IL 75/44/45 stroke rules.)
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
});

/** Needle: the stylus coming down onto a groove arc. */
export function INeedle({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 20a9 9 0 0 1 16 0" />
      <path d="M18 3 12.5 13" />
      <circle cx="12" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** I'm in: a dot dropping into an open seat. */
export function IIn({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Flip: two half discs, front and back. */
export function IFlip({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" stroke="none" />
      <path d="M12 4a8 8 0 0 1 0 16" />
      <path d="M12 2v20" />
    </svg>
  );
}

/** Again: two circles re-overlapping, pulled counter-clockwise. */
export function IAgain({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M15.5 5.2A7.5 7.5 0 1 0 19.5 12" />
      <path d="M15.5 5.2 15 1.8M15.5 5.2l-3.3.9" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

/** Back: an open arc returning to the crate. */
export function IBack({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M15 5a7 7 0 1 0 0 14" />
      <path d="M10 12h10" />
    </svg>
  );
}

/** Crate: record spines on edge. */
export function ICrate({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6 4v16M10 4v16M14 6v14" />
      <circle cx="19" cy="15" r="3" />
    </svg>
  );
}

/** Next: a small arrow made of a stroke and the spindle dot. */
export function IGo({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 12h12" />
      <path d="m12 7 5 5-5 5" />
      <circle cx="20.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Close: two strokes crossing the spindle. */
export function IClose({ size, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
