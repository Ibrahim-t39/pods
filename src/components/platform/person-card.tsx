// A person you share a pod with (People detail pane on a laptop, /app/people/[id] full page on a phone).
// Leads with what you share (Meetup "You both share things in common", Bumble "We have things in common"): likes in
// common, pods together, the next hangout you'll both be at. Then their own words (bio, prompts). Actions: message in
// the pod you share (primary), Report / Block in a quiet menu.
// PRIVACY: reads only toPublicMember(), interest labels and pod labels via podLabel() (community masking honoured).
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Disc } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { notify } from "@/components/ui/toast";
import { Icon } from "@/components/icons";
import { BlockSheet, ReportSheet } from "@/components/safety";
import { DateBlock } from "@/components/platform/page-head";
import { shortDay, shortTime } from "@/components/pods/model";
import { cn } from "@/lib/cn";
import { useDb, useRepo } from "@/lib/db/hooks";
import { isBlockedByMe } from "@/lib/safety/selectors";
import { myPlans, podLabel } from "@/lib/platform/selectors";
import { nowISO, nowMs } from "@/lib/time/clock";
import { toPublicMember } from "@/lib/utils";
import type { DbState, ProfilePrompt } from "@/lib/types";

const PROMPT: Record<ProfilePrompt["key"], string> = {
  ask_me_about: "Ask me about",
  perfect_saturday: "A perfect Saturday",
  currently_learning: "Currently learning",
  hot_take: "Hot take",
  hometown_food: "Hometown food",
};

export interface PersonView {
  member: ReturnType<typeof toPublicMember>;
  pods: { id: string; name: string }[];
  common: string[];
  other: string[];
  next: { id: string; title: string; starts_at: string; podName: string; venue: string | null } | null;
  together: number;
  blocked: boolean;
}

/** Null when the person is not someone you share a pod with (members stay inside their pods). */
export function personView(db: DbState, userId: string): PersonView | null {
  const u = db.users[userId];
  if (!db.me || !u || u.status === "deleted" || u.status === "banned" || userId === db.me) return null;
  const mine = new Set(db.memberships.filter((m) => m.user_id === db.me && !m.left_at).map((m) => m.pod_id));
  const pods = db.memberships
    .filter((m) => m.user_id === userId && !m.left_at && mine.has(m.pod_id) && db.pods[m.pod_id])
    .map((m) => db.pods[m.pod_id])
    .sort((a, b) => Number(a.type === "community") - Number(b.type === "community"));
  if (!pods.length) return null;
  const myLikes = new Set(db.userInterests.filter((x) => x.user_id === db.me).map((x) => x.interest_id));
  const theirs = db.userInterests.filter((x) => x.user_id === userId).map((x) => db.interests[x.interest_id]).filter(Boolean);
  const podIds = new Set(pods.map((p) => p.id));
  const now = nowISO();
  const upcoming = myPlans(db, Date.parse(now)).upcoming.find((p) => podIds.has(p.podId));
  const together = Object.values(db.hangouts).filter(
    (h) =>
      podIds.has(h.pod_id) &&
      h.status === "done" &&
      db.rsvps.some((r) => r.hangout_id === h.id && r.user_id === userId && r.status === "going") &&
      db.rsvps.some((r) => r.hangout_id === h.id && r.user_id === db.me && r.status === "going"),
  ).length;
  return {
    member: toPublicMember(u, now),
    pods: pods.map((p) => ({ id: p.id, name: podLabel(db, p) })),
    common: theirs.filter((i) => myLikes.has(i.id)).map((i) => i.label),
    other: theirs.filter((i) => !myLikes.has(i.id)).map((i) => i.label),
    next: upcoming
      ? { id: upcoming.id, title: upcoming.title, starts_at: upcoming.starts_at, podName: upcoming.podName, venue: upcoming.venue?.short_name ?? upcoming.venue?.name ?? null }
      : null,
    together,
    blocked: isBlockedByMe(db, userId),
  };
}

export function usePersonView(userId: string | null) {
  return useDb(useCallback((db: DbState) => (userId ? personView(db, userId) : null), [userId]));
}

function when(iso: string) {
  return `${shortDay(iso, nowMs())} ${shortTime(iso)}`;
}

