// Community pods picker data (B03s): two fields, each one pick. Pure, so the first-run sheet and Edit profile read
// the same lists and tests can check them.
//   From   regions first; a region opens its countries (two taps to "Zambian"; the region alone is a valid answer).
//   Faith  religions first; a religion with denominations opens them (two taps to "Seventh-day Adventist").
import { FAITH_NODES, HERITAGE_NODES, faithLadder, faithNode, heritageNode } from "@/data/taxonomy";
import type { FaithValue, HeritageValue } from "@/lib/types";

export interface Pick {
  code: string;
  label: string;
}

/** The region rows of From, in the order people reach for them. */
export const REGIONS: Pick[] = HERITAGE_NODES.filter((n) => n.level === "region").map((n) => ({ code: n.code, label: n.label }));

/** The religion rows of Faith: Christian, Muslim, Hindu, Jewish, Buddhist, Sikh, Other. */
const RELIGION_ORDER = ["christian", "islam", "hindu", "jewish", "buddhist", "sikh", "other_faith"];
const RELIGION_LABEL: Record<string, string> = { islam: "Muslim" };
export const RELIGIONS: Pick[] = RELIGION_ORDER.flatMap((code) => {
  const n = faithNode(code);
  return n ? [{ code, label: RELIGION_LABEL[code] ?? n.label }] : [];
});

/** Shorter words for a denomination once its religion is on screen beside it. */
const SHORT_FAITH: Record<string, string> = {
  nondenominational: "Non-denominational",
  sunni: "Sunni",
  shia: "Shia",
};

/** The countries under a region. */
export const countriesOf = (region: string | null): Pick[] =>
  region ? HERITAGE_NODES.filter((n) => n.level === "country" && n.parent === region).map((n) => ({ code: n.code, label: n.label })) : [];

/** The denominations under a religion (through its traditions). Empty for a religion picked on its own. */
export const denominationsOf = (religion: string | null): Pick[] =>
  religion
    ? FAITH_NODES.filter((n) => n.level === "denomination" && faithLadder(n.code).some((a) => a.code === religion)).map((n) => ({
        code: n.code,
        label: SHORT_FAITH[n.code] ?? n.label,
      }))
    : [];

/** The region a heritage code sits in (a country's parent, or the region itself). */
export function regionOf(code: string | null): string | null {
  if (!code) return null;
  const n = heritageNode(code);
  return n?.level === "country" ? n.parent : n?.level === "region" ? n.code : null;
}

/** The religion a faith code sits in (itself, or the top of its ladder). */
export function religionOf(code: string | null): string | null {
  if (!code) return null;
  return faithLadder(code).find((n) => n.level === "religion")?.code ?? null;
}

/** The stored value for a pick, at its own level (a region stays a region, a religion stays a religion). */
export const heritageValue = (code: string): HeritageValue => ({ level: heritageNode(code)?.level ?? "region", code });
export const faithValue = (code: string): FaithValue => ({ level: faithNode(code)?.level ?? "denomination", code });

/** The words a pick is said back in ("Zambian", "Muslim", "Seventh-day Adventist"). */
export function heritageLabel(code: string | null): string | null {
  return code ? (heritageNode(code)?.label ?? null) : null;
}
export function faithLabel(code: string | null): string | null {
  if (!code) return null;
  if (code === "other_faith") return "Another faith";
  return RELIGION_LABEL[code] ?? SHORT_FAITH[code] ?? faithNode(code)?.label ?? null;
}
