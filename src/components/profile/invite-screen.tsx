// /app/invite (redesign r2; Tolan / Rakuten / Noom invite pages): bring a friend, and say which pod you're saving them a seat in.
//   left    where: Any pod, or one of your pods (?pod=) · your link with Copy attached · Share (the one primary)
//           · who joined from your links
//   right   what happens next, in three steps
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/toast";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { inviteUrl } from "@/lib/platform/invite";
import { podLabel } from "@/lib/platform/selectors";
import type { DbState } from "@/lib/types";
import { podHue } from "./hue";
import { Icon } from "@/components/icons";
import { PodBead } from "./your-seat";
import { Card, Row, Section, YouHead, YouPage } from "./you-kit";

/** "pods.app/i/JjyyQXz4": the link people read, without the scheme or a port (a local host reads as pods.app). */
function shortLink(url: string): string {
  try {
    const u = new URL(url);
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.)/.test(u.hostname);
    return `${local ? "pods.app" : u.hostname.replace(/^www\./, "")}${u.pathname}`;
  } catch {
    return url;
  }
}

const ALL = (db: DbState) => db;

export function InviteScreen() {
  const hydrated = useHydrated();
  const router = useRouter();
  const podId = useSearchParams().get("pod");
  const db = useDb(ALL);
  const repo = useRepo();
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    setLink(null);
    setFailed(false);
    void repo.createInvite(podId).then((r) => {
      if (!live) return;
      if (r.ok) setLink(inviteUrl(window.location.origin, r.data.code));
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [repo, podId]);
  const pickPod = useCallback((id: string | null) => router.replace(id ? `/app/invite?pod=${id}` : "/app/invite", { scroll: false }), [router]);

  if (!hydrated) return null;

  const me = db.me;
  const pods = db.memberships
    // an on-deck pod has no seat to save yet: it opens after your first hangout
    .filter((m) => m.user_id === me && !m.left_at && m.activation !== "on_deck")
    .map((m) => db.pods[m.pod_id])
    .filter(Boolean)
    .map((p) => ({ id: p.id, name: podLabel(db, p), hue: podHue(db, p.id), members: db.memberships.filter((m) => m.pod_id === p.id && !m.left_at).length }));
  const chosen = pods.find((p) => p.id === podId) ?? null;
  const joined = Object.values(db.invites)
    .filter((i) => i.inviter_id === me)
    .flatMap((i) => i.redeemed_by.map((u) => ({ user: db.users[u], pod: i.pod_id ? db.pods[i.pod_id] : null })))
    .filter((x) => x.user);

  const share = async () => {
    if (!link) return;
    const text = chosen ? `Come to ${chosen.name} with me on Pods.` : "Join me on Pods. Small groups that meet again and again.";
    try {
      if (navigator.share) await navigator.share({ title: "Pods", text, url: link });
      else {
        await navigator.clipboard.writeText(link);
        notify.success("Link copied.");
      }
    } catch {
      /* share sheet closed */
    }
  };
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
  const fade = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { ...GENTLE, delay: 0.04 + i * STAGGER } });

  return (
    <YouPage>
      <YouHead title="Invite a friend" sub={chosen ? <span data-nc>Save them a seat in {chosen.name}.</span> : "New here too? Bring them along."} />
      <div className="yo-wrap yo-body">
        <div className="yo-cols">
          <div>
            <motion.div {...fade(0)}>
              <Section label="Your link">
                <Card className="yo-pad">
                  <div className="yo-link">
                    <span className="yo-link-t" data-nc>
                      {link ? shortLink(link) : failed ? "Couldn’t make a link" : "Making your link…"}
                    </span>
                    <button type="button" className="yo-link-b pressable" disabled={!link} onClick={() => void copy()} aria-label={link ? `Copy ${shortLink(link)}` : "Copy"}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <Button block size="md" className="mt-s3" disabled={!link} onClick={() => void share()}>
                    Share link
                  </Button>
                </Card>
              </Section>
            </motion.div>

            <motion.div {...fade(1)}>
              <Section label="Save them a seat in" className="mt-s6">
                <Card>
                  <div role="radiogroup" aria-label="Pod">
                    <Row
                      onClick={() => pickPod(null)}
                      lead={
                        <span className="yo-any" aria-hidden>
                          <Icon name="room" size={20} />
                        </span>
                      }
                      label="Any pod"
                      hint="We place them where they fit"
                      trailing={<Picked on={!chosen} />}
                      className={!chosen ? "yo-row-on" : undefined}
                    />
                    {pods.map((p) => (
                      <Row
                        key={p.id}
                        onClick={() => pickPod(p.id)}
                        lead={<PodBead hue={p.hue} members={p.members} size={36} />}
                        label={<span data-nc>{p.name}</span>}
                        hint={`${p.members} people`}
                        trailing={<Picked on={chosen?.id === p.id} />}
                        className={chosen?.id === p.id ? "yo-row-on" : undefined}
                      />
                    ))}
                  </div>
                </Card>
              </Section>
            </motion.div>

          </div>

          <div>
          <motion.div {...fade(3)}>
            <Section label="What happens next">
              <Card className="yo-pad">
                <ol className="yo-steps">
                  {[
                    ["They open your link", "and sign up with their phone number."],
                    [chosen ? `They land in ${chosen.name}` : "They get placed", chosen ? "if there’s room for them. Otherwise we find the closest fit." : "in a small pod that fits what they’re into and when they’re free."],
                    ["You meet at the next hangout", "The AI already has the plan. They just say I’m in."],
                  ].map(([t, s], i) => (
                    <li key={i} className="yo-step">
                      <span className="yo-step-n">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-[16px] font-medium" data-nc>
                          {t}
                        </span>
                        <span className="mt-[2px] block text-[14px] leading-[1.4] text-ink-2">{s}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                {!joined.length && <p className="mt-s1 border-t border-line pt-s3 text-[14px] text-ink-2">Friends who join from your link show up here.</p>}
              </Card>
            </Section>
          </motion.div>
            {joined.length > 0 && (
              <motion.div {...fade(4)}>
                <Section label={`Joined from your links · ${joined.length}`} className="mt-s6">
                  <Card>
                    {joined.map((j, i) => (
                      <Row key={i} icon="person" label={<span data-nc>{j.user!.first_name}</span>} hint={j.pod ? <span data-nc>In {podLabel(db, j.pod)}</span> : "Placed in a pod"} />
                    ))}
                  </Card>
                </Section>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </YouPage>
  );
}

/** The chosen pod's mark on the right: a tick in the select blue, nothing when not chosen. */
function Picked({ on }: { on: boolean }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center text-select" role="presentation">
      {on && <Icon name="tick" size={20} stroke={2.2} label="Chosen" />}
    </span>
  );
}
