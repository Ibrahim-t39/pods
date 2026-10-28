// <CirclesLoader />: loading drawn as the logo, not a spinner or grey bars (COLOR_LIFE §12.6). Three circles breathe
// toward each other and apart (finding the fit) with a light sheen passing over them. The only looping motion in Pods
// besides the Doorway's scroll cue, and only while something is loading. Reduced motion: still, the logo at rest.
// <CirclesLoader label="Finding your pods" size={96} />. The label is for screen readers (role=status).
import { cn } from "@/lib/cn";

export function CirclesLoader({ size = 64, label = "Loading", className }: { size?: number; label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("pods-circles-loader", className)} style={{ width: size, height: size }}>
      <i data-c="ember" />
      <i data-c="signal" />
      <i data-c="grove" />
    </span>
  );
}

/** Skeleton row drawn as people: three soft discs and a line, shimmering. For lists that are loading. */
export function CirclesSkeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex items-center gap-s3", className)}>
      <span className="flex -space-x-2">
        <span className="skeleton size-8 rounded-full!" />
        <span className="skeleton size-8 rounded-full!" />
        <span className="skeleton size-8 rounded-full!" />
      </span>
      <span className="skeleton h-3 w-32" />
    </span>
  );
}
