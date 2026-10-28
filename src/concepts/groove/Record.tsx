// The one object. A pod's record, printed flat in ink on paper. Grooves are the pod's history (#1 innermost,
// thickness = how many came, hand-cut wobble, never a closing progress arc). The next hangout is a hollow groove.
"use client";

import { motion } from "motion/react";
import { forwardRef, useId, type ReactNode } from "react";
import { HUE, type Hue } from "./data";

export type NextState = "none" | "seed" | "hollow" | "cutting" | "cut" | "glow";

export interface Dot {
  id: string;
  initial: string;
  me?: boolean;
}

export interface RecordProps {
  hue: Hue;
  arcLabel?: string;
  center?: ReactNode;
  history?: { came: number }[];
  next?: NextState;
  /** 0..1 while cutting */
  cut?: number;
  captions?: string[];
  captionsShown?: number;
  dots?: Dot[];
  seats?: number;
  spin?: boolean;
  rotate?: number;
  blur?: number;
  needle?: boolean;
  marks?: number;
  onLabel?: () => void;
  labelLabel?: string;
  className?: string;
  /** pod name printed big on the label instead of dots (crate, landing) */
  labelWord?: string;
  /** small lacquer: fewer micro-grooves (thumbnails) */
  lite?: boolean;
}

const R = 500;
const LABEL = 172;
const G0 = 214;
const STEP = 44;

export const grooveR = (i: number) => G0 + i * STEP;

function wobble(r: number, seed: number, amp = 2.2): string {
  const n = 96;
  let d = "";
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * Math.PI * 2;
    const rr = r + Math.sin(t * 3 + seed) * amp + Math.sin(t * 7 + seed * 2.3) * amp * 0.45;
    const x = (rr * Math.cos(t)).toFixed(1);
    const y = (rr * Math.sin(t)).toFixed(1);
    d += k === 0 ? `M${x} ${y}` : `L${x} ${y}`;
  }
  return d + "Z";
}

function arcPath(r: number, fromDeg: number): string {
  const a = (fromDeg * Math.PI) / 180;
  const b = ((fromDeg - 0.2) * Math.PI) / 180;
  const p = (t: number) => `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`;
  return `M${p(a)} A${r} ${r} 0 1 1 ${p(b)}`;
}

