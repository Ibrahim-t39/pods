// Your pods = the Room (V3_SPEC §6.3; wireframes C01-C08; template anatomy C).
// Your pods are tables seen from further away. They overlap, and you sit where they meet: the logo drawn as a place
// (PB 2.1, 6.4; IL 41; SF 01, 07). The next table is tinted and lit (PB 4.8). Tapping a table grows it into the
// page (PB 3.2 warp zoom; SF 03), then the route's "in" transition finishes the zoom.
//   head   "4 pods" / "Your pods." (Home leads with what is next; the Room is the map, PLATFORM_SPEC §F1)
//   object up to 3 overlapping tables, each filled with its pod's soft logo wash (multiplied, so where two tables
//          meet the colours deepen like the logo's overlaps) inside a 1.5px solid rim; people are discs on the rim in
//          their own colours (solid = said yes, faded = not yet), you are the ember spark at the centre (COLOR_LIFE §6.3).
//          Each table carries data-depth = held + 1, so its wash deepens with every hangout held (repeat made visible).
//   foot   "More pods ⟶" to Discover (a go link; the tables are the choice, so there is no filled primary)
// States: C02 arrival (?arrive=1, dawn, tables drift out from your seat), C03 one pod, C04 loading (StoreGate),
// C05 offline (shell word), C06 worn rings, C07 list view (?view=list, and 4+ pods behind the list glyph).
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CirclesLoader, GENTLE, Line, SNAPPY, STAGGER, Shared, Stage, WidenGlyph, sharedName } from "@/components/brand";
import { POD_SOLID, POD_WASH } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { Chrome, GlyphButton, SeatGlyph } from "@/components/shell";
import { Page } from "@/components/shell/page";
import { useDb, useHydrated, useMe } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { zoomHandoff } from "./table-context";
import { heroRow, opensAfter, roomTables, tableState, type RoomTable } from "./model";

/** A go link: underlined words with the arrow glyph (DESIGN §8 "go"). */
export const GO = buttonVariants({ variant: "link", size: "lg" });

/** "Only 3 Zambians live nearby, so we widened…" (the cached widen_explainer) → "Only 3 Zambians nearby." */
function widenLine(body: string | undefined, from: string): string {
  const m = body?.match(/Only (\d+) (\S+)/);
  return m ? `Only ${m[1]} ${m[2]} nearby.` : `Not many ${from}s nearby.`;
}

