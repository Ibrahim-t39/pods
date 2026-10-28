// Navigation glyphs (MOTION_SYSTEM §12). Drawn in the logo's language: every glyph is circles and dots, the dot is a
// person (BRAND §1). 24px grid, 1.75 stroke, currentColor. `on` = the active state (filled body, white dot).
//   home     a ring with a person at its centre: where you are now
//   pods     the three overlapping circles of the mark
//   plans    the lock ring: four arcs, one filled (a seat taken)
//   inbox    a circle with a dot arriving at its rim
//   discover a dashed ring with a dot: an open seat
//   people   two overlapping circles, a person in each
//   search   a ring and a short line
// Custom set only (gates: check-tokens).
import type { SVGProps } from "react";
import type { DestinationId } from "@/lib/platform/nav";

type P = SVGProps<SVGSVGElement> & { on?: boolean; size?: number };

function Svg({ size = 24, children, ...rest }: Omit<P, "on">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

const DOT = "var(--glyph-dot, var(--lit))";

export function HomeGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" fill={on ? "currentColor" : "none"} />
      <circle cx="12" cy="12" r="2.6" fill={on ? DOT : "currentColor"} stroke="none" />
    </Svg>
  );
}

export function PodsNavGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="5" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.9 : 0} />
      <circle cx="8" cy="15" r="5" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.55 : 0} />
      <circle cx="16" cy="15" r="5" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.35 : 0} />
    </Svg>
  );
}

export function PlansGlyph({ on, ...p }: P) {
  // four arcs of r=8 with small gaps; the top-right arc is the seat that's taken
  return (
    <Svg {...p}>
      <path d="M13.4 4.1a8 8 0 0 1 6.5 6.5" strokeWidth={on ? 3 : 2.4} />
      <path d="M19.9 13.4a8 8 0 0 1-6.5 6.5" />
      <path d="M10.6 19.9a8 8 0 0 1-6.5-6.5" />
      <path d="M4.1 10.6a8 8 0 0 1 6.5-6.5" />
      {on && <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />}
    </Svg>
  );
}

export function InboxGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="13" r="7.25" fill={on ? "currentColor" : "none"} />
      <circle cx="18" cy="6" r="2.9" fill="currentColor" stroke={on ? DOT : "none"} strokeWidth={1.5} />
    </Svg>
  );
}

export function DiscoverGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" strokeDasharray="3 2.6" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.15 : 0} />
      <path d="M12 8.6v6.8M8.6 12h6.8" />
    </Svg>
  );
}

export function PeopleGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="12" r="6" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.85 : 0} />
      <circle cx="15" cy="12" r="6" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.45 : 0} />
      <circle cx="8" cy="12" r="1.6" fill={on ? DOT : "currentColor"} stroke="none" />
      <circle cx="16" cy="12" r="1.6" fill={on ? DOT : "currentColor"} stroke="none" />
    </Svg>
  );
}

export function SearchGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <circle cx="10.5" cy="10.5" r="6.25" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.15 : 0} />
      <path d="M15.2 15.2 20 20" />
    </Svg>
  );
}

export function HelpGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.15 : 0} />
      <path d="M12 7.5v6" />
      <circle cx="12" cy="16.6" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function SettingsGlyph({ on, ...p }: P) {
  return (
    <Svg {...p}>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2.25" fill={on ? "currentColor" : "none"} />
      <circle cx="9" cy="16" r="2.25" fill={on ? "currentColor" : "none"} />
    </Svg>
  );
}

export const NAV_GLYPH: Record<DestinationId, (p: P) => React.ReactElement> = {
  home: HomeGlyph,
  pods: PodsNavGlyph,
  plans: PlansGlyph,
  inbox: InboxGlyph,
  you: HomeGlyph,
  discover: DiscoverGlyph,
  people: PeopleGlyph,
  search: SearchGlyph,
  safety: HelpGlyph,
  settings: SettingsGlyph,
};
