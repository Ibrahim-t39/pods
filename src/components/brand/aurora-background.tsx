// DEPRECATED: kept so older screens stay legible. It paints the MOMENT field (the centre: three circles converging, COLOR_LIFE §7).
// New code uses <Stage light="night" /> or the bg-moment utility.
import { cn } from "@/lib/cn";

export interface AuroraBackgroundProps {
  className?: string;
  intensity?: number;
  animated?: boolean;
  grain?: boolean;
  vignette?: boolean;
  ink?: boolean;
}

export function AuroraBackground({ className, ink = true }: AuroraBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundColor: ink ? "var(--night)" : undefined,
        backgroundImage: "var(--moment)",
      }}
    />
  );
}
