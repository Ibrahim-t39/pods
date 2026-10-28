// Admin shell v3 (DESIGN.md §5, §10; template.md anatomy G; wireframes K01-K04; COLOR_LIFE §10 "admin").
// Same brand as the member app, calm, a real ops tool: cool paper under logo light, the rows on one white table.
// Colour follows the thesis ("Overlap", COLOR_LIFE §5-6): a pod is two logo circles meeting (PodPair), its overlap
// deepening with every hangout held; chosen/current = --select (the plan's blue); teal stays on the moderation icons
// (moderation is safety); status as calm chips (open = signal, settled = grove, removed = red text). The mark top-left (home = the queue; the hidden 700 ms Director press), ONE switcher top-right (no tab row,
// no sidebar). Laptop: the bold head sits in a 520 px column at the left and the table beside it after a 96 px gap
// (DESIGN §9 rule 6). Admin authorization is a launch item (library C #8).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { MarkButton } from "@/components/brand/mark-button";
import { ARRIVE, DUR, EASE as EASES, SNAPPY, useCalmMotion } from "@/components/brand/motion";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { POD_SOLID, type PodHueKey } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useDb } from "@/lib/db/hooks";

export const ADMIN_NAV = [
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/pods", label: "Pods" },
  { href: "/admin/hangouts", label: "Hangouts" },
  { href: "/admin", label: "Overview" },
] as const;