export function Room() {
  const hydrated = useHydrated();
  const search = useSearchParams();
  const router = useRouter();
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  const me = useMe();
  const arrive = search.get("arrive") === "1";
  const list = search.get("view") === "list";
  const [zoom, setZoom] = useState<string | null>(null);
  // beat 3: the widened community pod and its one line (data: pod.widened_from + the cached widen_explainer)
  const widened = useDb(
    useCallback((db) => {
      const pod = Object.values(db.pods).find((p) => p.widened_from?.kind === "group" && db.memberships.some((m) => m.pod_id === p.id && m.user_id === db.me));
      if (!pod?.widened_from) return null;
      const entry = (db.plannerCache as Record<string, { output?: unknown }>)[`${pod.id}:widen_explainer`];
      const body = (entry?.output as { body?: string } | undefined)?.body;
      return { podId: pod.id, from: pod.widened_from.from, to: pod.widened_from.to, line: widenLine(body, pod.widened_from.from) };
    }, []),
  );

  // Home leads with the moment now (PLATFORM_SPEC §F1); the Room is the map of your pods and never redirects.

  if (!hydrated) {
    return (
      <div className="grid h-[100dvh] place-items-center">
        <CirclesLoader label="Loading your pods" size={96} />
      </div>
    );
  }

  const live = tables.filter((t) => t.open);
  const heroPick = heroRow(live.map((t) => t.row));
  const hero = live.find((t) => t.row === heroPick) ?? live[0];
  const verified = !!me?.verified;

  const toggle = (
    <GlyphButton
      icon={list ? "room" : "list"}
      label={list ? "Show as tables" : "Show as a list"}
      onClick={() => router.replace(list ? "/app/pods" : "/app/pods?view=list", { scroll: false })}
    />
  );
  const chrome = (
    <Chrome
      left="mark"
      right={
        <span className="flex items-center gap-s2">
          {tables.length > 0 && toggle}
          <SeatGlyph />
        </span>
      }
    />
  );

  if (!tables.length) {
    return (
      <>
        <Stage light="dawn" />
        <Page
          chrome={chrome}
          head={<Line>Your pod is filling.</Line>}
          object={<EmptyTable />}
          foot={<p className="text-label text-ink-2">We&apos;ll text you.</p>}
        />
      </>
    );
  }

  if (list) {
    return (
      <>
        <Stage light="paper" />
        <Page chrome={chrome} scroll head={<Line>Your pods.</Line>} object={<RoomList tables={tables} minute={minute} closed={opensAfter(tables, minute)} />} />
      </>
    );
  }

  const head = arrive ? (
    <>
      <Line>Your pods.</Line>
      <p className="mt-s4 flex items-center gap-s4 text-label text-ink-2" aria-label="Interest pods and community pods">
        <span className="inline-flex items-center gap-s2">
          <span aria-hidden data-pod-type="interest" className="size-3 rounded-full bg-pod" />
          Interests
        </span>
        <span className="inline-flex items-center gap-s2">
          <span aria-hidden data-pod-type="community" className="size-3 rounded-full bg-pod" />
          Communities
        </span>
      </p>
    </>
  ) : (
    <>
      <p className="text-overline text-ink-2 tabular">{tables.length} {tables.length === 1 ? "pod" : "pods"}</p>
      <Line className="mt-s2">Your pods.</Line>
    </>
  );

  const foot = !verified ? (
    <Link href="/app/verify" className={GO}>
      Check it&apos;s you <Icon name="arrow" size={20} />
    </Link>
  ) : !arrive ? (
    <Link href="/app/discover" className={GO}>
      More pods <Icon name="arrow" size={20} />
    </Link>
  ) : null;

  return (
    <>
      <Stage light={arrive ? "dawn" : "paper"} />
      <Page
        chrome={chrome}
        scroll
        className="pods-room"
        head={<motion.div animate={{ opacity: zoom ? 0 : 1, y: zoom ? -12 : 0 }} transition={{ duration: 0.24 }}>{head}</motion.div>}
        object={<Tables tables={byKind(tables).slice(0, 4)} heroId={hero?.row.pod.id} arrive={arrive} minute={minute} zoom={zoom} setZoom={setZoom} widened={widened} opensAfter={opensAfter(tables, minute)} />}
        foot={foot && <motion.div animate={{ opacity: zoom ? 0 : 1 }} transition={{ duration: 0.2 }}>{foot}</motion.div>}
      />
    </>
  );
}

// ── the tables ──────────────────────────────────────────────────────────
// QA core r1: pods never overlap (an overlap claims shared members, and your demo pods share nobody but you). Each pod is
// its own glass bubble; its people are the white dots inside it (BRAND §1: the dot is the person), you are the ember dot.
// Labels sit under the bubble in one clear zone (name, state, and the widened note), never on a rim or a dot.
// Interests across the top row, communities across the foot (beat 2). A pod not yet open is the same bubble, lighter,
// with what opens it ("Opens after Sat"), never a dashed outline.

/** Interest pods first, then community pods (beat 2: "her interest pods and community pods"); order kept within each. */
function byKind(tables: RoomTable[]): RoomTable[] {
  return [...tables.filter((t) => t.row.pod.type !== "community"), ...tables.filter((t) => t.row.pod.type === "community")];
}

function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/** The label zone under a bubble: name + state (+ the widened note). Heights are fixed so rows line up. */
const LABEL_H = 64;
const NOTE_H = 44;

