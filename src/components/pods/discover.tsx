// Discover (PLATFORM_SPEC §F5): more interest pods with open seats, your likes first. Community pods never show here
// (they come only from your own likes, K D4).
// QA core r1: each pod reads as itself, not a template card. Its bubble takes its kind's colour (moving = tide blue,
// making = glow ember, outdoors = grove green), its members are the white dots inside it (the dot is the person, BRAND §1)
// and its open seats are the empty rim. A row: bubble · name · what and when · seats, with "See it" pinned to one column
// so every row lines up. "See it" opens a small seat preview (who, when, where) before you commit; nothing joins blind.
//   states  joined → opens the pod (its first plan is made on join) · asked (waitlisted, undo) · cap reached · none open
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SNAPPY, STAGGER, type PodHueKey } from "@/components/brand";
import { POD_SOLID, POD_WASH } from "@/components/brand/disc";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toast";
import { useDb, useRepo } from "@/lib/db/hooks";
import { discoverPods, type DiscoverRow } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { toChicagoISO } from "@/lib/time/tz";
import { Frame } from "./frame";
import { shortDay, shortTime } from "./model";

/** A pod's kind decides its colour, so the list reads as different places, not one card repeated. */
const MOVING = new Set(["basketball", "pickleball", "soccer", "running", "disc_golf", "climbing", "climbing_gym", "volleyball", "tennis", "cycling", "swimming", "yoga"]);
const OUTDOORS = new Set(["hiking", "volunteering", "photography", "gardening", "birding"]);
function hueOf(topicKey: string): PodHueKey {
  if (MOVING.has(topicKey)) return "ember";
  if (OUTDOORS.has(topicKey)) return "grove";
  return "signal";
}

export function Discover() {
  const now = useClock(60_000);
  const iso = toChicagoISO(now.getTime());
  const interest = useSearchParams().get("i") ?? undefined;
  const rows = useDb(useCallback((db) => discoverPods(db, iso, interest), [iso, interest]));
  const label = useDb(useCallback((db) => (interest ? (db.interests[interest]?.label ?? null) : null), [interest]));
  const [peek, setPeek] = useState<DiscoverRow | null>(null);
  return (
    <Frame over="Discover" line={label ? `${label}.` : "More pods."} wide>
      {rows.length ? (
        <ul className="grid grid-cols-1 border-t border-line lg:grid-cols-2 lg:gap-x-s12 lg:border-t-0">
          {rows.map((r, i) => (
            <PodRow key={r.pod.id} row={r} i={i} now={now.getTime()} best={i === 0 && r.matchesMyLikes} onPeek={() => setPeek(r)} />
          ))}
        </ul>
      ) : (
        <p className="text-[20px] leading-[1.3] text-ink-2">No open pods right now.</p>
      )}
      <SeatPreview row={peek} now={now.getTime()} onClose={() => setPeek(null)} />
    </Frame>
  );
}

/** The pod's bubble: its people as white dots, its open seats as the empty rim. */
function PodBubble({ row, size }: { row: DiscoverRow; size: number }) {
  const hue = hueOf(row.pod.topic_key);
  const seats = Math.min(10, row.members + row.seatsOpen);
  return (
    <span aria-hidden className="orb relative block shrink-0" style={{ width: size, height: size, ["--orb" as string]: POD_SOLID[hue], ["--orb-wash" as string]: POD_WASH[hue] }}>
      {Array.from({ length: seats }, (_, d) => {
        const a = -Math.PI / 2 + (d / seats) * Math.PI * 2;
        const taken = d < row.members;
        return (
          <span
            key={d}
            data-nc
            className="absolute size-[12%] rounded-full"
            style={{
              left: `${50 + Math.cos(a) * 31}%`,
              top: `${50 + Math.sin(a) * 31}%`,
              transform: "translate(-50%,-50%)",
              backgroundColor: taken ? "var(--lit)" : "transparent",
              backgroundImage: taken ? "var(--bead)" : undefined,
              boxShadow: taken ? "0 1px 2px rgb(0 0 0 / .14)" : `inset 0 0 0 1.5px color-mix(in srgb, var(--lit) 80%, transparent)`,
            }}
          />
        );
      })}
    </span>
  );
}

