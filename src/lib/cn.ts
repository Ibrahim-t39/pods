// [U0] className helper: clsx + tailwind-merge (aware of our custom token classes).
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-2xl", "display-xl", "display-lg", "heading-xl", "heading-lg", "heading-md", "heading-sm",
            "body-lg", "body", "body-sm", "label", "caption", "overline", "mono",
          ],
        },
      ],
      shadow: [{ shadow: ["xs", "sm", "md", "lg", "glow-signal", "glow-ember", "glow-grove", "glow-pod", "inset-gloss"] }],
      rounded: [{ rounded: ["xs", "sm", "md", "lg", "xl", "2xl", "pill", "icon", "card", "button", "input", "sheet"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
