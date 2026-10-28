// [U0] Planner rules (ARCHITECTURE §10, BLUEPRINT §0: claudeBudgetMs = 8000).
import { z } from "zod/v4";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export const PlannerConfigSchema = z.object({
  budgetMax: z.number().min(0),
  lockThreshold: z.number().int().min(1),
  maxOptions: z.number().int().min(1).max(3),
  starterWindow: z.object({ startMin: hhmm, startMax: hhmm, endMax: hhmm }),
  minAvailabilitySharers: z.number().int().min(0),
  rainThreshold: z.number().min(0).max(100),
  earliestOffsetDays: z.number().int().min(0),
  nextHangoutDefault: z.object({ sameSlot: z.boolean(), weeksOut: z.array(z.number().int().min(1)) }),
  adminReview: z.boolean(),
  claudeBudgetMs: z.number().int().min(1000),
  stepDwellMs: z.number().int().min(0),
  model: z.string(),
  /** Run-it-back: a number is revealed only when at least this many said Yes (BLUEPRINT §7.1). */
  runItBackRevealMin: z.number().int().min(1),
});
export type PlannerConfig = z.infer<typeof PlannerConfigSchema>;

export const plannerDefaults: PlannerConfig = PlannerConfigSchema.parse({
  budgetMax: 15,
  lockThreshold: 4,
  maxOptions: 3,
  starterWindow: { startMin: "09:00", startMax: "19:00", endMax: "20:00" },
  minAvailabilitySharers: 2,
  rainThreshold: 50,
  earliestOffsetDays: 2,
  nextHangoutDefault: { sameSlot: true, weeksOut: [1, 2] },
  adminReview: false,
  claudeBudgetMs: 8000,
  stepDwellMs: 450,
  model: "claude-opus-5-5",
  runItBackRevealMin: 4,
});