export const Record = forwardRef<SVGSVGElement, RecordProps>(function Record(
  {
    hue, arcLabel, center, history = [], next = "none", cut = 1, captions = [], captionsShown, dots = [], seats = 8,
    spin, rotate = 0, blur = 0, needle, marks = 0, onLabel, labelLabel, className, labelWord, lite,
  },
  ref,
) {
  const uid = useId().replace(/:/g, "");
  const col = HUE[hue];
  const nextR = grooveR(history.length);
  const capR = Math.min(nextR + 30, R - 14);
  const contact = (206 * Math.PI) / 180;
  const cx = nextR * Math.cos(contact);
  const cy = nextR * Math.sin(contact);
  const shown = captionsShown ?? captions.length;

  const micro: number[] = [];
  for (let r = LABEL + 18; r < R - 6; r += lite ? 14 : 5) micro.push(r);

  return (
    <svg ref={ref} viewBox="-520 -520 1040 1040" className={className} style={{ overflow: "visible" }} role="img" aria-label={labelLabel}>
      <defs>
        <path id={`cap-${uid}`} d={arcPath(capR, 118)} />
        <path id={`lab-${uid}`} d={arcPath(LABEL - 30, 150)} />
        <filter id={`ink-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 0.95" result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
        </filter>
      </defs>

      <g className={spin ? "g-spin" : undefined}>
        <g
          style={{
            transform: `rotate(${rotate}deg)`,
            transformOrigin: "0 0",
            filter: blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : undefined,
            transition: blur > 0.2 ? "none" : "transform 700ms cubic-bezier(.2,1.4,.4,1)",
          }}
        >
          {/* printed disc */}
          <g filter={`url(#ink-${uid})`}>
            <circle r={R} fill="var(--g-ink)" />
          </g>
          {micro.map((r) => (
            <circle key={r} r={r} fill="none" stroke="var(--g-lacquer)" strokeWidth={1} />
          ))}
          {/* sheen: one printed highlight band, flat (no gradient) */}
          <path d={`M${-R * 0.72} ${-R * 0.69} A ${R} ${R} 0 0 1 ${-R * 0.2} ${-R * 0.96}`} stroke="var(--g-sheen)" strokeWidth={60} fill="none" opacity={0.5} />

          {/* history grooves */}
          {history.map((h, i) => (
            <path key={i} d={wobble(grooveR(i), i * 1.7 + 0.4)} fill="none" stroke="var(--g-groove)" strokeWidth={5 + h.came * 3.2} />
          ))}

          {/* seed groove: a beginning */}
          {next === "seed" && (
            <motion.path
              d={wobble(G0 - 6, 2.1, 1.4)}
              fill="none"
              stroke={col}
              strokeWidth={3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 0.22 }}
              transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}
            />
          )}

          {/* next hangout */}
          {next === "hollow" && (
            <circle r={nextR} fill="none" stroke="var(--g-paper)" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round" />
          )}
          {(next === "cutting" || next === "cut" || next === "glow") && (
            <>
              <circle r={nextR} fill="none" stroke="var(--g-paper)" strokeOpacity={0.18} strokeWidth={2} strokeDasharray="2 12" strokeLinecap="round" />
              <motion.path
                d={wobble(nextR, history.length * 1.7 + 0.4)}
                fill="none"
                stroke={col}
                strokeWidth={next === "glow" ? 14 : 9}
                style={{ filter: next === "glow" ? `drop-shadow(0 0 14px ${col})` : undefined }}
                initial={false}
                animate={{ pathLength: next === "cutting" ? cut : 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.3, 0.8, 0.3, 1] }}
              />
            </>
          )}

          {/* label */}
          <g
            onClick={onLabel}
            style={{ cursor: onLabel ? "pointer" : undefined }}
            role={onLabel ? "button" : undefined}
            aria-label={onLabel ? labelLabel : undefined}
            tabIndex={onLabel ? 0 : undefined}
            onKeyDown={(e) => {
              if (onLabel && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onLabel();
              }
            }}
            className={onLabel ? "g-label-hit" : undefined}
          >
            <circle r={LABEL} fill={col} />
            {/* misregistered print ring */}
            <circle r={LABEL - 6} cx={1.5} cy={-1} fill="none" stroke="var(--g-ink)" strokeOpacity={0.18} strokeWidth={1.2} />
            {arcLabel && (
              <text className="g-arc-label" fill="var(--g-ink)">
                <textPath href={`#lab-${uid}`}>{arcLabel}</textPath>
              </text>
            )}
            {labelWord && (
              <text className="g-label-word" textAnchor="middle" y={18} fill="var(--g-ink)">
                {labelWord}
              </text>
            )}
            {Array.from({ length: marks }).map((_, i) => {
              const a = (-90 - i * 14) * (Math.PI / 180);
              return (
                <motion.line
                  key={i}
                  x1={(LABEL - 4) * Math.cos(a)} y1={(LABEL - 4) * Math.sin(a)}
                  x2={(LABEL - 26) * Math.cos(a)} y2={(LABEL - 26) * Math.sin(a)}
                  stroke="var(--g-ink)" strokeWidth={6} strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                />
              );
            })}
            {!labelWord && seats > 0 && (
              <g>
                {Array.from({ length: seats }).map((_, i) => {
                  const a = (-90 + (i * 360) / seats) * (Math.PI / 180);
                  const x = 92 * Math.cos(a);
                  const y = 92 * Math.sin(a);
                  const d = dots[i];
                  return d ? (
                    <motion.g key={d.id} initial={{ y: -60, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.05 }}>
                      <circle cx={x} cy={y} r={20} fill={d.me ? "var(--g-ink)" : "var(--g-paper)"} />
                      <text x={x} y={y + 6} textAnchor="middle" className="g-dot-initial" fill={d.me ? "var(--g-paper)" : "var(--g-ink)"}>
                        {d.initial}
                      </text>
                    </motion.g>
                  ) : (
                    <circle key={`e${i}`} cx={x} cy={y} r={7} fill="none" stroke="var(--g-ink)" strokeOpacity={0.35} strokeWidth={2} />
                  );
                })}
              </g>
            )}
            {center}
            <circle r={9} fill="var(--g-paper)" />
          </g>

          {/* captions printed on the arc */}
          {captions.length > 0 && (
            <text className="g-arc-caption" fill="var(--g-paper)">
              <textPath href={`#cap-${uid}`}>
                {captions.map((c, i) => (
                  <motion.tspan key={i} initial={{ opacity: 0 }} animate={{ opacity: i < shown ? 1 : 0 }} transition={{ duration: 0.5 }}>
                    {i > 0 ? "   ·   " : ""}
                    {c}
                  </motion.tspan>
                ))}
              </textPath>
            </text>
          )}
        </g>
      </g>

      {/* needle (never spins) */}
      {needle && (
        <motion.g initial={{ y: -70, x: -30, opacity: 0 }} animate={{ y: 0, x: 0, opacity: 1 }} exit={{ y: -70, opacity: 0 }} transition={{ type: "spring", stiffness: 140, damping: 16 }}>
          <line x1={cx - 210} y1={cy - 520} x2={cx - 4} y2={cy - 22} stroke="var(--g-needle)" strokeWidth={9} strokeLinecap="round" />
          <rect x={cx - 20} y={cy - 40} width={36} height={48} rx={6} fill="var(--g-needle)" transform={`rotate(22 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={5} fill={col} />
        </motion.g>
      )}
    </svg>
  );
});
