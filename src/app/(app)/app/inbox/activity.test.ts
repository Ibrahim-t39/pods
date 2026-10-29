// Inbox (sweep 10/29): the Needs you number matches Home through the video beats, on-deck chats stay quiet,
// activation updates fold into one list-formatted line, and earlier updates keep their words.
import { beforeEach, describe, expect, it } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { DEMO } from "@/config/demo";
import { nowMs } from "@/lib/time/clock";
import { demoHangout, everyoneChecksIn, jumpAfterHangout, revealRunItBack, skipToPlaced } from "@/lib/simulation/director";
import { roomTables } from "@/components/pods/model";
import { listFormat, needsYouCount, needsYouLine } from "@/lib/platform/needs-you";
import { buildActivity, counted } from "./activity";

const db = () => useStore.getState().db;
const activity = () => buildActivity(db(), new Date(nowMs()), new Set(), false);
const inboxCount = () => activity().filter(counted).length;
const homeCount = () => needsYouCount(db(), nowMs());

describe("needs you", () => {
  beforeEach(async () => {
    useStore.setState({ db: freshDb("demo"), hydrated: true, mode: "demo" });
    await skipToPlaced(localRepo());
  });

  it("matches Home in fresh Demo, after the lock and after round two", async () => {
    expect(homeCount()).toBeGreaterThan(0);
    expect(inboxCount()).toBe(homeCount());
    // polls are listed but never counted
    expect(activity().some((a) => a.act?.type === "poll")).toBe(true);

    const r = await localRepo().rsvp(DEMO.hoopers.suggestionId, "going");
    expect(r.ok).toBe(true);
    expect(inboxCount()).toBe(homeCount());

    jumpAfterHangout();
    await localRepo().checkIn(demoHangout()!.id);
    everyoneChecksIn();
    revealRunItBack();
    // Round two: the Inbox shows Home's number (the shared selector). Home also counts a revealed run-it-back, which
    // has no answer left to give, so the cards can be one fewer than the number; never more.
    const tables = roomTables(db(), nowMs());
    const revealed = tables.filter((t) => t.open && t.row.status === "run_it_back").length;
    expect(inboxCount()).toBe(homeCount() - revealed);
  });

  it("keeps on-deck pods' chats out of the inbox before the first hangout", () => {
    const deck = new Set(db().memberships.filter((m) => m.user_id === db().me && m.activation === "on_deck").map((m) => m.pod_id));
    expect(deck.size).toBeGreaterThan(0);
    expect(activity().filter((a) => a.kind === "messages" && deck.has(a.podId ?? ""))).toHaveLength(0);
  });

  it("folds pods that open later into one line and keeps the placed update unchanged", async () => {
    const before = activity().find((a) => a.id.startsWith("d:placed:"))?.body;
    await localRepo().rsvp(DEMO.hoopers.suggestionId, "going");
    jumpAfterHangout();
    await localRepo().checkIn(demoHangout()!.id);
    const after = activity();
    expect(after.find((a) => a.id.startsWith("d:placed:"))?.body).toBe(before);
    const opened = after.filter((a) => a.ids && a.title.endsWith("open now."));
    expect(opened).toHaveLength(1);
    expect(opened[0].title).toMatch(/^[^,]+ and [^,]+ are open now\.$/);
    for (const a of after) expect(`${a.title} ${a.body}`).not.toMatch(/ and [^.]* and /);
  });
});

describe("copy helpers", () => {
  it("formats lists and the count line", () => {
    expect(listFormat(["A"])).toBe("A");
    expect(listFormat(["A", "B"])).toBe("A and B");
    expect(listFormat(["A", "B", "C"])).toBe("A, B and C");
    expect(needsYouLine(0)).toBe("You're all set");
    expect(needsYouLine(1)).toBe("1 needs you");
    expect(needsYouLine(2)).toBe("2 need you");
  });
});
