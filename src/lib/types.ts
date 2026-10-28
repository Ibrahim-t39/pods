// [U0] ALL domain types. Single source (ARCHITECTURE §4 + BLUEPRINT §0 D3 and §12 additions).
// snake_case fields = future Postgres columns. Timestamps are ISO 8601 WITH offset.
// Contract file: changes go through the lead (12:00 / 18:00 CT merge windows).
import type { PlacementConfig } from "@/config/placement";
import type { PlannerConfig } from "@/config/planner";
import type { FeatureFlags } from "@/config/app";
import type { DemoConfig } from "@/config/demo";

export type { PlacementConfig, PlannerConfig, FeatureFlags, DemoConfig };

export type ISODateTime = string; // "2026-11-08T13:00:00-06:00"
export type ISODate = string; // "2026-11-08"
export type ID = string;

// BLUEPRINT D3: 3 day cards (weekday evenings, Saturday, Sunday) with Morning / Afternoon / Evening sub-chips.
export const SLOTS = [
  "weekday-evening",
  "saturday-morning",
  "saturday-afternoon",
  "saturday-evening",
  "sunday-morning",
  "sunday-afternoon",
  "sunday-evening",
] as const;
export type Slot = (typeof SLOTS)[number];

/** D3 "Keep this day free". Device-side only: the planner sees per-slot counts, never this field. */
export const BLOCKABLE_DAYS = ["saturday", "sunday"] as const;
export type BlockedDay = (typeof BLOCKABLE_DAYS)[number];

// ── User ───────────────────────────────────────────────────────────────
export interface User {
  id: ID;
  first_name: string;
  last_name?: never; // + never collected or shown (spec: "No last names")
  nickname: string | null;
  pronouns: string | null;
  bio: string | null; // ≤150 chars
  prompts: ProfilePrompt[]; // 2–3
  photo_urls: string[]; // 1–3
  date_of_birth: ISODate;
  city: MetroCity;
  phone: string; // E.164; never leaves repo except to self
  verified: boolean;
  verified_at: ISODateTime | null;
  availability: Slot[]; // [] = didn't share
  blocked_days: BlockedDay[]; // + D3; never sent to the planner as a per-person value (D11)
  created_at: ISODateTime;
  // + operational fields
  status: "onboarding" | "pending_verification" | "active" | "suspended" | "banned" | "deleted";
  onboarding_step: OnboardingStep;
  pledge_accepted_at: ISODateTime | null;
  is_demo_bot: boolean; // + simulated member
  notification_prefs: NotificationPrefs;
}
export type MetroCity = "Huntsville" | "Madison" | "Decatur"; // one metro (spec: Distance)
export type OnboardingStep =
  | "welcome"
  | "account"
  | "about"
  | "interests"
  | "communities"
  | "availability"
  | "photo"
  | "pledge"
  | "verify"
  | "placing"
  | "done";
export interface ProfilePrompt {
  key: "ask_me_about" | "perfect_saturday" | "currently_learning" | "hot_take" | "hometown_food";
  answer: string;
}
export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/** The only shape member data leaves the repo in (ARCHITECTURE §9.3). Never heritage, faith, phone, DOB. */
export interface PublicMember {
  id: ID;
  display_name: string;
  photo_url: string | null;
  age: number;
  verified: boolean;
  pronouns: string | null;
  bio: string | null;
  prompts: ProfilePrompt[];
  is_demo_bot: boolean;
}

// ── Sensitive identity (stored separately) ─────────────────────────────
export interface UserIdentity {
  user_id: ID;
  heritage: HeritageValue | null; // country level, e.g. { level: "country", code: "ZM" }
  faith: FaithValue | null; // denomination level, e.g. { level: "denomination", code: "sda" }
  consent_given_at: ISODateTime;
}
export interface HeritageValue {
  level: "country" | "region" | "continent";
  code: string;
} // ladder in data/taxonomy.ts
export interface FaithValue {
  level: "denomination" | "tradition" | "religion";
  code: string;
}

// ── Interests ───────────────────────────────────────────────────────────
export type InterestSection = "move" | "make" | "play" | "learn_give"; // D9: Move · Make · Play · Learn & give
export interface Interest {
  id: ID;
  label: string;
  icon: string; // emoji for chips (D5 allows emoji inside interest chips only)
  category: "sport" | "music" | "outdoors" | "creative" | "games" | "food" | "wellness" | "learning";
  section: InterestSection; // +
  active: boolean;
}
export interface UserInterest {
  user_id: ID;
  interest_id: ID;
}

// ── Pods ────────────────────────────────────────────────────────────────
export interface Pod {
  id: ID;
  name: string; // admins can edit
  photo_url: string;
  type: "interest" | "community";
  community_kind: "heritage" | "faith" | null;
  topic: string; // "basketball" | "Southern African" | "Seventh-day Adventist"
  topic_key: string; // + interest_id or taxonomy code; placement joins on this
  city: "Huntsville metro";
  age_min: number;
  age_max: number;
  widened_from: { kind: "age" | "group"; from: string; to: string } | null;
  status: "forming" | "active" | "closed";
  created_at: ISODateTime;
  hue: "ember" | "signal" | "grove"; // + interest → ember, community → grove
}

