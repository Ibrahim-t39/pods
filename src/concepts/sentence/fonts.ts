// Sentence concept: two voices. Fraunces (soft, high-contrast at opsz 144) carries people and moments;
// DM Mono carries facts (times, places, counts) at 11-12px. Refs: PB 5.1 (AW 60, 62, 04; TS 29, 4), TS meta.json.
import { DM_Mono, Fraunces } from "next/font/google";

export const serif = Fraunces({
  subsets: ["latin"],
  variable: "--snt-serif",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

export const mono = DM_Mono({
  subsets: ["latin"],
  variable: "--snt-mono",
  weight: ["400", "500"],
  display: "swap",
});
