// Community pod names are masked in every admin view (K D4, D10; library I #3). Showing one takes a reason and is
// logged. The Repo has no reveal audit action yet, so reveals are logged for this browser session and merged into
// the report's history line.
"use client";

import { useState, useSyncExternalStore } from "react";
import type { DbState, Pod } from "@/lib/types";
import { Button, ResponsiveSheet } from "@/components/ui";

export interface RevealEntry { podId: string; reason: string; at: string }
let revealed: Record<string, RevealEntry> = {};
let log: RevealEntry[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function revealPod(podId: string, reason: string, at: string) {
  const e = { podId, reason, at };
  revealed = { ...revealed, [podId]: e };
  log = [e, ...log];
  emit();
}
export function hidePod(podId: string) {
  const { [podId]: _x, ...rest } = revealed;
  revealed = rest;
  emit();
}
export const useRevealed = () => useSyncExternalStore(subscribe, () => revealed, () => revealed);
export const useRevealLog = () => useSyncExternalStore(subscribe, () => log, () => log);

/** "Community 12": a stable number from the pod's position among all pods. */
export function maskedName(db: Pick<DbState, "pods">, pod: Pod): string {
  const ids = Object.keys(db.pods).sort();
  return `Community ${ids.indexOf(pod.id) + 1}`;
}

/** The name an admin sees: interest pods plainly, community pods masked until revealed. */
export function usePodLabel(db: Pick<DbState, "pods">) {
  const rev = useRevealed();
  return (pod: Pod | undefined) => (!pod ? "No pod" : pod.type === "interest" || rev[pod.id] ? pod.name : maskedName(db, pod));
}

/** The reveal sheet: one reason, one action. */
export function RevealSheet({ pod, open, onOpenChange, nowISO }: { pod: Pod | null; open: boolean; onOpenChange: (o: boolean) => void; nowISO: string }) {
  const [reason, setReason] = useState("");
  const ok = reason.trim().length >= 5;
  return (
    <ResponsiveSheet
      open={open && !!pod}
      onOpenChange={onOpenChange}
      title="Show this name?"
      description="It can point to faith or heritage. Logged."
      footer={
        <Button
          size="lg"
          block
          disabled={!ok}
          onClick={() => {
            if (!pod || !ok) return;
            revealPod(pod.id, reason.trim(), nowISO);
            setReason("");
            onOpenChange(false);
          }}
        >
          Show and log
        </Button>
      }
    >
      <label className="block">
        <span className="sr-only">Reason</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why"
          className="h-14 w-full rounded-[28px] bg-sunken px-s6 text-[17px] text-ink outline-none transition-shadow placeholder:text-ink-2 focus-visible:shadow-[inset_0_0_0_1.5px_var(--select)]"
        />
      </label>
    </ResponsiveSheet>
  );
}
