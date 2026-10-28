// [U4] Request schemas for /api/plan (ARCHITECTURE §8.4). `.strict()` everywhere: an unknown key (a name, an id,
// a heritage field) is rejected with 400, so nothing beyond counts can reach Claude even by mistake.
import { z } from "zod/v4";
import { SLOTS, THEMES } from "./types";
import { PlanSchema } from "./types";

const short = z.string().max(120);
const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const VenueInSchema = z
  .object({
    id: z.string().max(80),
    name: short,
    shortName: short.optional(),
    address: z.string().max(200),
    type: z.string().max(40),
    isPublic: z.boolean(),
    indoor: z.boolean(),
    costPerPerson: z.number().min(0).max(1000),
    costUnconfirmed: z.boolean().optional(),
    alcoholCentered: z.boolean(),
    goodFor: z.array(z.string().max(40)).max(20),
    parking: z.string().max(200).nullable().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
  .strict();

export const PlannerInputSchema = z
  .object({
    pod: z
      .object({
        kind: z.enum(["interest", "community"]),
        activity: z.string().max(40),
        templateKey: z.string().max(40),
        fitKey: z.string().max(40),
        size: z.number().int().min(1).max(12),
        city: z.string().max(40),
      })
      .strict(),
    availability: z.array(z.object({ slot: z.enum(SLOTS), free: z.number().int().min(0).max(12) }).strict()).max(SLOTS.length),
    sharers: z.number().int().min(0).max(12),
    venues: z.array(VenueInSchema).max(80),
    pastHangouts: z.array(z.object({ title: short, venueId: z.string().max(80), date: date.optional(), startHHMM: hhmm.optional() }).strict()).max(20),
    hangoutNumber: z.number().int().min(1).max(100),
    budgetMax: z.number().min(0).max(200),
    earliestDate: date,
    avoid: z
      .object({
        title: short,
        venueId: z.string().max(80),
        startsAt: z.string().max(40).optional(),
        prefs: z.array(z.enum(["different_time", "different_place", "chill", "surprise"])).max(4).optional(),
      })
      .strict()
      .optional(),
    context: z
      .object({
        checkedIn: z.number().int().min(0).max(12),
        runItBackYes: z.number().int().min(0).max(12),
        answered: z.number().int().min(0).max(12),
        themes: z.array(z.enum(THEMES)).max(3),
      })
      .strict()
      .optional(),
    rules: z
      .object({
        budgetMs: z.number().int().min(1000).max(20000),
        rainThreshold: z.number().min(0).max(100),
        minSharers: z.number().int().min(0).max(12),
        starterWindow: z.object({ startMin: hhmm, startMax: hhmm, endMax: hhmm }).strict(),
        model: z.string().max(40),
      })
      .strict(),
    noAI: z.boolean().optional(),
    cachedDraft: PlanSchema.nullable().optional(),
  })
  .strict();

export const WhyFitsInSchema = z
  .object({
    activity: z.string().max(40),
    kind: z.enum(["interest", "community"]),
    size: z.number().int().min(1).max(12),
    topSlot: z.object({ label: z.string().max(40), free: z.number().int().min(0).max(12) }).strict().nullable(),
    ageBand: z.tuple([z.number().int(), z.number().int()]),
    metro: z.string().max(40),
  })
  .strict();

export const WidenInSchema = z
  .object({
    steps: z.array(z.object({ label: z.string().max(40), nearby: z.number().int().min(0).max(500) }).strict()).min(1).max(4),
    minSize: z.number().int().min(1).max(12),
  })
  .strict();

export const LineJobBodySchema = z
  .object({ input: z.unknown(), noAI: z.boolean().optional(), budgetMs: z.number().int().min(1000).max(20000).optional(), model: z.string().max(40).optional() })
  .strict();

export const MAX_BODY_BYTES = 64 * 1024;