function whenLine(row: DiscoverRow, now: number): string {
  return row.next ? `${shortDay(row.next.starts_at, now)} ${shortTime(row.next.starts_at)}` : "Planning";
}

function PodRow({ row, i, now, best, onPeek }: { row: DiscoverRow; i: number; now: number; best: boolean; onPeek: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      className="border-b border-line"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAPPY, delay: i * STAGGER }}
    >
      <button type="button" onClick={onPeek} className="pressable grid min-h-[104px] w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-s4 py-s4 text-left outline-offset-[-2px]">
        <PodBubble row={row} size={64} />
        <span className="min-w-0">
          <span className="flex items-baseline gap-s2">
            <span className="truncate text-[17px] leading-[1.25] font-semibold tracking-[-0.01em] text-ink">{row.pod.name}</span>
            {best && <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--select)_12%,transparent)] px-s2 py-px text-[12px] font-semibold text-select">Fits you</span>}
          </span>
          <span className="mt-1 line-clamp-2 block text-label text-ink-2">
            {row.pod.topic} · {whenLine(row, now)}
          </span>
          <span className="tabular mt-1 block text-label text-ink-2">
            {row.members} in · {row.seatsOpen} open
          </span>
        </span>
        <span className="inline-flex h-11 items-center rounded-full px-s4 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line-2)]">
          {row.requested ? "Asked" : "See it"}
        </span>
      </button>
    </motion.li>
  );
}

/** Who, when, where, then one seat. A small preview before anyone joins (QA core r1). */
function SeatPreview({ row, now, onClose }: { row: DiscoverRow | null; now: number; onClose: () => void }) {
  const repo = useRepo();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const band = useDb(useCallback((db) => (row ? db.pods[row.pod.id] : null), [row]));
  const requestId = useDb(
    useCallback((db) => (row ? (db.podRequests.find((r) => r.user_id === db.me && r.pod_id === row.pod.id && r.status !== "cancelled")?.id ?? null) : null), [row]),
  );
  if (!row) return <ResponsiveSheet open={false} onOpenChange={() => onClose()} title="Pod" />;

  const take = async () => {
    setBusy(true);
    const r = await repo.requestPod(row.pod.id);
    setBusy(false);
    if (!r.ok) return notify.error(r.error.message ?? "Not sent.");
    onClose();
    if (r.data.status === "joined") {
      notify.success(`You're in ${row.pod.name}.`);
      router.push(`/app/pods/${row.pod.id}`);
    } else {
      const id = r.data.id;
      notify("On the list.", { undo: () => void repo.cancelPodRequest(id) });
    }
  };
  const cancel = async () => {
    if (!requestId) return;
    const r = await repo.cancelPodRequest(requestId);
    if (!r.ok) return notify.error("Not saved.");
    onClose();
    notify("Taken off the list.");
  };

  const facts: [string, string][] = [
    ["Who", `${row.members} people${band ? ` · ${band.age_min}-${band.age_max}` : ""}`],
    ["When", row.next ? `${shortDay(row.next.starts_at, now)} · ${shortTime(row.next.starts_at)}` : "First plan after you join"],
    ...(row.next?.venueName ? ([["Where", row.next.venueName]] as [string, string][]) : []),
    ["Seats", `${row.seatsOpen} open`],
  ];

  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={row.pod.name} description={row.pod.topic} media={<PodBubble row={row} size={72} />}>
      <dl className="border-t border-line">
        {facts.map(([k, v]) => (
          <div key={k} className="flex min-h-14 items-center justify-between gap-s4 border-b border-line">
            <dt className="text-label text-ink-2">{k}</dt>
            <dd className="tabular text-right text-[17px] font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-s8 flex items-center justify-between gap-s4">
        <p className="text-label text-ink-2">{row.verdict === "join" ? "Join now. Leave anytime." : "Full for now. We'll save a seat."}</p>
        {row.requested ? (
          <Button variant="secondary" size="md" onClick={() => void cancel()}>
            Cancel ask
          </Button>
        ) : row.verdict === "cap" ? (
          <span className="text-label text-ink-2">At your limit</span>
        ) : (
          <Button size="md" loading={busy} onClick={() => void take()}>
            {row.verdict === "join" ? "Take a seat" : "Ask"}
          </Button>
        )}
      </div>
    </ResponsiveSheet>
  );
}
