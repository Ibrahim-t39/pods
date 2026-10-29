// The Pods icon set (DESIGN.md §6). 24 grid, 1.75 round stroke, built only from circles, arcs, dots and the seat notch
// (PB 6.1-6.3; IL 40, 24, 11). Paths are the approved wireframe kit's (PODS/v3/wireframes/src/kit.mjs `P`), so the
// app and the Visual Direction PDF draw the same glyphs. No lucide in new code: check-tokens fails it.
//
//   <Icon name="room" />            decorative (aria-hidden)
//   <Icon name="close" label="Close" />   only when the glyph is the whole control's name (prefer aria-label on the button)
import type { SVGProps } from "react";

export const ICON_PATHS = {
  /** Your pods: three overlapping rings (the logo, drawn). */
  room: '<circle cx="12" cy="8.6" r="4.6"/><circle cx="8.4" cy="14.6" r="4.6"/><circle cx="15.6" cy="14.6" r="4.6"/>',
  /** A seat: a ring with a notch where one more person fits. */
  seat: '<path d="M14.6 19.2A7.6 7.6 0 1 1 19.3 14.6"/><circle cx="18.2" cy="18.2" r="1.6" fill="currentColor" stroke="none"/>',
  /** Back: a plain chevron (the ring-and-dot version read as a loading spinner). */
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  /** Close: two soft arcs (kept near-universal on purpose). */
  close: '<path d="M6.5 6.5c4 3.2 7.8 7 11 11"/><path d="M17.5 6.5c-3.2 4-7 7.8-11 11"/>',
  /** Menu: the logo laid flat, three small overlapping circles. */
  more: '<circle cx="7" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="17" cy="12" r="3"/>',
  /** Talk: two overlapping circles; the overlap is the conversation. */
  talk: '<circle cx="9" cy="11" r="5.4"/><circle cx="15" cy="13" r="5.4"/>',
  /** Time (plan sheet): a plain clock face, so a time never reads as a loading spinner. */
  clockFace: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  /** Rain backup (plan sheet): a soft cloud built from arcs. */
  cloud: '<path d="M7.5 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17.6 9.6 4.2 4.2 0 0 1 17 18Z"/>',
  /** Time: no clock hands; a dot riding the rim. */
  clock: '<circle cx="12" cy="12" r="7.5" stroke-opacity=".45"/><path d="M12 4.5a7.5 7.5 0 0 1 6.5 3.75"/><circle cx="18.5" cy="8.25" r="1.7" fill="currentColor" stroke="none"/>',
  /** Place: a table (ring) with your seat dot pulled up to it, not a map pin. */
  place: '<circle cx="12" cy="10" r="6"/><circle cx="12" cy="19.6" r="1.9" fill="currentColor" stroke="none"/>',
  /** Help: a ring held by a second ring. */
  help: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.2"/><path d="M6.7 6.7l3 3M17.3 6.7l-3 3M6.7 17.3l3-3M17.3 17.3l-3-3"/>',
  /** Texts: one bubble made of a circle, three seat dots inside. */
  bell: '<circle cx="12" cy="12" r="7.5"/><circle cx="8.8" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="15.2" cy="12" r=".9" fill="currentColor"/>',
  /** Block / leave: two discs pushed apart by a line. */
  block: '<circle cx="6.5" cy="12" r="3.6"/><circle cx="17.5" cy="12" r="3.6"/><path d="M12 5v14"/>',
  /** Undo / can't make it: the ring runs backwards to its starting dot. */
  undo: '<path d="M7 17.4A7.5 7.5 0 1 0 5.1 9"/><circle cx="5.1" cy="9" r="1.8" fill="currentColor" stroke="none"/>',
  /** Send: a dot leaving your circle toward the table. */
  send: '<circle cx="9" cy="12" r="5.5"/><circle cx="19" cy="12" r="2" fill="currentColor" stroke="none"/>',
  /** List: the same pods, laid out as rows. */
  list: '<circle cx="6" cy="7" r="2.2"/><circle cx="6" cy="17" r="2.2"/><path d="M11 7h8M11 17h8"/>',
  /** Sky: a disc over the horizon arc. */
  sky: '<circle cx="12" cy="10" r="3.4"/><path d="M4 17.5a8 8 0 0 1 16 0"/>',
  /** Rain: the canopy arc with three drops. */
  rain: '<path d="M4.5 12a7.5 7.5 0 0 1 15 0"/><circle cx="8" cy="16.5" r=".9" fill="currentColor"/><circle cx="12" cy="19" r=".9" fill="currentColor"/><circle cx="16" cy="16.5" r=".9" fill="currentColor"/>',
  /** Why: a half-lit disc (the reasoning, half shown). */
  why: '<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none"/>',
  /** Report: a ring with a mark. */
  flag: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4.5"/><circle cx="12" cy="15.6" r=".9" fill="currentColor"/>',
  /** Here: you arrived, rings ripple from your dot. */
  here: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="8.4" stroke-opacity=".45"/>',
  /** Chosen: a ring with a filled centre (never a tick). */
  check: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  /** Turn / try again: a ring with its leading dot. */
  turn: '<path d="M19.4 12A7.4 7.4 0 1 1 15.6 5.5"/><circle cx="15.6" cy="5.5" r="1.6" fill="currentColor" stroke="none"/>',
  /** Offline. */
  off: '<path d="M4.5 9a10.5 10.5 0 0 1 15 0"/><path d="M7.5 12.5a6 6 0 0 1 9 0"/><circle cx="12" cy="16.5" r="1.3" fill="currentColor"/><path d="M4 4l16 16"/>',
  /** Go: a chevron (rows that open something, text links). Founder review: the old line-and-dot read as a dash. Rotate 90 for a dropdown. */
  arrow: '<path d="M9.5 6.5 15 12l-5.5 5.5"/>',
  /** Add: a ring with a centre cross made of two short strokes. */
  add: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8.6v6.8M8.6 12h6.8"/>',
  /** Calendar: a ring sitting on a line (a day on the week). */
  day: '<path d="M4 18.5h16"/><circle cx="12" cy="10.5" r="5.5"/><circle cx="12" cy="10.5" r="1.4" fill="currentColor" stroke="none"/>',
  /** Edit: a dot travelling along a short arc. */
  edit: '<path d="M5 18.5c3.5-1 9.5-7 13-12"/><circle cx="18.6" cy="5.8" r="1.8" fill="currentColor" stroke="none"/>',
  /** Lock moment / locked: four small discs closing into one ring. */
  locked: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="4.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="19.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  /** Again: two circles re-overlapping with an arc (run it back). */
  again: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5" stroke-dasharray="2.4 2.4"/>',
  /** Delete: a bin, lid and two strokes. */
  trash: '<path d="M4.5 7h15"/><path d="M9.5 7V5.2h5V7"/><path d="M6.5 7l.9 11.6a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/><path d="M10.2 11v5M13.8 11v5"/>',
  /** Leave: a door frame with the way out. */
  exit: '<path d="M13.5 4.5H7a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 7 19.5h6.5"/><path d="M11 12h9"/><path d="M16.8 8.5 20.3 12l-3.5 3.5"/>',
  /** Blocked: a ring with a slash. */
  blocked: '<circle cx="12" cy="12" r="7.5"/><path d="M6.7 17.3 17.3 6.7"/>',
  /** Privacy: a shield. */
  shield: '<path d="M12 3.8 5.5 6.3v5.2c0 4 2.8 7.4 6.5 8.7 3.7-1.3 6.5-4.7 6.5-8.7V6.3z"/>',
  /** Write to us: an envelope. */
  mail: '<rect x="3.8" y="6" width="16.4" height="12" rx="2"/><path d="m4.5 7.2 7.5 5.6 7.5-5.6"/>',
  /** Tick: a picked chip (selected interests). */
  tick: '<path d="M5.5 12.5l4.2 4.2 8.8-9.4"/>',
  /** Person: one flat disc on a shoulder arc. */
  person: '<circle cx="12" cy="9" r="3.6"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children" | "name" | "stroke"> {
  name: IconName;
  /** px, default 24 */
  size?: number;
  /** stroke width, default 1.75 (matches the 14-16px label weight next to it) */
  stroke?: number;
  /** accessible name; omit for decorative (the default) */
  label?: string;
}

export function Icon({ name, size = 24, stroke = 1.75, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      {...rest}
    />
  );
}
