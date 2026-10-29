// B02 Likes (2 of 4) + B03s Community pods sheet. "Into hoops, guitar." Five likes sit around the table's rim; the
// turn glyph at the centre brings five more. A like you take turns ink and is written into the line (PB 2.7
// adapted; AW 37: a field of words, not a chip wall or a card grid; counterexamples Discord c5bc0219, Brilliant
// a4620b17). Up to 5 (D17). Community pods are a dashed pill under the table: opt-in, never inferred, never shown
// to non-members (I #3, K D4). The words "faith" and "heritage" are not on the step itself.
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Line } from "@/components/brand/line";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { useDb } from "@/lib/db/hooks";
import { cn } from "@/lib/cn";
import { FlowStep, GoLink, Sub, useTableSize } from "../flow";
import { RingTable } from "../objects";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, DOT, STEP_ROUTE } from "../steps";
import { joinWords, LIKE_WORD } from "../words";
import { faithLabel, heritageLabel } from "../community";
import { CommunityFields } from "../community-fields";

const PAGE = 5;

/** Round-robin across sections (move, make, play, give), so each turn of the ring shows a mix:
 *  page one reads "basketball, guitar, board games, volunteering, pickleball" instead of five sports. */
function mixSections(list: { id: string; section: string }[]): string[] {
  const by = new Map<string, string[]>();
  for (const i of list) by.set(i.section, [...(by.get(i.section) ?? []), i.id]);
  const cols = [...by.values()];
  const out: string[] = [];
  for (let r = 0; out.length < list.length; r++) for (const c of cols) if (c[r]) out.push(c[r]);
  return out;
}

export function LikesScreen({ openCommunity = false }: { openCommunity?: boolean }) {
  return <Guarded need="none">{() => <Likes openCommunity={openCommunity} />}</Guarded>;
}

function Likes({ openCommunity }: { openCommunity: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { size } = useTableSize();
  const draft = useDraft();
  const { list, max } = useDb((db) => ({
    list: Object.values(db.interests).filter((i) => i.active),
    max: db.config.placement.maxInterestPods,
  }));
  const ids = useMemo(() => mixSections(list), [list]);
  const pages = Math.max(1, Math.ceil(ids.length / PAGE));
  const [page, setPage] = useState(0);
  const [full, setFull] = useState(0);
  const [sheet, setSheet] = useState(openCommunity);
  const picks = draft.interests;
  const shown = ids.slice(page * PAGE, page * PAGE + PAGE);
  const community = !!(draft.heritage || draft.faith);
  const from = heritageLabel(draft.heritage);
  const faith = faithLabel(draft.faith);

  const toggle = (id: string) => {
    if (picks.includes(id)) return draft.set({ interests: picks.filter((x) => x !== id) });
    if (picks.length >= max) return setFull((k) => k + 1);
    draft.set({ interests: [...picks, id] });
  };

  const words = picks.map((id) => LIKE_WORD[id] ?? id);
  const long = joinWords(words).length > 18;

  return (
    <>
    <FlowStep
      screen="likes"
      back={BACK.likes}
      label="Likes"
      head={
        <>
          <Line size={long ? "md" : "lg"} className={long ? "max-w-[18ch]" : "max-w-[12ch]"}>
            Into{" "}
            {words.length ? (
              words.map((w, i) => (
                <span key={w}>
                  <span className="u">{w}</span>
                  {i < words.length - 1 ? ", " : ""}
                </span>
              ))
            ) : (
              <span aria-label="anything yet" className="inline-block w-[2.2ch] translate-y-[-0.12em] border-b-2 border-line-2 align-baseline">
                &nbsp;
              </span>
            )}
            .
          </Line>
          <Sub live className="min-h-6">
            <span key={full} className={cn(full > 0 && "inline-block animate-[pods-shake_420ms_ease]")}>
              {full > 0 && picks.length >= max ? `Up to ${max} for now. Add more anytime.` : picks.length ? "Add more anytime." : "Pick a few you'd do with others."}
            </span>
          </Sub>
        </>
      }
      object={
        <RingTable
          size={size}
          on={picks.length > 0}
          filled={picks.length}
          label="Likes"
          items={shown.map((id) => ({
            key: id,
            node: (
                <motion.button
                  key={`${page}-${id}`}
                  type="button"
                  aria-pressed={picks.includes(id)}
                  onClick={() => toggle(id)}
                  className="pods-ob-like pressable"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                >
                  {picks.includes(id) && <span aria-hidden className="pods-ob-like-dot pods-pop-in" />}
                  {LIKE_WORD[id] ?? id}
                </motion.button>
            ),
          }))}
          center={
            pages > 1 ? (
              <button
                type="button"
                aria-label="More likes"
                onClick={() => setPage((p) => (p + 1) % pages)}
                className="pods-ob-like pressable gap-s1"
              >
                <motion.span key={page} className="inline-grid" initial={reduce ? false : { rotate: -120 }} animate={{ rotate: 0 }} transition={{ type: "spring", stiffness: 170, damping: 26 }}>
                  <Icon name="turn" size={18} />
                </motion.span>
                <span aria-hidden>More</span>
              </button>
            ) : null
          }
          below={
            <button
              type="button"
              aria-label="Community pods"
              aria-haspopup="dialog"
              data-on={community ? "" : undefined}
              className="pods-ob-community pressable"
              onClick={() => setSheet(true)}
            >
              <span className="pods-ob-community-title">
                Community pods <small>{community ? "Edit" : "Optional"}</small>
              </span>
              <dl className="contents">
                <dt>From</dt>
                <dd data-empty={from ? undefined : ""}>{from ?? "Add"}</dd>
                <dt>Faith</dt>
                <dd data-empty={faith ? undefined : ""}>{faith ?? "Add"}</dd>
              </dl>
            </button>
          }
        />
      }
      dot={DOT.likes}
      hint={picks.length ? undefined : "Pick at least one."}
      action={
        <Button size="xl" disabled={!picks.length} onClick={() => router.push(STEP_ROUTE.free)}>
          Next
        </Button>
      }
    />
    <CommunitySheet open={sheet} onOpenChange={setSheet} />
    </>
  );
}

/**
 * B03s. "Community pods" / "Only members see you there." Two fields of words, one pick each, tap again to clear.
 * From: tap a region and the other regions step aside for its countries (two taps to "Zambian"; the region alone
 * is a valid answer). Faith: the religions; Christian and Muslim open their denominations. Nothing is saved until Done, and nothing at all when
 * nothing is picked (edge case 5). Chosen = --select, like every chosen thing in first run (COLOR_LIFE §13 beat 1).
 */
function CommunitySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const draft = useDraft();
  const [h, setH] = useState<string | null>(draft.heritage);
  const [f, setF] = useState<string | null>(draft.faith);
  const sync = (o: boolean) => {
    if (o) {
      setH(useDraft.getState().heritage);
      setF(useDraft.getState().faith);
    }
    onOpenChange(o);
  };
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={sync}
      title="Community pods"
      description="Only members see you there. Change it anytime."
      size="sm"
      footer={
        <>
          {(h || f) && (
            <GoLink
              className="mr-auto min-w-11 justify-center"
              onClick={() => {
                setH(null);
                setF(null);
              }}
            >
              None
            </GoLink>
          )}
          <Button
            size="lg"
            onClick={() => {
              draft.set({ heritage: h, faith: f });
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </>
      }
    >
      <div className="pb-s6">
        <CommunityFields heritage={h} faith={f} onHeritage={setH} onFaith={setF} />
      </div>
    </ResponsiveSheet>
  );
}
