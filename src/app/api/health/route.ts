// [U4] GET /api/health → { ok, claude, ms }. With ?deep=1 it makes ONE real Claude call on a fixed tiny pod
// (no user data) and reports { ok, source, ms, errorClass } (ARCHITECTURE §8.3 smoke test; Director "Health").
import { runPlanner } from "@/lib/planner/run";
import { getForecast } from "@/lib/planner/weather";
import type { PlannerInput } from "@/lib/planner/types";
import { plannerDefaults } from "@/config/planner";

const TINY: PlannerInput = {
  pod: { kind: "interest", activity: "basketball", templateKey: "basketball", fitKey: "basketball", size: 6, city: "Huntsville" },
  availability: [{ slot: "sunday-afternoon", free: 5 }, { slot: "thursday-evening", free: 3 }],
  sharers: 6,
  venues: [
    { id: "v_court", name: "Test Recreation Center", shortName: "Test Rec", address: "1 Test Ave", type: "community_center", isPublic: true, indoor: true, costPerPerson: 0, alcoholCentered: false, goodFor: ["basketball"] },
  ],
  pastHangouts: [],
  hangoutNumber: 1,
  budgetMax: 15,
  earliestDate: "2026-11-06",
  rules: {
    budgetMs: plannerDefaults.claudeBudgetMs,
    rainThreshold: plannerDefaults.rainThreshold,
    minSharers: plannerDefaults.minAvailabilitySharers,
    starterWindow: plannerDefaults.starterWindow,
    model: plannerDefaults.model,
  },
};

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  const { claudeJobs, hasClaude } = await import("@/lib/planner/claude");
  const t0 = performance.now();
  if (!deep) return Response.json({ ok: true, claude: hasClaude(), ms: Math.round(performance.now() - t0) }, { headers: { "Cache-Control": "no-store" } });

  let source = "none";
  let errorClass: string | null = null;
  for await (const e of runPlanner(TINY, { mode: "server", claude: hasClaude() ? claudeJobs : null, forecast: (d) => getForecast(d) })) {
    if (e.type === "plan") source = e.source;
    if (e.type === "step" && e.id === "draft" && e.status === "warn") errorClass = /\(([^)]+)\)/.exec(e.detail ?? "")?.[1] ?? "Fallback";
    if (e.type === "error") errorClass = e.code;
  }
  return Response.json(
    { ok: source === "claude", claude: hasClaude(), source, ms: Math.round(performance.now() - t0), errorClass },
    { headers: { "Cache-Control": "no-store" } },
  );
}
