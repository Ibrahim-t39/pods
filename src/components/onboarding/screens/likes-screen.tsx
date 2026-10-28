// B02 Likes (2 of 4) + B03s Community pods sheet. "Into hoops, guitar." Five likes sit around the table's rim; the
// turn glyph at the centre brings five more. A like you take turns ink and is written into the line (PB 2.7
// adapted; AW 37: a field of words, not a chip wall or a card grid; counterexamples Discord c5bc0219, Brilliant
// a4620b17). Up to 5 (D17). Community pods are a dashed pill under the table: opt-in, never inferred, never shown
// to non-members (I #3, K D4). The words "faith" and "heritage" are not on the step itself.
"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Line } from "@/components/brand/line";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { useDb } from "@/lib/db/hooks";
import { FAITH_NODES, HERITAGE_NODES, faithNode, heritageNode } from "@/data/taxonomy";
import { cn } from "@/lib/cn";
import { FlowStep, GoLink, Sub, useTableSize } from "../flow";
import { RingTable } from "../objects";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, DOT, STEP_ROUTE } from "../steps";
import { joinWords, LIKE_WORD } from "../words";

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
  const { size, wide } = useTableSize();
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
  const chosen = [draft.heritage && heritageNode(draft.heritage)?.label, draft.faith && faithNode(draft.faith)?.label].filter(Boolean) as string[];

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
          <Line size={long ? "md" : "lg"} className="max-w-[12ch]">
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
              {full > 0 && picks.length >= max ? `Up to ${max}.` : ""}
            </span>
          </Sub>
        </>
      }
      object={
        <RingTable
          size={size}
          on={picks.length > 0}
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
                className="pressable grid size-11 place-items-center rounded-full text-ink outline-offset-2 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
              >
                <motion.span key={page} initial={reduce ? false : { rotate: -120 }} animate={{ rotate: 0 }} transition={{ type: "spring", stiffness: 170, damping: 26 }}>
                  <Icon name="turn" />
                </motion.span>
              </button>
            ) : null
          }
          below={
            community ? (
              <div className="flex flex-wrap justify-center gap-s2" style={wide ? undefined : { marginTop: -8 }}>
                {chosen.map((c) => (
                  <button key={c} type="button" className="pods-ob-like pressable" data-community="" onClick={() => setSheet(true)}>
                    <span aria-hidden className="pods-ob-like-dot pods-pop-in" />
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" data-dashed="" className="pods-ob-like pressable" onClick={() => setSheet(true)} style={wide ? undefined : { marginTop: -8 }}>
                <Icon name="room" size={18} />
                Community pods
              </button>
            )
          }
        />
      }
      dot={DOT.likes}
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

const REGIONS = HERITAGE_NODES.filter((n) => n.level === "region");
const COUNTRIES = HERITAGE_NODES.filter((n) => n.level === "country");
const FAITHS = FAITH_NODES.filter((n) => n.level === "denomination").map((n) => ({
  code: n.code,
  label: n.label.replace("Non-denominational Christian", "Non-denominational").replace("Muslim (Sunni)", "Sunni Muslim").replace("Muslim (Shia)", "Shia Muslim"),
}));

/** The region a heritage code sits in (a country's parent, or the region itself). */
const regionOf = (code: string | null) => {
  if (!code) return null;
  const n = heritageNode(code);
  return n?.level === "country" ? n.parent : (n?.code ?? null);
};

/**
 * B03s. "Community pods" / "Only members see you there." Two fields of words, one pick each, tap again to clear.
 * From: tap a region and the other regions step aside for its countries (two taps to "Zambian"; the region alone
 * is a valid answer). Faith: the denominations, full names. Nothing is saved until Done, and nothing at all when
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
  const region = regionOf(h);
  const countries = region ? COUNTRIES.filter((c) => c.parent === region) : [];
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={sync}
      title="Community pods"
      description="Only members see you there."
      size="sm"
      footer={
        <>
          {(h || f) && (
            <GoLink
              className="mr-auto"
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
      <div className="flex flex-col gap-s8">
        <Field label="From">
          {(region ? REGIONS.filter((r) => r.code === region) : REGIONS).map((r) => (
            <Chip key={r.code} on={h === r.code} near={region === r.code && h !== r.code} onClick={() => setH(h === r.code || region === r.code ? null : r.code)}>
              {r.label}
            </Chip>
          ))}
          {countries.map((c, k) => (
            <Chip key={c.code} on={h === c.code} onClick={() => setH(h === c.code ? region : c.code)} delay={k * 0.03}>
              {c.label}
            </Chip>
          ))}
        </Field>
        <Field label="Faith">
          {FAITHS.map((o) => (
            <Chip key={o.code} on={f === o.code} onClick={() => setF(f === o.code ? null : o.code)}>
              {o.label}
            </Chip>
          ))}
        </Field>
      </div>
    </ResponsiveSheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-s3 text-label text-ink-2">{label}</p>
      <div className="flex flex-wrap gap-s2">{children}</div>
    </div>
  );
}

function Chip({ on, near, onClick, delay = 0, children }: { on: boolean; near?: boolean; onClick: () => void; delay?: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      layout={reduce ? false : "position"}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-near={near ? "" : undefined}
      className="pods-ob-like pressable"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay }}
    >
      {on && <span aria-hidden className="pods-ob-like-dot pods-pop-in" />}
      {children}
    </motion.button>
  );
}
