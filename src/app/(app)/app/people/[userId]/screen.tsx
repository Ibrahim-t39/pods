// A person (wireframe S06): a sheet over the table you share. Name and age, what they're into (shared likes first),
// the other pods you share, then Report and Block as quiet links (G #4: who, age, shared likes; no bio wall, no seal).
// PRIVACY: reads only toPublicMember() and interest labels. Community pod names are never printed here.
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { Disc } from "@/components/brand/disc";
import { Line } from "@/components/brand/line";
import { Stage } from "@/components/brand/stage";
import { TableRing, GENTLE, type Seat } from "@/components/brand/table-ring";
import { Chrome } from "@/components/shell/chrome";
import { ResponsiveSheet, notify } from "@/components/ui";
import { BlockSheet, ReportSheet } from "@/components/safety";
import { GoLink, PageName, SheetFoot, SheetLine } from "@/components/profile/kit";
import { podHue } from "@/components/profile/hue";
import { shortLike } from "@/components/profile/words";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { isBlockedByMe } from "@/lib/safety/selectors";
import { nowISO } from "@/lib/time/clock";
import { displayName, toPublicMember } from "@/lib/utils";
import "@/components/profile/seat.css";

export function PersonScreen() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const repo = useRepo();
  const hydrated = useHydrated();
  const [sheet, setSheet] = useState<"person" | "report" | "block">("person");

  // Only people you share a pod with can be seen (members stay inside their pods).
  const view = useDb((db) => {
    const u = db.users[userId];
    if (!db.me || !u || u.status === "deleted" || u.status === "banned" || userId === db.me) return null;
    const mine = db.memberships.filter((m) => m.user_id === db.me && !m.left_at);
    const theirs = db.memberships.filter((m) => m.user_id === userId && !m.left_at);
    const shared = mine.filter((m) => theirs.some((t) => t.pod_id === m.pod_id)).map((m) => db.pods[m.pod_id]).filter(Boolean);
    if (!shared.length) return null;
    const pod = shared.find((p) => p.type === "interest") ?? shared[0];
    const myLikes = new Set(db.userInterests.filter((x) => x.user_id === db.me).map((x) => x.interest_id));
    const likes = db.userInterests
      .filter((x) => x.user_id === userId)
      .map((x) => db.interests[x.interest_id])
      .filter(Boolean)
      .sort((a, b) => Number(myLikes.has(b.id)) - Number(myLikes.has(a.id)))
      .map((i) => shortLike(i.id, i.label));
    const also = shared.filter((p) => p.id !== pod.id && p.type === "interest").map((p) => p.name);
    const at = db.memberships
      .filter((m) => m.pod_id === pod.id && !m.left_at)
      .sort((a, b) => Number(b.user_id === db.me) - Number(a.user_id === db.me))
      .slice(0, 6)
      .map((m) => db.users[m.user_id])
      .filter(Boolean);
    return {
      member: toPublicMember(u, nowISO()),
      pod: { id: pod.id, name: pod.type === "community" ? "Your pod" : pod.name },
      hue: podHue(db, pod.id),
      likes,
      also,
      seats: at.map((p): Seat => ({ in: true, ink: p.id === db.me, initial: displayName(p).slice(0, 1), name: p.id === db.me ? "you" : displayName(p) })),
      blocked: isBlockedByMe(db, userId),
      // hangouts this table has held: the shared wash deepens with each one (COLOR_LIFE §6.3, what they share grows)
      held: Object.values(db.hangouts).filter((h) => h.pod_id === pod.id && h.status !== "cancelled" && h.ends_at <= nowISO()).length,
    };
  });

  if (!hydrated) return null;
  if (!view)
    return (
      <div className="seat-pg">
        <Stage light="paper" />
        <Chrome left="back" backHref="/app/pods" backLabel="Your pods" />
        <div className="seat-body">
          <Line size="lg">Not at your tables.</Line>
          <GoLink href="/app/pods" className="mt-s6">
            Your pods
          </GoLink>
        </div>
      </div>
    );

  const name = view.member.display_name;
  const back = () => router.push(`/app/pods/${view.pod.id}`);
  const into = view.likes.length ? `Into ${view.likes.slice(0, 2).join(", ")}.` : null;

  return (
    <div className="seat-pg">
      <Stage light="paper" />
      <Chrome left="back" backHref={`/app/pods/${view.pod.id}`} backLabel={view.pod.name} />
      <div className="seat-body">
        <div className="seat-col">
          <p className="text-overline text-ink-2">At the table</p>
          <Line size="lg" className="mt-s2">
            {view.pod.name}.
          </Line>
        </div>
        <motion.div className="person-obj" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={GENTLE}>
          {/* the same table you left: the pod's circle travels in from the pod page (MOTION_SYSTEM §4) */}
          <TableRing size={232} seats={view.seats} hue={view.hue} worn={Math.min(3, view.held + 1)} youWaiting={false} fill />
        </motion.div>
      </div>

      <ResponsiveSheet
        open={sheet === "person"}
        onOpenChange={(o) => !o && back()}
        title={<span data-nc className="tabular-nums">{`${name}, ${view.member.age}`}</span>}
        footer={
          view.blocked ? (
            <SheetFoot
              left={
                <GoLink
                  onClick={async () => {
                    const r = await repo.unblock(view.member.id);
                    if (r.ok) notify(`${name} unblocked`, { undo: () => void repo.block(view.member.id) });
                  }}
                >
                  Unblock
                </GoLink>
              }
            />
          ) : (
            <SheetFoot left={<GoLink onClick={() => setSheet("report")}>Report</GoLink>} right={<GoLink onClick={() => setSheet("block")}>Block</GoLink>} />
          )
        }
      >
        <PageName>{name}</PageName>
        <div className="flex items-center gap-s4">
          <Disc initial={name.slice(0, 1)} tone={view.hue} seed={name} size={64} />
          <div className="min-w-0">
            {view.blocked ? (
              <p className="text-[16px] text-ink">Blocked.</p>
            ) : (
              <>
                {into && <p className="text-[16px] text-ink">{into}</p>}
                {view.also.length > 0 && <SheetLine>Also in {view.also.join(", ")}.</SheetLine>}
              </>
            )}
          </div>
        </div>
      </ResponsiveSheet>

      <ReportSheet open={sheet === "report"} onOpenChange={(o) => !o && setSheet("person")} target={{ kind: "member", userId: view.member.id, userName: name, podId: view.pod.id }} />
      <BlockSheet open={sheet === "block"} onOpenChange={(o) => !o && setSheet("person")} userId={view.member.id} userName={name} podId={view.pod.id} />
    </div>
  );
}
