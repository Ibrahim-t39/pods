// [U4] POST /api/plan?job=plan|next_options|why_fits|widen_explainer → application/x-ndjson of PlannerEvent.
// Validates the body with zod (strict: unknown keys are rejected), caps it at 64 KB / 12 members / 80 venues, never
// echoes the input, never logs payloads. Logs one line per run: job, a hash of the pod key, source and latency.
import { MAX_BODY_BYTES, LineJobBodySchema, PlannerInputSchema, WhyFitsInSchema, WidenInSchema } from "@/lib/planner/schema";
import { runLineJob, runPlanner, type PlannerDeps } from "@/lib/planner/run";
import { getForecast } from "@/lib/planner/weather";
import type { PlannerEvent, PlannerInput, WhyFitsInput, WidenInput } from "@/lib/planner/types";

const JOBS = ["plan", "next_options", "why_fits", "widen_explainer"] as const;
type Job = (typeof JOBS)[number];

const bad = (message: string) => Response.json({ error: message }, { status: 400 });

function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export async function POST(request: Request) {
  const job = (new URL(request.url).searchParams.get("job") ?? "plan") as Job;
  if (!JOBS.includes(job)) return bad("Unknown job");

  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return bad("Body too large");
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return bad("Unreadable body");
  }
  if (raw.length > MAX_BODY_BYTES) return bad("Body too large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Body must be JSON");
  }

  const { claudeJobs, hasClaude } = await import("@/lib/planner/claude");
  const deps: PlannerDeps = {
    mode: "server",
    claude: hasClaude() ? claudeJobs : null,
    forecast: (date, venue, signal) => getForecast(date, { lat: venue?.lat, lng: venue?.lng, signal }),
    signal: request.signal,
  };

  let events: AsyncGenerator<PlannerEvent>;
  let podKey = "-";
  if (job === "plan" || job === "next_options") {
    const parsed = PlannerInputSchema.safeParse(body);
    if (!parsed.success) {
      // Field paths only, never values.
      console.warn(`[plan] job=${job} rejected: ${parsed.error.issues.map((i) => i.path.join(".")).slice(0, 5).join(", ")}`);
      return bad("Invalid planner input");
    }
    const input = parsed.data as PlannerInput;
    podKey = shortHash(`${input.pod.templateKey}:${input.pod.size}`);
    events = runPlanner(input, deps, job);
  } else {
    const outer = LineJobBodySchema.safeParse(body);
    if (!outer.success) return bad("Invalid body");
    const inner = job === "why_fits" ? WhyFitsInSchema.safeParse(outer.data.input) : WidenInSchema.safeParse(outer.data.input);
    if (!inner.success) return bad("Invalid job input");
    events = runLineJob(job, inner.data as WhyFitsInput | WidenInput, deps, {
      budgetMs: outer.data.budgetMs ?? 8000,
      model: outer.data.model ?? "claude-opus-5-5",
      noAI: outer.data.noAI,
    });
  }

  const encoder = new TextEncoder();
  const t0 = performance.now();
  const stream = new ReadableStream({
    async start(controller) {
      let source = "none";
      try {
        for await (const event of events) {
          if (event.type === "plan" || event.type === "result") source = event.source;
          if (event.type === "options") source = event.options.map((o) => o.source).join("+");
          if (event.type === "error") source = `error:${event.code}`;
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch {
        // Any exception is a fallback on the client, never an error screen.
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", code: "UNKNOWN", message: "Planner stopped" } satisfies PlannerEvent) + "\n"));
        source = "exception";
      } finally {
        console.info(`[plan] job=${job} pod=${podKey} source=${source} ms=${Math.round(performance.now() - t0)}`);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
