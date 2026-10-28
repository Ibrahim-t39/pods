// A pod's table: the page (V3_SPEC §6.3; template anatomy B; wireframes D03, M01, S03).
//   chrome   the mark (back to Your pods) · dots for your place among your tables · the menu (M01)
//   body     what sits on the table now (table-stage.tsx: the plan, the lock, the repeat loop)
//   sheets   Talk (S03), the menu (M01), members, memories, the place (S02), give up your seat (D08), report, leave.
//            One at a time. Deep links: /chat, /members, /memories, /settings, /details.
// Walk to the next table: swipe sideways on a phone, arrow keys on a laptop (a 24px slide, nav.ts "side").
// It lives in the [podId] layout, so /details (the menu) and /plan/[id] (Why this plan) open over it without a re-mount.
"use client";

import "./pods.css";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Line, Stage } from "@/components/brand";
import { POD_SOLID } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { Chrome } from "@/components/shell";
import { isTypingTarget } from "@/components/shell/shortcuts";
import { Page } from "@/components/shell/page";
import { ReportSheet } from "@/components/safety/report-sheet";
import { usePlanActions } from "@/components/planner/use-plan-actions";
import { useDb, useHydrated } from "@/lib/db/hooks";
import { membership } from "@/lib/db/selectors";
import { useClock } from "@/lib/time/clock";
import { LeavePodSheet } from "./leave-pod-sheet";
import { roomTables } from "./model";
import { GiveUpSheet, PlaceSheet, PodMenuSheet, type PodSheet } from "./pod-menu";
import { MembersSheet, MemoriesSheet } from "./pod-sheets";
import { notify } from "@/components/ui/toast";
import { useRepo } from "@/lib/db/hooks";
import { GO } from "./room";
import { PodTableContext, type PodTableApi } from "./table-context";
import { useTableStage } from "./table-stage";
import { TalkPanel, TalkSheet } from "./talk-sheet";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useLastRead } from "./use-last-read";

/** The sheet a deep link opens over the table. */
function sheetForPath(p: string): PodSheet {
  const m = p.match(/^\/app\/pods\/[^/]+\/(details|settings|chat|members|memories)\/?$/);
  if (!m) return null;
  if (m[1] === "details") return null; // the plan's details (below), or the menu when there is no plan yet
  return m[1] === "chat" ? "talk" : m[1] === "members" ? "members" : m[1] === "memories" ? "memories" : "menu";
}

export function PodTable() {
  const { podId } = useParams<{ podId: string }>();
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <PodTableInner key={podId} podId={podId} />;
}

