// [U3] Human copy for placement: /placing checklist, widened notice, OV-05 explainer, offers, admin trace.
// The spec pattern is exact: "Only 3 Zambians nearby, so we widened to Southern African."
// Claude (D18 job 4) only writes the optional body from group-level counts; every string here is the template fallback.
import type { PlacementConfig } from "@/config/placement";
import type { PlacementResult, PlacementRun } from "@/lib/types";
import { ageRangeLabel } from "./ladder";
import { DEFAULT_TAXONOMY, type Taxonomy } from "./taxonomy";

export { widenSentence, waitlistNote } from "./engine";
export { offerMessage } from "./offers";

export interface ExplainedResult {
  /** One line for the placement screen / pod details. */
  headline: string;
  /** "age" = only ages widened; "group" = the group widened; "none" otherwise. */
  widened: "none" | "age" | "group";
  waitlisted: boolean;
  /** Plain-language trace lines for admin and the OV-05 sheet (never contains blocks). */
  lines: string[];
}

function stepOf(r: PlacementResult, rule: string) {
  return r.steps.find((s) => s.rule === rule);
}

/** What to show for one placement result. */
export function explainResult(r: PlacementResult): ExplainedResult {
  const group = stepOf(r, "widen_group");
  const age = stepOf(r, "widen_age");
  const waitlisted = r.outcome === "waitlisted";
  const widened = group && !waitlisted ? "group" : age && r.user_note && !waitlisted ? "age" : "none";
  let headline: string;
  if (waitlisted) headline = r.user_note ?? "";
  else if (widened === "group") headline = group!.detail;
  else if (widened === "age") headline = r.user_note ?? "";
  else if (r.outcome === "created_new") headline = `We started a new ${r.candidate.label} pod for you.`;
  else headline = `You're in ${r.candidate.label}.`;
  const lines = r.steps.filter((s) => s.rule !== "blocks").map((s) => s.detail);
  return { headline, widened, waitlisted, lines };
}

/** The deterministic widened-pod headline for a run, if any group was widened (OB-11 WidenedNotice). */
export function widenedHeadline(run: Pick<PlacementRun, "results">): string | null {
  for (const r of run.results) {
    if (r.outcome === "waitlisted") continue;
    const g = stepOf(r, "widen_group");
    if (g) return g.detail;
  }
  return null;
}

export interface WidenFacts {
  fromLabel: string;
  toLabel: string;
  /** People in the narrow group nearby (the "Only N" number). */
  fromCount: number;
  /** Members of the widened pod. */
  toCount: number;
  /** podMin, the number that opens the narrow pod. */
  needed: number;
  kind: "heritage" | "faith";
}

/** Group-level counts only: safe to hand to Claude (D18 job 4). */
export function widenFacts(
  r: PlacementResult,
  toCount: number,
  config: Pick<PlacementConfig, "podMin">,
  tax: Taxonomy = DEFAULT_TAXONOMY,
): WidenFacts | null {
  const g = stepOf(r, "widen_group");
  if (!g || !r.candidate.community_kind) return null;
  const m = /^Only (\d+) .+ nearby, so we widened to (.+)\.$/.exec(g.detail);
  if (!m) return null;
  const from = tax[r.candidate.community_kind][r.candidate.topic_key];
  return {
    fromLabel: from?.label ?? r.candidate.label,
    toLabel: m[2],
    fromCount: Number(m[1]),
    toCount,
    needed: config.podMin,
    kind: r.candidate.community_kind,
  };
}

/** Template body (<= 160 chars) used when Claude is off or fails. */
export function widenTemplateBody(f: WidenFacts, tax: Taxonomy = DEFAULT_TAXONOMY): string {
  const to = Object.values(tax[f.kind]).find((n) => n.label === f.toLabel);
  const place = to?.place ?? f.toLabel;
  const intro =
    f.kind === "heritage"
      ? `Your pod brings together ${f.toCount} people with roots across ${place}.`
      : `Your pod brings together ${f.toCount} people from ${place}.`;
  const body = `${intro} We'll offer you a ${f.fromLabel} pod as soon as ${f.needed} people join.`;
  return body.length <= 160 ? body : `${intro} We'll offer a ${f.fromLabel} pod when ${f.needed} people join.`;
}

export interface ChecklistItem {
  id: "interests" | "nearby" | "ages" | "communities" | "widen" | "plan";
  label: string;
  /** Short result line shown after the tick (counts only). */
  detail: string;
}

/** The /placing checklist (BLUEPRINT OB-11), built from a real (dry-run) result. Pass the person's age and city. */
export function placingChecklist(
  run: Pick<PlacementRun, "results">,
  who: { city: string; age: number },
  config: Pick<PlacementConfig, "ageBand" | "ageBandWide" | "minAge" | "maxAge">,
): ChecklistItem[] {
  const interest = run.results.filter((r) => r.candidate.type === "interest");
  const community = run.results.filter((r) => r.candidate.type === "community");
  const placed = run.results.filter((r) => r.outcome !== "waitlisted");
  const items: ChecklistItem[] = [
    {
      id: "interests",
      label: "Matching your interests",
      detail: interest.length ? interest.map((r) => r.candidate.label).join(", ") : "No interests picked",
    },
    {
      id: "nearby",
      label: `Looking for people near ${who.city}`,
      detail: `${placed.length} ${placed.length === 1 ? "pod" : "pods"} ready`,
    },
    {
      id: "ages",
      label: `Checking ages ${ageRangeLabel(who.age, config.ageBand, config as PlacementConfig)}`,
      detail: "Within a few years of you",
    },
  ];
  if (community.length) {
    items.push({ id: "communities", label: "Checking community pods", detail: `${community.length} checked` });
  }
  if (run.results.some((r) => r.steps.some((s) => s.rule === "widen_group") && r.outcome !== "waitlisted")) {
    items.push({ id: "widen", label: "Widening one group a little", detail: "One group widened" });
  }
  items.push({ id: "plan", label: "Planning your first hangouts", detail: "Planner ready" });
  return items;
}
