// Director panel (BLUEPRINT SY-04). Hidden: closed by default and never hinted at in the UI. Opens only with
// ?director=1, Ctrl/Cmd + ., or a 700 ms press on the mark (MarkButton fires DIRECTOR_EVENT; the press is also caught
// here at the document level for any [data-mark]). Opening it also unlocks /admin for this browser (OPS_KEY).
// Solid night surface (no moment art behind text), rows ordered by the video beats (Scene 5), engine toggles folded
// away. Phone: a compact drawer above the nav capsule; laptop: a right-hand card. After a beat action it folds to a
// small pill so the camera sees the product, not the panel.
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon, type IconName } from "@/components/icons";
const G = (n: IconName, size = 18) => <Icon name={n} size={size} />;
import { cn } from "@/lib/cn";
import { Switch } from "@/components/ui/switch";
import { Kbd } from "@/components/ui/kbd";
import { DEMO } from "@/config/demo";
import { useDb, useRepo } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { formatWhen } from "@/lib/time/format";
import {
  checkHealth,
  demoHangout,
  everyoneChecksIn,
  jumpAfterHangout,
  makeItRain,
  oneDecline,
  resetDemo,
  revealRunItBack,
  setDemoFlag,
  skipToPlaced,
  type ActionResult,
} from "@/lib/simulation/director";

import { DIRECTOR_EVENT } from "./director-event";
export { DIRECTOR_EVENT };
const LONG_PRESS_MS = 700;

/** localStorage flag that unlocks /admin in this browser (set by any Director trigger or ?admin=1). */
export const OPS_KEY = "pods:ops";
export const OPS_EVENT = "pods:ops-unlock";
export function unlockOps() {
  try {
    localStorage.setItem(OPS_KEY, "1");
  } catch {
    /* storage blocked: the unlock lasts for this page only */
  }
  window.dispatchEvent(new Event(OPS_EVENT));
}

