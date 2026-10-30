# Pods page template (v3)

This template is derived from the approved round-3 wireframes, which are the frozen layout:
- `PODS/v3/wireframes/` (84 screens x phone and laptop, `counts.json`);
- the winning "table" prototype (`src/app/concepts/table`, with its grafts).

Read `DESIGN.md` first for the tokens and rules. This file says how a page is put together.

Reference screen: the Doorway (`/`, `src/components/marketing/doorway.tsx`). Shots:
- before: `shots/before/home.*.png`
- after: `shots/home.*.png`

## 1. Page anatomies

Every screen is one of these seven. Use `<Page>` (`src/components/shell/page.tsx`) for anatomies A, B and E. It already carries the phone grid and the laptop grid below.

### A. Flow step (first run, statements, system pages)
Wireframes B01-B10, Z01-Z03, D12, D13, E07.

```
phone 390x844                                  laptop 1440x900
┌──────────────────────────────┐               ┌──────────────────────────────────────────────────────────┐
│ 16                           │               │ 32  [glyph]                                    [glyph]   │
│ [glyph]            [glyph] 44│ chrome        │                                                          │
│ 24                           │               │ 160 ┌ text column 520 ┐ 96 ┌ object (off-centre) ──────┐ │
│ overline 14 · 8              │ head          │     │ overline        │    │                           │ │
│ The serif line.              │               │     │ The serif line. │    │        ( table )          │ │
│                              │               │     │                 │    │                           │ │
│        ( object )            │ object: rest  │     │ status  [Primary]    │                           │ │
│                              │               │ 64  └─────────────────┘    └───────────────────────────┘ │
│ 32 clear zone                │               └──────────────────────────────────────────────────────────┘
│ status label        [Primary]│ foot 120         margin 64 · column 520 · gap 96 · object = the rest
│ 32 + safe area               │
└──────────────────────────────┘
```

- Head: one overline (optional, 14 px, ink-2) plus one serif line (`<Line size="lg|xl">`).
- Foot: the status sits on the left ("1 of 4", "3 in · 1 more locks it", "2 of 4 voted") and the one primary on the right. On laptop the primary comes first, then the status.
- **The page does not scroll at 390x844.** If it does not fit, cut words, not space.

### B. The table (a pod's plan; the reference composition)
Wireframes D02-D16, E01-E06.

- Chrome: the mark on the left, the menu on the right.
- Head: the overline `Hoopers #1 · closes Thu`, then the plan line, one phrase per row ("Sunday. / 1pm. / Miller."). Under it sits the provenance line: `◐ Claude · everyone's free · 12 min ⟶`, which opens the S01 sheet.
- Object: `<TableRing>` with 4 seats until it locks.
  - Your seat is at 6 o'clock and your disc waits outside it.
  - The centre holds the Talk cue (`talk` glyph and unread count), and the whole table opens Talk.
- Foot: `3 in · 1 more locks it` on the left, `I'm in` on the right.
- Light: dawn while planning, clear when locked, rain when moved, night for the lock moment, dusk after.

### C. Your pods (the Room)
Wireframes C01-C08.

- Chrome: the mark on the left, your disc on the right.
- Head: `Next` / `Hoopers, Sunday 1pm.`
- Object: up to 3 tables drawn as overlapping circles in their hues. People shared by two pods sit in the overlap. Your disc sits at the centre.
- Foot: `Open the plan ⟶` as a go link. There is no filled primary: the tables are the choice.
- 4 or more pods, or a screen reader, gets the list view (C07): rows of `disc + name + next`, toggled by the `list` glyph.

### D. Sheet (popups)
Wireframes M01, S01-S12, B03s, D08, Y02-Y06.

- `ResponsiveSheet`: on phone a bottom sheet (grab, a 32 px serif title, the close glyph at the top right, 20 px gutter, 32 px floor); on laptop a 480 px margin card at the right.
- Content: labelled rows (`mrow`). Each row is 56 px minimum with a hairline on top, a glyph in 24 px and a 16 px label.
- Risky rows (report, leave, delete) sit apart at the bottom, after an `s8` gap.
- At most one primary, bottom right. Destructive actions are an outlined ink pill.

### E. The moment (lock, #2 locked)
Wireframes D05, E06.

