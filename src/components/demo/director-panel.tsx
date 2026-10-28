// Director panel (BLUEPRINT SY-04). Hidden: closed by default and never hinted at in the UI. Opens only with
// ?director=1, Ctrl/Cmd + ., or a 700 ms press on the mark (MarkButton fires DIRECTOR_EVENT; the press is also caught
// here at the document level for any [data-mark]). Bottom sheet on phones, right-hand card on laptop.
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

/** Hook: panel open state + all the ways to open it. */
export function useDirectorOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("director") === "1")
      setOpen(true);
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

  return [open, setOpen] as const;
}

function Row({
  icon,
  label,
  hint,
  onClick,
  busy,
  tone = "default",
  testId,
}: {
  icon: ReactNode;
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
        "pressable flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left outline-offset-[-2px]",
        "hover:bg-sunken focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-50",
        tone === "danger" ? "text-danger-text" : "text-fg",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-sm",
          tone === "danger"
            ? "bg-danger-soft"
            : "bg-primary-soft text-primary-soft-text",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold leading-tight">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-caption text-fg-muted">
            {hint}
          </span>
        )}
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
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-md px-3 py-1.5">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary-soft text-primary-soft-text"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          id={`dir-${label}`}
          className="block text-[14.5px] font-semibold leading-tight text-fg"
        >
          {label}
        </span>
        <span className="mt-0.5 block text-caption text-fg-muted">{hint}</span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={`dir-${label}`}
      />
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-1">
      <h3 className="px-3 pb-1 pt-2 text-overline text-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}

/** Closed by default: the body (which reads the clock) only mounts once opened, so nothing time-based runs in prerender. */
export function DirectorPanel() {
  const [open, setOpen] = useDirectorOpen();
  return (
    <AnimatePresence>
      {open && <PanelBody onClose={() => setOpen(false)} />}
    </AnimatePresence>
  );
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const open = true;
  const setOpen = (_: boolean) => onClose();
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      return;
    }
    closeRef.current?.focus();
  }, [open]);

  const run = useCallback(
    async (key: string, fn: () => ActionResult | Promise<ActionResult>) => {
      setBusy(key);
      try {
        setResult(await fn());
      } catch {
        setResult({ ok: false, message: "That didn't work." });
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const rain = demo.venueVariant === "park_courts";

  return (
    <motion.aside
      role="dialog"
      aria-label="Director panel"
      data-director-panel
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98, transition: { duration: 0.14 } }}
      className={cn(
        "fixed z-toast flex max-h-[min(86dvh,720px)] flex-col overflow-hidden rounded-[28px] bg-night text-lamp shadow-lg",
        "inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom))]",
        "md:inset-x-auto md:bottom-4 md:right-4 md:w-[380px]",
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span
          aria-hidden
          className="grid size-8 place-items-center text-lamp"
        >
          {G("room", 18)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-heading-sm text-fg">Director</h2>
          <p className="truncate text-caption text-fg-muted tabular">
            {formatWhen(now)} CT
            {state.me ? ` · ${state.me}` : " · not signed in"}
            {state.hangout
              ? ` · hangout ${state.hangout.seq} ${state.hangout.status.replace("_", " ")}`
              : ""}
          </p>
        </div>
        <Kbd>⌘.</Kbd>
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close director panel"
          className="pressable grid size-10 place-items-center rounded-pill text-fg-muted outline-offset-2 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          {G("close", 20)}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1">
        <Group title="Story">
          <Row
            testId="dir-skip"
            icon={G("seat", 18)}
            label="Skip to placed"
            hint="Creates Chanda and seats her"
            busy={busy === "skip"}
            onClick={() => run("skip", () => skipToPlaced(repo))}
          />
          <Row
            testId="dir-jump"
            icon={G("clock", 18)}
            label={DEMO.directorJump.label}
            hint="Moves the clock, posts the check-in prompt"
            busy={busy === "jump"}
            onClick={() => run("jump", () => jumpAfterHangout())}
          />
          <Row
            testId="dir-checkin"
            icon={G("here", 18)}
            label="Everyone checks in"
            hint="Every member who was going"
            busy={busy === "checkin"}
            onClick={() => run("checkin", () => everyoneChecksIn())}
          />
          <Row
            testId="dir-reveal"
            icon={G("again", 18)}
            label="Reveal run-it-back"
            hint="Members answer, then the count shows"
            busy={busy === "reveal"}
            onClick={() => run("reveal", () => revealRunItBack())}
          />
        </Group>

        <Group title="Scenarios">
          <Row
            testId="dir-rain"
            icon={G("rain", 18)}
            label={rain ? "Back to the Rec Center" : "Make it rain"}
            hint={
              rain
                ? "Park courts plan is on"
                : "Switches to the park courts plan"
            }
            busy={busy === "rain"}
            onClick={() => run("rain", () => makeItRain())}
          />
          <Row
            testId="dir-decline"
            icon={G("undo", 18)}
            label="One decline"
            hint="A member can't make it"
            busy={busy === "decline"}
            onClick={() => run("decline", () => oneDecline())}
          />
        </Group>

        <Group title="Settings">
          <Toggle
            icon={G("why", 18)}
            label="No AI"
            hint="Rule-based planner and template copy, same UI"
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
            label="Latency 0"
            hint="Off = normal 120-260 ms"
            checked={demo.fastLatency}
            onChange={(v) =>
              run("lat", () => setDemoFlag(repo, "fastLatency", v))
            }
          />
          <Row
            testId="dir-health"
            icon={G("check", 18)}
            label="Health"
            hint="Key present, one real Claude call"
            busy={busy === "health"}
            onClick={() => run("health", () => checkHealth())}
          />
        </Group>

        <Group title="Danger">
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
                className="pressable h-10 rounded-pill px-4 text-[14px] font-semibold text-fg hover:bg-sunken"
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
                className="pressable inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-pill bg-danger px-4 text-[14px] font-semibold text-on-danger shadow-inset-gloss disabled:opacity-60"
              >
                {G("undo", 16)}
                Reset everything
              </button>
            </div>
          )}
        </Group>
      </div>

      <footer
        className="min-h-11 border-t border-border px-4 py-2.5"
        role="status"
        aria-live="polite"
      >
        {result ? (
          <p
            className={cn(
              "flex items-center gap-2 text-body-sm",
              result.ok ? "text-success-text" : "text-danger-text",
            )}
          >
            {result.ok && G("check", 16)}
            {result.message}
          </p>
        ) : (
          <p className="text-body-sm text-fg-subtle">
            Nothing run yet.
          </p>
        )}
      </footer>
    </motion.aside>
  );
}
