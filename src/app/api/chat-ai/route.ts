// POST /api/chat-ai { question, facts[], draft } → { text: string | null }. With a Claude key, rephrases the rule-based
// draft as a short chat reply using only the given facts; without one (or on any failure) returns null and the client
// keeps its draft. No names beyond what the facts carry, nothing logged.
import { z } from "zod/v4";

const Body = z.object({ question: z.string().max(400), facts: z.array(z.string().max(400)).max(8), draft: z.string().max(600) }).strict();

const SYSTEM = `You are the AI in a small friend group's chat on Pods. Answer the member's question in one or two short sentences.
Use ONLY the facts and the draft provided. Never invent a place, time, price or person. Plain, warm, sentence case.
No emojis, no exclamation marks, no puns, no filler. Do not greet. Do not sign off.`;

export async function POST(request: Request) {
  let body: z.infer<typeof Body>;
  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
    body = parsed.data;
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const { hasClaude } = await import("@/lib/planner/claude");
  if (!hasClaude()) return Response.json({ text: null });
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ timeout: 5_000, maxRetries: 0 });
    const res = await client.messages.create(
      {
        model: process.env.PODS_CHAT_MODEL ?? "claude-opus-5-5",
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: "user", content: `Question: ${body.question}\nFacts:\n- ${body.facts.join("\n- ")}\nDraft answer: ${body.draft}` }],
      },
      { signal: request.signal },
    );
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return Response.json({ text: text && text.length <= 400 ? text : null });
  } catch {
    return Response.json({ text: null });
  }
}