const EASE = EASES.out;

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/admin";
  const urgent = useDb((db) => Object.values(db.reports).some((r) => r.status === "open" && r.urgent));
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const current = ADMIN_NAV.find((n) => active(n.href)) ?? ADMIN_NAV[3];
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const barOpacity = useTransform(scrollY, [40, 88], [0, 1]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh flex-col text-ink">
      {/* Condensing head (MOTION_SYSTEM §4, admin lists): past 40 px a glass bar fades in under the header and the
          large page word fades into it (AdminPage); the switcher already names the page, so the bar repeats nothing. */}
      <motion.div aria-hidden className="glass pointer-events-none fixed inset-x-0 top-0 z-header h-[calc(env(safe-area-inset-top)+68px)] rounded-b-[20px] lg:h-[96px]" style={{ opacity: barOpacity }} />
      <header className="sticky top-0 z-header mx-auto flex h-[calc(env(safe-area-inset-top)+68px)] w-full max-w-[1440px] items-end justify-between px-gutter pb-s3 lg:h-[96px] lg:items-center lg:px-s16 lg:pb-0">
        <span className="-ml-2">
          <MarkButton href="/admin/reports" label="Pods admin" size={30} />
        </span>
        <div ref={box} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="pressable -mr-2 inline-flex h-11 items-center gap-s2 rounded-full px-2 text-[16px] font-medium text-ink"
          >
            <Icon name="room" size={22} className="text-teal" />
            <span className="u">{current.label}</span>
            {urgent && (
              <span aria-label="urgent report open" className="relative grid size-2 place-items-center">
                <motion.span aria-hidden className="absolute inset-0 rounded-full bg-info" animate={{ scale: [1, 2.4], opacity: [0.5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
                <span className="size-2 rounded-full bg-info" />
              </span>
            )}
          </button>
          <AnimatePresence>
            {open && (
              <motion.nav
                aria-label="Admin"
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: DUR.move, ease: EASE }}
                style={{ transformOrigin: "top right" }}
                className="absolute top-14 right-0 z-overlay w-60 rounded-[28px] bg-lit p-s2 shadow-lg ring-1 ring-line"
              >
                {ADMIN_NAV.map((n) => {
                  const on = active(n.href);
                  return (
                    <Link
                      key={n.href}
                      role="menuitem"
                      href={n.href}
                      aria-current={on ? "page" : undefined}
                      className={cn("flex h-12 items-center gap-s3 rounded-full px-s4 text-[20px] font-semibold tracking-[-0.02em] text-ink-2 hover:bg-primary-soft hover:text-ink", on && "bg-primary-soft text-primary-soft-text")}
                    >
                      <span aria-hidden className={cn("size-2.5 rounded-full", on ? "bg-select" : "shadow-[inset_0_0_0_1.5px_var(--line-2)]")} />
                      {n.label}
                    </Link>
                  );
                })}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-gutter pt-s4 pb-s16 lg:px-s16 lg:pt-s16">{children}</main>
    </div>
  );
}

/**
 * The admin page: head (bold word + one quiet label + at most one filter link) and the rows.
 * Phone: stacked, 32 px between the head and the rows. Laptop: the head in a 520 px column, rows beside it.
 * `side` replaces the head on laptop (the open report) while the rows stay put.
 */
export function AdminPage({ title, sub, link, children, side }: { title: string; sub?: ReactNode; link?: ReactNode; children: ReactNode; side?: ReactNode }) {
  // phone only: the large word condenses into the glass bar (on laptop the head is a sticky column and stays put)
  const wide = useMediaQuery("(min-width: 1024px)");
  const calm = useCalmMotion();
  const { scrollY } = useScroll();
  const still = wide || calm;
  const headOpacity = useTransform(scrollY, [0, 72], wide ? [1, 1] : [1, 0]);
  const headScale = useTransform(scrollY, [0, 72], still ? [1, 1] : [1, 0.92]);
  const headY = useTransform(scrollY, [0, 72], still ? [0, 0] : [0, -10]);
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-s24">
      <div className="lg:sticky lg:top-s24 lg:self-start">
        <AnimatePresence mode="wait" initial={false}>
          {side ?? (
            <motion.div key="head" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR.move, ease: EASE }}>
              <motion.div style={{ opacity: headOpacity, scale: headScale, y: headY, transformOrigin: "0% 100%" }}>
                <h1 className="line text-display-lg">{title}</h1>
                {sub && <p className="tabular mt-s3 text-[16px] font-medium text-ink-2 lg:text-[18px]">{sub}</p>}
              </motion.div>
              {link && <div className="mt-s4 hidden lg:block">{link}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-s8 lg:mt-0">
        <div className="rounded-[28px] bg-lit px-s4 py-s2 shadow-sm ring-1 ring-line lg:px-s6 lg:py-s3">{children}</div>
        {link && <div className="mt-s6 lg:hidden">{link}</div>}
      </div>
    </div>
  );
}

/** The one filter link per screen (an underlined word, 44 px tall). */
export function FilterLink({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="pressable inline-flex min-h-11 items-center gap-s2 text-[15px] font-medium text-ink">
      <Icon name={on ? "back" : "list"} size={18} className="text-select" />
      <span className="u">{children}</span>
    </button>
  );
}

/** A closed or settled row passes hue "ink": a hollow dot.
 * A queue row (records, so `data-data`: the word gate counts copy, not rows): the pod as a dot (reports) or a ring
 * (pods, hangouts) in its family colour, a bold title, a quiet meta on the right, an optional status chip. */
export function AdminRow({
  hue,
  mark = "dot",
  rings = 1,
  waiting,
  title,
  meta,
  under,
  chip,
  onClick,
  selected,
  lit,
  index = 0,
  ...rest
}: {
  hue: PodHueKey | "ink";
  mark?: "dot" | "ring";
  /** worn rings: one per held hangout (Repeat is visible, V3_SPEC §1) */
  rings?: number;
  /** a pod whose plan has not locked yet: the pair drawn dashed, nothing settled (COLOR_LIFE §6.3) */
  waiting?: boolean;
  title: ReactNode;
  meta?: ReactNode;
  under?: ReactNode;
  /** a status chip (StatusChip) shown beside the meta */
  chip?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  lit?: boolean;
  index?: number;
  [k: `data-${string}`]: string | boolean | undefined;
}) {
  const color = hue === "ink" ? "var(--ink)" : POD_SOLID[hue];
  const body = (
    <>
      <PodMark color={color} hue={hue} mark={mark} rings={rings} waiting={waiting} />
      <span className="flex min-w-0 flex-1 flex-col gap-s1">
        <span className="tabular truncate text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] lg:text-[26px]">{title}</span>
        {(meta || under || chip) && (
          <span className="flex min-w-0 items-center gap-s2 lg:hidden">
            {chip}
            {(meta || under) && (
              <span className="tabular truncate text-[14px] text-ink-2">
                {[meta, under].filter(Boolean).map((x, i) => (
                  <span key={i}>{i > 0 && " · "}{x}</span>
                ))}
              </span>
            )}
          </span>
        )}
      </span>
      {(meta || under || chip) && (
        <span className="hidden shrink-0 flex-col items-end gap-s1 text-right lg:flex">
          {meta && <span className="tabular text-[15px] text-ink-2">{meta}</span>}
          {under && <span className="tabular text-[13px] text-ink-2">{under}</span>}
          {chip}
        </span>
      )}
    </>
  );
  const cls = cn(
    "relative flex min-h-[72px] w-full items-center gap-s4 py-s3 text-left",
    "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line group-last:after:hidden",
  );
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ ...ARRIVE, delay: Math.min(index, 8) * 0.04 }}
      className="group relative list-none"
      data-data
      {...rest}
    >
      {(selected || lit) && (
        <motion.span
          layoutId={selected ? "admin-row-lit" : undefined}
          aria-hidden
          className={cn("absolute -inset-x-s3 inset-y-0 rounded-[20px]", selected ? "bg-primary-soft shadow-[inset_0_0_0_1.5px_var(--color-signal-soft-border)]" : "bg-[color-mix(in_srgb,var(--color-signal-soft)_70%,transparent)]")}
          transition={SNAPPY}
        />
      )}
      {onClick ? (
        <button type="button" onClick={onClick} aria-current={selected || undefined} className={cn(cls, "pressable relative")}>
          {body}
        </button>
      ) : (
        <div className={cn(cls, "relative")}>{body}</div>
      )}
    </motion.li>
  );
}