function Tables({
  tables,
  heroId,
  arrive,
  minute,
  zoom,
  setZoom,
  widened,
  opensAfter,
}: {
  tables: RoomTable[];
  heroId?: string;
  arrive: boolean;
  minute: number;
  zoom: string | null;
  setZoom: (id: string) => void;
  widened: { podId: string; from: string; to: string; line: string } | null;
  opensAfter: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [ref, box] = useBox<HTMLDivElement>();
  const me = useMe();
  const cols = tables.length === 1 ? 1 : 2;
  const rows = Math.ceil(tables.length / cols);
  const gapX = box.w >= 600 ? 48 : 20;
  const gapY = box.w >= 600 ? 32 : 20;
  const note = widened && tables.some((t) => t.row.pod.id === widened.podId) ? NOTE_H : 0;
  // the bubble fills its column, capped by the height left once every label zone is placed
  const byW = (box.w - gapX * (cols - 1)) / cols;
  const byH = (box.h - rows * LABEL_H - note - gapY * (rows - 1)) / rows;
  // a phone scrolls the Room (labels never squeeze); a laptop fits it in the frame
  const phone = box.w < 600;
  const D = Math.floor(Math.max(0, Math.min(tables.length === 1 ? 280 : phone ? 200 : 248, byW, phone ? byW : Math.max(140, byH))));

  useEffect(() => {
    if (!zoom) return;
    // the others step back, then the route changes and the shared circle carries into the table (Shared pod-<id>)
    const t = setTimeout(() => router.push(`/app/pods/${zoom}`), reduce ? 0 : 180);
    return () => clearTimeout(t);
  }, [zoom, router, reduce]);

  const open = (t: RoomTable) => {
    if (!t.open || zoom) return;
    zoomHandoff.podId = t.row.pod.id;
    setZoom(t.row.pod.id);
  };

  return (
    <div ref={ref} className="relative flex min-h-[360px] w-full items-center justify-center py-s6 lg:h-full lg:py-0" data-room>
      {D > 0 && (
        <ul
          className="grid justify-center"
          style={{ gridTemplateColumns: `repeat(${cols}, ${D}px)`, columnGap: gapX, rowGap: gapY }}
          aria-label="Your pods"
        >
          {tables.map((t, i) => {
            const hero = t.row.pod.id === heroId;
            const z = zoom === t.row.pod.id;
            const H = POD_SOLID[t.hue];
            const kind = t.row.pod.type === "community" ? "community" : "interest";
            const grows = arrive && !reduce && widened?.podId === t.row.pod.id;
            const delay = arrive ? 0.2 + i * STAGGER * 3 : 0;
            const state = t.open ? tableState(t, minute) : opensAfter;
            // the people: you first (ember, top), then everyone else as white dots, solid = said yes
            const n = Math.min(10, t.people.length + 1);
            const isWidened = widened?.podId === t.row.pod.id;
            return (
              <motion.li
                key={t.row.pod.id}
                className="flex min-w-0 flex-col items-center"
                data-pod-type={kind}
                initial={arrive && !reduce ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: zoom && !z ? 0 : 1, y: 0 }}
                transition={arrive ? { ...GENTLE, delay } : SNAPPY}
              >
                <button
                  type="button"
                  onClick={() => open(t)}
                  disabled={!t.open}
                  aria-label={`${t.row.name}, ${state}`}
                  className="group flex w-full flex-col items-center rounded-[28px] outline-offset-4 disabled:cursor-default"
                >
                  <Shared name={sharedName.pod(t.row.pod.id)}>
                    <motion.span
                      aria-hidden
                      data-depth={Math.min(3, Math.max(1, t.held + 1))}
                      className="orb relative block shrink-0"
                      style={{
                        width: D,
                        height: D,
                        opacity: t.open ? 1 : 0.5,
                        ["--orb" as string]: H,
                        ["--orb-wash" as string]: hero ? `${POD_WASH[t.hue]}, linear-gradient(color-mix(in srgb, ${H} 9%, transparent), color-mix(in srgb, ${H} 9%, transparent))` : POD_WASH[t.hue],
                      }}
                      initial={grows ? { scale: 0.55 } : arrive && !reduce ? { scale: 0.7 } : false}
                      animate={{ scale: z ? 1.06 : 1 }}
                      whileHover={t.open && !zoom && !reduce ? { scale: 1.03 } : undefined}
                      whileTap={t.open && !reduce ? { scale: 0.97 } : undefined}
                      transition={grows ? { duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: delay + 0.6 } : arrive ? { ...GENTLE, delay } : SNAPPY}
                    >
                      {/* worn rings: one per hangout held (C06) */}
                      {Array.from({ length: Math.min(3, t.held) }, (_, k) => (
                        <span key={k} className="pointer-events-none absolute rounded-full" style={{ inset: -(k + 1) * 6, border: `1px solid ${H}`, opacity: 0.32 - k * 0.08 }} />
                      ))}
                      {Array.from({ length: n }, (_, d) => {
                        const a = -Math.PI / 2 + (d / n) * Math.PI * 2;
                        const you = d === 0;
                        const p = you ? null : t.people[d - 1];
                        const size = you ? Math.round(D * 0.16) : Math.round(D * 0.085);
                        return (
                          <motion.span
                            key={d}
                            data-nc
                            className="absolute grid place-items-center rounded-full font-semibold leading-none text-on-spark"
                            initial={arrive && !reduce ? { scale: 0 } : false}
                            animate={{ scale: 1 }}
                            transition={{ ...SNAPPY, delay: arrive ? delay + 0.5 + d * STAGGER * 0.6 : 0 }}
                            style={{
                              width: size,
                              height: size,
                              left: `calc(${50 + Math.cos(a) * 31}% - ${size / 2}px)`,
                              top: `calc(${50 + Math.sin(a) * 31}% - ${size / 2}px)`,
                              fontSize: Math.round(size * 0.5),
                              color: you ? "var(--on-you)" : undefined,
                              backgroundColor: you ? "var(--you)" : p?.in ? "var(--lit)" : "color-mix(in srgb, var(--lit) 55%, transparent)",
                              backgroundImage: "var(--bead)",
                              boxShadow: you ? "var(--shadow-bead)" : "0 1px 2px rgb(0 0 0 / .14)",
                            }}
                          >
                            {you ? (me?.first_name ?? "").slice(0, 1).toUpperCase() : null}
                          </motion.span>
                        );
                      })}
                    </motion.span>
                  </Shared>
                  <span className="mt-s3 flex w-full flex-col items-center text-center" style={{ minHeight: LABEL_H - 12 }}>
                    <span className="relative grid w-full text-[19px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink [text-wrap:balance] lg:text-[24px]">
                      {grows && widened ? (
                        <>
                          <motion.span className="[grid-area:1/1]" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.3, delay: delay + 1.2 }}>
                            {widened.from}
                          </motion.span>
                          <motion.span className="[grid-area:1/1]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: delay + 1.3 }}>
                            {t.row.name}
                          </motion.span>
                        </>
                      ) : (
                        t.row.name
                      )}
                    </span>
                    <span className={`mt-1 text-label tabular ${hero ? "font-semibold text-ink" : "text-ink-2"}`}>{state}</span>
                  </span>
                </button>
                {isWidened && widened && (
                  <motion.p
                    className="glass mt-s2 flex max-w-full items-start gap-s1 rounded-[14px] px-s3 py-s2 text-left text-[13px] leading-[1.3] text-ink"
                    data-widened-note
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...GENTLE, delay: arrive ? delay + 1.6 : 0.3 }}
                  >
                    <WidenGlyph size={16} className="mt-px shrink-0 text-grove-text" />
                    <span>
                      {widened.line} Widened to {widened.to}.
                    </span>
                  </motion.p>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyTable() {
  return (
    <span aria-hidden className="pods-breathe block size-[min(64vw,320px)] rounded-full" style={{ border: "1.5px dashed var(--ink-3)" }} />
  );
}

// ── C07 list view ───────────────────────────────────────────────────────

function RoomList({ tables, minute, closed }: { tables: RoomTable[]; minute: number; closed: string }) {
  return (
    <ul className="mt-s8 w-0 min-w-full max-w-[640px] self-start border-t border-line lg:mt-[116px] lg:w-full lg:min-w-0" aria-label="Your pods">
      {tables.map((t) => {
        const row = (
          <>
            <span
              aria-hidden
              data-nc
              className="size-10 shrink-0 rounded-full"
              data-depth={Math.min(3, Math.max(1, t.held + 1))}
              style={{ background: `${POD_WASH[t.hue]}, var(--lit)`, boxShadow: `inset 0 0 0 1.5px ${POD_SOLID[t.hue]}`, opacity: t.open ? 1 : 0.55 }}
            />
            <span className="min-w-0 flex-1 truncate font-display text-[24px] leading-[1.2] font-semibold tracking-[-0.02em] lg:text-[28px]">{t.row.name}</span>
            <span className="shrink-0 text-label text-ink-2">{tableState(t, minute, closed)}</span>
          </>
        );
        return (
          <li key={t.row.pod.id} className="border-b border-line">
            {t.open ? (
              <Link href={`/app/pods/${t.row.pod.id}`} className="flex min-h-[72px] items-center gap-s4 outline-offset-[-2px]">
                {row}
              </Link>
            ) : (
              <div className="flex min-h-[72px] items-center gap-s4 opacity-70">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** For tests and the director: the Room's table order. */
export function useRoomOrder() {
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  return useMemo(() => tables.filter((t) => t.open).map((t) => t.row.pod.id), [tables]);
}
