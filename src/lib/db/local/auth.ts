// [U6] Auth (simulated). Phone OTP: any 6 digits pass except "000000" (ARCHITECTURE §11), which shows the
// invalid-code state. 5 wrong codes on one challenge lock it ("Too many tries"). Apple / Google are simulated
// ("Demo sign-in", BLUEPRINT D15).
// Fingerprints: production uses HMAC-SHA256 with a server secret (ARCHITECTURE §9.3). The local build keys a
// 32-bit hash of the digits; it is a stand-in, not a security control.
// Minor block (edge case 1): a phone that entered an under-18 birthday is blocked for 30 days. The demo keeps this
// list in its own localStorage key (it plays the role of a server table); Reset demo from onboarding clears it.
import type { RepoCtx } from "./context";
import { ok, err, type RepoPart } from "@/lib/db/repo";
import { newId, hash32 } from "@/lib/ids";
import type { User } from "@/lib/types";

export const MINOR_BLOCK_KEY = "pods:minor-block:v1";
const MINOR_BLOCK_DAYS = 30;
const MAX_TRIES = 5;

export function phoneHash(phone: string): string {
  return `ph_${hash32(`pods-phone|${phone.replace(/\D/g, "")}`).toString(36)}`;
}

type MinorBlock = { hash: string; until: number };

function readBlocks(): MinorBlock[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(MINOR_BLOCK_KEY) : null;
    const list = raw ? (JSON.parse(raw) as MinorBlock[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Record a minor block for this phone (30 days). `nowMs` is the demo clock. */
export function recordMinorBlock(phone: string, nowMs: number) {
  try {
    const hash = phoneHash(phone);
    const list = readBlocks().filter((b) => b.hash !== hash && b.until > nowMs);
    list.push({ hash, until: nowMs + MINOR_BLOCK_DAYS * 86_400_000 });
    window.localStorage.setItem(MINOR_BLOCK_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: the in-session draft flag still holds the block */
  }
}

export function isMinorBlocked(phone: string, nowMs: number): boolean {
  const hash = phoneHash(phone);
  return readBlocks().some((b) => b.hash === hash && b.until > nowMs);
}

/** Demo only: Reset demo clears minor blocks so a rehearsal can't lock the stage phone. */
export function clearMinorBlocks() {
  try {
    window.localStorage.removeItem(MINOR_BLOCK_KEY);
  } catch {
    /* ignore */
  }
}

function blankUser(id: string, phone: string, now: string): User {
  return {
    id,
    first_name: "",
    nickname: null,
    pronouns: null,
    bio: null,
    prompts: [],
    photo_urls: [],
    date_of_birth: "2000-01-01",
    city: "Seattle",
    phone,
    verified: false,
    verified_at: null,
    availability: [],
    blocked_days: [],
    created_at: now,
    status: "onboarding",
    onboarding_step: "about",
    pledge_accepted_at: null,
    is_demo_bot: false,
    notification_prefs: { email: true, sms: true, push: true },
  };
}

const attempts = new Map<string, number>();

export function authRepo(ctx: RepoCtx): RepoPart<"startPhoneAuth" | "verifyPhoneCode" | "signInWithProvider"> {
  const nowMs = () => Date.parse(ctx.now());

  /** Sign in to the account that owns this phone, or create one. Returns null when the phone is barred. */
  const signIn = (phone: string): { user: User } | { code: "BANNED" | "UNDERAGE" } => {
    const hash = phoneHash(phone);
    const db = ctx.get();
    if (db.banned.some((b) => b.phone_hash === hash)) return { code: "BANNED" };
    if (isMinorBlocked(phone, nowMs())) return { code: "UNDERAGE" };
    const existing = Object.values(db.users).find(
      (u) => !u.is_demo_bot && u.status !== "deleted" && u.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""),
    );
    if (existing) {
      if (existing.status === "banned") return { code: "BANNED" };
      ctx.commit((d) => {
        d.me = existing.id;
      });
      return { user: ctx.me()! };
    }
    const id = newId("user");
    const user = blankUser(id, phone, ctx.now());
    ctx.commit((d) => {
      d.users[id] = user;
      d.me = id;
    });
    return { user };
  };

  return {
    async startPhoneAuth(phone) {
      await ctx.latency();
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15)
        return err({ code: "VALIDATION", field: "phone", message: "Enter a full phone number." });
      return ok({ challengeId: `chal_${hash32(`${digits}|${ctx.now()}`).toString(36)}|${digits}` });
    },
    async verifyPhoneCode(challengeId, code) {
      await ctx.latency();
      const tries = attempts.get(challengeId) ?? 0;
      if (tries >= MAX_TRIES) return err({ code: "VALIDATION", field: "locked", message: "Too many tries." });
      if (!/^\d{6}$/.test(code) || code === "000000") {
        attempts.set(challengeId, tries + 1);
        if (tries + 1 >= MAX_TRIES) return err({ code: "VALIDATION", field: "locked", message: "Too many tries." });
        return err({ code: "VALIDATION", field: "code", message: "That code isn't right. Try again." });
      }
      attempts.delete(challengeId);
      const digits = challengeId.split("|")[1] ?? "2065550142";
      const phone = digits.length === 10 ? `+1${digits}` : `+${digits}`;
      const r = signIn(phone);
      if ("code" in r) return err({ code: r.code });
      return ok(r.user);
    },
    async signInWithProvider(p) {
      await ctx.latency();
      // Simulated provider: a stable placeholder number per provider (never shown to other members).
      const r = signIn(p === "apple" ? "+12065550142" : "+12065550143");
      if ("code" in r) return err({ code: r.code });
      return ok(r.user);
    },
  };
}
