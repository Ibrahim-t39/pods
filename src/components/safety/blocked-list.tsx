// Blocked people: one row each (a quiet disc, the name, Unblock). Unblock has an Undo toast.
"use client";

import { useState } from "react";
import { Disc } from "@/components/brand/disc";
import { notify } from "@/components/ui";
import { useDb, useRepo } from "@/lib/db/hooks";
import { displayName } from "@/lib/utils";
import { GoLink, Rows, SheetLine } from "@/components/profile/kit";

export function useBlockedPeople() {
  return useDb((db) =>
    db.blocks
      .filter((b) => b.blocker_id === db.me)
      .map((b) => db.users[b.blocked_id])
      .filter(Boolean)
      .map((u) => ({ id: u.id, name: displayName(u) })),
  );
}

export function BlockedList() {
  const repo = useRepo();
  const people = useBlockedPeople();
  const [busy, setBusy] = useState<string | null>(null);

  if (!people.length) return <SheetLine>Nobody.</SheetLine>;

  return (
    <Rows label="Blocked">
      {people.map((p) => (
        <div key={p.id} className="flex min-h-14 items-center gap-s4 border-t border-line py-s2">
          <Disc tone="open" size={32}>
            <span className="text-[15px] font-semibold text-ink-2">{p.name.slice(0, 1)}</span>
          </Disc>
          <span data-nc className="min-w-0 flex-1 truncate text-[16px] text-ink">
            {p.name}
          </span>
          <GoLink
            className={busy === p.id ? "opacity-50" : undefined}
            onClick={async () => {
              setBusy(p.id);
              const r = await repo.unblock(p.id);
              setBusy(null);
              if (r.ok) notify(`${p.name} unblocked`, { undo: () => void repo.block(p.id) });
              else notify.error("Not unblocked. Try again.");
            }}
          >
            Unblock
          </GoLink>
        </div>
      ))}
    </Rows>
  );
}
