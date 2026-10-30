// Platform foundation (PLATFORM_SPEC §D, §M): mode helpers, the Live world, starter plans, chat replies/reactions,
// polls, memories, member proposals, Discover, invites, trusted contact, inbox, plans, search, .ics, directions, nav.
import { beforeEach, describe, expect, it } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { activeSuggestion, myMemberships } from "@/lib/db/selectors";
import { DEMO } from "@/config/demo";
import { modeFromSearch, resolveInitialMode, DB_KEYS } from "@/lib/mode/mode";
import { buildLiveSeed } from "@/data/live-seed";
import { discoverPods, inbox, myPeople, myPlans, planShareText, pollTally, podMemories, searchAll, smsHref, unreadCount } from "./selectors";
import { buildIcs, icsDate, icsEscape, icsFold, icsForPlan } from "./ics";
import { directionsUrl } from "./directions";
import { activeDestination, destinationsFor, showsNav } from "./nav";
import { inviteUrl, isInviteCode } from "./invite";
import { nowISO, nowMs } from "@/lib/time/clock";
import type { AppMode } from "@/lib/types";

const repo = () => localRepo();
const db = () => useStore.getState().db;

async function onboard(phone = "(206) 555-0142", interests = ["basketball", "guitar"]) {
  const r = repo();
  const ch = await r.startPhoneAuth(phone);
  if (!ch.ok) throw new Error("no challenge");
  await r.verifyPhoneCode(ch.data.challengeId, "123456");
  await r.updateAbout({ first_name: "Chanda", nickname: null, date_of_birth: "2004-03-14", city: "Seattle" });
  await r.setInterests(interests);
  await r.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "sda" }, consent: true });
  await r.setAvailability(["weekday-evening", "sunday-afternoon"], []);
  await r.acceptPledge();
  await r.submitVerification({});
  const run = await r.runPlacement();
  if (!run.ok) throw new Error(run.error.code);
  return r;
}

function boot(mode: AppMode) {
  useStore.setState({ db: freshDb(mode), hydrated: true, mode });
}

describe("mode helpers", () => {
  it("URL wins, then saved, then demo; junk is ignored", () => {
    expect(modeFromSearch("?mode=live")).toBe("live");
    expect(modeFromSearch("?mode=prod")).toBeNull();
    expect(resolveInitialMode("?mode=demo", "live")).toBe("demo");
    expect(resolveInitialMode("", "live")).toBe("live");
    expect(resolveInitialMode("?director=1", null)).toBe("demo");
    expect(DB_KEYS.demo).toBe("pods:v1");
    expect(DB_KEYS.live).not.toBe(DB_KEYS.demo);
  });
});

describe("Live world", () => {
  it("keeps people, pods and venues; drops every scripted moment", () => {
    const demo = freshDb("demo");
    const live = buildLiveSeed("2026-10-28T12:00:00-07:00");
    expect(Object.keys(live.users)).toEqual(Object.keys(demo.users));
    expect(Object.keys(live.pods)).toEqual(Object.keys(demo.pods));
    expect(Object.keys(live.venues).length).toBeGreaterThan(0);
    expect(live.hangouts).toEqual({});
    expect(live.suggestions).toEqual({});
    expect(live.rsvps).toEqual([]);
    expect(live.reports).toEqual({});
    expect(Object.values(live.messages).every((l) => l.length === 0)).toBe(true);
    expect(live.clock.virtual_at).toBe("2026-10-28T12:00:00-07:00");
    expect(live.config.demo.anchor).toBeNull();
  });

  it("onboarding in Live produces pods that each open with a planned first hangout", async () => {
    boot("live");
    await onboard();
    const d = db();
    const active = myMemberships(d).filter((m) => m.activation === "active");
    expect(active.length).toBeGreaterThanOrEqual(1);
    for (const m of active) {
      const s = activeSuggestion(d, m.pod_id);
      expect(s, `starter for ${m.pod_id}`).toBeDefined();
      expect(s!.round).toBe(1);
      expect(Date.parse(s!.starts_at)).toBeGreaterThan(nowMs());
      expect(d.messages[m.pod_id].some((x) => x.kind === "plan_card" && x.ref_id === s!.id)).toBe(true);
      expect(d.venues[s!.venue_id].is_public).toBe(true);
    }
    // nothing scripted leaked in: no RSVPs until people answer
    expect(d.rsvps).toHaveLength(0);
    // planStarters is a no-op now
    const again = await repo().planStarters();
    expect(again.ok && again.data).toEqual([]);
  });

  it("Demo placement keeps the scripted Hoopers plan (no extra starter)", async () => {
    boot("demo");
    await onboard();
    const hoopers = Object.values(db().suggestions).filter((s) => s.pod_id === DEMO.hoopers.podId);
    expect(hoopers).toHaveLength(1);
    expect(hoopers[0].id).toBe(DEMO.hoopers.suggestionId);
  });
});