export interface Membership {
  pod_id: ID;
  user_id: ID;
  role: "member" | "admin"; // ≤2 admins per pod
  muted: boolean;
  card_dismissed: boolean;
  card_dismissed_for: ID | null; // + which suggestion was dismissed
  /** + D4: "active" or "on_deck" (opens after the first check-in). */
  activation: "active" | "on_deck";
  joined_at: ISODateTime;
  left_at: ISODateTime | null;
}

// ── Hangouts & planner ─────────────────────────────────────────────────
export interface Hangout {
  id: ID;
  pod_id: ID;
  title: string;
  starts_at: ISODateTime;
  ends_at: ISODateTime;
  venue_id: ID;
  plan_text: string;
  is_starter: boolean;
  suggestion_id: ID;
  status: "upcoming" | "in_progress" | "done" | "cancelled";
  sequence: number; // 1 = starter, 2 = the "Repeat" metric
}

export interface PlanJson {
  event: string;
  starts_at: ISODateTime;
  ends_at: ISODateTime;
  venue_id: ID;
  cost: string;
  bring: string[];
  schedule: { time: string; item: string }[];
  rain_plan: string;
  icebreaker: string;
  reason: string;
  summary: string;
  rain_venue_id?: ID | null;
}

export interface HangoutSuggestion {
  id: ID;
  pod_id: ID;
  summary: string;
  plan_json: PlanJson;
  venue_id: ID;
  starts_at: ISODateTime;
  status: "suggested" | "accepted" | "replaced" | "pending_review";
  created_at: ISODateTime;
  source: "claude" | "fallback" | "seed" | "admin";
  round: number;
  option_index: 0 | 1 | 2;
  trace: PlannerStep[];
}

export type RsvpStatus = "going" | "not_going";
export interface RSVP {
  hangout_id: ID; // before lock, holds the suggestion id; on lock, RSVPs migrate to the hangout
  user_id: ID;
  status: RsvpStatus;
  checked_in: boolean;
  checked_in_at: ISODateTime | null;
}

export interface NextHangoutVote {
  id: ID;
  pod_id: ID;
  after_hangout_id: ID;
  option_ids: ID[];
  votes: Record<ID /*user*/, ID /*suggestion*/>;
  closes_at: ISODateTime;
  status: "open" | "closed";
  winner_id: ID | null;
}

export type RunItBackAnswer = "yes" | "not_sure" | "no"; // D6: Yes / Not sure / Not this time
export interface RunItBack {
  hangout_id: ID;
  responses: Record<ID /*user*/, RunItBackAnswer>; // private; only the aggregate is ever shown
  revealed_at: ISODateTime | null;
}
export interface RunItBackTally {
  yes: number;
  answered: number;
  checkedIn: number;
  revealed: boolean;
}

// ── Chat ────────────────────────────────────────────────────────────────
export interface Message {
  id: ID;
  pod_id: ID;
  user_id: ID | null; // null = system host
  text: string;
  created_at: ISODateTime;
  kind: "text" | "host" | "plan_card" | "checkin_prompt" | "vote" | "run_it_back" | "system";
  ref_id: ID | null;
  client_id: string | null;
  pinned: boolean;
  delivery: "sending" | "sent" | "failed";
  /** + host quick replies (BLUEPRINT AP-02). */
  quick_replies?: string[];
}

// ── Safety ──────────────────────────────────────────────────────────────
export type ReportReason = "unsafe" | "harassment" | "fake_profile" | "spam" | "other";
export interface Report {
  id: ID;
  reporter_id: ID;
  reported_id: ID | null;
  pod_id: ID | null;
  reason: ReportReason;
  details: string | null;
  message_id: ID | null;
  status: "open" | "actioned" | "dismissed";
  urgent: boolean;
  due_by: ISODateTime;
  created_at: ISODateTime;
}
export interface Block {
  blocker_id: ID;
  blocked_id: ID;
  created_at: ISODateTime;
}
export type ModerationAction = "warn" | "suspend" | "ban" | "dismiss";
export interface AdminAction {
  id: ID;
  admin: string;
  target_user_id: ID | null;
  report_id: ID | null;
  action: ModerationAction | "config_change" | "hangout_edit" | "venue_edit";
  note: string | null;
  created_at: ISODateTime;
}
export interface BannedFingerprint {
  phone_hash: string;
  id_hash: string | null;
  created_at: ISODateTime;
}

