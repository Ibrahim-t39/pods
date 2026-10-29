// Pods (redesign): every pod you are in, as one card each, with what you need at a glance (identity, members, the
// next plan and how many are in, the last line in Talk and what is new, the status). Pods that need you come first.
// Phone: one column. Tablet and laptop: two columns. Header: compact (PageHeader), "Find more pods" on the right.
"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { CirclesLoader, Stage } from "@/components/brand";
import { Icon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shell";
import { useDb, useHydrated } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { cn } from "@/lib/cn";
import { opensAfter, roomTables } from "./model";
import { PodCard, needsYou } from "./pod-card";
import { PodOrb } from "./pod-orb";
import { useLastRead } from "./use-last-read";
import "./pods.css";

/** A go link: underlined words with the arrow glyph (DESIGN §8 "go"). */
export const GO = buttonVariants({ variant: "link", size: "lg" });

export function Room() {
  const hydrated = useHydrated();
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  const { lastRead } = useLastRead();
  const unreadBy = useDb(
    useCallback(
      (db) => {
        const out: Record<string, number> = {};
        for (const id of Object.keys(db.messages)) {
          const seen = lastRead[id];
          out[id] = seen ? (db.messages[id] ?? []).filter((m) => m.kind === "text" && m.user_id !== db.me && m.created_at > seen).length : 0;
        }
        return out;
      },
      [lastRead],
    ),
  );
  if (!hydrated) {
    return (
      <div className="grid h-[100dvh] place-items-center">
        <CirclesLoader label="Loading your pods" size={96} />
      </div>
    );
  }

  // needs you first, then open pods, then pods that open later (stable within each group)
  const ordered = [...tables].sort((a, b) => Number(needsYou(b)) - Number(needsYou(a)) || Number(b.open) - Number(a.open));
  const closed = opensAfter(tables, minute);
  const waiting = tables.filter(needsYou).length;
  const meta = tables.length
    ? `${tables.length} ${tables.length === 1 ? "pod" : "pods"}${waiting ? ` · ${waiting} ${waiting === 1 ? "needs" : "need"} you` : ""}`
    : "None yet";

  return (
    <>
      <Stage light="paper" />
      <PageHeader
        title="Pods"
        meta={meta}
        actions={
          <Link href="/app/discover" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "max-sm:px-4")}>
            <Icon name="add" size={18} /> <span className="max-[359px]:sr-only">Find more</span>
          </Link>
        }
      />
      {tables.length ? (
        <ul className="pods-list-grid">
          {ordered.map((t) => (
            <li key={t.row.pod.id} className="min-w-0">
              <PodCard t={t} minute={minute} closed={closed} unread={unreadBy[t.row.pod.id] ?? 0} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-auto max-w-[1280px] px-gutter pt-s6 lg:px-s12">
          <div className="pods-card flex flex-col items-start gap-s3 p-s6">
            <PodOrb hue="ember" people={8} size={48} open={false} />
            <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">No pods yet</h2>
            <p className="max-w-[44ch] text-[15px] text-ink-2">We place you with 6 to 10 people near you who share an interest or a community.</p>
            <Link href="/app/discover" className={buttonVariants({ size: "sm" })}>
              Find a pod
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

/** For tests and the director: the open pods in order. */
export function useRoomOrder() {
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  return useMemo(() => tables.filter((t) => t.open).map((t) => t.row.pod.id), [tables]);
}
