// BlockSheet (wireframe S07): consequence first, one line, Cancel and a blue Block (the commit; red is only for Call 911, COLOR_LIFE §10).
//   <BlockSheet open onOpenChange userId userName podId? onBlocked? />
// The person is never told. Today a block hides their messages and keeps you from being placed together; making it
// two-way and removing them from shared pods (S12 "Malik is out.") is the integration build change (library C #2).
"use client";

import { useEffect, useState } from "react";
import { Button, ResponsiveSheet, notify } from "@/components/ui";
import { useRepo } from "@/lib/db/hooks";
import { GoLink, SheetFoot, SheetLine } from "@/components/profile/kit";

export interface BlockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  /** The pod you share (kept for callers; the build change uses it). */
  podId?: string;
  onBlocked?: () => void;
}

export function BlockSheet({ open, onOpenChange, userId, userName, onBlocked }: BlockSheetProps) {
  const repo = useRepo();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setBusy(false);
  }, [open]);

  async function block() {
    setBusy(true);
    const r = await repo.block(userId);
    setBusy(false);
    if (!r.ok) {
      notify.error("Not blocked. Try again.", { retry: block });
      return;
    }
    onOpenChange(false);
    onBlocked?.();
    notify(`${userName} blocked`, { undo: () => void repo.unblock(userId) });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Block ${userName}?`}
      dismissible={!busy}
      footer={
        <SheetFoot
          left={<GoLink onClick={() => onOpenChange(false)}>Cancel</GoLink>}
          right={
            <Button loading={busy} onClick={block}>
              Block
            </Button>
          }
        />
      }
    >
      <SheetLine>You stop seeing each other. {userName} isn’t told.</SheetLine>
    </ResponsiveSheet>
  );
}
