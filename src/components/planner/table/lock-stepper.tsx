// planner_loop · <LockStepper>: "Locks at 4" + the AI's one-line reason + a small − / + the pod can nudge.
// Bounds: 2 to pod size, never below who's already in (lockBounds). A change saves on the plan, re-checks the lock
// (already met → it locks) and leaves one quiet line in chat ("Ama changed it to lock at 5").
"use client";

import { useState } from "react";
import { notify } from "@/components/ui/toast";
import { useRepo } from "@/lib/db/hooks";
import { lockBounds } from "@/lib/planner/lock";

export function LockStepper({
  suggestionId,
  at,
  size,
  going,
  reason,
  seats,
  onLocked,
}: {
  suggestionId: string;
  at: number;
  size: number;
  going: number;
  reason?: string;
  seats?: number;
  onLocked?: () => void;
}) {
  const repo = useRepo();
  const [busy, setBusy] = useState(false);
  const b = lockBounds(size, going, seats);
  const set = async (n: number) => {
    if (busy || n < b.min || n > b.max || n === at) return;
    setBusy(true);
    const r = await repo.setLockMin(suggestionId, n);
    setBusy(false);
    if (!r.ok) {
      notify("Couldn't change that. Try again.");
      return;
    }
    if (r.data.locked) onLocked?.();
  };
  return (
    <div className="pd-lock" aria-live="polite">
      <div className="pd-lock-text">
        <span className="pd-fact-k">
          Locks at <span className="tabular">{at}</span>
          {seats ? <span className="pd-lock-seats"> · {seats} seats</span> : null}
        </span>
        {reason ? <span className="pd-fact-s">{reason}</span> : null}
      </div>
      <div className="pd-lock-step" role="group" aria-label="When it locks">
        <button
          type="button"
          className="pd-lock-btn"
          aria-label={`Lock at ${at - 1}`}
          disabled={busy || at - 1 < b.min}
          onClick={() => void set(at - 1)}
        >
          −
        </button>
        <span className="pd-lock-n tabular" aria-hidden>
          {at}
        </span>
        <button
          type="button"
          className="pd-lock-btn"
          aria-label={`Lock at ${at + 1}`}
          disabled={busy || at + 1 > b.max}
          onClick={() => void set(at + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
