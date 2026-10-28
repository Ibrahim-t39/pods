"use client";
// The one object (PB 1.1, 4.8): a circle of light in the pod's hue, seen from below, held up by four poles.
// lift = poles standing / 4. Under-supported it flutters; at 4 it snaps taut on a spring, the light falls through onto
// the ground and the four shadows meet. Folded, it lies on the ground. Rain: a dashed second ring over an indoor mark;
// if the day turns wet the canopy slides onto it. Never a tent drawing (indoor faith and heritage pods must fit).
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

export interface Pole {
  key: string;
  initial: string;
  tone: number;
  me: boolean;
  standing: boolean;
}

const TONES = [
  "var(--pods-ember)", "var(--pods-signal)", "var(--pods-grove)",
  "var(--pods-overlap-ember-signal)", "var(--pods-overlap-signal-grove)", "var(--pods-overlap-ember-grove)",
];
const TONE_INK = ["var(--pods-ink)", "var(--neutral-0)", "var(--pods-ink)", "var(--neutral-0)", "var(--neutral-0)", "var(--neutral-0)"];

// Feet on the ground plane (viewBox 400 x 460, horizon ~ y 400). Slot 2 is always yours: front right, by the thumb.
export const FEET = [
  { x: 70, y: 424 },
  { x: 146, y: 446 },
  { x: 254, y: 446 },
  { x: 330, y: 424 },
];
const CX = 200;
const LIFTED = { cy: 112, rx: 176, ry: 62 };
const FOLDED = { cy: 436, rx: 118, ry: 10 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function Canopy({
  poles,
  lift,
  folded = false,
  extra = 0,
  corners = 0,
  rain = null,
  moved = false,
  showSeats = true,
  className,
}: {
  poles: Pole[];
  lift: number;
  folded?: boolean;
  extra?: number;
  corners?: number;
  rain?: { label: string } | null;
  moved?: boolean;
  showSeats?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const t = folded ? 0 : Math.max(0, Math.min(1, lift));
  const e = 1 - Math.pow(1 - t, 1.6);
  const cy = lerp(FOLDED.cy, LIFTED.cy, e);
  const rx = lerp(FOLDED.rx, LIFTED.rx, e);
  const ry = lerp(FOLDED.ry, LIFTED.ry, e);
  const taut = !folded && t >= 1;
  const flutter = !folded && t > 0 && t < 1 && !reduce;
  const spring = { type: "spring" as const, stiffness: taut ? 520 : 170, damping: taut ? 16 : 22 };
  const edgeY = (x: number) => cy + ry * Math.sqrt(Math.max(0, 1 - ((x - CX) / rx) ** 2));

  return (
    <svg viewBox="0 0 400 460" className={className} role="img" aria-label={taut ? "Canopy up" : folded ? "Canopy folded" : `${poles.filter((p) => p.standing).length} of 4 holding`}>
      <defs>
        <radialGradient id={`${id}-cloth`} cx="50%" cy="60%" r="60%">
          <stop offset="0%" style={{ stopColor: taut ? "var(--hue-soft)" : "var(--hue)" }} />
          <stop offset="100%" style={{ stopColor: "var(--hue)" }} />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${id}-blur`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* light falling through onto the ground */}
      <motion.ellipse
        cx={CX} cy={432} rx={176} ry={30}
        style={{ fill: "var(--hue)" }}
        filter={`url(#${id}-blur)`}
        initial={false}
        animate={{ opacity: taut ? 0.42 : 0 }}
        transition={{ duration: reduce ? 0 : 0.9, delay: taut ? 0.25 : 0 }}
      />

      {/* rain plan ring */}
      {rain && !folded ? (
        <g opacity={moved ? 1 : 0.9}>
          <ellipse cx={356} cy={404} rx={34} ry={7} fill="none" style={{ stroke: "var(--fg-2)" }} strokeWidth={1.5} strokeDasharray="4 5" />
          <g transform="translate(344 368)" style={{ color: "var(--fg-2)" }}>
            <path d="M4 10.5h16M5.6 10.5a6.5 6.5 0 0 0 12.8 0M12 5.5v5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        </g>
      ) : null}

      <motion.g
        initial={false}
        animate={moved ? { x: 118, y: -10, scale: 0.42 } : { x: 0, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
        style={{ transformOrigin: "356px 404px" }}
      >
        {/* shadows meet when taut */}
        {FEET.map((f, i) => (
          <motion.line
            key={`sh${i}`}
            x1={f.x} y1={f.y + 2} x2={lerp(f.x, CX, 0.72)} y2={f.y + 16}
            style={{ stroke: "var(--pods-ink)" }} strokeWidth={5} strokeLinecap="round"
            initial={false}
            animate={{ opacity: taut ? 0.1 : 0, pathLength: taut ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.7, delay: taut ? 0.35 : 0 }}
          />
        ))}

        {/* guy-lines: seats 5-8 */}
        {Array.from({ length: Math.min(4, extra) }).map((_, i) => {
          const side = i % 2 === 0 ? -1 : 1;
          const gx = CX + side * (rx + 6 + Math.floor(i / 2) * 18);
          return (
            <g key={`g${i}`}>
              <motion.line initial={false} animate={{ x1: CX + side * rx * 0.98, y1: cy, x2: gx, y2: 404 }} transition={spring} style={{ stroke: "var(--fg-3)" }} strokeWidth={1.2} strokeDasharray="3 4" />
              <circle cx={gx} cy={406} r={5} style={{ fill: "var(--fg-2)" }} />
            </g>
          );
        })}

        {/* poles */}
        {poles.map((p, i) => {
          const f = FEET[i];
          if (!f || !p.standing || folded) return null;
          return (
            <motion.line
              key={`pole${p.key}`}
              x1={f.x} x2={f.x} y1={f.y - 16}
              initial={{ y2: f.y - 16 }}
              animate={{ y2: edgeY(f.x) - 2 }}
              transition={spring}
              style={{ stroke: "var(--fg)" }} strokeWidth={1.25} strokeLinecap="round"
            />
          );
        })}

        {/* the cloth */}
        <motion.g
          animate={flutter ? { rotate: [-1.4, 1.2, -0.6, 1.4, -1.4], y: [0, -2, 1, -1, 0] } : { rotate: 0, y: 0 }}
          transition={flutter ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
          style={{ transformOrigin: `${CX}px ${cy}px` }}
        >
          <motion.ellipse
            cx={CX}
            initial={false}
            animate={{ cy, rx, ry }}
            transition={spring}
            style={{ fill: `url(#${id}-cloth)` }}
          />
          <motion.ellipse
            cx={CX}
            initial={false}
            animate={{ cy: cy + ry * 0.08, rx: rx * 0.62, ry: ry * 0.58, opacity: folded ? 0 : taut ? 0.85 : 0.35 }}
            transition={spring}
            style={{ fill: "var(--hue-soft)" }}
            filter={`url(#${id}-soft)`}
          />
          <motion.ellipse
            cx={CX}
            initial={false}
            animate={{ cy, rx, ry }}
            transition={spring}
            fill="none"
            style={{ stroke: "var(--hue-deep)" }}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
          {/* a ring of hem, seen from below */}
          {!folded ? (
            <motion.ellipse cx={CX} initial={false} animate={{ cy: cy + 2, rx: rx * 0.86, ry: ry * 0.8 }} transition={spring}
              fill="none" style={{ stroke: "var(--hue-deep)" }} strokeOpacity={0.18} strokeWidth={1} strokeDasharray="2 6" />
          ) : null}
          {folded ? (
            <g style={{ stroke: "var(--hue-deep)" }} strokeWidth={1} opacity={0.5} fill="none">
              <path d={`M${CX - 70} ${FOLDED.cy - 2} q 30 6 60 0`} />
              <path d={`M${CX + 6} ${FOLDED.cy + 2} q 30 -6 64 0`} />
            </g>
          ) : null}
          {/* corners lifting, one per yes you can see (yours until the reveal) */}
          {folded &&
            [118, 172, 228, 282].slice(0, corners).map((x, i) => (
              <motion.path
                key={`c${i}`}
                d={`M${x - 16} ${FOLDED.cy} Q ${x} ${FOLDED.cy - 34} ${x + 16} ${FOLDED.cy} Z`}
                style={{ fill: "var(--hue)", transformBox: "fill-box", originY: 1 }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: i * 0.12 }}
              />
            ))}
        </motion.g>

        {/* seats: a face disc at each foot; yours is saved (dashed) until you're in */}
        {showSeats &&
          poles.map((p, i) => {
            const f = FEET[i];
            if (!f) return null;
            const filled = p.standing;
            return (
              <g key={`seat${p.key}`} transform={`translate(${f.x} ${f.y})`}>
                <ellipse cx={0} cy={15} rx={15} ry={3.5} style={{ fill: "var(--pods-ink)" }} opacity={0.12} />
                {filled ? (
                  <motion.g initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 20 }}>
                    <circle r={16} style={{ fill: p.me ? "var(--fg)" : TONES[p.tone] }} />
                    <text y={4.5} textAnchor="middle" style={{ fill: p.me ? "var(--sky)" : TONE_INK[p.tone], font: "500 13px var(--mono)" }}>{p.initial}</text>
                  </motion.g>
                ) : (
                  <g>
                    {p.me && !reduce ? (
                      <motion.circle r={16} style={{ fill: "var(--hue)" }} initial={{ opacity: 0.25, scale: 1 }} animate={{ opacity: [0.28, 0, 0.28], scale: [1, 1.7, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
                    ) : null}
                    <circle r={15.25} fill="none" style={{ stroke: p.me ? "var(--fg)" : "var(--fg-3)" }} strokeWidth={1.5} strokeDasharray="3.5 3.5" />
                    {p.me ? <text y={4.5} textAnchor="middle" style={{ fill: "var(--fg)", font: "500 13px var(--mono)" }}>{p.initial}</text> : null}
                  </g>
                )}
              </g>
            );
          })}
      </motion.g>
    </svg>
  );
}
