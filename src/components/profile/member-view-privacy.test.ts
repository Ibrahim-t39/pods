// Heritage and faith must never reach a member view. Source-level guard: the files that show another person (or a
// report about them) may not import identities or the taxonomy, or read `identities`/`heritage`/`faith`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/app/(app)/app/people/[userId]/screen.tsx",
  "src/components/safety/report-sheet.tsx",
  "src/components/safety/block-sheet.tsx",
  "src/components/safety/blocked-list.tsx",
  "src/components/profile/hue.ts",
];

describe("member view never renders heritage or faith", () => {
  for (const f of FILES) {
    it(f, () => {
      const src = readFileSync(f, "utf8").replace(/\/\/.*$/gm, "");
      expect(src).not.toMatch(/taxonomy|identities|UserIdentity|heritage|faith/i);
    });
  }
});
