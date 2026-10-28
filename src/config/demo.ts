// [U0] Canonical demo values. BLUEPRINT §0 is the only source; tests/unit/canon.test.ts asserts these.
import { z } from "zod/v4";

export const DemoConfigSchema = z.object({
  /** Virtual "now" at boot. The clock pins to this so the Hoopers card always reads "In 4 days". */
  anchor: z.string().nullable(),
  venueVariant: z.enum(["rec_center", "park_courts"]),
  /** Director "No AI": every Claude job uses its template. */
  noAI: z.boolean(),
  crowd: z.boolean(),
  fastLatency: z.boolean(),
});
export type DemoConfig = z.infer<typeof DemoConfigSchema>;

export const demoDefaults: DemoConfig = DemoConfigSchema.parse({
  anchor: "2026-11-04T09:00:00-06:00",
  venueVariant: "rec_center",
  noAI: false,
  crowd: true,
  fastLatency: false,
});

/** Fixed demo facts (BLUEPRINT §0 table). */
export const DEMO = {
  anchor: "2026-11-04T09:00:00-06:00",
  hoopers: {
    podId: "pod_hoopers",
    suggestionId: "sug_hoopers_1",
    title: "Sunday pickup run at Brahan Spring",
    starts_at: "2026-11-08T13:00:00-06:00",
    ends_at: "2026-11-08T15:00:00-06:00",
    reason: "7 of 8 of you are free Sunday afternoons",
    goingBeforeYou: 3,
  },
  directorJump: { label: "Jump to after hangout (Sun 3:15 PM)", at: "2026-11-08T15:15:00-06:00" },
  southernAfrican: {
    podId: "pod_southern_african",
    starts_at: "2026-11-15T13:00:00-06:00",
    ends_at: "2026-11-15T15:00:00-06:00",
    venue: "Big Spring Park",
  },
  hangout2Options: [
    { label: "Same time in 2 weeks", starts_at: "2026-11-22T13:00:00-06:00", venue: "Brahan Spring", isDefault: true },
    { label: "Weeknight run", starts_at: "2026-11-19T18:30:00-06:00", venue: "Dr. Richard Showers Sr. Recreation Center", isDefault: false },
  ],
  podsAtStart: 2,
  zambiansInMetro: 3,
  persona: { first_name: "Chanda", age: 22 },
} as const;
