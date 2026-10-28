// ReportSheet (wireframes S08, S09). One sheet for every entry point: a message, a person, a pod, the check-in.
//   <ReportSheet open onOpenChange target={{ kind: "member", userId, userName, podId? }} />
//   <ReportSheet … target={{ kind: "message", messageId, userId, podId, userName, preview? }} />
//   <ReportSheet … target={{ kind: "pod", podId, podName }} />
// From a pod (the menu's "Report someone") the first step is "Who is it?": the pod's members as ring rows, with
// "Block {name}" beside Next (block first, reason second; wireframe S08). Then "What happened?" with four ring rows
// whose words equal the admin queue (REPORT_REASONS), then Send. Then "Sent." / "{name} isn't told. We'll follow up."
// with "Block {name} too" and Done. No response-time promise (library H #10).
// The reporter is never named to anyone. Unsafe and Harassment pause the reported person's chat (lib/safety).
"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, ResponsiveSheet, notify } from "@/components/ui";
import { useDb, useRepo } from "@/lib/db/hooks";
import { isBlockedByMe } from "@/lib/safety/selectors";
import type { Report, ReportReason } from "@/lib/types";
import { ChoiceRow, GoLink, Rows, SheetFoot, SheetLine } from "@/components/profile/kit";
import { Icon } from "@/components/icons";
import { POP } from "@/components/brand/motion";
import { Disc } from "@/components/brand/disc";
import { podMembers } from "@/lib/db/selectors";
import { displayName } from "@/lib/utils";

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
  const fromPod = target.kind === "pod";
  // a pod report starts by choosing the person (never yourself); a person or message report already knows who
  const people = useDb((db) =>
    fromPod
      ? podMembers(db, target.podId)
          .filter((m) => m.user_id !== db.me && db.users[m.user_id])
          .map((m) => ({ id: m.user_id, name: displayName(db.users[m.user_id]) }))
      : [],
  );
  const [who, setWho] = useState<string | null>(null);
  const [step, setStep] = useState<"who" | "what" | "block">(fromPod ? "who" : "what");
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const picked = useMemo(() => people.find((p) => p.id === who) ?? null, [people, who]);
  const userId = target.kind === "pod" ? (picked?.id ?? null) : target.userId;
  const name = target.kind === "pod" ? (picked?.name ?? null) : target.userName;
  const blocked = useDb((db) => (userId ? isBlockedByMe(db, userId) : false));

  useEffect(() => {
    if (!open) return;
    setWho(null);
    setStep(fromPod ? "who" : "what");
    setPick(null);
    setNote("");
    setBusy(false);
    setError(null);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setBusy(true);
    const r = await repo.block(userId);
    setBusy(false);
    onOpenChange(false);
    if (r.ok) notify(`${name} blocked`, { undo: () => void repo.unblock(userId) });
    else notify.error("Not blocked. Try again.");
  }

  const title = done ? "Sent." : step === "who" ? "Who is it?" : step === "block" ? `Block ${name}?` : name ? `Report ${name}` : "What happened?";
  const sendFoot = (
    <SheetFoot
      left={
        error ? (
          <span role="alert" className="text-label font-medium text-ink">{error}</span>
        ) : fromPod ? (
          <GoLink onClick={() => setStep("who")}>Back</GoLink>
        ) : undefined
      }
      right={
        <Button disabled={!chosen} loading={busy} onClick={send}>
          Send
        </Button>
      }
    />
  );
  const footer = done ? (
    <SheetFoot left={userId && name && !blocked ? <GoLink onClick={blockToo}>Block {name} too</GoLink> : undefined} right={<Button onClick={() => onOpenChange(false)}>Done</Button>} />
  ) : step === "who" ? (
    <SheetFoot
      left={picked && !blocked ? <GoLink onClick={() => setStep("block")}>Block {picked.name}</GoLink> : undefined}
      right={
        <Button disabled={!picked} onClick={() => setStep("what")}>
          Next
        </Button>
      }
    />
  ) : step === "block" ? (
    <SheetFoot
      left={<GoLink onClick={() => setStep("who")}>Cancel</GoLink>}
      right={
        <Button loading={busy} onClick={blockToo}>
          Block
        </Button>
      }
    />
  ) : (
    sendFoot
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      dismissible={!busy}
      footer={footer}
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
              <SheetLine>{name ? <><span data-nc>{name}</span> isn’t told. We’ll follow up.</> : "We’ll follow up."}</SheetLine>
            </div>
          </motion.div>
        ) : step === "who" ? (
          <motion.div key="who" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SheetLine className="-mt-s3 mb-s4">Private. They aren’t told.</SheetLine>
            <Rows radio label="Who is it?">
              {people.map((p) => (
                <ChoiceRow
                  key={p.id}
                  radio
                  safe
                  on={who === p.id}
                  onToggle={() => setWho(p.id)}
                  label={
                    <span className="flex items-center gap-s3" data-nc>
                      <Disc tone="grove" seed={p.id} initial={p.name.slice(0, 1)} size={32} />
                      {p.name}
                    </span>
                  }
                />
              ))}
            </Rows>
          </motion.div>
        ) : step === "block" ? (
          <motion.div key="block" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SheetLine>You stop seeing each other. <span data-nc>{name}</span> isn’t told.</SheetLine>
          </motion.div>
        ) : (
          <motion.div key="form" initial={fromPod ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {name && <SheetLine className="-mt-s3 mb-s4">What happened? Only our team sees this.</SheetLine>}
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
