// The first-run kit (template §1 anatomy A; wireframes B01-B10). Every step is the same composition so moving
// through first run feels like one table being laid, not a stack of forms:
//   chrome   the back glyph (top left), nothing else
//   head     ONE bold sentence that IS the input ("I'm Chanda, 22.", "Into hoops, guitar.") (call graft; AW 06, 58)
//   object   the table, always at the same centre and size, so a step change reads as the table changing state
//   foot     the 4 dots + "n of 4" on the left, the one blue commit pill on the right (laptop: pill first) (PB 2.7)
// Light is dawn: something is being chosen (DESIGN §2). Steps slide 24px sideways; the table only breathes (§7).
"use client";

import Link from "next/link";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Stage, type StageLight } from "@/components/brand/stage";
import { ProgressDots } from "@/components/brand/progress-dots";
import { Chrome } from "@/components/shell/chrome";
import { Page } from "@/components/shell/page";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { cn } from "@/lib/cn";
import "./onboarding.css";

export const EASE = [0.2, 0, 0, 1] as const;

export interface FlowStepProps {
  /** key for the head's slide (sub-screens inside one route change it) */
  screen: string;
  light?: StageLight;
  back?: string | false;
  head: ReactNode;
  object?: ReactNode;
  /** "n of 4" dots on the left of the foot */
  dot?: number;
  /** extra quiet thing on the left of the foot (a go link, a status label) */
  status?: ReactNode;
  action?: ReactNode;
  label?: string;
}

export function FlowStep({ screen, light = "dawn", back, head, object, dot, status, action, label }: FlowStepProps) {
  const reduce = useReducedMotion();
  return (
    <>
      <Stage light={light} />
      <Page
        label={label}
        className="pods-ob"
        chrome={<Chrome left={back === false ? "none" : "back"} backHref={back || undefined} />}
        head={
          <motion.div
            key={screen}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduce ? { duration: 0.16 } : { duration: 0.32, ease: EASE }}
          >
            {head}
          </motion.div>
        }
        object={
          object ? (
            <motion.div
              className="pods-ob-obj"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduce ? { duration: 0.16 } : { type: "spring", stiffness: 170, damping: 26 }}
            >
              {object}
            </motion.div>
          ) : undefined
        }
        foot={
          dot || status || action ? (
            <>
              <div className="flex min-h-11 min-w-0 items-center gap-s4">
                {dot ? <ProgressDots step={dot} total={4} /> : null}
                {status}
              </div>
              {action}
            </>
          ) : undefined
        }
      />
    </>
  );
}

/** The one size for the table across first run, so every step's object sits on the same circle. */
export function useTableSize(): { size: number; wide: boolean } {
  const wide = useMediaQuery("(min-width: 1024px)");
  const short = useMediaQuery("(max-height: 740px)");
  return { size: wide ? 400 : short ? 176 : 212, wide };
}

/**
 * A word you type inside the headline. The input sizes to its own text (an invisible mirror in the same grid
 * cell), so the sentence reads as a sentence while you type it.
 */
export const InlineField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { box?: boolean; placeholder: string }>(
  function InlineField({ box, placeholder, value, className, ...rest }, ref) {
    const shown = String(value ?? "") || placeholder;
    return (
      <span className={cn("pods-ob-field", box && "pods-ob-field-box", className)} data-empty={value ? undefined : ""}>
        <span aria-hidden className="pods-ob-mirror">
          {shown}
        </span>
        <input ref={ref} size={1} value={value} placeholder={placeholder} spellCheck={false} autoCorrect="off" {...rest} />
      </span>
    );
  },
);

/** A quiet line under the headline (template: 16/24 ink-2, never a paragraph). */
export function Sub({ children, className, live }: { children: ReactNode; className?: string; live?: boolean }) {
  return (
    <p className={cn("mt-s4 text-body-lg text-ink-2", className)} aria-live={live ? "polite" : undefined}>
      {children}
    </p>
  );
}

/** Underlined go link (DESIGN §8 "go"). 44px tall. */
export function GoLink({ children, onClick, href, className }: { children: ReactNode; onClick?: () => void; href?: string; className?: string }) {
  const cls = cn("u inline-flex min-h-11 items-center text-[15px] font-medium text-ink", className);
  if (href && !href.startsWith("/"))
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
