// Delete my seat (wireframe Y03, Apple 5.1.1(v)): a peek sheet, consequence in one line, Keep or Delete. The final
// delete is the one place a member sees red, as text only (`danger-quiet`, COLOR_LIFE §7 and §10).
// After it: AccountDeleted, a flow step with one line and the way back to the start.
// Before the repo's deleteAccount runs, this clears what the platform added (PLATFORM_SPEC §O profile_safety #4):
// the trusted contact, your memories (photo and caption) and your open pod requests. Invites have no repo remove yet
// (filed with integration); they hold no personal data beyond the inviter id.
"use client";

import { wipeLocalPersonal } from "@/lib/safety/sign-out";
import { useEffect, useState } from "react";
import { Button, ResponsiveSheet, notify } from "@/components/ui";
import { useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { Line } from "@/components/brand/line";
import { Stage } from "@/components/brand/stage";
import { TableRing } from "@/components/brand/table-ring";
import { Chrome } from "@/components/shell/chrome";
import { Page } from "@/components/shell/page";
import { GoLink, SheetFoot, SheetLine } from "@/components/profile/kit";

export function DeleteAccountFlow({ open, onOpenChange, onDeleted, onBefore }: { open: boolean; onOpenChange: (o: boolean) => void; onDeleted: () => void; onBefore?: () => void }) {
  const repo = useRepo();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setBusy(false);
  }, [open]);

  async function go() {
    setBusy(true);
    const db = useStore.getState().db;
    const me = db.me;
    if (me) {
      await repo.setTrustedContact(null);
      for (const m of Object.values(db.memories ?? {})) if (m.user_id === me && !m.removed_at) await repo.removeMemory(m.id);
      for (const q of db.podRequests ?? []) if (q.user_id === me && (q.status === "pending" || q.status === "waitlisted")) await repo.cancelPodRequest(q.id);
    }
    onBefore?.();
    const r = await repo.deleteAccount();
    setBusy(false);
    if (!r.ok) {
      notify.error("Not deleted. Try again.", { retry: go });
      return;
    }
    wipeLocalPersonal();
    onOpenChange(false);
    onDeleted();
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Delete your account?"
      dismissible={!busy}
      footer={
        <SheetFoot
          left={<GoLink onClick={() => onOpenChange(false)}>Keep</GoLink>}
          right={
            <Button variant="danger-quiet" loading={busy} onClick={go}>
              Delete
            </Button>
          }
        />
      }
    >
      <SheetLine>Your name, number, interests and free times are removed for good. Messages you sent stay in your pods.</SheetLine>
    </ResponsiveSheet>
  );
}

/** Shown after deletion (the repo has signed the person out). The table is empty: your seat is gone too. */
export function AccountDeleted() {
  return (
    <>
      <Stage light="dusk" />
      <Page
        chrome={<Chrome left="none" />}
        head={<Line size="lg">Your account is deleted.</Line>}
        object={<TableRing size={200} seats={[{ open: true }, { open: true }, { open: true }, { open: true }]} names={false} youWaiting={false} dim />}
        foot={
          <>
            <span />
            <GoLink href="/">Back to the start</GoLink>
          </>
        }
      />
    </>
  );
}
