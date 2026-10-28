// [U0] Config barrel: defaults + the zod schema for the whole AppConfig (db.config).
import { z } from "zod/v4";
import { PlacementConfigSchema, placementDefaults } from "./placement";
import { PlannerConfigSchema, plannerDefaults } from "./planner";
import { FeatureFlagsSchema, flagDefaults } from "./app";
import { DemoConfigSchema, demoDefaults } from "./demo";

export const AppConfigSchema = z.object({
  placement: PlacementConfigSchema,
  planner: PlannerConfigSchema,
  flags: FeatureFlagsSchema,
  demo: DemoConfigSchema,
});

export function defaultConfig() {
  return {
    placement: structuredClone(placementDefaults),
    planner: structuredClone(plannerDefaults),
    flags: structuredClone(flagDefaults),
    demo: structuredClone(demoDefaults),
  };
}

export { placementDefaults, plannerDefaults, flagDefaults, demoDefaults };
export { PlacementConfigSchema, PlannerConfigSchema, FeatureFlagsSchema, DemoConfigSchema };
export { APP } from "./app";
export { DEMO } from "./demo";
