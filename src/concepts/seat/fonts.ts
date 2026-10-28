// SEAT concept: two voices only (PB 5.1). Fraunces (soft, high-contrast display serif) for people and moments,
// DM Mono for every label, time and count.
import { DM_Mono, Fraunces } from "next/font/google";

export const seatSerif = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--st-serif",
  display: "swap",
});

export const seatMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--st-mono",
  display: "swap",
});
