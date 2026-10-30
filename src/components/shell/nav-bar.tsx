// Navigation (MOTION_SYSTEM §12; PLATFORM_SPEC §C). The data is lib/platform/nav.ts, so the phone capsule, the laptop
// rail and the ⌘K palette never disagree.
//   Phone   the capsule: a floating glass pill 12px above the safe area. Home · Pods · Plans · Inbox as circle glyphs
//           with one word each, then your own disc (You). The active item sits in a small lit bubble that slides
//           between items (layoutId "nav-bubble", SNAPPY). Hides on scroll down, returns on scroll up, and sinks
//           under any open sheet.
//   Laptop  the rail: 232px of glass on the left. The mark, the four, then Discover · People · Search ⌘K, your disc at
//           the foot. Same sliding bubble.
//   Keys    ⌘K / Ctrl+K palette, g then h p l i y d e, / search, comma settings. Esc closes the palette.
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SNAPPY } from "@/components/brand/motion";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { useDb, useMe } from "@/lib/db/hooks";
import { activeDestination, destinationsFor, DESTINATIONS, type Destination, type DestinationId } from "@/lib/platform/nav";
import { searchAll, unreadCount } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { toChicagoISO } from "@/lib/time/tz";
import { NAV_GLYPH, SearchGlyph } from "./nav-glyphs";
import { isTypingTarget } from "./shortcuts";

// ── shared bits ─────────────────────────────────────────────────────────

function YouDisc({ size = 32, on }: { size?: number; on?: boolean }) {
  const me = useMe();
  const initial = (me?.first_name ?? "").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden
      data-nc
      className="grid shrink-0 place-items-center rounded-full bg-ink leading-none font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.46),
        backgroundImage: "var(--bead)",
        boxShadow: on ? "0 0 0 2px var(--lit), 0 0 0 3.5px var(--select)" : "var(--shadow-bead)",
      }}
    >
      {initial}
    </span>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <motion.span
      key={n}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SNAPPY}
      className="tabular absolute -top-1 left-[calc(50%+4px)] grid h-[20px] min-w-[20px] place-items-center rounded-full bg-spark px-1 text-[12px] leading-none font-semibold text-on-spark shadow-[0_0_0_2px_var(--lit)]"
    >
      {n > 9 ? "9+" : n}
    </motion.span>
  );
}

/** The lit bubble behind the active item. One per surface; it slides between items. */
function Bubble({ id, className }: { id: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      layoutId={id}
      aria-hidden
      transition={reduce ? { duration: 0 } : SNAPPY}
      className={cn("pods-nav-bubble absolute inset-0 rounded-full", className)}
    />
  );
}

// ── phone: the capsule ──────────────────────────────────────────────────

export function NavCapsule() {
  const pathname = usePathname() ?? "";
  const active = activeDestination(pathname);
  const unread = useDb(unreadCount);
  const items = destinationsFor("phone").filter((d) => d.id !== "you");
  const [hidden, setHidden] = useState(false);

  // hide on scroll down, return on scroll up (only pages that scroll ever move it)
  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setHidden(false), [pathname]);

  return (
    <nav aria-label="Main" className="pods-nav-capsule lg:hidden" data-hidden={hidden ? "" : undefined}>
      <LayoutGroup id="capsule">
        <ul className="glass flex items-center gap-s1 rounded-full p-1.5">
          {items.map((d) => {
            const on = d.id === active;
            const G = NAV_GLYPH[d.id];
            return (
              <li key={d.id} className="relative">
                <Link
                  href={d.href}
                  aria-current={on ? "page" : undefined}
                  aria-label={d.id === "inbox" && unread ? `${d.label}, ${unread} new` : d.label}
                  className={cn("pressable relative flex h-[56px] w-[62px] flex-col items-center justify-center gap-1 rounded-full outline-offset-2", on ? "text-select" : "text-ink-2")}
                >
                  {on && <Bubble id="nav-bubble" />}
                  <span className="relative">
                    <G on={on} size={24} />
                  </span>
                  <span className={cn("relative text-[12px] leading-none", on ? "font-semibold" : "font-medium")}>{d.label}</span>
                  {d.id === "inbox" && <Count n={unread} />}
                </Link>
              </li>
            );
          })}
          <li className="relative ml-s1">
            <Link href="/app/profile" aria-label="You" aria-current={active === "you" ? "page" : undefined} className="pressable relative grid size-[56px] place-items-center rounded-full outline-offset-2">
              {active === "you" && <Bubble id="nav-bubble" />}
              <span className="relative">
                <YouDisc size={34} on={active === "you"} />
              </span>
            </Link>
          </li>
        </ul>
      </LayoutGroup>
    </nav>
  );
}

