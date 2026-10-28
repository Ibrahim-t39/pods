// The one motion language (COLOR_LIFE §12; DESIGN §7). JS twins of the CSS tokens in src/styles/tokens.css.
// Four durations, each with one job; three curves; two springs. Transform and opacity only.
//   TAP     150 ms  press feedback, toggles, a disc popping in
//   MOVE    250 ms  something moving within the screen: a segment filling, a count ticking
//   SETTLE  400 ms  a screen or object arriving: page in, sheet up, the plan card becoming the lock
//   LIGHT   700 ms  the stage changing its light, the moment
// One hero motion per screen. Motion explains a state change or marks a meaningful moment; otherwise it is quiet.
import { useSyncExternalStore } from "react";
import { useReducedMotion, type Transition } from "motion/react";

export const DUR = { tap: 0.15, move: 0.25, settle: 0.4, light: 0.7 } as const;

/** ARRIVE (entering, settling), TRAVEL (A to B on screen), LEAVE (quick and quiet). */
export const EASE = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, [number, number, number, number]>;

/** Discs, controls, counts: lands with one small overshoot. */
export const SNAPPY: Transition = { type: "spring", stiffness: 420, damping: 32 };
/** Tables, circles, the lock ring: heavier, slower, no overshoot you can see. */
export const GENTLE: Transition = { type: "spring", stiffness: 170, damping: 26 };

export const ARRIVE: Transition = { duration: DUR.settle, ease: EASE.out };
export const TRAVEL: Transition = { duration: DUR.move, ease: EASE.inOut };
export const LEAVE: Transition = { duration: DUR.tap, ease: EASE.exit };

/** Stagger between people arriving (discs popping in around a table). */
export const STAGGER = 0.06;

/** A disc popping in (initial / animate / exit). */
export const POP = {
  initial: { scale: 0.4, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.6, opacity: 0 },
  transition: SNAPPY,
} as const;

const noop = () => () => {};
/** Reduced-motion preference that is safe to hydrate: false on the server and the first client render, then the
 *  user's setting. Use it wherever the preference changes what is RENDERED (values, not just transitions). */
export function useCalmMotion(): boolean {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const reduced = useReducedMotion();
  return mounted && !!reduced;
}
