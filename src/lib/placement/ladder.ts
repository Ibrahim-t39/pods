// [U3] The fallback ladder (ARCHITECTURE §9.1 step 5): widen age, then widen the group, then waitlist.
import type { PlacementConfig } from "@/config/placement";
import { DEFAULT_TAXONOMY, type TaxKind, type TaxNode, type Taxonomy } from "./taxonomy";

/** Ancestors of `code`, narrowest first: chain("heritage","ZM") = [zm, southern_african, african]. Unknown codes stand alone. */
export function groupChain(kind: TaxKind, code: string, tax: Taxonomy = DEFAULT_TAXONOMY): TaxNode[] {
  const table = tax[kind];
  const out: TaxNode[] = [];
  let key: string | null = code.toLowerCase();
  const seen = new Set<string>();
  while (key && !seen.has(key)) {
    seen.add(key);
    const node: TaxNode | undefined = table[key];
    if (!node) {
      if (out.length === 0) out.push({ key, label: code, plural: code, place: code, parent: null, level: "country" });
      break;
    }
    out.push(node);
    key = node.parent;
  }
  return out;
}

/** True when a person whose own value is `code` belongs to group `groupKey` (itself or any ancestor). */
export function inGroup(kind: TaxKind, code: string, groupKey: string, tax: Taxonomy = DEFAULT_TAXONOMY): boolean {
  return groupChain(kind, code, tax).some((n) => n.key === groupKey.toLowerCase());
}

export type RungKind = "start" | "widen_age" | "widen_group";
export type AgeMode = "narrow" | "wide";
export interface Rung {
  kind: RungKind;
  /** Index into the candidate's chain (0 = narrowest). */
  groupIndex: number;
  ageMode: AgeMode;
}

/**
 * Rung order for a candidate whose chain has `chainLength` groups:
 * (g0, narrow) -> (g0, wide) -> (g1, wide) -> ... -> (gN, wide). Interests have a chain of 1, so they only widen age.
 */
export function buildLadder(chainLength: number): Rung[] {
  const rungs: Rung[] = [
    { kind: "start", groupIndex: 0, ageMode: "narrow" },
    { kind: "widen_age", groupIndex: 0, ageMode: "wide" },
  ];
  for (let g = 1; g < Math.max(1, chainLength); g++) rungs.push({ kind: "widen_group", groupIndex: g, ageMode: "wide" });
  return rungs;
}

export function bandFor(mode: AgeMode, cfg: PlacementConfig): number {
  return mode === "wide" ? cfg.ageBandWide : cfg.ageBand;
}

/** "19-25", clamped to the product's age limits. */
export function ageRangeLabel(age: number, band: number, cfg: PlacementConfig): string {
  const lo = Math.max(cfg.minAge, age - band);
  const hi = Math.min(cfg.maxAge, age + band);
  return `${lo}-${hi}`;
}
