// [U1] Skeleton (M19): shapes that match the final layout, shimmer 1.4s linear, static under reduced motion.
// Never a lone spinner for content. Presets: line, avatar, card (pod card), bubble.
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, style, circle }: { className?: string; style?: CSSProperties; circle?: boolean }) {
  return <span aria-hidden className={cn("skeleton block", circle && "rounded-full", className)} style={style} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: i === lines - 1 ? "62%" : `${92 - i * 6}%` }} />
      ))}
    </span>
  );
}

/** Matches PodCard: cover 56 squircle + 2 lines + status chip. */
export function SkeletonPodCard({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3.5 rounded-card border border-border bg-surface p-4 shadow-xs", className)}>
      <Skeleton className="size-14 rounded-icon" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-1 h-5 w-24 rounded-pill" />
      </div>
    </div>
  );
}

/** Matches a chat run: avatar + two bubbles. */
export function SkeletonBubbles({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end gap-2">
        <Skeleton circle className="size-7" />
        <Skeleton className="h-10 w-3/5 rounded-[20px]" />
      </div>
      <Skeleton className="ml-auto h-10 w-1/2 rounded-[20px]" />
      <div className="flex items-end gap-2">
        <Skeleton circle className="size-7" />
        <Skeleton className="h-16 w-2/3 rounded-[20px]" />
      </div>
    </div>
  );
}

/** Status text for screen readers while skeletons show. */
export function LoadingStatus({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}
