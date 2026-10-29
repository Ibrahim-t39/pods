// [U0] Repository interface (ARCHITECTURE §5). All UI writes go through useRepo(); every method is async and
// returns a Result, so the future SupabaseRepo changes no call sites. Contract file: changes via the lead.
import type {
  AppConfig,
  FaithValue,
  Hangout,
  HangoutSuggestion,
  HeritageValue,
  Interest,
  Message,
  ModerationAction,
  NextHangoutVote,
  NotificationPrefs,
  PlacementRun,
  PlanJson,
  Pod,
  Report,
  ReportReason,
  RSVP,
  RsvpStatus,
  RunItBackAnswer,
  RunItBackTally,
  Slot,
  BlockedDay,
  User,
  Venue,
  Verification,
  Poll,
  Memory,
  Invite,
  PodRequest,
  PodMatch,
  ReactionKey,
  TrustedContact,
} from "@/lib/types";

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };
export type AppError =
  | { code: "UNDERAGE" | "OVER_AGE" | "OUT_OF_METRO" | "NOT_VERIFIED" | "BLOCKED" | "BANNED"; message?: string }
  | { code: "VALIDATION"; field?: string; message: string }
  | { code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "OFFLINE" | "UNKNOWN" | "NOT_IMPLEMENTED"; message?: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T = never>(error: AppError): Result<T> => ({ ok: false, error });

export interface Repo {
  // auth & onboarding [U6]
  startPhoneAuth(phone: string): Promise<Result<{ challengeId: string }>>;
  verifyPhoneCode(challengeId: string, code: string): Promise<Result<User>>;
  signInWithProvider(p: "apple" | "google"): Promise<Result<User>>;
  updateAbout(input: Pick<User, "first_name" | "nickname" | "date_of_birth" | "city">): Promise<Result<User>>;
  setInterests(interestIds: string[]): Promise<Result<void>>;
  setIdentity(input: { heritage?: HeritageValue | null; faith?: FaithValue | null; consent: boolean }): Promise<Result<void>>;
  /** D3: slots + "Keep this day free" days (device-side; planner sees counts only). */
  setAvailability(slots: Slot[], blockedDays?: BlockedDay[]): Promise<Result<void>>;
  setPhotos(urls: string[]): Promise<Result<void>>;
  acceptPledge(): Promise<Result<void>>;
  /** DEMO ONLY: sample images, never persisted. */
  submitVerification(input: { idImage?: string; selfie?: string }): Promise<Result<Verification>>;
  /** D14 dry run for OB-11/11b: pod types and counts only, nothing written. */
  previewPlacement(): Promise<Result<PlacementRun>>;
  runPlacement(): Promise<Result<PlacementRun>>;

  // pods & chat [U7]
  leavePod(podId: string): Promise<Result<{ rematchedInto: Pod | null; waitlisted: boolean }>>;
  setMuted(podId: string, muted: boolean): Promise<Result<void>>;
  renamePod(podId: string, name: string, photoUrl?: string): Promise<Result<Pod>>; // admins only
  /** Idempotent on clientId. Platform §F2: `replyTo` threads it under a message of the same pod. */
  sendMessage(podId: string, text: string, clientId: string, opts?: { replyTo?: string }): Promise<Result<Message>>;
  pinMessage(podId: string, messageId: string): Promise<Result<void>>; // admins only
  /** The AI posts in the pod chat (an "@AI" answer, a reminder, a recap prompt). Members only; one line, optional chips. */
  postAiMessage(podId: string, text: string, chips?: string[]): Promise<Result<Message>>;

  // hangouts & planner [U4]
  saveSuggestion(s: Omit<HangoutSuggestion, "id" | "created_at">): Promise<Result<HangoutSuggestion>>;
  dismissCard(podId: string): Promise<Result<void>>;
  undismissCard(podId: string): Promise<Result<void>>; // + Undo on the "Hidden for you" toast (AP-02 AC 2)
  rsvp(hangoutOrSuggestionId: string, status: RsvpStatus): Promise<Result<{ goingCount: number; locked: boolean }>>;
  /** The pod nudges how many "I'm in" lock this plan (2..pod size, not below who's in). Locks now if already met. */
  setLockMin(suggestionId: string, n: number): Promise<Result<{ min: number; locked: boolean }>>;
  approveSuggestion(id: string, edits?: Partial<PlanJson>): Promise<Result<HangoutSuggestion>>;
  checkIn(hangoutId: string): Promise<Result<RSVP>>;
  castRunItBack(hangoutId: string, value: RunItBackAnswer): Promise<Result<RunItBackTally>>; // D6: yes / not_sure / no
  voteNextOption(voteId: string, suggestionId: string): Promise<Result<NextHangoutVote>>;

  // profile & safety & privacy [U8]
  updateProfile(
    patch: Partial<Pick<User, "nickname" | "pronouns" | "bio" | "prompts" | "photo_urls" | "availability" | "blocked_days">>,
  ): Promise<Result<User>>;
  addInterest(id: string): Promise<Result<PlacementRun>>;
  removeInterest(id: string): Promise<Result<void>>;
  deleteIdentityField(field: "heritage" | "faith"): Promise<Result<void>>;
  // + Interests (continuous placement): likes and communities added after sign-up propose pods; nothing is joined
  // until the person says so. findPodMatches re-scans and returns the matches it just created.
  findPodMatches(): Promise<Result<PodMatch[]>>;
  joinPodMatch(matchId: string): Promise<Result<{ podId: string }>>;
  skipPodMatch(matchId: string): Promise<Result<void>>;
  report(input: {
    reportedUserId?: string;
    podId?: string;
    messageId?: string;
    reason: ReportReason;
    details?: string;
  }): Promise<Result<Report>>;
  block(userId: string): Promise<Result<void>>;
  unblock(userId: string): Promise<Result<void>>;
  exportMyData(): Promise<Result<Blob>>;
  deleteAccount(): Promise<Result<void>>;
  setNotificationPrefs(p: NotificationPrefs): Promise<Result<void>>;
  markNotificationsRead(ids: string[]): Promise<Result<void>>;

  // platform foundation (PLATFORM_SPEC §D) — module local/social.ts
  /** Toggle my reaction `key` on a message. Returns the message's reactions after the change. */
  react(podId: string, messageId: string, key: ReactionKey): Promise<Result<Record<string, string[]>>>;
  /** 2-4 options. Posts a "poll" chat line. Idempotent on clientId. */
  createPoll(podId: string, question: string, options: string[], clientId: string): Promise<Result<Poll>>;
  /** One vote per member; voting again moves it. Closed polls refuse. */
  votePoll(pollId: string, optionId: string): Promise<Result<Poll>>;
  /** The creator or a pod admin closes it. */
  closePoll(pollId: string): Promise<Result<Poll>>;
  addMemory(podId: string, input: { caption: string; photoUrl?: string | null; hangoutId?: string | null }): Promise<Result<Memory>>;
  /** Only its author removes a memory (soft delete). */
  removeMemory(memoryId: string): Promise<Result<void>>;
  /** A member proposes a hangout by hand (source "member"). Venue must be on the checked list; same rules as plans. */
  proposeHangout(podId: string, input: { title: string; starts_at: string; ends_at?: string; venue_id: string }): Promise<Result<HangoutSuggestion>>;
  /** Plan every pod I'm in that has no plan yet (on-device planner). Returns the new suggestion ids. */
  planStarters(): Promise<Result<string[]>>;
  /** Discover: ask to join an interest pod. Joins at once when a seat is open and the age band fits, else waitlists. */
  requestPod(podId: string): Promise<Result<PodRequest>>;
  cancelPodRequest(requestId: string): Promise<Result<void>>;
  /** A share link. podId = "save them a seat" in that pod (they are still placed by the engine). */
  createInvite(podId?: string | null): Promise<Result<Invite>>;
  /** Called after sign-up with a stored code. Joins the invite's pod when allowed, else plain placement holds. */
  redeemInvite(code: string): Promise<Result<{ invite: Invite; joinedPodId: string | null }>>;
  /** One trusted contact for "share my plan". null removes it. */
  setTrustedContact(input: { name: string; phone: string } | null): Promise<Result<TrustedContact | null>>;
  markAllNotificationsRead(): Promise<Result<number>>;

  // admin [U9]
  admin: {
    upsertVenue(v: Venue): Promise<Result<Venue>>;
    upsertInterest(i: Interest): Promise<Result<Interest>>;
    upsertHangout(h: Hangout): Promise<Result<Hangout>>;
    actOnReport(id: string, action: ModerationAction, note?: string): Promise<Result<Report>>;
    setConfig(c: Partial<AppConfig>): Promise<Result<AppConfig>>;
    rerunPlacement(userId?: string): Promise<Result<PlacementRun>>;
    resetDemo(): Promise<Result<void>>;
  };
}

/** Method names each domain module implements. A module exports `(ctx) => RepoPart<"a" | "b">`. */
export type RepoPart<K extends keyof Omit<Repo, "admin">> = Pick<Repo, K>;
