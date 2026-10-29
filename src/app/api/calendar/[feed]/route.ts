// GET /api/calendar/<feed>.ics → text/calendar. The feed token is the person's upcoming plans and hangouts, encoded
// on their device (lib/platform/calendar.ts encodeFeed), so Google, Apple and Outlook can subscribe without the server
// holding anyone's data. Times only, first names never; capped at 200 events.
import { buildFeed, decodeFeed } from "@/lib/platform/calendar";

export async function GET(request: Request, { params }: { params: Promise<{ feed: string }> }) {
  const { feed } = await params;
  const token = feed.replace(/\.ics$/, "");
  if (token.length > 60_000) return new Response("Feed too long", { status: 414 });
  const events = decodeFeed(token);
  const origin = new URL(request.url).origin;
  const body = buildFeed(events, new Date().toISOString(), origin);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pods.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