- `<Stage light="night">`. No chrome at all.
- The overline `It's on.` sits top-left in serif 32.
- The table sits in the lamp pool with names showing.
- The day word (`<Line size="xxl" crop>`) runs off the right edge.
- Foot: `1pm · Miller` on the left and `See you there` (glass pill) on the right. It stays until tapped.

### F. Content (legal, Your seat, settings)
Wireframes L01-L03, Y01.

- Chrome: the back glyph.
- Head: one serif word or line.
- Body: labelled rows (`<LegalPage>`, `src/components/legal/legal-page.tsx`). A row is a label (16/600) and one line (14, ink-2), and it expands in place for more.
- Your seat: sentence rows in serif 32 ("Into hoops, guitar.", "Texts when it's on."), each a tap target that opens one sheet. Help, legal, sign out and delete are behind one row ("Help, legal, sign out ⟶").
- May scroll. The laptop layout is the 520 px column for the head and a 640 px column for the rows.

### G. Admin
Wireframes K01-K05.

- Chrome: logo on the left, one switcher on the right (`AdminShell`).
- Head: a serif word (`Reports`) and a quiet label (`3 open · oldest first`).
- Body: the queue as rows (a hue dot, a reason in serif 20, the pod and age in a 14 px label). On laptop it sits in the right column.
- One report shows: who and about whom, what was said (quoted), the pause and its expiry. It has two actions, and Remove sits in the menu.
- Data-heavy, so the budget is 40 words. No KPI wall.

## 2. Components kit

| Component | File | What it is | Used on | Refs |
|-|-|-|-|-|
| `Stage` | `components/brand/stage.tsx` | sets the page light (paper, dawn, clear, rain, night, dusk) | every page with a state | PB 4.4 |
| `Line`, `figures()` | `components/brand/line.tsx` | the serif line; digits re-set in Figtree; sizes xxl to sm; `crop` | every screen's line | PB 1.2, 5.1 |
| `TableRing`, `Seat` | `components/brand/table-ring.tsx` | the pod as a table: n seats, segments fill per yes, place-card names, fill, dim, worn, roof, night; one target | Doorway, plan, lock, run it back, vote, Room (small) | PB 2.1, 6.4, 7.2 |
| `Disc`, `DiscStack` | `components/brand/disc.tsx` | a person as a flat disc (you ink, others pod hue); dashed open seat; overlapping row | Talk header, people rows, admin | PB 6.4; IL 41 |
| `MarkButton` | `components/brand/mark-button.tsx` | the mark as home; the hidden 700 ms Director press | chrome | §5 |
| `ProgressDots` | `components/brand/progress-dots.tsx` | first-run "1 of 4" dots | first run foot | PB 2.7 |
| `Logo` | `components/brand/logo.tsx` | the fixed asset | Doorway, admin | brand |
| `Icon` | `components/icons/index.tsx` | the 28-glyph circle set | everywhere a word cannot sit | PB 6.1-6.3 |
| `Chrome`, `GlyphButton`, `SeatGlyph` | `components/shell/chrome.tsx` | the one 44 px top row | every page | §5 |
| `Page` | `components/shell/page.tsx` | phone and laptop anatomy (head, object, foot) | anatomies A, B, E | L07 §4 |
| `AppShell`, `PageTransition` | `components/shell/app-shell.tsx`, `page-transition.tsx` | stage, Offline word, depth transitions, StoreGate | /app | PB 3.2 |
| `PageSkeleton` | `components/shell/store-gate.tsx` | loading: a dashed table breathing | loading | PB 6.6 |
| `NotFoundView`, `ErrorView` | `components/shell/system-pages.tsx` | Z01, Z02 | system | |
| `Button` | `components/ui/button.tsx` | commit, go (link), destructive (danger), quiet (secondary), night (glass) | everywhere | §8 |
| `IconButton` | `components/ui/icon-button.tsx` | 44 px glyph button | chrome, rows | |
| `ResponsiveSheet` | `components/ui/sheet.tsx` | the only popup | anatomy D | TS 2, 7, 12 |
| `ListRow`, `ListGroup` | `components/ui/list-row.tsx` | labelled rows with hairlines (no box) | sheets, settings | L03 rule 5 |
| `Chip` | `components/ui/chip.tsx` | ink when picked, outlined when not (first-run likes only, around the ring) | B02 | |
| `LegalPage` | `components/legal/legal-page.tsx` | labelled, expandable rows | /privacy, /safety, /terms | L01-L03 |
| `AdminShell`, `PageHeader` | `components/admin/admin-shell.tsx` | logo, switcher, serif head | /admin | K01 |
| `Doorway` | `components/marketing/doorway.tsx` | A01 to A03 | / | PB 2.1 |