describe("chat: replies, reactions, polls", () => {
  beforeEach(async () => {
    boot("demo");
    await onboard();
  });
  const pod = DEMO.hoopers.podId;

  it("a reply threads under its parent and tells the parent's author", async () => {
    const parent = db().messages[pod].find((m) => m.user_id && m.user_id !== db().me)!;
    const r = await repo().sendMessage(pod, "Count me in", "c1", { replyTo: parent.id });
    expect(r.ok && r.data.reply_to).toBe(parent.id);
    const n = db().notifications.find((x) => x.user_id === parent.user_id && x.trigger === "reply");
    expect(n?.href).toBe(`/app/pods/${pod}/chat`);
    expect((await repo().sendMessage(pod, "x", "c2", { replyTo: "msg_nope" })).ok).toBe(false);
  });

  it("reactions toggle per person", async () => {
    const m = db().messages[pod][0];
    const a = await repo().react(pod, m.id, "heart");
    expect(a.ok && a.data.heart).toEqual([db().me]);
    const b = await repo().react(pod, m.id, "heart");
    expect(b.ok && b.data.heart).toBeUndefined();
    expect((await repo().react(pod, m.id, "nope" as never)).ok).toBe(false);
    expect((await repo().react("pod_books", m.id, "heart")).ok).toBe(false); // not a member
  });

  it("polls: validate, post a chat line, one movable vote, close", async () => {
    expect((await repo().createPoll(pod, "Ball?", ["Yes"], "p0")).ok).toBe(false);
    const p = await repo().createPoll(pod, "Who brings a ball?", ["Me", "Not me", "Me"], "p1");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.data.options).toHaveLength(2); // de-duplicated
    expect(db().messages[pod].some((m) => m.kind === "poll" && m.ref_id === p.data.id)).toBe(true);
    const dupe = await repo().createPoll(pod, "Who brings a ball?", ["Me", "Not me"], "p1");
    expect(dupe.ok && dupe.data.id).toBe(p.data.id);
    await repo().votePoll(p.data.id, p.data.options[0].id);
    await repo().votePoll(p.data.id, p.data.options[1].id);
    const t = pollTally(db().polls[p.data.id], db().me);
    expect(t.total).toBe(1);
    expect(t.mine).toBe(p.data.options[1].id);
    expect((await repo().closePoll(p.data.id)).ok).toBe(true);
    expect((await repo().votePoll(p.data.id, p.data.options[0].id)).ok).toBe(false);
  });

  it("memories: note or photo, author-only removal", async () => {
    expect((await repo().addMemory(pod, { caption: "  " })).ok).toBe(false);
    expect((await repo().addMemory(pod, { caption: "x", photoUrl: "https://evil/x.png" })).ok).toBe(false);
    const m = await repo().addMemory(pod, { caption: "First run, good run" });
    expect(m.ok).toBe(true);
    expect(podMemories(db(), pod)).toHaveLength(1);
    if (m.ok) expect((await repo().removeMemory(m.data.id)).ok).toBe(true);
    expect(podMemories(db(), pod)).toHaveLength(0);
  });
});