function PodMark({ color, hue, mark, rings, waiting }: { color: string; hue: PodHueKey | "ink"; mark: "dot" | "ring"; rings: number; waiting?: boolean }) {
  if (mark === "dot" && hue === "ink") return <span aria-hidden className="mx-[13px] size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_var(--ink-2)]" />;
  if (mark === "dot") return <span aria-hidden className="mx-[13px] size-3.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 16%, transparent)` }} />;
  return <PodPair hue={hue === "ink" ? "ember" : hue} held={rings - 1} waiting={waiting} />;
}

/** A pod's two logo circles (COLOR_LIFE §6.3): tide = blue x green, grove = green x ember, dusk = ember x blue. */
export const POD_PAIR: Record<PodHueKey, readonly [string, string]> = {
  ember: ["var(--color-signal)", "var(--color-grove)"],
  grove: ["var(--color-grove)", "var(--color-ember)"],
  signal: ["var(--color-ember)", "var(--color-signal)"],
};

/**
 * A pod as two circles meeting, drawn like the logo: solid circles, the overlap (multiply) darker, because it is what
 * they share. Repeat is visible: each held hangout deepens the circles (depth 1-3, the same steps as data-depth).
 * `waiting` = has not met again yet: two dashed outlines, nothing shared yet.
 */
export function PodPair({ hue, held = 0, size = 40, waiting, className }: { hue: PodHueKey; held?: number; size?: number; waiting?: boolean; className?: string }) {
  const [a, b] = POD_PAIR[hue];
  const depth = Math.min(3, Math.max(1, held));
  const alpha = [0.5, 0.7, 0.9][depth - 1];
  return (
    <svg aria-hidden viewBox="0 0 40 40" width={size} height={size} className={cn("shrink-0", className)} fill="none">
      <g style={{ isolation: "isolate" }}>
        {([[14, a], [26, b]] as const).map(([cx, c], i) =>
          waiting ? (
            <circle key={i} cx={cx} cy="20" r="9.5" stroke={c} strokeWidth="1.75" strokeDasharray="3 2.5" />
          ) : (
            <circle key={i} cx={cx} cy="20" r="10.5" fill={c} fillOpacity={alpha} style={{ mixBlendMode: "multiply" }} />
          ),
        )}
      </g>
    </svg>
  );
}

/** A calm status chip (COLOR_LIFE §10 admin): open = signal, settled = grove, removed = red text only. */
export function StatusChip({ tone, children }: { tone: "open" | "done" | "locked" | "removed"; children: ReactNode }) {
  if (tone === "removed") return <span className="text-[13px] font-semibold text-danger-text">{children}</span>;
  // "Locked": the member app's word and blue, as quiet text with the settled dot (calm in a column of rows)
  if (tone === "locked")
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1.5 text-[13px] font-semibold text-select">
        <span aria-hidden className="size-1.5 rounded-full bg-select" />
        {children}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold",
        tone === "open" ? "bg-info-soft text-info-text" : "bg-success-soft text-success-text",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", tone === "open" ? "bg-info" : "bg-success")} />
      {children}
    </span>
  );
}
