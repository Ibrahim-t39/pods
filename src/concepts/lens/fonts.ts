// Lens concept type: two voices only (PB 5.1). Newsreader carries people and moments at display optical size;
// Fragment Mono carries times, places and counts at 10-12px. Nothing in between (PB 5.2, ~12:1 scale contrast).
import { Fragment_Mono, Newsreader } from "next/font/google";

export const serif = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--lz-serif",
  display: "swap",
});

export const mono = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--lz-mono",
  display: "swap",
});
