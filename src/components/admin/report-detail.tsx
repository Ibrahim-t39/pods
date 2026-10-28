// One report (wireframe K02; template anatomy G). Who it is about, what was said (quoted), the pause and its age,
// the pod and its round. Two actions: Dismiss (a go link) and Keep paused (the one blue commit). Warn, Remove and
// "Show pod name" sit in the menu. Every action needs a note: the Repo writes it to the audit log.
// The reporter is never shown (library J #8; BLUEPRINT §5.6).
"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { motion } from "motion/react";
import { Button, ResponsiveSheet } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { DbState, ModerationAction, Report } from "@/lib/types";
import { displayName, ageOn } from "@/lib/utils";
import { formatShortDate } from "@/lib/time/format";
import { cn } from "@/lib/cn";
import { ARRIVE } from "@/components/brand/motion";
import { DONE, REASON, age, hueOf, roundState } from "./facts";
import { PodPair, StatusChip } from "./admin-shell";
import { RevealSheet, useRevealed, useRevealLog } from "./reveal";


export function ReportDetail({
  db,
  report: r,
  status,
  pendingAction,
  now,
  podLabel,
  onAct,
  onClose,
  noteRef,
}: {
  db: DbState;
  report: Report;
  status: Report["status"];
  pendingAction?: ModerationAction;
  now: Date;
  podLabel: string;
  onAct: (r: Report, a: ModerationAction, note: string) => void;
  onClose: () => void;
  noteRef?: RefObject<HTMLInputElement | null>;
}) {
  const [note, setNote] = useState("");
  const [sheet, setSheet] = useState<null | "menu" | "remove" | "reveal">(null);
  const revealed = useRevealed();
  const revealLog = useRevealLog();
  const t = now.getTime();
  const nowISO = now.toISOString();
  const user = r.reported_id ? db.users[r.reported_id] : undefined;
  const name = user ? displayName(user) : "someone";
  const pod = r.pod_id ? db.pods[r.pod_id] : undefined;
  const open = status === "open" && !pendingAction;
  const ready = note.trim().length >= 5;
  const msg = r.message_id && r.pod_id ? (db.messages[r.pod_id] ?? []).find((m) => m.id === r.message_id) : undefined;
  const prior = r.reported_id ? Object.values(db.reports).filter((x) => x.reported_id === r.reported_id && x.id !== r.id).length : 0;
  const blocks = r.reported_id ? db.blocks.filter((b) => b.blocked_id === r.reported_id).length : 0;
  const last = db.adminActions.filter((a) => a.report_id === r.id).at(-1);
  const pausesChat = r.reason === "unsafe" || r.reason === "harassment";
  const masked = pod?.type === "community" && !revealed[pod.id];
  const shownLog = pod ? revealLog.find((e) => e.podId === pod.id) : undefined;

  const state =
    pendingAction ? DONE[pendingAction]
    : status !== "open" ? `${status === "dismissed" ? "Dismissed" : DONE[last?.action ?? "warn"] ?? "Closed"}${last ? ` · ${formatShortDate(last.created_at)}` : ""}`
    : user?.status === "suspended" ? "Account paused"
    : user?.status === "banned" ? "Removed"
    : pausesChat ? `Chat paused · ${age(r.created_at, t)}`
    : "Open";

  const act = (a: ModerationAction) => {
    if (!ready) {
      if (sheet !== "remove") {
        setSheet(null);
        setTimeout(() => noteRef?.current?.focus(), 320);
      }
      return;
    }
    onAct(r, a, note.trim());
    setNote("");
    setSheet(null);
  };

  return (
    <motion.section
      key={r.id}
      aria-label="Report"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={ARRIVE}
      style={{ transformOrigin: "top left" }}
      className="flex min-h-[calc(100dvh-180px)] flex-col lg:min-h-0"
    >
      <div className="-ml-3 flex items-center gap-s1">
        <button type="button" onClick={onClose} aria-label="Back to reports" className="pressable grid size-11 shrink-0 place-items-center rounded-full">
          <Icon name="back" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] text-ink-2">
          {REASON[r.reason]} · {podLabel} · {age(r.created_at, t)}
          {r.urgent && status === "open" ? " · urgent" : ""}
        </p>
        <button type="button" onClick={() => setSheet("menu")} aria-label="More actions" className="pressable -mr-3 grid size-11 shrink-0 place-items-center rounded-full">
          <Icon name="more" />
        </button>
      </div>

      <h1 className="line mt-s4 text-display-lg">
        About {name}
        {user && <span className="tabular text-ink-2">, {ageOn(user.date_of_birth, nowISO)}</span>}
      </h1>

      <dl className="mt-s8 rounded-[28px] bg-lit px-s4 shadow-sm ring-1 ring-line lg:px-s6">
        <Fact k="Status" v={<StatusChip tone={pendingAction === "ban" || user?.status === "banned" ? "removed" : open ? "open" : "done"}>{state}</StatusChip>} />
        <Fact
          k="Pod"
          v={pod ? (
            <span className="inline-flex items-baseline gap-s2">
              <PodPair hue={hueOf(pod)} held={1} size={24} className="-my-1 self-center" />
              {podLabel} · {roundState(db, pod, t)}
            </span>
          ) : "No pod"}
        />
        {msg && <Fact k="Said" v={<q className="block border-l-[3px] border-info pl-s4 text-[20px] leading-[1.3] font-semibold tracking-[-0.01em]">{msg.text}</q>} />}
        {r.details && <Fact k="Note" v={r.details} />}
        <Fact k="Before" v={prior || blocks ? [prior && `${prior} report${prior === 1 ? "" : "s"}`, blocks && `${blocks} block${blocks === 1 ? "" : "s"}`].filter(Boolean).join(" · ") : "Nothing"} />
        {shownLog && <Fact k="Shown" v={`Pod name · ${shownLog.reason}`} />}
      </dl>

      {open ? (
        <div className="sticky bottom-0 mt-auto -mx-gutter bg-[linear-gradient(to_top,var(--stage,var(--paper))_70%,transparent)] px-gutter pt-s8 pb-[calc(24px+env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:mt-s12 lg:bg-none lg:px-0 lg:pt-0 lg:pb-0">
          <label className="block">
            <span className="sr-only">Note for the log</span>
            <input
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the log"
              className="h-12 w-full border-b-[1.5px] border-line-2 bg-transparent text-[16px] text-ink outline-none transition-colors placeholder:text-ink-2 focus-visible:border-select"
            />
          </label>
          <div className="mt-s8 flex items-center justify-between gap-s4">
            <button type="button" onClick={() => act("dismiss")} className="pressable min-h-11 text-[17px] font-semibold u">
              Dismiss
            </button>
            <Button size="lg" onClick={() => act("suspend")} aria-disabled={!ready} className={cn(!ready && "bg-transparent! text-ink-2 shadow-[inset_0_0_0_1.5px_var(--line-2)]! hover:bg-transparent!")}>
              Keep paused
            </Button>
          </div>
        </div>
      ) : (
        pendingAction && <p className="mt-s8 text-[15px] text-ink-2">Saving. Undo is in the corner.</p>
      )}

      <ResponsiveSheet open={sheet === "menu"} onOpenChange={(o) => !o && setSheet(null)} title={name}>
        <ul className="-mx-s2">
          {open && <MenuRow icon="bell" onClick={() => act("warn")} hint={ready ? undefined : "Add a note first"}>Warn</MenuRow>}
          {masked && pod && <MenuRow icon="why" onClick={() => setSheet("reveal")}>Show pod name</MenuRow>}
          {open && <MenuRow icon="block" danger onClick={() => setSheet("remove")}>Remove from Pods</MenuRow>}
          {!open && !masked && <li className="px-s2 py-s3 text-[15px] text-ink-2">Nothing else to do here.</li>}
        </ul>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={sheet === "remove"}
        onOpenChange={(o) => !o && setSheet(null)}
        title={`Remove ${name}?`}
        description="Leaves every pod. Phone blocked."
        footer={
          <>
            <Button variant="link" size="lg" onClick={() => setSheet(null)}>Back</Button>
            <Button variant="danger-quiet" size="lg" onClick={() => act("ban")} aria-disabled={!ready} className={cn("shadow-[inset_0_0_0_1.5px_var(--color-danger-border)]", !ready && "text-ink-2 shadow-[inset_0_0_0_1.5px_var(--line-2)]!")}>Remove</Button>
          </>
        }
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note for the log"
          placeholder="Note for the log"
          className="h-12 w-full border-b-[1.5px] border-line-2 bg-transparent text-[16px] text-ink outline-none transition-colors placeholder:text-ink-2 focus-visible:border-select"
        />
      </ResponsiveSheet>

      <RevealSheet pod={pod ?? null} open={sheet === "reveal"} onOpenChange={(o) => !o && setSheet(null)} nowISO={nowISO} />
    </motion.section>
  );
}

function Fact({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[96px_minmax(0,1fr)] items-baseline gap-s4 border-b border-line py-s4 last:border-b-0">
      <dt className="text-[14px] font-medium text-ink-2">{k}</dt>
      <dd className="text-[16px] text-ink">{v}</dd>
    </div>
  );
}

function MenuRow({ icon, children, onClick, hint, danger }: { icon: "bell" | "why" | "block"; children: ReactNode; onClick: () => void; hint?: string; danger?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cn("pressable flex min-h-14 w-full items-center gap-s4 rounded-full px-s2 text-left text-[17px] font-medium", danger ? "text-danger-text hover:bg-danger-soft" : "hover:bg-primary-soft")}>
        <Icon name={icon} className={danger ? undefined : "text-teal"} />
        <span className="flex-1">{children}</span>
        {hint && <span className="text-[13px] text-ink-2">{hint}</span>}
      </button>
    </li>
  );
}