export function PersonCard({ view, className, wide }: { view: PersonView; className?: string; wide?: boolean }) {
  const repo = useRepo();
  const [sheet, setSheet] = useState<null | "report" | "block">(null);
  const m = view.member;
  const pod = view.pods[0];
  const chip = "inline-flex h-8 items-center rounded-full px-s3 text-[14px]";

  return (
    <article className={cn("min-w-0", className)} aria-label={m.display_name}>
      <header className="flex items-center gap-s4">
        <Disc initial={m.display_name.slice(0, 1)} seed={m.display_name} tone="ember" size={wide ? 72 : 64} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[24px] leading-[1.2] font-semibold tracking-[-0.01em] text-ink">
            {m.display_name}
            <span className="tabular font-normal text-ink-2">, {m.age}</span>
          </h2>
          <p className="truncate text-[14px] text-ink-2">
            {[m.pronouns, m.verified ? "Verified" : null, view.together ? `${view.together} hangout${view.together === 1 ? "" : "s"} together` : "New to your pod"].filter(Boolean).join(" · ")}
          </p>
        </div>
      </header>

      {view.blocked ? (
        <div className="mt-s6 rounded-2xl px-s4 py-s6 shadow-[inset_0_0_0_1px_var(--line)]">
          <p className="text-[16px] font-semibold text-ink">You blocked {m.display_name}.</p>
          <p className="mt-1 text-[14px] text-ink-2">You won&apos;t see each other&apos;s messages.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-s4"
            onClick={async () => {
              const r = await repo.unblock(m.id);
              if (r.ok) notify(`${m.display_name} unblocked`, { undo: () => void repo.block(m.id) });
            }}
          >
            Unblock
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-s4 flex items-center gap-s2">
            <Button asChild size="sm" className="flex-1 sm:flex-none">
              <Link href={`/app/pods/${pod.id}/chat`}>Message in {pod.name}</Link>
            </Button>
            <Dropdown>
              <DropdownTrigger asChild>
                <button type="button" aria-label="More" className="pressable inline-flex size-11 items-center justify-center rounded-full text-ink shadow-[inset_0_0_0_1.5px_var(--line-2)]">
                  <Icon name="more" size={20} />
                </button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => setSheet("report")}>Report</DropdownItem>
                <DropdownItem tone="danger" onSelect={() => setSheet("block")}>
                  Block
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>

          <div className={cn("mt-s6 grid gap-s6", wide && "lg:grid-cols-2 lg:gap-x-s8")}>
            <section>
              <h3 className="text-[13px] font-medium text-ink-3">{view.common.length ? `Likes · ${view.common.length} in common` : "Likes"}</h3>
              {view.common.length || view.other.length ? (
                <div className="mt-s2 flex flex-wrap gap-s2">
                  {view.common.map((l) => (
                    <span key={l} className={cn(chip, "bg-[color-mix(in_srgb,var(--select)_10%,transparent)] font-medium text-select")}>
                      {l}
                    </span>
                  ))}
                  {view.other.map((l) => (
                    <span key={l} className={cn(chip, "text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]")}>
                      {l}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-s2 text-[14px] text-ink-2">No likes shared yet.</p>
              )}
            </section>

            <section>
              <h3 className="text-[13px] font-medium text-ink-3">Pods together</h3>
              <ul className="mt-s2 flex flex-wrap gap-s2">
                {view.pods.map((p) => (
                  <li key={p.id}>
                    <Link href={`/app/pods/${p.id}`} className={cn(chip, "pressable font-medium text-ink shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]")}>
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {view.next && (
            <section className="mt-s6">
              <h3 className="text-[13px] font-medium text-ink-3">Next time you&apos;ll see them</h3>
              <Link href={`/app/plans/${view.next.id}`} className="pressable mt-s2 flex items-center gap-s3 rounded-2xl bg-surface px-s4 py-s3 shadow-[inset_0_0_0_1px_var(--line)]">
                <DateBlock iso={view.next.starts_at} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{view.next.title}</span>
                  <span className="tabular block truncate text-[13px] text-ink-2">
                    {when(view.next.starts_at)}
                    {view.next.venue ? ` · ${view.next.venue}` : ""} · {view.next.podName}
                  </span>
                </span>
                <Icon name="arrow" size={18} className="shrink-0 text-ink-3" />
              </Link>
            </section>
          )}

          {(m.bio || m.prompts.length > 0) && (
            <section className="mt-s6 border-t border-line pt-s6">
              {m.bio && <p className="text-[16px] leading-[1.5] text-ink">{m.bio}</p>}
              {m.prompts.length > 0 && (
                <dl className={cn("grid gap-s4", m.bio && "mt-s4", wide && "lg:grid-cols-2 lg:gap-x-s8")}>
                  {m.prompts.map((p) => (
                    <div key={p.key}>
                      <dt className="text-[13px] font-medium text-ink-3">{PROMPT[p.key]}</dt>
                      <dd className="mt-1 text-[15px] leading-[1.45] text-ink">{p.answer}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}
        </>
      )}

      <ReportSheet open={sheet === "report"} onOpenChange={(o) => !o && setSheet(null)} target={{ kind: "member", userId: m.id, userName: m.display_name, podId: pod.id }} />
      <BlockSheet open={sheet === "block"} onOpenChange={(o) => !o && setSheet(null)} userId={m.id} userName={m.display_name} podId={pod.id} />
    </article>
  );
}