**Still to build** (each owned by its area, see V3_SPEC §5):

| Component | Area | Wireframes |
|-|-|-|
| `Room` (overlapping tables) | core | C01 |
| `PlanLine` (the plan headline with underlined words) | planner_loop | D03, call graft |
| `LockMoment` | planner_loop | D05, E06 |
| `OptionRing` (vote options as circles people sit on) | planner_loop | E05 |
| `TalkSheet` | core | S03 |
| `SentenceField` ("I'm Chanda, 22." inputs inline in the line) | onboarding | B01 |
| `LikesRing` | onboarding | B02 |
| `FreeArcs` | onboarding | B04 |
| `CodeCircles` (six circles fill) | onboarding | B06 |

Deprecated, kept only until each area removes its last use:

| Item | Status |
|-|-|
| `AuroraBackground` | now paints night |
| `GlassCard`, `Card` | flat |
| `TopBar` | renders `Chrome` plus a serif line |
| `PaneLayout` | |
| `Badge` | |
| `Segmented`, `Tabs` | no segmented controls in member screens |
| `CirclePeople`, `ThreeCircleArt` | |
| `fireConfettiCircles` | |
| `Countdown` | |
| `Stat`, `NumberTicker` | admin only |

## 3. States (each anatomy designs all of them)

| State | Pattern | Wireframe |
|-|-|-|
| new / empty | a dashed seat or dashed table, one line, one way forward. Never a fake pod (D #5) | C02, B09, S04 |
| loading | `PageSkeleton`: a dashed table breathing, no words | C04, Z04 |
| planning | dawn light, up to 6 beats, then one line | D01 |
| waiting | "3 of 4 answered. Maybe isn't a yes." with a quiet change link | E03 |
| 3 of 4 in | ring 3/4 solid, `3 in · 1 more locks it` | D03 |
| locked | clear light, table tinted, `4 going` | D06 |
| rained out | rain light, dashed canopy, then a solid canopy with "Rain moved it." | D10, D11 |
| did not lock | table dim and dashed, "Not this time. The 3 who said yes stay in." | D12 |
| error | one line, nothing lost, Try again | D13, Z02 |
| offline | the `Offline.` word top centre; actions queue with "Not sent. Retry" | C05, D04o, E03o, S05 |
| long names | the line steps down a size and balances; place cards ellipsize at 80 px | D14 |
| undo | ink toast, 56 px: `You're in. · Undo` (6 s) | D04, D09 |

## 4. Density targets (counted on the rendered screen)

| Kind | Words | Taps | Filled primaries |
|-|-|-|-|
| Flow step | 15 or fewer | 4 or fewer | 1 |
| Plan | 26 or fewer | 5 or fewer | 1 |
| Sheet | 15 or fewer (list 24) | 6 or fewer | 0 or 1 |
| Content | 24 to 40 | 7 or fewer | 0 or 1 |
| Admin | 40 or fewer | 6 or fewer | 0 or 1 |

## 5. Copy rules (short)

- One serif line per screen, full stop.
- Labels have no full stop.
- No em or en dashes.
- No disclaimers.
- No city outside `[data-allow-city]`.
- Claude is named once per plan, in "Why this plan".
- "Run it back?" is a question and a button, never a feature name.
- Numbers come only from the product's own data.

## 6. Checklist before a page merges

- [ ] It matches its wireframe frame ID (cite it in the file header) at 390x844 **and** 1440x900.
- [ ] Shots exist for both new and filled accounts (`shots/`), and in grayscale (meaning never rides on hue alone).
- [ ] Words and taps are within section 4. Exactly one filled primary.
- [ ] Spacing is on the scale only. Between groups is at least 2x inside. The primary's clear zone is held. No flow step scrolls at 390x844.
- [ ] One visible h1. Targets are 44 or larger. No overlaps. No horizontal scroll. No console errors.
- [ ] No lucide import, no hex outside tokens, no glass, gloss or gradient on things.
- [ ] Every state in section 3 that applies is designed and reachable (the Director can set it).
- [ ] `node scripts/check-product-gates.mjs` and `node scripts/check-ui-basics.mjs` pass for the route. `npx tsc --noEmit` is clean. `node scripts/judge-path.mjs` still walks.
