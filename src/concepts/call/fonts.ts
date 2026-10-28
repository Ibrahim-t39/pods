// Call concept: two voices only (PB 5.1; AW 60, 62, 04; TS 29, 4).
// Newsreader carries the call (opsz 72, wght 360 → 560 at lock). Fragment Mono carries facts at 11–12 px.
import { Fragment_Mono, Newsreader } from "next/font/google";

export const serif = Newsreader({
  subsets: ["latin"],
  variable: "--call-serif",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

export const mono = Fragment_Mono({
  subsets: ["latin"],
  variable: "--call-mono",
  weight: "400",
  display: "swap",
});
