// TABLE concept: two voices (PB 5.1). Instrument Serif carries people and moments; Geist Mono carries every label,
// time, count and button. Nothing in the middle (PB 5.2).
import { Geist_Mono, Instrument_Serif } from "next/font/google";

export const tbSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--tb-serif",
  display: "swap",
});

export const tbMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--tb-mono",
  display: "swap",
});
