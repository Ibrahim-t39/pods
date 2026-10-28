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
  /** Back: a dot leaving the ring to the left (step out of the room you are in). */
  back: '<path d="M10 5.2A7 7 0 1 1 10 18.8"/><circle cx="4.6" cy="12" r="1.9" fill="currentColor" stroke="none"/>',
  /** Close: two soft arcs (kept near-universal on purpose). */
  close: '<path d="M6.5 6.5c4 3.2 7.8 7 11 11"/><path d="M17.5 6.5c-3.2 4-7 7.8-11 11"/>',
  /** Menu: the logo laid flat, three small overlapping circles. */
  more: '<circle cx="7" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="17" cy="12" r="3"/>',
  /** Talk: two overlapping circles; the overlap is the conversation. */
  talk: '<circle cx="9" cy="11" r="5.4"/><circle cx="15" cy="13" r="5.4"/>',
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
  /** Go: a line arriving at a dot (used after a text link). */
  arrow: '<circle cx="18" cy="12" r="1.8" fill="currentColor" stroke="none"/><path d="M4 12h10"/>',
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
