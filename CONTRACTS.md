# Pods app contracts (U0 cheat-sheet)

Read BLUEPRINT §J + §0 first; they override everything. This file is the "how do I plug in" page for every unit.
Contract files (U0, change only via the lead in the 12:00 / 18:00 CT windows): `src/lib/types.ts`, `src/lib/db/repo.ts`,
`src/lib/db/store.ts`, `src/lib/db/hooks.ts`, `src/lib/db/local/{index,context}.ts`, `src/config/*` (except `interests.ts`, U2),
`src/app/{layout,providers,globals.css}`, `src/styles/*`, `package.json`, `next.config.ts`, `vitest.config.ts`.

## 1. Tokens → Tailwind classes

Tokens live in `src/styles/tokens.css` (brand copy, unmodified minus the font import). `globals.css` maps them with
`@theme inline`. **Tailwind's default palette is removed**: `bg-zinc-50` etc. no longer exist. Never write hex in components.

| Need | Class |
|---|---|
| Page / card / sheet / inset | `bg-bg` `bg-surface` `bg-raised` `bg-sunken` |
| Text | `text-fg` `text-fg-muted` `text-fg-subtle` `text-fg-inverse` |
| Borders | `border-border` `border-border-strong` |
| Primary (Signal = Pods itself) | `bg-primary` `hover:bg-primary-hover` `text-on-primary` `bg-primary-soft` `text-primary-soft-text` `text-link` |
| Status (icon + text, never colour alone) | `bg-success-soft text-success-text border-success-border` and the same for `warning`, `danger`, `info`; solid `bg-success` / `bg-danger` |
| Brand hues | `bg-ember-soft` `text-ember-text` `border-ember-soft-border` (same for `signal`, `grove`). **Never** `text-ember-500` / `text-grove-500` (contrast; lint-banned). |
| Pod surface | put `data-pod-type="interest|community"` (or `data-pod-hue="ember|grove|signal"`) on the container, then `bg-pod` `bg-pod-soft` `text-pod-text` `border-pod-soft-border` `text-pod-on` `bg-pod-gloss` `shadow-glow-pod` |
| Ramps (illustration only) | `bg-ember-50…950`, `signal-*`, `grove-*`, `amber-*`, `red-*`, `neutral-0…950`; `bg-ink`, `bg-paper`, `bg-white`, `bg-black` |
| Verified seal | `text-verified` / `bg-verified` (seal only) |
| Type scale (tokens.css classes) | `text-display-2xl` `text-display-xl` `text-display-lg` `text-heading-xl` `text-heading-lg` `text-heading-md` `text-heading-sm` `text-body-lg` `text-body` `text-body-sm` `text-label` `text-caption` `text-overline` `text-mono` (each sets family, size, line, weight, tracking; display/heading-xl/lg also set `font-stretch: 112%`) |
| Families | `font-display` (Archivo, wdth axis) `font-ui` (Inter, default) `font-mono` (JetBrains Mono); `font-stretch-display` (112%), `font-stretch-hero` (125%) |
| Numbers | `tabular` |
| Radii | `rounded-xs` 6 · `rounded-sm` 10 · `rounded-md` 14 · `rounded-lg` 20 · `rounded-xl` 28 · `rounded-2xl` 36 · `rounded-pill` · `rounded-icon` (squircle 22.37%) · aliases `rounded-card` (20) `rounded-button` `rounded-input` (14) `rounded-sheet` (28) |
| Shadows | `shadow-xs` `shadow-sm` `shadow-md` `shadow-lg` `shadow-glow-signal` `shadow-glow-ember` `shadow-glow-grove` `shadow-glow-pod` `shadow-inset-gloss` (max one glow per screen) |
| Gradients | `bg-aurora` (landing hero, splash, reveal, OG only) `bg-signal-gloss` `bg-ember-gloss` `bg-grove-gloss` `bg-pod-gloss` `bg-glass` |
| Recipes | `gloss-signal` (primary button / own bubble: gloss + inset highlight + white label) · `gloss` (pod gloss + inset) · `glass` (E3: glass gradient + blur 18 + border + shadow-lg, with solid fallbacks) · `ai-hairline` (1px ember→signal→grove border on surface) · `pressable` (M1 press scale .97, reduced-motion safe) · `dot-grain` (chat canvas) · `skeleton` (shimmer M19) |
| Motion | easings `ease-standard` `ease-enter` `ease-exit` `ease-spring` `ease-snap`; durations `duration-instant` 80 · `duration-fast` 140 · `duration-base` 220 · `duration-slow` 360 · `duration-slower` 560; animations `animate-shimmer` `animate-shake` (M22) `animate-fade-in` `animate-rise-in` `animate-typing`; keyframe `pods-orbit` + `--pods-orbit-angle` for the M7 ring. Springs in motion/react: snappy `{stiffness:420,damping:32}` (the MotionConfig default), bouncy `{260,18}`, gentle `{170,26}`. |
| Z | `z-sticky` `z-header` `z-overlay` `z-sheet` `z-toast` `z-tooltip` |
| Safe area | `pt-safe` `pb-safe` (or `pb-[calc(12px+env(safe-area-inset-bottom))]`) |
| Breakpoints | `sm` 480 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536 (tokens.json, not Tailwind's defaults) |
| Dark | `dark:` = `[data-theme=dark]`, or OS dark when no `data-theme` is set. Prefer semantic tokens (they flip automatically) over `dark:` overrides. |

Raw CSS: use `var(--color-*)`, `var(--pod-*)`, `var(--dur-*)`, `var(--ease-*)`, `var(--shadow-*)`, `var(--gradient-*)`.
Icons: `lucide-react`, `strokeWidth={1.75}`, 20 in rows / 24 in bars. No emoji as UI icons (interest chips and host quick replies only).

## 2. Theme
`src/lib/theme.ts`: light is the default (`data-theme="light"` set before paint by the inline script in the root layout).
`setThemePref("light" | "dark" | "system")` from Profile › Appearance; `"system"` removes `data-theme` so the OS decides.

## 3. Data: store, repo, hooks

```tsx
"use client";
import { useDb, useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { activeSuggestion, myPods, podMembers } from "@/lib/db/selectors";

const hydrated = useHydrated();            // false on the server and first client paint → render a skeleton
const me = useMe();                         // User | null
const pods = useDb((db) => myPods(db));     // any pure selector; new arrays/objects are fine (structural compare)
const repo = useRepo();
const r = await repo.rsvp(suggestionId, "going");   // every method: Promise<Result<T>>
if (!r.ok) toast("Couldn't save. Tap to retry.");     // r.error.code: VALIDATION | FORBIDDEN | NOT_VERIFIED | ...
```

- **Reads**: `useDb(selector)` only. Selectors must be pure. Put cross-unit selectors in `src/lib/db/selectors.ts` (ask the lead); unit-specific ones live with the unit.
- **Writes**: `useRepo().<method>()` only. Never call `useStore.setState` from a screen.
- **Hydration**: the store is persisted to `localStorage["pods:v1"]` with `skipHydration`; `useHydrated()` (or U5's StoreGate) boots it. Never read `localStorage` / `Date.now()` during render or prerender (cacheComponents).
- **Server**: pages are thin server files rendering a `"use client"` screen inside `<Suspense>`; client screens use `useParams()` (params are Promises on the server in Next 16).
- **Seed**: `src/data/seed.ts` exports `buildSeed(anchor): DbState` and `SEED_VERSION`. U2 owns it; **bump `SEED_VERSION` on every seed change** (it feeds `SEED_HASH`; a mismatched persisted blob resets with "Demo reset to a fresh start.").
- **Reset**: `useRepo().admin.resetDemo()` (DemoBar popover, Director).
- **Cross-tab**: automatic (BroadcastChannel "pods", storage-event fallback). localStorage blocked/full → in-memory + toast.
- **Member data** leaves the repo only as `toPublicMember()` (`src/lib/utils.ts`): no heritage, faith, phone or DOB on any member view. Only `placement/*` and admin read `db.identities`.

### Adding a Repo method
1. Add the signature to `Repo` in `src/lib/db/repo.ts` (lead review; contract file).
2. Implement it in the owning module's `RepoPart<"…">` in `src/lib/db/local/<module>.ts` (add the name to the `RepoPart` union).
3. `npm run typecheck`: `local/index.ts` uses `satisfies Repo`, so a missing or misplaced method fails.
4. Inside: `await ctx.latency()` (120-260 ms; `?fast=1` or `demo.fastLatency` → 0), auth check (`ctx.meId()`, membership/admin role), then `ctx.commit((d) => { … })` (immer draft; bumps `rev`, persists, broadcasts). Return `ok(data)` / `err({ code })`.

### Module ownership (`src/lib/db/local/*`)
| Module | Owner | Methods |
|---|---|---|
| `auth.ts` | U6 | startPhoneAuth, verifyPhoneCode, signInWithProvider |
| `onboarding.ts` | U6 | updateAbout, setInterests, setIdentity, setAvailability, setPhotos, acceptPledge, submitVerification, previewPlacement, runPlacement (calls U3's engine; currently a STUB) |
| `pods.ts`, `chat.ts` | U7 | leavePod, setMuted, renamePod · sendMessage, pinMessage |
| `hangouts.ts` | U4 | saveSuggestion, dismissCard, undismissCard, rsvp (+ lock transaction), approveSuggestion, checkIn, castRunItBack, voteNextOption |
| `profile.ts`, `safety.ts`, `notifications.ts` | U8 | updateProfile, add/removeInterest, deleteIdentityField · report, block, unblock, exportMyData, deleteAccount · setNotificationPrefs, markNotificationsRead |
| `admin.ts` | U9 | admin.* |
| `context.ts`, `index.ts` | U0 | ctx + composition |

U0 wrote working minimal versions of every module so the app runs; owners extend them in place.

## 4. Clock (demo-aware time)
```ts
import { now, nowISO, nowMs, useClock, jumpTo, toChicagoISO, TZ } from "@/lib/time/clock";
const t = useClock();          // Date; re-renders every 30 s and immediately on a Director jump
repo code: ctx.now()           // ISO with Chicago offset, e.g. "2026-11-04T09:00:00-06:00"
jumpTo(DEMO.directorJump.at)   // Director "Jump to after hangout (Sun 3:15 PM)"
```
`now = db.clock.virtual_at + (Date.now() − db.clock.real_at)`; `real_at` is re-stamped at boot (pinned clock, J5).
Before hydration / on the server, `now()` returns the virtual time exactly (deterministic). U3 owns `lib/time/*` and
will harden `clock.ts` and replace the minimal `format.ts` (`formatWhen`, `formatSpan`, `formatDay`, `countdown`).
Store every timestamp as ISO **with offset**; display in `America/Chicago`.

## 5. Config
`import { DEMO, APP, defaultConfig, AppConfigSchema } from "@/config"`; runtime values (admin-editable) are `db.config.{placement,planner,flags,demo}` via `useDb((db) => db.config.planner.lockThreshold)`.
Canon (BLUEPRINT §0): anchor `2026-11-04T09:00:00-06:00`, Hoopers starter Sun Nov 8 1:00-3:00 PM CT, Southern African Sun Nov 15 1:00 PM Big Spring Park, `podsAtStart = 2`, 14 interests, `claudeBudgetMs = 8000`, `verificationMode = "simulated"`, `lockThreshold = 4`, run-it-back reveal only at ≥ 4 Yes.

## 6. Types: v1.1 additions to ARCHITECTURE §4
- `SLOTS` += `saturday-evening`, `sunday-morning`, `sunday-afternoon`, `sunday-evening` (D3); `User.blocked_days: ("saturday"|"sunday")[]` (never sent to the planner).
- `Membership.activation: "active" | "on_deck"` (D4). `Interest.section` (D9). `Message.quick_replies?`.
- `Venue.short_name?`, `cost_unconfirmed?`, `meet_note`, `accessibility`, `verified_at` (BLUEPRINT §12).
- `RunItBack.responses: Record<user, "yes" | "not_sure" | "no">` and `castRunItBack(hangoutId, RunItBackAnswer)` (D6 has three answers).
- `PlannerStep.id` += `"context"` (§6.2). `PlacementRun.dry_run?` + `Repo.previewPlacement()` (D14). `Repo.undismissCard()` (Undo toast).
- `DbState.plannerCache`, `DbState.clock`. `planner.runItBackRevealMin`, `flags.maskCommunityInApp`.
- `src/lib/planner/types.ts` re-exports `SLOTS`/`Slot` from `src/lib/types.ts`; `SLOT_HOURS["sunday-afternoon"]` is 13-15 (D1).

## 7. App shell bits already in place
- Root layout: next/font (Archivo wdth / Inter / JetBrains Mono → `--font-archivo|inter|jetbrains` → `--font-display|ui|mono`), theme script, `MotionConfig reducedMotion="user"`, sonner `<Toaster>` (bottom-center, above the tab bar). Use `toast("…", { action: { label: "Undo", onClick } })` from `sonner`.
- Public assets: `/brand/*.svg|png` (logos, mark, wordmark, OG), `/icons/*` (favicons, 192/512/maskable, apple-touch). U11 owns the manifest and `scripts/make-icons.mjs`.
- `next.config.ts` serves `/sw.js` no-cache with `Service-Worker-Allowed: /` and sets nosniff / referrer / permissions headers.

## 8. Slice stubs to replace (all marked `STUB(U#)`)
`src/app/(marketing)/page.tsx` (U10) · `src/app/(app)/app/page.tsx` + `router-screen.tsx` (U5) · `welcome/*` and `placing/*` (U6) · `pods/*` and `pods/[podId]/*` (U7; the pinned card inside is U4's HangoutCard) · `src/app/(app)/app/_slice/*` (delete once U1/U5 components exist) · `src/data/seed.ts` + `src/config/interests.ts` (U2) · `src/lib/time/format.ts` (U3) · stub placement inside `local/onboarding.ts` (U3 engine).

## 9. Commands
`npm run typecheck` · `npm test` (Vitest; `src/**/*.test.ts`, `tests/unit/**`) · `node scripts/shot.mjs http://localhost:3000 /route` (FULL=1 for full page).
Do not run `npm install` (U0 only) or `next build`. Installed and pinned: radix-ui 1.8.1, vaul 1.1.2, sonner 2.0.8, zustand 5.0.16, immer 11.2.9,
date-fns 4.4.0, date-fns-tz 3.2.0, class-variance-authority 0.7.1, cmdk 1.1.1, recharts 3.10.1, canvas-confetti 1.9.4, qrcode.react 4.2.0,
nanoid 6.0.2; dev: vitest 5.0.5 (+ vite 8.3.5 peer), @axe-core/playwright 4.14.0, @playwright/test 1.49.1, playwright 1.49.1, sharp 0.35.5,
@types/canvas-confetti 1.9.0. Installed with `--legacy-peer-deps`.
