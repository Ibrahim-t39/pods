// [U0] Placement rules (ARCHITECTURE §10). Every number lives here; admin can override at runtime (db.config.placement).
import { z } from "zod/v4";

export const PlacementConfigSchema = z.object({
  podMin: z.number().int().min(2),
  podTarget: z.number().int().min(2),
  podMax: z.number().int().min(2),
  ageBand: z.number().int().min(0),
  ageBandWide: z.number().int().min(0),
  minAge: z.number().int(),
  maxAge: z.number().int(),
  maxInterestPods: z.number().int().min(1),
  maxCommunityPods: z.number().int().min(0),
  metro: z.array(z.enum(["Seattle", "Bellevue", "Shoreline"])),
  preferUpcomingHangout: z.boolean(),
});
export type PlacementConfig = z.infer<typeof PlacementConfigSchema>;

export const placementDefaults: PlacementConfig = PlacementConfigSchema.parse({
  podMin: 6,
  podTarget: 8,
  podMax: 10,
  ageBand: 3,
  ageBandWide: 5,
  minAge: 18,
  maxAge: 29,
  maxInterestPods: 5,
  maxCommunityPods: 2,
  metro: ["Seattle", "Bellevue", "Shoreline"],
  preferUpcomingHangout: true,
});
