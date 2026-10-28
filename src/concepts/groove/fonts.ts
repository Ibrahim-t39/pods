// Groove concept: two voices only. A Clarendon-descended slab (dance-hall wood type, Blue Note sleeves) + a label mono.
import { Alfa_Slab_One, IBM_Plex_Mono } from "next/font/google";

export const slab = Alfa_Slab_One({ weight: "400", subsets: ["latin"], variable: "--g-slab", display: "swap" });
export const mono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--g-mono", display: "swap" });