// ── Venues ──────────────────────────────────────────────────────────────
export interface Venue {
  id: ID;
  name: string;
  short_name?: string; // + card copy, e.g. "Brahan Spring Rec Center"
  address: string;
  type:
    | "park"
    | "court"
    | "library"
    | "cafe"
    | "community_center"
    | "museum"
    | "trail"
    | "studio"
    | "restaurant"
    | "church_hall"
    | "campus";
  is_public: boolean;
  city: MetroCity;
  lat: number;
  lng: number;
  indoor: boolean;
  cost_per_person: number; // USD, 0 = free
  /** + D2: true when the cost is not confirmed by a source; UI then says "Cost to confirm". */
  cost_unconfirmed?: boolean;
  alcohol_centered: boolean;
  good_for: string[]; // interest ids / topic keys, or "any"
  hours_note: string | null;
  parking: string | null;
  meet_note: string | null; // + BLUEPRINT §12 "How to find us"
  accessibility: string | null; // + BLUEPRINT §12
  source_url: string; // + required: where the address/hours were verified
  verified_at: ISODate | null; // + required when active
  active: boolean;
}

// ── Verification, placement, waitlist, notifications ──────────────────
export interface Verification {
  user_id: ID;
  vendor: "simulated" | "persona" | "veriff" | "stripe_identity";
  status: "not_started" | "processing" | "approved" | "retry" | "rejected";
  reason: string | null;
  created_at: ISODateTime;
  decided_at: ISODateTime | null;
}
export interface WaitlistEntry {
  user_id: ID;
  pod_kind: Pod["type"];
  topic_key: string;
  reason: "under_min" | "pods_at_start_limit";
  created_at: ISODateTime;
}
export interface PlacementRun {
  id: ID;
  user_id: ID;
  created_at: ISODateTime;
  results: PlacementResult[];
  /** + D14: true for previewPlacement() dry runs (nothing written). */
  dry_run?: boolean;
}
export interface PlacementResult {
  candidate: { type: Pod["type"]; community_kind: Pod["community_kind"]; topic_key: string; label: string };
  outcome: "joined_existing" | "created_new" | "waitlisted" | "deferred";
  pod_id: ID | null;
  steps: PlacementStep[];
  user_note: string | null;
}
export interface PlacementStep {
  rule: "age_band" | "metro" | "blocks" | "open_spots" | "widen_age" | "widen_group" | "waitlist" | "pods_at_start";
  detail: string;
  pool_size: number;
}

export interface AppNotification {
  id: ID;
  user_id: ID;
  pod_id: ID | null;
  trigger:
    | "placed"
    | "reminder_24h"
    | "reminder_2h"
    | "chat_batch"
    | "checkin"
    | "next_scheduled"
    | "plan_locked"
    | "run_it_back_reveal"
    | "report_update";
  title: string;
  body: string;
  href: string;
  channels: ("email" | "sms" | "push" | "inapp")[];
  created_at: ISODateTime;
  read_at: ISODateTime | null;
}

// ── Planner trace (visible AI work) ────────────────────────────────────
export interface PlannerStep {
  id: "pod" | "time" | "venues" | "weather" | "context" | "repeat" | "draft" | "validate" | "retry";
  label: string;
  detail?: string;
  status: "running" | "done" | "warn";
}

/** + cached Claude outputs by pod id (ARCHITECTURE §8.3 recording rule; BLUEPRINT §6.6 jobs 2-4). */
export interface PlannerCacheEntry {
  pod_id: ID;
  job: "plan" | "why_fits" | "next_options" | "widen_explainer";
  source: "claude" | "fallback" | "seed";
  output: unknown;
  created_at: ISODateTime;
}

// ── Config (§10) ────────────────────────────────────────────────────────
export interface AppConfig {
  placement: PlacementConfig;
  planner: PlannerConfig;
  flags: FeatureFlags;
  demo: DemoConfig;
}

/** + Demo clock: virtual time = virtual_at + (realNow - real_at). real_at is re-stamped at boot (J5 pinned clock). */
export interface ClockState {
  virtual_at: ISODateTime;
  real_at: number; // epoch ms, client only
}

// ── The whole local DB ─────────────────────────────────────────────────
export interface DbState {
  rev: number;
  me: ID | null;
  users: Record<ID, User>;
  identities: Record<ID, UserIdentity>;
  interests: Record<ID, Interest>;
  userInterests: UserInterest[];
  pods: Record<ID, Pod>;
  memberships: Membership[];
  hangouts: Record<ID, Hangout>;
  suggestions: Record<ID, HangoutSuggestion>;
  rsvps: RSVP[];
  votes: Record<ID, NextHangoutVote>;
  runItBack: Record<ID, RunItBack>;
  messages: Record<ID /*pod*/, Message[]>;
  reports: Record<ID, Report>;
  blocks: Block[];
  adminActions: AdminAction[];
  banned: BannedFingerprint[];
  venues: Record<ID, Venue>;
  verifications: Record<ID, Verification>;
  waitlist: WaitlistEntry[];
  placementRuns: PlacementRun[];
  notifications: AppNotification[];
  plannerCache: Record<string /* `${pod_id}:${job}` */, PlannerCacheEntry>;
  clock: ClockState;
  config: AppConfig;
}
