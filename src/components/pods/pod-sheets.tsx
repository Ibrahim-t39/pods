// The pod's people and memories as sheets over the table (PLATFORM_SPEC §F2; V3_SPEC §6.3: details fold into the menu).
//   Members    everyone at the table: disc, first name, age. You first. Tap a person → their card (report, block).
//   Memories   a line from the day (optionally later a photo); yours can be removed. Newest first.
// Deep links /members and /memories open these over the table.
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Disc, SNAPPY, type PodHueKey } from "@/components/brand";
import { Icon } from "@/components/icons";
import { notify } from "@/components/ui/toast";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { useDb, useRepo } from "@/lib/db/hooks";
import { podPublicMembers } from "@/lib/db/selectors";
import { podMemories } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { formatRelative } from "@/lib/time/format";
import { toChicagoISO } from "@/lib/time/tz";
import { firstName } from "./model";

type SheetProps = { open: boolean; onOpenChange: (o: boolean) => void; podId: string; podName: string; hue: PodHueKey };

export function MembersSheet({ open, onOpenChange, podId, podName, hue }: SheetProps) {
  const iso = toChicagoISO(useClock(60_000).getTime());
  const me = useDb((db) => db.me);
  const members = useDb(useCallback((db) => podPublicMembers(db, podId, iso), [podId, iso]));
  const list = [...members].sort((a, b) => Number(b.id === me) - Number(a.id === me));
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={podName} description={<span className="tabular">{list.length} people</span>}>
      <ul className="border-t border-line">
        {list.map((m) => {
          const you = m.id === me;
          return (
            <li key={m.id} className="border-b border-line">
              <Link
                href={you ? "/app/profile" : `/app/people/${m.id}`}
                onClick={() => onOpenChange(false)}
                className="pressable flex min-h-16 items-center gap-s4 outline-offset-[-2px]"
              >
                <Disc initial={m.display_name.slice(0, 1).toUpperCase()} tone={you ? "you" : hue} seed={m.display_name} size={40} />
                <span className="flex-1 text-[17px] font-semibold text-ink">{you ? "You" : m.display_name}</span>
                <span className="tabular text-label text-ink-2">{m.age}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </ResponsiveSheet>
  );
}

export function MemoriesSheet({ open, onOpenChange, podId, podName, hue }: SheetProps) {
  const repo = useRepo();
  const reduce = useReducedMotion();
  const now = useClock(60_000);
  const me = useDb((db) => db.me);
  const meInitial = useDb((db) => (db.me ? (db.users[db.me]?.first_name ?? "").slice(0, 1).toUpperCase() : ""));
  const items = useDb(
    useCallback((db) => podMemories(db, podId).map((m) => ({ ...m, by: m.user_id === db.me ? "You" : firstName(db, m.user_id) })), [podId]),
  );
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const c = caption.trim();
    if (!c || busy) return;
    setBusy(true);
    const r = await repo.addMemory(podId, { caption: c });
    setBusy(false);
    if (!r.ok) return notify.error(r.error.code === "VALIDATION" ? r.error.message : "Not saved.");
    setCaption("");
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Memories"
      description={podName}
      footer={
        <form className="flex w-full items-center" onSubmit={(e) => (e.preventDefault(), void add())}>
          <label className="relative flex h-14 w-full items-center rounded-full bg-paper shadow-[inset_0_0_0_1.5px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--select)]">
            <span className="sr-only">A line from the day</span>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder="A line from the day"
              className="h-full min-w-0 flex-1 bg-transparent pr-2 pl-5 text-[17px] text-ink outline-none placeholder:text-ink-2"
              autoComplete="off"
            />
            <button type="submit" aria-label="Save" disabled={!caption.trim() || busy} className="pressable mr-1.5 grid size-11 shrink-0 place-items-center rounded-full bg-select text-on-select disabled:opacity-25">
              <Icon name="check" size={22} />
            </button>
          </label>
        </form>
      }
    >
      {items.length ? (
        <ul className="flex flex-col gap-s4">
          <AnimatePresence initial={false}>
            {items.map((m) => (
              <motion.li
                key={m.id}
                layout
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={SNAPPY}
                className="flex items-start gap-s3"
              >
                <Disc initial={m.user_id === me ? meInitial : m.by.slice(0, 1).toUpperCase()} tone={m.user_id === me ? "you" : hue} seed={m.by} size={32} />
                <div className="min-w-0 flex-1 rounded-[22px] rounded-tl-md bg-sunken px-4 py-3">
                  {m.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- local data URL
                    <img src={m.photo_url} alt="" className="mb-s2 max-h-56 w-full rounded-[14px] object-cover" />
                  )}
                  {m.caption && <p className="text-[17px] leading-[1.4] text-ink">{m.caption}</p>}
                  <p className="mt-1 text-caption text-ink-2">
                    {m.by} · {formatRelative(m.created_at, now)}
                  </p>
                </div>
                {m.user_id === me && (
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={async () => {
                      const r = await repo.removeMemory(m.id);
                      if (!r.ok) notify.error("Not removed.");
                    }}
                    className="pressable grid size-11 shrink-0 place-items-center rounded-full text-ink-2"
                  >
                    <Icon name="close" size={18} />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="py-s8 text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink-2">Nothing yet.</p>
      )}
    </ResponsiveSheet>
  );
}