function PodTableInner({ podId }: { podId: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  const mine = useDb((db) => membership(db, podId));
  const { lastRead } = useLastRead();
  const unread = useDb(
    useCallback(
      (db) => {
        const seen = lastRead[podId];
        return seen ? (db.messages[podId] ?? []).filter((m) => m.kind === "text" && m.user_id !== db.me && m.created_at > seen).length : 0;
      },
      [lastRead, podId],
    ),
  );

  const here = tables.find((t) => t.row.pod.id === podId);
  const walk = useMemo(() => tables.filter((t) => t.open).map((t) => t.row.pod.id), [tables]);
  const at = walk.indexOf(podId);

  // deep links open their sheet over the table: /details and /settings the menu, /chat Talk, /members, /memories
  const deep = sheetForPath(pathname);
  const [sheet, setSheet] = useState<PodSheet>(deep);
  const [giving, setGiving] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a deep link opens its sheet over the table
    if (deep) setSheet(deep);
  }, [deep]);
  const actions = usePlanActions(podId);
  const repo = useRepo();
  const muted = useDb((db) => membership(db, podId)?.muted ?? false);
  const toggleMute = useCallback(async () => {
    const next = !muted;
    const r = await repo.setMuted(podId, next);
    if (!r.ok) return notify.error("Not saved.");
    notify(next ? "Muted." : "Unmuted.", { undo: () => void repo.setMuted(podId, !next) });
  }, [muted, podId, repo]);

  const close = useCallback(() => {
    setSheet(null);
    if (sheetForPath(window.location.pathname)) router.replace(`/app/pods/${podId}`, { scroll: false });
  }, [podId, router]);

  // wide laptops: Talk docks beside the table (split view); "open Talk" focuses its input instead of opening a sheet
  const docked = useMediaQuery("(min-width: 1280px)");
  const [focusTalk, setFocusTalk] = useState(0);
  useEffect(() => {
    if (docked && sheet === "talk") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the docked panel replaces the sheet
      setSheet(null);
      setFocusTalk((k) => k + 1);
    }
  }, [docked, sheet]);
  const api: PodTableApi = useMemo(
    () => ({ podId, unread: docked ? 0 : unread, openTalk: () => (docked ? setFocusTalk((k) => k + 1) : setSheet("talk")), openMenu: () => setSheet("menu") }),
    [podId, unread, docked],
  );
  const name = here?.row.name ?? "";
  const hue = here?.hue ?? "ember";
  const stage = useTableStage(podId, name, hue, api);
  const view = stage.view;
  // /details is the plan's details (QA core r1: the plan, what to bring, the rain backup), not the pod menu.
  // With no plan on the table yet it falls back to the menu; /settings is always the menu.
  const detailsTarget = pathname.endsWith("/details") && view?.suggestion ? `/app/pods/${podId}/plan/${view.suggestion.id}` : null;
  const detailsNoPlan = pathname.endsWith("/details") && !!view && !view.suggestion;
  useEffect(() => {
    if (detailsTarget) router.replace(detailsTarget, { scroll: false });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- /details without a plan opens the menu
    else if (detailsNoPlan) setSheet("menu");
  }, [detailsTarget, detailsNoPlan, router]);

  // walk sideways between tables: arrow keys (laptop) and a horizontal swipe (phone)
  const go = useCallback(
    (d: 1 | -1) => {
      if (walk.length < 2 || at < 0) return;
      const next = walk[(at + d + walk.length) % walk.length];
      router.push(`/app/pods/${next}`);
    },
    [walk, at, router],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, sheet]);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);

  if (!mine || !here) {
    return (
      <>
        <Stage light="paper" />
        <Page
          chrome={<Chrome left="mark" />}
          head={<Line>Not your table.</Line>}
          foot={
            <Link href="/app/pods" className={GO}>
              Your pods <Icon name="arrow" size={20} />
            </Link>
          }
        />
      </>
    );
  }

  const dots =
    walk.length > 1 ? (
      <span role="img" aria-label={`${at + 1} of ${walk.length}`} className="flex items-center gap-s2">
        {walk.map((id) => (
          <span key={id} aria-hidden className="rounded-full transition-all duration-300" style={id === podId ? { width: 18, height: 6, background: POD_SOLID[hue] } : { width: 6, height: 6, background: "var(--line-2)" }} />
        ))}
      </span>
    ) : null;

  const canGiveUp = !!view && !!view.targetId && view.imIn && ["proposed", "in", "locked", "starting_soon"].includes(view.phase);

  return (
    <PodTableContext.Provider value={api}>
      <Stage light={stage.light} />
      <div
        className="contents"
        data-sheet-open={sheet ? "" : undefined}
        data-docked={docked ? "" : undefined}
        onTouchStart={(e) => {
          const p = e.touches[0];
          touch.current = { x: p.clientX, y: p.clientY, t: Date.now() };
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s || sheet) return;
          const p = e.changedTouches[0];
          const dx = p.clientX - s.x;
          const dy = p.clientY - s.y;
          if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - s.t < 600) go(dx < 0 ? 1 : -1);
        }}
      >
        <Page
          label={`${name} table`}
          chrome={<Chrome left="mark" center={dots} right="menu" onMenu={() => setSheet("menu")} menuLabel={`${name} menu`} />}
          head={stage.head}
          object={stage.object}
          foot={stage.foot}
        />
      </div>
      {stage.overlay}

      {docked && <TalkPanel podId={podId} podName={name} hue={hue} focusKey={focusTalk} onMembers={() => setSheet("members")} />}
      <TalkSheet open={!docked && sheet === "talk"} onOpenChange={(o) => (o ? setSheet("talk") : close())} podId={podId} podName={name} hue={hue} onMembers={() => setSheet("members")} />
      <PodMenuSheet
        open={sheet === "menu"}
        onOpenChange={(o) => (o ? setSheet("menu") : close())}
        title={stage.title}
        name={name}
        whyHref={view?.suggestion ? `/app/pods/${podId}/plan/${view.suggestion.id}` : null}
        venue={view?.venue ?? null}
        canGiveUp={canGiveUp}
        onSheet={(s) => setSheet(s)}
        podId={podId}
        muted={muted}
        onMute={() => void toggleMute()}
        unread={unread}
      />
      <MembersSheet open={sheet === "members"} onOpenChange={(o) => (o ? setSheet("members") : close())} podId={podId} podName={name} hue={hue} />
      <MemoriesSheet open={sheet === "memories"} onOpenChange={(o) => (o ? setSheet("memories") : close())} podId={podId} podName={name} hue={hue} />
      {view?.venue && <PlaceSheet open={sheet === "place"} onOpenChange={(o) => (o ? setSheet("place") : close())} venue={view.venue} />}
      <GiveUpSheet
        open={sheet === "giveup"}
        onOpenChange={(o) => (o ? setSheet("giveup") : close())}
        busy={giving}
        onGiveUp={async () => {
          if (!view?.targetId) return;
          setGiving(true);
          await actions.rsvp(view.targetId, "not_going");
          setGiving(false);
          close();
        }}
      />
      <ReportSheet open={sheet === "report"} onOpenChange={(o) => (o ? setSheet("report") : close())} target={{ kind: "pod", podId, podName: name }} />
      <LeavePodSheet open={sheet === "leave"} onOpenChange={(o) => (o ? setSheet("leave") : close())} podId={podId} podName={name} />
    </PodTableContext.Provider>
  );
}
