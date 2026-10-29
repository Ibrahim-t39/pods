// Invite (PLATFORM_SPEC §F7): one link to bring a friend; ?pod=<id> saves them a seat in that pod (they are still placed).
//   object   the shared pod mark (solid, one white dot per person) with one half-lit dot: the seat you are saving
//   foot     the short link as a copy row ("pods.app/i/…", tap copies) · Share (the one primary)
"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { GENTLE } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/toast";
import { useDb, useRepo } from "@/lib/db/hooks";
import { inviteUrl } from "@/lib/platform/invite";
import { podLabel } from "@/lib/platform/selectors";
import { Frame } from "./frame";
import { podHue, podOnDeck } from "@/components/profile/hue";
import { PodOrb } from "./pod-orb";

/** "host/i/JjyyQXz4": the link people read, without the scheme; a local host shows just the code. */
function shortLink(url: string): string {
  try {
    const u = new URL(url);
    if (/^(localhost|127\.|0\.0\.0\.0)/.test(u.hostname)) return `Your link · ${u.pathname.split("/").pop()}`;
    return `${u.host.replace(/^www\./, "")}${u.pathname}`;
  } catch {
    return url;
  }
}

export function Invite() {
  const podId = useSearchParams().get("pod");
  const podName = useDb(useCallback((db) => (podId && db.pods[podId] ? podLabel(db, db.pods[podId]) : null), [podId]));
  const hue = useDb(useCallback((db) => podHue(db, podId), [podId]));
  const onDeck = useDb(useCallback((db) => podOnDeck(db, podId), [podId]));
  // a pod you name: its people; no pod: you plus the friend you are bringing
  const people = useDb(useCallback((db) => (podId && db.pods[podId] ? db.memberships.filter((m) => m.pod_id === podId && !m.left_at).length : 1), [podId]));
  const repo = useRepo();
  const reduce = useReducedMotion();
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void repo.createInvite(podId).then((r) => {
      if (live && r.ok) setLink(inviteUrl(window.location.origin, r.data.code));
    });
    return () => {
      live = false;
    };
  }, [repo, podId]);
  const share = async () => {
    if (!link) return;
    try {
      if (navigator.share) await navigator.share({ title: "Pods", url: link });
      else {
        await navigator.clipboard.writeText(link);
        notify.success("Link copied.");
      }
    } catch {
      /* share sheet closed */
    }
  };
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      notify.success("Link copied.");
      setTimeout(() => setCopied(false), 2400);
    } catch {
      notify.error("Couldn't copy.");
    }
  };
  return (
    <Frame over={podName ?? "Invite"} line={podName ? "Save a friend a seat." : "Bring a friend."}>
      <div className="flex flex-col items-start gap-s8 lg:flex-row lg:gap-s12 lg:items-center">
        <motion.span initial={reduce ? false : { scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={GENTLE} className="block">
          <PodOrb hue={hue} people={Math.min(10, people + 1)} inCount={people} size={120} open={!onDeck} />
        </motion.span>
        <div className="flex w-full max-w-[420px] flex-col gap-s4">
          <button
            type="button"
            disabled={!link}
            onClick={() => void copy()}
            className="pressable flex h-14 w-full items-center gap-s3 rounded-full bg-paper px-s5 text-left shadow-[inset_0_0_0_1.5px_var(--line-2)] outline-offset-2"
            aria-label={link ? `Copy ${shortLink(link)}` : "Making your link"}
          >
            <span className="tabular min-w-0 flex-1 truncate text-[17px] font-semibold text-ink" data-nc>
              {link ? shortLink(link) : "Making your link…"}
            </span>
            <span className="shrink-0 text-label font-semibold text-select">{copied ? "Copied" : "Copy"}</span>
          </button>
          <Button size="lg" disabled={!link} onClick={() => void share()} className="self-start">
            Share link
          </Button>
        </div>
      </div>
    </Frame>
  );
}