/** Hook: panel open state + all the ways to open it. */
export function useDirectorOpen() {
  const [open, setOpen] = useState(false);
  // ?director=1 opens it folded to its pill (QA r1: it covered the onboarding screen and the plan card)
  const [fromUrl, setFromUrl] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("director") === "1") {
      setOpen(true);
      setFromUrl(true);
      // one-shot: drop the flag so a reload (or a recording retake) does not reopen the panel
      url.searchParams.delete("director");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(DIRECTOR_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(DIRECTOR_EVENT, onEvent);
    };
  }, []);

  // Long-press the mark (700 ms), caught at the document so any [data-mark] works; the click that follows is swallowed.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;
    let sx = 0;
    let sy = 0;
    const isBar = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("[data-mark]");
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const down = (e: PointerEvent) => {
      if (!isBar(e.target)) return;
      fired = false;
      sx = e.clientX;
      sy = e.clientY;
      clear();
      timer = setTimeout(() => {
        fired = true;
        try {
          navigator.vibrate?.(12);
        } catch {
          /* no haptics */
        }
        setOpen(true);
      }, LONG_PRESS_MS);
    };
    const move = (e: PointerEvent) => {
      if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clear();
    };
    const click = (e: MouseEvent) => {
      if (fired && isBar(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
      fired = false;
    };
    const menu = (e: Event) => {
      if (isBar(e.target)) e.preventDefault(); // no iOS/Android context menu on the bar
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", clear, true);
    document.addEventListener("pointercancel", clear, true);
    document.addEventListener("click", click, true);
    document.addEventListener("contextmenu", menu, true);
    return () => {
      clear();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", clear, true);
      document.removeEventListener("pointercancel", clear, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("contextmenu", menu, true);
    };
  }, []);

  return [open, setOpen, fromUrl] as const;
}

/** A plain down chevron (drawn here: the icon set has no chevron). */
function Chevron({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

function Row({
  icon,
  step,
  label,
  hint,
  onClick,
  busy,
  tone = "default",
  testId,
}: {
  icon: ReactNode;
  /** the video beat this row stages (Scene 5), drawn as a number */
  step?: string;
  label: string;
  hint?: string;
  onClick: () => void;
  busy?: boolean;
  tone?: "default" | "danger";
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-testid={testId}
      className={cn(
        "pressable flex min-h-14 w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left outline-offset-[-2px]",
        "hover:bg-sunken focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-50",
        tone === "danger" ? "text-danger-text" : "text-fg",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "tabular grid size-9 shrink-0 place-items-center rounded-full text-[15px] font-semibold",
          tone === "danger" ? "bg-[rgba(255,175,176,0.14)]" : step ? "bg-lamp text-[var(--night)]" : "bg-sunken text-fg",
        )}
      >
        {step ?? icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-tight font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-snug text-fg-muted">{hint}</span>}
      </span>
    </button>
  );
}

function Toggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `dir-${label.replace(/\W+/g, "-")}`;
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-[16px] px-3 py-2">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-fg">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span id={id} className="block text-[16px] leading-tight font-semibold text-fg">
          {label}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-fg-muted">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-labelledby={id} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-2 pb-1">
      <h3 className="px-3 pt-2 pb-1 text-[13px] font-medium text-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}

/** Closed by default: the body (which reads the clock) only mounts once opened, so nothing time-based runs in prerender. */
export function DirectorPanel() {
  const [open, setOpen, fromUrl] = useDirectorOpen();
  return (
    <AnimatePresence>
      {open && <PanelBody startFolded={fromUrl} onClose={() => setOpen(false)} />}
    </AnimatePresence>
  );
}

// a solid surface: the night colour without the moment art (.bg-night paints --moment, which put bubbles behind text)
const SURFACE = "bg-[var(--night)] text-lamp shadow-[0_24px_60px_-12px_rgba(6,38,43,0.55),0_0_0_1px_rgba(242,255,250,0.10)]";

function PanelBody({ onClose, startFolded = false }: { onClose: () => void; startFolded?: boolean }) {
  const repo = useRepo();
  const demo = useDb((d) => d.config.demo);
  const state = useDb((d) => {
    const h = demoHangout(d);
    return {
      me: d.me ? d.users[d.me]?.first_name : null,
      hangout: h ? { status: h.status, seq: h.sequence } : null,
    };
  });
  const now = useClock(5000);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [folded, setFolded] = useState(startFolded);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    unlockOps();
    closeRef.current?.focus();
  }, []);

  /** Runs an action; beat actions (`fold`) fold the panel to its pill afterwards so the screen is clear for camera. */
  const run = useCallback(
    async (key: string, fn: () => ActionResult | Promise<ActionResult>, fold = false) => {
      setBusy(key);
      try {
        const r = await fn();
        setResult(r);
        if (fold && r.ok) setFolded(true);
      } catch {
        setResult({ ok: false, message: "That didn't work." });
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  // the demo default is the park courts (video script); "rain" means the run has moved indoors to the Rec Center
  const rain = demo.venueVariant === "rec_center";
  const where = cn(
    "fixed z-toast",
    "right-2 bottom-[calc(env(safe-area-inset-bottom)+96px)]",
    "md:right-4 md:bottom-4",
  );

  if (folded)
    return (
      <motion.div
        role="dialog"
        aria-label="Director panel"
        data-director-panel
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.14 } }}
        className={cn(where, SURFACE, "flex h-[52px] max-w-[calc(100vw-16px)] items-center gap-1 rounded-full pr-1 pl-1")}
      >
        <button
          type="button"
          onClick={() => setFolded(false)}
          aria-label="Open director panel"
          className="pressable flex h-11 min-w-0 items-center gap-2 rounded-full px-3 text-[14px] font-semibold text-fg hover:bg-sunken"
        >
          {G("room", 18)}
          <span className="max-w-[220px] truncate">{result?.message ?? "Director"}</span>
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close director panel"
          className="pressable grid size-11 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-sunken"
        >
          {G("close", 18)}
        </button>
      </motion.div>
    );

  return (
    <motion.aside
      role="dialog"
      aria-label="Director panel"
      data-director-panel
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.14 } }}
      className={cn(
        where,
        SURFACE,
        "left-2 flex max-h-[min(58dvh,560px)] flex-col overflow-hidden rounded-[24px]",
        "md:left-auto md:max-h-[min(86dvh,760px)] md:w-[400px]",
      )}
    >
      <header className="flex items-center gap-3 border-b border-border py-2.5 pr-2 pl-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-tight font-semibold text-fg">Director</h2>
          <p className="tabular truncate text-[13px] text-fg-muted">
            {formatWhen(now)}
            {state.me ? ` · ${state.me}` : " · signed out"}
            {state.hangout ? ` · #${state.hangout.seq} ${state.hangout.status.replace("_", " ")}` : ""}
          </p>
        </div>
        <Kbd className="border-border bg-transparent text-fg-muted">⌘.</Kbd>
        <button
          type="button"
          onClick={() => setFolded(true)}
          aria-label="Fold director panel"
          className="pressable grid size-11 place-items-center rounded-full text-fg-muted hover:bg-sunken"
        >
          <Chevron size={20} />
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close director panel"
          className="pressable grid size-11 place-items-center rounded-full text-fg-muted hover:bg-sunken"
        >
          {G("close", 20)}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-2">
        <Group title="Video beats">
          <Row
            testId="dir-skip"
            step="1"
            icon={G("seat", 18)}
            label="Skip sign-up"
            hint="Chanda placed in her pods (beats 1-3)"
            busy={busy === "skip"}
            onClick={() => run("skip", () => skipToPlaced(repo), true)}
          />
          <Row
            testId="dir-jump"
            step="7"
            icon={G("clock", 18)}
            label={DEMO.directorJump.label}
            hint="Check-in prompt goes out"
            busy={busy === "jump"}
            onClick={() => run("jump", () => jumpAfterHangout(), true)}
          />
          <Row
            testId="dir-checkin"
            step="7"
            icon={G("here", 18)}
            label="Everyone checks in"
            hint="Every member who was going"
            busy={busy === "checkin"}
            onClick={() => run("checkin", () => everyoneChecksIn())}
          />
          <Row
            testId="dir-reveal"
            step="7"
            icon={G("again", 18)}
            label="Answer for the pod"
            hint="Run it back count shows, the vote opens"
            busy={busy === "reveal"}
            onClick={() => run("reveal", () => revealRunItBack(), true)}
          />
        </Group>

        <Group title="Extras">
          <Row
            testId="dir-rain"
            icon={G("rain", 18)}
            label={rain ? "Back to the park" : "Make it rain"}
            hint={rain ? "Indoors at the Rec Center" : "Moves the run indoors"}
            busy={busy === "rain"}
            onClick={() => run("rain", () => makeItRain(), true)}
          />
          <Row
            testId="dir-decline"
            icon={G("undo", 18)}
            label="One decline"
            hint="A member can't make it"
            busy={busy === "decline"}
            onClick={() => run("decline", () => oneDecline(), true)}
          />
        </Group>

        <details className="group/eng pt-2">
          <summary className="pressable flex min-h-11 cursor-pointer list-none items-center justify-between rounded-[16px] px-3 text-[13px] font-medium text-fg-subtle hover:bg-sunken [&::-webkit-details-marker]:hidden">
            Engine
            <Chevron size={16} className="transition-transform group-open/eng:rotate-180" />
          </summary>
          <Toggle
            icon={G("why", 18)}
            label="No AI"
            hint="Rule-based planner, same screens"
            checked={demo.noAI}
            onChange={(v) => run("noai", () => setDemoFlag(repo, "noAI", v))}
          />
          <Toggle
            icon={G("talk", 18)}
            label="Members reply"
            hint="Members reply, RSVP and check in"
            checked={demo.crowd}
            onChange={(v) => run("crowd", () => setDemoFlag(repo, "crowd", v))}
          />
          <Toggle
            icon={G("clock", 18)}
            label="Instant replies"
            hint="Off: 120-260 ms like a network"
            checked={demo.fastLatency}
            onChange={(v) => run("lat", () => setDemoFlag(repo, "fastLatency", v))}
          />
          <Row
            testId="dir-health"
            icon={G("check", 18)}
            label="Planner check"
            hint="Key and one live planner call"
            busy={busy === "health"}
            onClick={() => run("health", () => checkHealth())}
          />
        </details>

        <div className="mt-2 border-t border-border pt-1">
          {!confirmReset ? (
            <Row
              testId="dir-reset"
              tone="danger"
              icon={G("undo", 18)}
              label="Start over"
              hint="Back to Wed Nov 4, 9:00 AM"
              onClick={() => setConfirmReset(true)}
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="pressable h-11 rounded-full px-4 text-[15px] font-semibold text-fg hover:bg-sunken"
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                data-testid="dir-reset-confirm"
                disabled={busy === "reset"}
                onClick={() =>
                  run("reset", async () => {
                    const r = await resetDemo(repo);
                    setConfirmReset(false);
                    return r;
                  })
                }
                className="pressable inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-danger px-4 text-[15px] font-semibold text-on-danger disabled:opacity-60"
              >
                {G("undo", 16)}
                Reset everything
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className={cn("border-t border-border px-4", result ? "py-2.5" : "hidden")} role="status" aria-live="polite">
        {result && (
          <p className={cn("flex items-center gap-2 text-[14px] font-medium", result.ok ? "text-success-text" : "text-danger-text")}>
            {result.ok && G("check", 16)}
            {result.message}
          </p>
        )}
      </footer>
    </motion.aside>
  );
}
