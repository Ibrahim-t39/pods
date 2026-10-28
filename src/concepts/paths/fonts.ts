// Paths concept: two voices only (PB 5.1). Instrument Serif carries people and moments (the day, the pod, "Again?");
// Instrument Sans carries labels, times and captions. Same family, so proportions agree; ~10:1 scale contrast (PB 5.2).
import { Instrument_Sans, Instrument_Serif } from "next/font/google";

export const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--p-serif", display: "swap" });
export const sans = Instrument_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--p-sans", display: "swap" });
