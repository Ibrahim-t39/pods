// First-run progress: four dots plus "1 of 4" beside the primary (founder R2: one progress, never a bar; PB 2.7).
import { cn } from "@/lib/cn";

export function ProgressDots({ step, total, className }: { step: number; total: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-label text-ink-2", className)} aria-label={`Step ${step} of ${total}`}>
      <span className="inline-flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <i
            key={i}
            className="block size-2 rounded-full"
            style={i < step ? { background: "var(--ink)" } : { boxShadow: "inset 0 0 0 1.5px var(--ink-2)" }}
          />
        ))}
      </span>
      <span aria-hidden>
        {step} of {total}
      </span>
    </span>
  );
}