describe("plans: proposals, calendar, share, .ics", () => {
  beforeEach(async () => {
    boot("demo");
    await onboard();
  });
  const pod = DEMO.hoopers.podId;

  it("a member proposal joins the open round as an option; bad input is refused", async () => {
    const venue = db().suggestions[DEMO.hoopers.suggestionId].venue_id;
    expect((await repo().proposeHangout(pod, { title: "Run", starts_at: nowISO(), venue_id: venue })).ok).toBe(false); // too soon
    expect((await repo().proposeHangout(pod, { title: "Run", starts_at: "2026-11-10T18:00:00-08:00", venue_id: "venue_nope" })).ok).toBe(false);
    const r = await repo().proposeHangout(pod, { title: "Tuesday shootaround", starts_at: "2026-11-10T18:00:00-08:00", venue_id: venue });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.source).toBe("member");
    expect(r.data.proposed_by).toBe(db().me);
    expect(r.data.round).toBe(1);
    expect(r.data.option_index).toBe(1);
    expect(Object.values(db().votes).some((v) => v.pod_id === pod && v.option_ids.includes(r.data.id))).toBe(true);
  });

  it("myPlans lists the open plans, then the locked hangout", async () => {
    const { upcoming } = myPlans(db(), nowMs());
    expect(upcoming.find((i) => i.id === DEMO.hoopers.suggestionId)?.going).toBe(3);
    await repo().rsvp(DEMO.hoopers.suggestionId, "going");
    const after = myPlans(db(), nowMs());
    const h = after.upcoming.find((i) => i.kind === "hangout" && i.podId === pod)!;
    expect(h.locked).toBe(true);
    expect(h.me).toBe("going");
    expect(after.upcoming.some((i) => i.id === DEMO.hoopers.suggestionId)).toBe(false);
    const text = planShareText(h, "Sun 1 PM", "3 PM");
    expect(text).toContain(h.venue!.address);
    expect(text).not.toMatch(/Malik|Ama|Tobi/);
    expect(smsHref("+12065550100", "a b")).toBe("sms:+12065550100?&body=a%20b");
  });

  it(".ics is valid RFC 5545", () => {
    const s = db().suggestions[DEMO.hoopers.suggestionId];
    const ics = icsForPlan(s, db().venues[s.venue_id], nowISO(), "https://pods.example");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain(`DTSTART:${icsDate(s.starts_at)}`);
    expect(icsDate("2026-11-08T13:00:00-08:00")).toBe("20261108T210000Z");
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(icsEscape("a,b;c\nd")).toBe("a\\,b\;c\\nd");
    expect(icsFold("x".repeat(160)).split("\r\n ")).toHaveLength(3);
    expect(buildIcs({ uid: "u", title: "T", starts_at: s.starts_at, ends_at: s.plan_json.ends_at, venue: null, stamp: nowISO() })).not.toContain("LOCATION");
  });

  it("directions use the pin, else the address", () => {
    expect(directionsUrl({ lat: 34.7, lng: -86.6, name: "A", address: "1 St" })).toContain("destination=34.7%2C-86.6");
    expect(directionsUrl({ lat: 0, lng: 0, name: "A", address: "1 St" })).toContain("A%2C%201%20St");
  });
});

