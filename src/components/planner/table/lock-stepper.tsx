// planner_loop · <LockStepper>: "Locks at 4" + the AI's one-line reason, read-only. "Change" opens a small − / + the
// pod can nudge, with one line saying it changes for everyone. Bounds: 2 to pod size (3 on a pod's hangout #1), never
// below who's already in (lockBounds). A change saves on the plan, re-checks the lock
// (already met → it locks) and leaves one quiet line in chat ("Ama changed it to lock at 5").
"use client";

import { useId, useState } from "react";
import { notify } from "@/components/ui/toast";
import { useDb, useRepo } from "@/lib/db/hooks";
import { isFirstHangout, lockBounds } from "@/lib/planner/lock";

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
  const [open, setOpen] = useState(false);
  const noteId = useId();
  // the pod's hangout #1 never locks below 3
  const first = useDb((db) => {
    const podId = db.suggestions[suggestionId]?.pod_id;
    return !!podId && isFirstHangout(db, podId);
  });
  const b = lockBounds(size, going, seats, first);
  const fixed = b.min >= b.max;
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
  const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
  return (
    <div className="pd-lock" data-open={open || undefined} aria-live="polite">
      <div className="pd-lock-text">
        <span className="pd-fact-k">
          Locks at <span className="tabular">{at}</span>
          {seats ? <span className="pd-lock-seats"> · {seats} seats</span> : null}
        </span>
        {open ? (
          <span id={noteId} className="pd-fact-s">
            Changes it for the whole pod
          </span>
        ) : reason ? (
          <span className="pd-fact-s">{reason}</span>
        ) : null}
      </div>
      {open ? (
        <div className="pd-lock-edit">
          <div className="pd-lock-step" role="group" aria-label="When it locks" aria-describedby={noteId}>
            <button
              type="button"
              className="pd-lock-btn"
              aria-label={`Lock at ${people(at - 1)} instead`}
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
              aria-label={`Lock at ${people(at + 1)} instead`}
              disabled={busy || at + 1 > b.max}
              onClick={() => void set(at + 1)}
            >
              +
            </button>
          </div>
          <button type="button" className="pd-lock-link" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      ) : fixed ? null : (
        <button type="button" className="pd-lock-link" aria-label={`Change when it locks, now ${people(at)}`} onClick={() => setOpen(true)}>
          Change
        </button>
      )}
    </div>
  );
}