// ── laptop: the rail ────────────────────────────────────────────────────

export function NavRail({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname() ?? "";
  const active = activeDestination(pathname);
  const unread = useDb(unreadCount);
  const me = useMe();
  const all = destinationsFor("laptop");
  const primary = all.filter((d) => d.slot === "primary" && d.id !== "you");
  const more = all.filter((d) => d.slot === "rail");

  const item = (d: Destination) => {
    const on = d.id === active;
    const G = NAV_GLYPH[d.id];
    return (
      <li key={d.id} className="relative">
        <Link
          href={d.href}
          aria-current={on ? "page" : undefined}
          className={cn("pressable relative flex h-11 items-center gap-s3 rounded-full px-s3 text-[16px] outline-offset-2", on ? "font-semibold text-select" : "font-medium text-ink-2 hover:text-ink")}
        >
          {on && <Bubble id="rail-bubble" />}
          <G on={on} size={22} className="relative shrink-0" />
          <span className="relative flex-1">{d.label}</span>
          {d.id === "inbox" && unread > 0 && (
            <span className="tabular relative grid h-5 min-w-5 place-items-center rounded-full bg-spark px-1.5 text-[12px] font-semibold text-on-spark">{unread}</span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="pods-nav-rail hidden lg:flex">
      <div className="flex h-11 items-center gap-s2 px-s1">
        <Link
          href="/app/home"
          aria-label="Home"
          data-mark
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="inline-flex h-11 items-center gap-s2 rounded-full px-s1 outline-offset-2"
          style={{ WebkitTouchCallout: "none", userSelect: "none" }}
        >
          <LogoMark size={26} title="" />
          <Wordmark className="h-[18px] w-auto" title="Pods" />
        </Link>
      </div>
      <LayoutGroup id="rail">
        <ul className="mt-s12 flex flex-col gap-s1">{primary.map(item)}</ul>
        <ul className="mt-s8 flex flex-col gap-s1">
          {more.map(item)}
          <li>
            <button
              type="button"
              onClick={onSearch}
              className="pressable flex h-11 w-full items-center gap-s3 rounded-full px-s3 text-[16px] font-medium text-ink-2 outline-offset-2 hover:text-ink"
            >
              <SearchGlyph size={22} className="shrink-0" />
              <span className="flex-1 text-left">Search</span>
              <kbd className="text-[12px] font-medium text-ink-3">⌘K</kbd>
            </button>
          </li>
        </ul>
        <div className="mt-auto">
          <Link
            href="/app/profile"
            aria-current={active === "you" ? "page" : undefined}
            className={cn("pressable relative flex h-14 items-center gap-s3 rounded-full px-s2 text-[16px] outline-offset-2", active === "you" ? "font-semibold text-ink" : "font-medium text-ink-2 hover:text-ink")}
          >
            {active === "you" && <Bubble id="rail-bubble" />}
            <span className="relative">
              <YouDisc size={36} />
            </span>
            <span className="relative truncate">{me?.first_name ?? "You"}</span>
          </Link>
        </div>
      </LayoutGroup>
    </nav>
  );
}

// ── ⌘K: the palette ─────────────────────────────────────────────────────

type Hit = { key: string; label: string; sub?: string; href: string; glyph: DestinationId | null };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const iso = toChicagoISO(useClock(60_000).getTime());
  const found = useDb(useCallback((db) => (q.trim() ? searchAll(db, q, iso, 8) : []), [q, iso]));

  const hits: Hit[] = useMemo(() => {
    const s = q.trim().toLowerCase();
    const dests = DESTINATIONS.filter((d) => !s || d.label.toLowerCase().includes(s)).map((d): Hit => ({ key: `d:${d.id}`, label: d.label, sub: `g ${d.key}`, href: d.href, glyph: d.id }));
    const more = found.map((h): Hit => ({ key: `${h.kind}:${h.id}`, label: h.label, sub: h.sub, href: h.href, glyph: h.kind === "pod" ? "pods" : h.kind === "person" ? "people" : h.kind === "plan" ? "plans" : "discover" }));
    return [...more, ...dests].slice(0, 10);
  }, [q, found]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fresh palette each time
    setQ("");
    setAt(0);
    const t = setTimeout(() => input.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    router.push(h.href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-sheet grid place-items-start justify-center px-s4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button type="button" aria-label="Close" tabIndex={-1} className="pods-scrim absolute inset-0 cursor-default" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Go to"
            className="glass relative w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-[28px]"
            initial={reduce ? false : { scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={reduce ? undefined : { scale: 0.98, y: -4 }}
            transition={SNAPPY}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") (e.preventDefault(), setAt((a) => Math.min(hits.length - 1, a + 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setAt((a) => Math.max(0, a - 1)));
              if (e.key === "Enter") (e.preventDefault(), go(hits[at]));
            }}
          >
            <label className="flex h-16 items-center gap-s3 border-b border-line px-s6">
              <SearchGlyph size={22} className="shrink-0 text-ink-2" />
              <span className="sr-only">Search pods, people, plans</span>
              <input
                ref={input}
                value={q}
                onChange={(e) => (setQ(e.target.value), setAt(0))}
                placeholder="Pods, people, plans"
                className="h-full min-w-0 flex-1 bg-transparent text-[18px] text-ink outline-none placeholder:text-ink-3"
                autoComplete="off"
              />
              <kbd className="text-[12px] font-medium text-ink-3">esc</kbd>
            </label>
            <ul role="listbox" aria-label="Results" className="max-h-[52vh] overflow-y-auto p-s2">
              {hits.map((h, i) => {
                const G = h.glyph ? NAV_GLYPH[h.glyph] : null;
                return (
                  <li key={h.key} role="option" aria-selected={i === at}>
                    <button
                      type="button"
                      onMouseEnter={() => setAt(i)}
                      onClick={() => go(h)}
                      className={cn("flex min-h-12 w-full items-center gap-s3 rounded-[16px] px-s4 text-left", i === at && "bg-[color-mix(in_srgb,var(--select)_9%,transparent)]")}
                    >
                      {G && <G size={20} className="shrink-0 text-ink-2" />}
                      <span className="flex-1 truncate text-[16px] font-medium text-ink">{h.label}</span>
                      {h.sub && <span className="shrink-0 text-[13px] text-ink-3">{h.sub}</span>}
                    </button>
                  </li>
                );
              })}
              {!hits.length && <li className="px-s4 py-s6 text-[15px] text-ink-2">No matches.</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ⌘K, g-then-key, / and comma. Returns the palette state. */
export function useNavKeys() {
  const router = useRouter();
  const [palette, setPalette] = useState(false);
  const pending = useRef<number>(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || document.querySelector('[role="dialog"]')) return;
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (e.key === ",") return void router.push("/app/settings");
      if (e.key === "g") {
        pending.current = Date.now();
        return;
      }
      if (Date.now() - pending.current < 1200) {
        pending.current = 0;
        const d = DESTINATIONS.find((x) => x.key === e.key.toLowerCase() && x.key.length === 1 && /[a-z]/.test(x.key));
        if (d) router.push(d.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return { palette, setPalette };
}
