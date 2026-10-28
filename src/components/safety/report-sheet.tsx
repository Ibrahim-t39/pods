// ReportSheet (wireframes S08, S09). One sheet for every entry point: a message, a person, a pod, the check-in.
//   <ReportSheet open onOpenChange target={{ kind: "member", userId, userName, podId? }} />
//   <ReportSheet … target={{ kind: "message", messageId, userId, podId, userName, preview? }} />
//   <ReportSheet … target={{ kind: "pod", podId, podName }} />
// "What happened?" with four ring rows whose words equal the admin queue (REPORT_REASONS), then Send. Then
// "Sent." / "We'll follow up." with "Block Malik too" and Done. No response-time promise (library H #10).
// The reporter is never named to anyone. Unsafe and Harassment pause the reported person's chat (lib/safety).
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, ResponsiveSheet, notify } from "@/components/ui";
import { useDb, useRepo } from "@/lib/db/hooks";
import { isBlockedByMe } from "@/lib/safety/selectors";
import type { Report, ReportReason } from "@/lib/types";
import { ChoiceRow, GoLink, Rows, SheetFoot, SheetLine } from "@/components/profile/kit";
import { Icon } from "@/components/icons";
import { POP } from "@/components/brand/motion";

export type ReportTarget =
  | { kind: "message"; messageId: string; userId: string | null; podId: string; userName: string; preview?: string }
  | { kind: "member"; userId: string; userName: string; podId?: string }
  | { kind: "pod"; podId: string; podName: string };

export interface ReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget;
  /** Called once the report is saved (e.g. the chat hides the message for the reporter). */
  onReported?: (report: Report) => void;
}

/**
 * The member's words, one to one with the admin queue (V3_SPEC §6.5, designer R2 #3). "Didn't show" has no reason
 * of its own in the data model yet, so it travels as `other` with the tag below; admin reads the tag back with
 * `reportLabel()`. A `no_show` reason is filed with integration.
 */
export const REPORT_REASONS: { key: string; label: string; reason: ReportReason; tag?: string }[] = [
  { key: "unsafe", label: "Felt unsafe", reason: "unsafe" },
  { key: "harassment", label: "Harassment", reason: "harassment" },
  { key: "no_show", label: "Didn’t show", reason: "other", tag: "[Didn't show]" },
  { key: "other", label: "Something else", reason: "other" },
];

/** The label admin shows for a stored report: the same words the member picked. */
export function reportLabel(r: { reason: ReportReason; details?: string | null }) {
  if (r.reason === "other" && r.details?.startsWith("[Didn't show]")) return "Didn’t show";
  return REPORT_REASONS.find((x) => x.reason === r.reason)?.label ?? "Something else";
}

export function ReportSheet({ open, onOpenChange, target, onReported }: ReportSheetProps) {
  const repo = useRepo();
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const userId = target.kind === "pod" ? null : target.userId;
  const name = target.kind === "pod" ? null : target.userName;
  const blocked = useDb((db) => (userId ? isBlockedByMe(db, userId) : false));

  useEffect(() => {
    if (!open) return;
    setPick(null);
    setNote("");
    setBusy(false);
    setError(null);
    setDone(false);
  }, [open]);

  const chosen = REPORT_REASONS.find((r) => r.key === pick);

  async function send() {
    if (!chosen || busy) return;
    setBusy(true);
    setError(null);
    const details = [chosen.tag, note.trim()].filter(Boolean).join(" ") || undefined;
    const r = await repo.report({
      reason: chosen.reason,
      details,
      reportedUserId: userId ?? undefined,
      podId: target.podId,
      messageId: target.kind === "message" ? target.messageId : undefined,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.code === "OFFLINE" ? "Offline. Not sent yet." : (r.error.message ?? "Not sent. Try again."));
      return;
    }
    setDone(true);
    onReported?.(r.data);
  }

  async function blockToo() {
    if (!userId || !name) return;
    const r = await repo.block(userId);
    onOpenChange(false);
    if (r.ok) notify(`${name} blocked`, { undo: () => void repo.unblock(userId) });
    else notify.error("Not blocked. Try again.");
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={done ? "Sent." : "What happened?"}
      dismissible={!busy}
      footer={
        done ? (
          <SheetFoot left={userId && name && !blocked ? <GoLink onClick={blockToo}>Block {name} too</GoLink> : undefined} right={<Button onClick={() => onOpenChange(false)}>Done</Button>} />
        ) : (
          <SheetFoot
            left={error ? <span role="alert" className="text-label font-medium text-ink">{error}</span> : undefined}
            right={
              <Button disabled={!chosen} loading={busy} onClick={send}>
                Send
              </Button>
            }
          />
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-s4">
              <motion.span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-full bg-success-soft text-success-text"
                initial={POP.initial}
                animate={POP.animate}
                transition={POP.transition}
              >
                <Icon name="check" size={24} />
              </motion.span>
              <SheetLine>We’ll follow up.</SheetLine>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={false} exit={{ opacity: 0, y: -8 }}>
            <Rows radio label="What happened?">
              {REPORT_REASONS.map((r) => (
                <ChoiceRow key={r.key} radio safe on={pick === r.key} label={r.label} onToggle={() => setPick(r.key)} />
              ))}
            </Rows>
            <AnimatePresence initial={false}>
              {pick === "other" && (
                <motion.label key="note" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="block overflow-hidden">
                  <span className="sr-only">In a few words</span>
                  <input
                    value={note}
                    maxLength={200}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="In a few words"
                    className="mt-s4 h-14 w-full rounded-[28px] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] px-gutter text-[16px] text-ink outline-offset-2 placeholder:text-ink-2"
                  />
                </motion.label>
              )}
              {pick === "unsafe" && (
                <motion.a
                  key="911"
                  href="tel:911"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-s4 inline-flex min-h-11 items-center text-[16px] font-semibold text-danger-text underline decoration-[1.5px] underline-offset-[5px]"
                >
                  In danger now? Call 911
                </motion.a>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveSheet>
  );
}
