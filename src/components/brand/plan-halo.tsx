// <PlanHalo state="waiting">: the planned hangout card wears the logo's three hues as a ring (MOTION_SYSTEM §5.4).
// Video beat 4: "the AI hangout card is at the top with an animated highlight ring". A bright arc runs one lap on arrival over a quiet three-hue ring, then keeps travelling
// slowly (9 s a lap) while the plan waits on "I'm in"; locked = the ring stops in the commit blue. CSS in styles/motion.css.
// Wrap the card (not the page). `radius` must match the card's border radius so the ring sits 4 px outside it.
// One per screen: it is that screen's hero motion.
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PlanHaloProps {
  /** waiting: plan open for "I'm in"; locked: settled blue, still; off: no ring */
  state?: "waiting" | "locked" | "off";
  /** the wrapped card's border radius in px */
  radius?: number;
  className?: string;
  children: ReactNode;
}

export function PlanHalo({ state = "waiting", radius = 24, className, children }: PlanHaloProps) {
  return (
    <div className={cn("pods-halo", className)} data-state={state} style={{ ["--halo-r" as string]: `${radius}px` }}>
      {children}
      <span aria-hidden className="pods-halo__ring" />
      <span aria-hidden className="pods-halo__comet" />
    </div>
  );
}
