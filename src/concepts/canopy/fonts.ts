// CANOPY concept: two voices only (PB 5.1, AW 60/62/04, TS 29/4, SF 34/53/54).
// Instrument Serif: a condensed display serif, so the day ("Sunday") can sit at 96-200px on a 390 screen and still
// fit one line; it carries moments. Spline Sans Mono: soft-terminal mono that echoes the round "pods" wordmark; it
// carries facts (time, place, sky, counts) and every control label. Nothing in between (scale ~8:1, PB 5.2).
import { Instrument_Serif, Spline_Sans_Mono } from "next/font/google";

export const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--cn-serif",
  display: "swap",
});

export const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--cn-mono",
  display: "swap",
});
