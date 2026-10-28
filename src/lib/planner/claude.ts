// [U4] SERVER ONLY. The Claude calls behind /api/plan (ARCHITECTURE §8.3, BLUEPRINT §6.6). Imported dynamically by
// run.ts only when running on the server, so the browser bundle never pulls in the SDK.
// Rules: the system prompts are static (cacheable); per-request data goes in the user message as JSON with sorted keys;
// payloads are counts only (no names, heritage, faith or blocked_days); nothing here logs a payload.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";
import { NextOptionSchema, PlanSchema, WhyFitsSchema, WidenSchema } from "./types";

export const hasClaude = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const RULES = `Rules you must follow:
- Use ONLY a venue_id from the provided candidate list. Never invent a place, and never name a place that is not in the list.
- First hangouts are at public venues, in daytime or early evening, and are not centered on alcohol.
- Keep it within the per-person budget. If a venue's cost is unconfirmed, the cost field reads "Cost to confirm".
- Fit the pod's shared activity; make it easy for strangers to talk (a shared activity, not just sitting).
- Use the chosen date and time window exactly as given.
- If rain is likely and the venue is outdoors, the rain_plan must name an indoor venue from the list.
- The reason uses counts only, e.g. "Chosen because 7 of 8 of you are free Sunday afternoons." Never guess why anyone is unavailable.
- Write warm, concise, plain copy for 22-year-olds. Sentence case. No emojis, no hype, no exclamation marks.`;

const SYSTEM_PLAN = `You plan small-group hangouts for Pods, an app that places young adults (18-29) who just moved to a new city into small recurring friend groups called pods.
${RULES}`;

const SYSTEM_NEXT = `You plan the next hangout for a Pods pod that just met and said they want to run it back.
You get counts from the last hangout and up to three chat themes from a fixed list. Draft ONE option that keeps what worked and adds what the theme suggests.
${RULES}
- The reason is one line, at most 90 characters, and refers to counts or themes only. Never quote a message or name a person.`;

const SYSTEM_WHY = `You write the one-line "why this fits" note Pods shows next to a pod a new member was placed in.
Use only the numbers and words in the input. At most 90 characters. No names. Never mention heritage, faith or any community by name. Plain, warm, sentence case, no emojis, no ending period.`;

const SYSTEM_WIDEN = `You write one or two short sentences explaining to a new member why Pods widened their community group.
Use only the group labels and counts in the input. At most 160 characters. Never name a person. Plain, warm, sentence case, no emojis.`;

/** JSON with sorted keys (stable bytes, cache-friendly). */
export function sortedJson(v: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(sort) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])])) : x;
  return JSON.stringify(sort(v));
}

export type ClaudeOutcome<T> = { ok: true; data: T } | { ok: false; errorClass: string };

function errorClassOf(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "RateLimitError";
  if (e instanceof Anthropic.APIConnectionTimeoutError) return "APIConnectionTimeoutError";
  if (e instanceof Anthropic.APIConnectionError) return "APIConnectionError";
  if (e instanceof Anthropic.APIUserAbortError) return "Aborted";
  if (e instanceof Anthropic.APIError) return `APIError${e.status ? `:${e.status}` : ""}`;
  if (e instanceof Error && e.name === "AbortError") return "Aborted";
  return e instanceof Error ? e.constructor.name : "Unknown";
}

async function parse<S extends z.ZodType>(
  schema: S,
  system: string,
  brief: unknown,
  opts: { signal: AbortSignal; model: string; previous?: unknown; errors?: string[]; ask: string },
): Promise<ClaudeOutcome<z.infer<S>>> {
  try {
    const client = new Anthropic({ timeout: 6_000, maxRetries: 0 });
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: `${opts.ask}\n\n${sortedJson(brief)}` }];
    if (opts.previous && opts.errors?.length) {
      messages.push({ role: "assistant", content: sortedJson(opts.previous) });
      messages.push({ role: "user", content: `Your previous answer failed these checks: ${opts.errors.join("; ")}. Fix them and answer again.` });
    }
    const response = await client.beta.messages.parse(
      {
        model: opts.model,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: betaZodOutputFormat(schema) },
        system,
        messages,
      },
      { signal: opts.signal },
    );
    if (response.stop_reason === "refusal") return { ok: false, errorClass: "Refusal" };
    const out = response.parsed_output;
    if (!out) return { ok: false, errorClass: "NoOutput" };
    return { ok: true, data: out as z.infer<S> };
  } catch (e) {
    return { ok: false, errorClass: errorClassOf(e) };
  }
}

export const claudeJobs = {
  plan: (brief: unknown, o: { signal: AbortSignal; model: string; previous?: unknown; errors?: string[] }) =>
    parse(PlanSchema, SYSTEM_PLAN, brief, { ...o, ask: "Plan this pod's hangout. Return only the plan." }),
  nextOption: (brief: unknown, o: { signal: AbortSignal; model: string; previous?: unknown; errors?: string[] }) =>
    parse(NextOptionSchema, SYSTEM_NEXT, brief, { ...o, ask: "Draft one more option for the pod's next hangout." }),
  whyFits: (brief: unknown, o: { signal: AbortSignal; model: string; previous?: unknown; errors?: string[] }) =>
    parse(WhyFitsSchema, SYSTEM_WHY, brief, { ...o, ask: "Write the line." }),
  widen: (brief: unknown, o: { signal: AbortSignal; model: string; previous?: unknown; errors?: string[] }) =>
    parse(WidenSchema, SYSTEM_WIDEN, brief, { ...o, ask: "Write the explainer." }),
};
export type ClaudeJobs = typeof claudeJobs;