describe("discover, invites, safety, inbox, search", () => {
  beforeEach(async () => {
    boot("live");
    await onboard();
  });

  it("Discover lists interest pods only, my likes first; joining plans the pod", async () => {
    const rows = discoverPods(db(), nowISO());
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.pod.type === "interest")).toBe(true);
    const target = rows.find((r) => r.verdict === "join")!;
    const req = await repo().requestPod(target.pod.id);
    expect(req.ok && req.data.status).toBe("joined");
    // before the first hangout the seat is saved on deck; the pod opens (and gets planned) after that hangout
    expect(myMemberships(db()).find((m) => m.pod_id === target.pod.id)?.activation).toBe("on_deck");
    expect(discoverPods(db(), nowISO()).some((r) => r.pod.id === target.pod.id)).toBe(false);
    const community = Object.values(db().pods).find((p) => p.type === "community")!;
    const c = await repo().requestPod(community.id);
    expect(c.ok).toBe(false);
  });

  it("invites: one link per pod, redeem joins a friend where allowed", async () => {
    const me = db().me!;
    const pod = myMemberships(db()).find((m) => m.activation === "active" && db().pods[m.pod_id].type === "interest")!.pod_id;
    const a = await repo().createInvite(pod);
    const b = await repo().createInvite(pod);
    expect(a.ok && b.ok && a.data.code === b.data.code).toBe(true);
    if (!a.ok) return;
    expect(isInviteCode(a.data.code)).toBe(true);
    expect(inviteUrl("https://pods.example/", a.data.code)).toBe(`https://pods.example/i/${a.data.code}`);
    // a friend signs up on this device
    await onboard("(206) 555-0199", ["books"]);
    expect(db().me).not.toBe(me);
    const r = await repo().redeemInvite(a.data.code);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.invite.redeemed_by).toContain(db().me);
    expect((await repo().redeemInvite("zzzzzzzz")).ok).toBe(false);
  });

  it("trusted contact validates and clears", async () => {
    expect((await repo().setTrustedContact({ name: "Mom", phone: "123" })).ok).toBe(false);
    const r = await repo().setTrustedContact({ name: "Mom", phone: "(206) 555-0100" });
    expect(r.ok && r.data?.phone).toBe("+12065550100");
    await repo().setTrustedContact(null);
    expect(db().trustedContacts[db().me!]).toBeUndefined();
  });

  it("inbox filters and mark-all-read", async () => {
    const pod = discoverPods(db(), nowISO()).find((r) => r.verdict === "join")!.pod.id;
    await repo().requestPod(pod);
    expect(unreadCount(db())).toBeGreaterThan(0);
    expect(inbox(db(), "news").every((n) => n.trigger === "pod_request")).toBe(true);
    const r = await repo().markAllNotificationsRead();
    expect(r.ok && r.data).toBeGreaterThan(0);
    expect(unreadCount(db())).toBe(0);
    expect(inbox(db(), "unread")).toHaveLength(0);
  });

  it("search finds my pods, my people, our plans and interests; never strangers", () => {
    const people = myPeople(db(), nowISO());
    expect(people.length).toBeGreaterThan(0);
    const someone = people[0].member.display_name;
    expect(searchAll(db(), someone, nowISO()).some((h) => h.kind === "person")).toBe(true);
    expect(searchAll(db(), "", nowISO())).toEqual([]);
    expect(searchAll(db(), "basket", nowISO()).some((h) => h.kind === "interest")).toBe(true);
    const myPodIds = new Set(myMemberships(db()).map((m) => m.pod_id));
    const stranger = Object.values(db().users).find((u) => u.is_demo_bot && !db().memberships.some((m) => m.user_id === u.id && myPodIds.has(m.pod_id)))!;
    expect(searchAll(db(), stranger.first_name, nowISO()).some((h) => h.kind === "person" && h.id === stranger.id)).toBe(false);
  });
});

describe("navigation model", () => {
  it("5 primary destinations on phone; everything in the palette", () => {
    expect(destinationsFor("phone").map((d) => d.label)).toEqual(["Home", "Pods", "Plans", "Inbox", "You"]);
    expect(destinationsFor("palette").length).toBeGreaterThan(destinationsFor("laptop").length);
    expect(activeDestination("/app/pods/pod_hoopers/chat")).toBe("pods");
    expect(activeDestination("/app/events")).toBe("plans");
    expect(showsNav("/app/onboarding/about")).toBe(false);
    expect(showsNav("/app/home")).toBe(true);
  });
});
