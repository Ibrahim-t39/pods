// [U0] Feature flags = the spec's open decisions, as ruled in BLUEPRINT §0 (D4, D8, D10, D12).
import { z } from "zod/v4";

export const FeatureFlagsSchema = z.object({
  podsAtStart: z.union([z.literal("all"), z.literal(2)]),
  womenOnlyOption: z.boolean(),
  adminSelection: z.enum(["first_two_checkins", "pod_vote"]),
  verificationMode: z.enum(["simulated", "vendor"]),
  discreetCommunityNames: z.boolean(),
  /** Per device: mask community pod names in-app too (Settings › Privacy). */
  maskCommunityInApp: z.boolean(),
  runItBack: z.boolean(),
  notificationBatchMinutes: z.number().int().min(0),
});
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const flagDefaults: FeatureFlags = FeatureFlagsSchema.parse({
  podsAtStart: 2,
  womenOnlyOption: false,
  adminSelection: "first_two_checkins",
  verificationMode: "simulated",
  discreetCommunityNames: true,
  maskCommunityInApp: false,
  runItBack: true,
  notificationBatchMinutes: 30,
});

export const APP = {
  name: "Pods",
  title: "Pods",
  tagline: "Find your people. Then keep them.",
  description: "Small friend groups that meet again.",
  timeZone: "America/Chicago",
} as const;
