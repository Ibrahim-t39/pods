# Pods design system (v3)

This is the one current guide for how Pods looks, moves and speaks. It replaces BLUEPRINT §2 (look) and every v1/v2 restyle note.

- Tokens live in `src/styles/tokens.css` and are exposed to Tailwind in `src/app/globals.css` (`@theme inline`).
- The kit lives in `src/components/brand`, `src/components/icons`, `src/components/shell` and `src/components/ui`.
- Page anatomies, the components table and the merge checklist are in `docs/design/template.md`.
- Per-area specs and file ownership are in `PODS/v3/V3_SPEC.md`.
- If code and this file disagree, fix one of them in the same change.

Reference tags follow `PODS/v3/corpus/PATTERN_BOOK.md`:

| Tag | Corpus folder |
|-|-|
| `AW` | awwwards_sites |
| `CM` | consumer_apps_mobbin |
| `IL` | icons_illustration |
| `SF` | structure_flow |
| `TS` | type_and_surface |
| `PB x.y` | a Pattern Book item |

The track letters are library tracks in `PODS/v3/library/`, for example `L` (whitespace) or `K D5` (brand voice decision 5). "Wireframe X00" means a frame in `PODS/v3/wireframes/` (`counts.json` holds its words and taps).

## 0. The feel and the idea

**The feel.** Arriving somewhere new and being expected. Warm, effortless, a little thrilling, quietly confident. Friends already saved you a seat.

**The idea.** A pod is a round table seen from above.

- You always sit at 6 o'clock, over your thumb.
- People are flat discs around the ring.
- Your pods are tables that overlap where people are shared, which is the logo drawn as a place.
- Claude lays the table. Four "I'm in" close the ring in four colours. The room becomes the moment: deep teal, logo light.
- Afterwards the table asks privately, "Run it back?". The next round is laid on top of the first, and the ring wears in.

This is the approved "table" wireframe set (5 of 6 judges), with grafts from "call", "paths" and "canopy". See `V3_SPEC.md` §1.

## 1. Principles (each has a number and a check)

1. **One object, one line, one action.** Each screen has:
   - one object: a table, a ring of options or a sheet;
   - one bold line;
   - one filled primary.

   Words above the fold: 15 or fewer on a flow step. The plan screen gets 26, because it shows who is in before you commit (wireframe D03). `check-product-gates` warns above 1.5x the budget. `check-words` (Phase E) fails above it. (PB 1.1, 1.2, 1.8; AW 04, 06, 12)
2. **People are the structure, not decoration.** Pods, plans, votes and progress are drawn as people around a ring. Never a list of cards with avatars inside (PB 2.4, 6.4; IL 41; CM 124).
3. **State changes the surface, not the words.** Planning is dawn, locked is clear, the lock moment is night and after the hangout is dusk. A screen never explains its state in a sentence when the light can show it (PB 4.4; TS 33, 28, 35; SF 09).
4. **Labels over sentences.** Copy is a label or one short line. No explainer cards, no info blurbs, no feature lists, no helper paragraphs (PB 8).
5. **Zero disclaimers, no city, no invented proof.** No "demo", "sample", "pilot", "simulated", "prototype", "synthetic", "placeholder" or "launching" anywhere, admin and Director included. City words appear only inside `[data-allow-city]` (a venue address, the one city picker). There are no counts, testimonials, press lines or stars. `scripts/check-product-gates.mjs` enforces all three.
6. **No em or en dashes in copy.** Use commas, periods, a middle dot `·` or a colon.
7. **Cool white, logo light, gloss only where you touch.** (founder 2026-10-28: "clean, glossy maybe"; COLOR_LIFE §12.4)
   - Gradients are logo light: on the page, in a pod's wash and in the moment (§2, §4).
   - Gloss is a highlight: filled pills carry `sheen`, discs carry `--disc-sheen`. Glass (`glass`) only on things that float over colour: sheets, the condensed header.
   - Never glass behind running text or lists, never gloss on outlined or text buttons, never glows.

## 2. Surface and light (COLOR_LIFE §5.1; PB 4.4)

The page is crisp cool white lit by the logo's three circles: soft ember, blue and green light overlapping at the top-right, darker where more meet, with 3.5% cool grain. The light changes with the moment of the journey. Only the lock is dark, and it is dark because it is the centre of the logo, where all three circles meet.

| Token | Value | Job |
|-|-|-|
| `--paper` | `#F7F9FB` | the page |
| `--lit` / `--table` | `#FFFFFF` | sheets, cards, table tops |
| `--ink` / `--ink-2` / `--ink-3` | `#0E1A22` / `#475563` / `#8A97A4` | text (16.7:1) / secondary text (7.2:1) / rules only (never text) |
| `--line` / `--line-2` | ink at 12% / 26% | hairlines / dashed seats |
| `--mesh-page` | three soft logo circles, top-right (larger on laptop) | the page light (`paper`) |
| `--night` / `--moment` / `--lamp` | `#06262B` / the three circles converging on a deep field / `#F2FFFA` | the moment only (lock, #2 is on, Director) |
| `--grad-venn` | the three circles at full strength | splash, share image, the empty "filling" state |
| `--scrim` | teal at 22%, frosted 6px | behind sheets and dialogs (safety reads calm, not grey) |

**Light is a state.** `<Stage light="…"/>` (`src/components/brand/stage.tsx`) sets `<html data-light>`. The background cross-fades over `--dur-light` (700 ms). `body { isolation: isolate }` keeps the light above the body background (before 2026-10-28 it was painted underneath and never showed).

| Light | Field | Moment | Feeling |
|-|-|-|-|
| `paper` | `#F7F9FB` + the three circles at the top-right | Your pods, Your seat, settings, legal, admin | someone is already here |
| `dawn` | `#F5F9FF`, a blue circle rises top-left | first run, planning, the vote | the plan is forming |
| `clear` | `#F6FAFE`, blue sky at the top, green ground at the foot | locked and settled, the reveal | daylight, public, safe |
| `rain` | `#EEF3F7` cool mist | the plan moved indoors | handled |
| `dusk` | `#FBF8F8`, a low ember lamp and plum | after the hangout: "Everything okay?", "Run it back?" | warm and private |
| `night` | `--moment`: blue and green below, the ember spark above, deep centre | the moment only (D05, E06) | it's happening, together |

**Rules.**
- (S1) One light per screen. Only the moment is dark. `bg-night` and `bg-moment` paint it.
- (S2) Gradient fields never sit behind body text. Display lines may sit on light; paragraphs never do.
- (S3) A table top is white with the pod's two-circle wash (`POD_WASH`). It deepens with each hangout held (`data-depth` 1-3, set by `<TableRing worn>`), and is tinted 9% with the pod's solid when locked.
- (S4) Cards are the exception, not the layout. When one is needed, it is `bg-lit shadow-sm` with no border.

Counterexamples:
- the v2 dark aurora with glass cards (colour as decoration, not meaning);
- the v3 tan paper with coral and black pills, which said "assistant", not "people" (`PODS/v3/color/r1-clear-water/before-390.png`);
- "Clear Water" (round 1): correct hues, but corner light with no meaning and too pale to feel alive (`PODS/v3/color/r1-clear-water/winner-390.png`).

## 3. Type (founder 2026-10-28; `PODS/v3/type/TYPE_RESEARCH.md`)

One sans: **Plus Jakarta Sans** (next/font, `--font-jakarta`). `--font-display`, `--font-serif` and `--font-ui` all resolve to it, so older class names keep working. Instrument Serif and Figtree are gone. The OG image uses `public/og/fonts/PlusJakartaSans-Bold.woff`.

**Why this font.**
- Its rounded-geometric forms rhyme with the three circles without copying the wordmark.
- It looks classy and confident in bold, and stays legible at 13-16 px.
- It has tabular figures and is OFL.
- Runner-up: Mona Sans.
- The research covered 19 products, a 12-font specimen and five fonts in-app (`PODS/v3/type/`).

**Headlines are bold.** Weights, by job:

| Weight | Job |
|-|-|
| 700 | display and page lines (`.line`, `text-display-*`) |
| 600 | headings, buttons, sheet titles, initials in discs |
| 500 | labels and captions |
| 400 | body only |

Never use 300 or below. No italics anywhere: inputs, placeholders and emphasised words included.

| Class | Size | Weight / tracking | Used for |
|-|-|-|-|
| `text-display-2xl` | 64-168 | 700 / -0.035em | the cropped day word (lamp on the moment; over a circle it is large text, 3:1 or better) |
| `text-display-xl` | 56-112 | 700 / -0.03em | plan and "Run it back?" |
| `text-display-lg` | 48-72 | 600 / -0.025em | page lines |
| `text-heading-xl` | 40-56 | 600 / -0.02em | settings lines |
| `text-heading-lg` | 32 | 600 / -0.015em | sheet titles |
| `text-heading-md` | 18/24 | 600 / -0.01em | the mid line |
| `text-heading-sm` | 16/24 | 600 | row titles |
| `text-body-lg` / `text-body` | 18/28, 16/24 | 400 | body |
| `text-label` | 14/20 | 500 | labels |
| `text-caption` | 12/16 | 500 | captions |

**Rules.**
- (T1) One line per screen carries it: left-anchored, 2-5 words, bold, `text-wrap: balance`.
- (T2) Times, dates and counts use `tabular-nums` (`.fig` or `tabular`).
- (T3) Headline measure is 20-45 characters; body is 45-70.
- (T4) No widows on lines: use `<br/>` or `max-w-[Nch]`.
- (T5) Long venue names step the line down one size rather than leaving one word alone (wireframe D14).
- (T6) Emphasis is weight or colour, never italic. The `text-logo` gradient word is allowed once per moment.
- (T7) Type is ink on every light surface and lamp on the moment. Hue is never used for running text except links (blue) and safety (teal).

## 4. Colour: what we share grows (`PODS/v3/color/COLOR_LIFE.md`, "Overlap")

Colour follows the thesis, not a swatch list. The logo is three people (three circles) and what they share (the overlaps, darker where more meet; the centre is the pod). Friendship needs Fit and Repeat, so colour shows people meeting and their overlap deepening each time they meet again. "Overlap" won a 5-voice panel against Porch Light, Saturday Park and Lights On, all rendered on the same real screens (`PODS/v3/color/directions.png`, `directions-1440.png`).

**Roles (each hue has one meaning).**

| Hue | Value | Means | Where |
|-|-|-|-|
| signal blue | `#0161DD` (light `#1B78FE`) | the plan, settled (the blue period of "pods.") | the commit button, links, focus, chosen and active states (`--select`, `bg-select`), the planning light, people |
| ember | `#FD6123` | you, and the warm yes | your disc, "I'm in", "Run it back", the lock spark. **Never a field, never text, never white on ember (3.0:1).** |
| grove | `#19C185` (text `#03684A`) | confirmed, OK | success, the verified mark (`#05A771`), community pods, people |
| teal | `#01627E` (blue x green overlap) | trust where people meet | safety centre icons and text (`--color-safe`), check-in ring, switches |
| plum | `#40313F` (ember x blue overlap) | dusk | the second interest pod's family, after-hangout light |
| red | `#C50B3A` | destroying something | delete account, admin remove, "Call 911" text. Never a normal safety state. |

**People.**
- Everyone wears their own logo colour: blue, green or teal, stable per person via `personColor()` in `disc.tsx`. Pass `seed`.
- You are always ember, with an ink initial.
- Ring segments fill in each person's colour, so a closed ring is the logo.

**Pods: two circles meeting.**

| Key (`data-pod-hue`) | Pod | Family | Its overlap |
|-|-|-|-|
| `ember` | first interest pod | tide: blue x green | teal |
| `grove` | community pod | grove: green x ember | moss |
| `signal` | second interest pod | dusk: ember x blue | plum |

- Use `POD_SOLID`, `POD_WASH` and `POD_GRAD` (or `bg-pod-grad`, `bg-pod-wash`).
- **Repeat is visible:** `data-depth="1|2|3"` on any ancestor deepens every wash under it (alphas x1, x1.45, x1.9).

**Gradients (the signature):**
- only the logo's circles and their overlaps; at most 3 circles in a field;
- a circle keeps a recognisable edge (solid to 58-64% of its radius, then fades) so it reads as a circle, not a fog; size it as `circle Npx`, never a %-sized ellipse;
- grained; never behind body text;
- they move only by cross-fading lights and, at the lock, by the circles converging once.

Tokens: `--grad-logo`, `--grad-tide`, `--grad-grove`, `--grad-dusk`, `--grad-venn`, the `-soft` washes, `--mesh-page`, `--moment`.

**Buttons.** One filled commit per screen: blue `<Button>` (5.6:1). Warm commits ("I'm in", "Run it back", "Vote" once picked) are `variant="spark"`, ember with ink text (5.8:1). On the moment: `variant="glass"` (lamp, 15.5:1). Quiet and destructive are outlined in ink.

**Plan states (Scene 5 beats 4 and 6; COLOR_LIFE §13).** The planned card wears the plan halo in the logo's three hues (people, never "AI violet"). "I'm in" is spark. "3 of 8 in" is ink; at 4 the word "Locked" arrives as a blue pill (`bg-select text-on-select`, 5.6:1) and the halo settles to blue. Seats: 8 per pod, people in their colours, open seats dashed; the first 4 form the lock arc.

**Status.** Words still carry state (§1 principle 3); colour helps: success grove, info blue, safety teal, caution a quiet amber word, danger red text. AA is checked for every pair (COLOR_LIFE §9).

## 5. Navigation and chrome (PB 3.1-3.6; SF 01, 03, 07)

- **No tab bar, no rail, no hamburger.**
- **Depth is distance.**
  - The Doorway leads to first run.
  - Your pods (the Room of overlapping tables) zooms into one table.
  - A table opens sheets.
- **Moving between pods.** Swipe left or right on phone, or use the arrow keys on laptop, to walk to the next table.

**The chrome contract** (`<Chrome>`, `src/components/shell/chrome.tsx`). It is one 44 px row: 16 px from the top on phone, 32 px on laptop, at the gutter or margin. It has one glyph per job, in the same place on every screen, and never a title.

| Where | Left | Right |
|-|-|-|
| Doorway | logo (horizontal) | "Sign in" text link |
| First run, Your seat, legal | back glyph | none |
| Your pods | the mark (home; 700 ms press opens the Director) | your disc, which opens Your seat |
| A table, After | the mark, which goes back to Your pods | menu (three small circles), which opens the one menu sheet |
| Lock moment | none | none |
| Admin | logo | one switcher |

**The Director** is hidden. It is reachable only by:
- `?director=1`;
- Ctrl/Cmd + `.`;
- a 700 ms press on the mark.

Nothing hints at it. It sits on the moment stage and uses the same icon set.

## 6. Icons (PB 6.1-6.3; IL 40, 24, 11)

The custom set is in `src/components/icons/index.tsx`, as `<Icon name="…"/>`.
- 24 grid, 1.75 round stroke, the same weight as the 14-16 px label beside it.
- Built only from circles, arcs, dots and the seat notch. The paths match the wireframe kit, so the PDFs and the app draw the same glyphs.

| Name | Drawn as | Replaces |
|-|-|-|
| `room` | three overlapping rings | home, grid |
| `seat` | ring with a notch | user-plus |
| `back` | dot leaving the ring | chevron-left |
| `close` | two soft arcs | X |
| `more` | three small circles in a row | ellipsis, hamburger |
| `talk` | two overlapping circles | message-square |
| `clock` | dot riding the rim | clock |
| `place` | ring with your seat dot pulled up | map-pin |
| `help` | ring held by a ring | life-buoy |
| `bell` | circle with three seat dots | bell |
| `block` | two discs pushed apart | user-x |
| `undo` | ring running back to its dot | rotate-ccw |
| `send` | dot leaving your circle | send |
| `sky` | disc over a horizon arc | sun |
| `rain` | canopy arc and three drops | cloud-rain |
| `why` | half-lit disc | info, sparkles |
| `flag` | ring with a mark | flag, alert |
| `here` | ripples from a dot | map-pin-check |
| `check` | ring with a filled centre | check (never a tick) |
| `turn` | ring with a leading dot | refresh |
| `off` | arcs struck through | wifi-off |
| `arrow` | line arriving at a dot | arrow-right, chevron |
| `add` | ring with a cross | plus |
| `day` | ring on a line | calendar |
| `edit` | dot along an arc | pencil |
| `locked` | ring closed by four dots | lock |
| `again` | solid circle overlapping a dashed one | repeat |
| `person` | disc on a shoulder arc | user |

Rules:
- (I1) No lucide in new code (`check-tokens` fails it). Area packages remove their last lucide import.
- (I2) Glyphs appear only where a word cannot sit. The best screens use no icon (PB 6.5).
- (I3) No sparkles for AI. Claude is named once, in "Why this plan" (K D5).

## 7. Motion (COLOR_LIFE §12; PB 7.1-7.5)

Motion is the logo doing what it means: circles drift together (fit), overlaps deepen (repeat), a ring closes (the plan, settled). One hero motion per screen; everything else is quiet. Transform and opacity only. Tokens in `tokens.css`, JS twins in `src/components/brand/motion.ts`.

| Token | Value | One job |
|-|-|-|
| `--dur-tap` / `DUR.tap` | 150 ms | press feedback, toggles, a disc popping in |
| `--dur-move` / `DUR.move` | 250 ms | a thing moving within the screen: a segment filling, a count ticking |
| `--dur-settle` / `DUR.settle` | 400 ms | a screen or object arriving: page in, sheet up, plan card to lock |
| `--dur-light` / `DUR.light` | 700 ms | the stage changing light; the moment |
| `--ease-out` | (.22,1,.36,1) | ARRIVE |
| `--ease-in-out` | (.65,0,.35,1) | TRAVEL |
| `--ease-exit` | (.4,0,1,1) | LEAVE |
| `--ease-spring` / `SNAPPY` | 420 / 32 | discs, controls, press release |
| `GENTLE` | 170 / 26 | tables, circles, the lock ring |

Reduced motion: nothing travels; every state change is a 160 ms cross-fade (`MotionConfig reducedMotion="user"`, the CSS tokens, and `useCalmMotion` where the preference changes what is rendered).

| Moment | Motion | Primitive |
|-|-|-|
| Doorway | the logo told by scroll: apart, fit, ring closes, centre fills (§12.1 of COLOR_LIFE) | `VennStory` |
| Room to table | the pod's circle travels into the table top | `<Shared name={sharedName.pod(id)}>` |
| Page deeper / out / sideways | grows from 0.94 / recedes from 1.04 / 24 px slide | `PageTransition` |
| Press | 0.96 in 80 ms, back on the spring; the sheen flattens | `pressable`, `sheen` |
| Content page scroll | the bold line condenses into a glass bar | `CondensingHead` |
| Later groups on a scrolling page | settle in as they enter | `settle` |
| I'm in | your disc slides into your seat; your segment fills; "3 in" ticks to "4 in" | `layoutId="you-disc"`, `.pods-tick` |
| Lock (4th in) | the plan card becomes the lock; light to `night`; ring closes in four colours (GENTLE); no confetti | `<Shared name={sharedName.plan(id)}>` |
| Loading | three circles breathing toward each other | `CirclesLoader`, `CirclesSkeleton` |
| Evening | the paper light warms after 6pm | `Daypart` (`html[data-daypart]`) |
| Sheet | from the bottom on phone; margin card 24 px from the right on laptop; glass | `ResponsiveSheet` |

## 8. Copy: budgets, kinds, vocabulary

**Budgets.** Words above the fold. Initials, first names at a table, times inside a table and chat are not counted (`data-nc`).

| Screen kind | Budget | Examples (wireframe) |
|-|-|-|
| Flow step | 15 | Doorway A01 15, name B01 7, Your pods C01 16 to 18, lock D05 9, Run it back E02 14 |
| Plan (who is in before you commit) | 26 | D03 22 |
| Sheet | 15 (a list sheet: 24) | menu M01 14, why S01 24, report S08 10 |
| Content (legal, Your seat) | 24 to 40 | privacy L01 32, Your seat Y01 22 |
| Admin | 40 | queue K01 17, report K02 29 |

The gate config is `scripts/gates.config.mjs`. Too few words is also a failure of feel, because a screen with no line is cold, so the gate warns under each screen's `min`.

**Kinds of action (one filled primary per screen).**

| Kind | Look | Used for |
|-|-|-|
| commit | blue pill (`Button` primary, the blue period), 56 px phone, 64 px laptop | the screen's one action |
| warm commit | ember pill, ink text (`Button variant="spark"`) | I'm in, Run it back (Yes), Vote once picked |
| go | underlined text link, with the `arrow` glyph if it leaves the page | secondary moves |
| destructive | outlined ink pill, 2 px (`Button` danger) | Give it up, Leave, Block, Delete |
| quiet | outlined line pill (`Button` secondary) | the second choice (Maybe, Keep it) |
| moment | lamp pill on the moment, deep teal text (`Button` glass) | the lock moment, #2 is on |

Every press has a tap path. There are no hold-only actions.

**Voice** (K D3). A plain, decided host:
- no slang, puns, mascots or exclamation marks;
- second person, present tense;
- labels in sentence case;
- full stops on serif lines ("Saved you a seat.") and none on labels.

**Vocabulary.**

| Use | Never |
|-|-|
| pod, table (in design talk only), seat, your seat | group, community (as a lead noun), squad |
| I'm in, can't make it, give up your seat | RSVP, attend, register |
| hangout, the plan | event, meetup |
| Run it back? (button and question only, K D8) | streak, level, score |
| Your pods, Your seat | dashboard, home, profile (in UI) |
| Claude (once, in "Why this plan") | AI, smart, magic, algorithm |
| If something's off | safe, verified safe (I #4) |
| 18 and up | 18+ only badges |
| Community pods (opt-in) | faith pods, heritage pods (in public copy) |

**Numbers.** Only numbers from the product's own data appear ("3 in", "2 of 4 voted"). Statistics live in the pitch, sourced from `I/09_claims_sheet.md`. Never "friends in N hangouts".

## 9. Spacing and whitespace (L track, measured; L07)

The base is 4 pt. **Each step has one job.** Values off this list fail `check-spacing`. Tailwind names: `p-gutter`, `gap-s8`, `mt-s6` and so on.

| Token | px | The one job | Evidence |
|-|-|-|-|
| `s1` | 4 | inside one control: glyph to its label | Mobbin 3-7 px band, 20% of gaps (L03) |
| `s2` | 8 | inside a group: label to value, disc to disc, overline to line | inner median 7-12 (L03) |
| `s3` | 12 | rows of one list | pooled inner median 12 (L03) |
| `s4` | 16 | a line to its object; sheet title to its list; between pills | the most common single gutter (L02) |
| `gutter` | 20 | phone outer margin | INFERENCE: 16 is the mode, and 20 adds air for the "saved you a seat" feel; Pods already holds its margin better than the benchmark (L02) |
| `s6` | 24 | the head below the chrome row | primary clear-above median 24 (L05) |
| `s8` | 32 | between groups; the phone clear zone above the primary; the floor | outer-gap median 33 to 34 (L03) |
| `s12` | 48 | the laptop clear zone around the primary | web phone outer median 42 (L03) |
| `s16` | 64 | laptop outer margin; laptop floor | Pods desktop section median 65 (L03) |
| `s24` | 96 | laptop gap between the text column and the object | web desktop section median 99.5 (L03) |

The rules:

1. **Between groups is at least 2x inside.** The inner gaps are 8 and 12, and the outer gaps are 24 and 32. This targets L03's flat rhythm: 45% of Pods screens had a ratio under 2, against 23% of matched benchmark screens.
2. **The primary owns its zone.** Nothing tappable within 32 px above it on phone (48 px on laptop), and nothing else filled within 160 px (L05).
3. **One edge.** Text, rows and buttons sit on the gutter. There is at most one indent.
4. **One void, and it is placed.** At most one gap of 96 px or more per screen, and it is either the object's space or the clear zone. Single-question steps give the void to an anchor (a table or the ring of choices). This fixes the 147-347 px voids found in L04.
5. **Group by distance, not boxes.** A screen with three groups uses three distance levels and 0 or 1 box.
6. **Phone and laptop are two layouts.**
   - Phone: chrome 16 + 44, head 24 below, the object takes the rest, foot 120 (32 / 56 / 32).
   - Laptop: 64 px margin, a 520 px text column with the head at 160 px from the top and the foot at the bottom, 96 px gap, and the object off-centre in the rest (PB 1.1).
7. **No scrolling on a flow step at 390x844.** Content pages may scroll.

Radii:
- pills and discs: 999;
- sheets and the margin card: 28;
- table tops: 50%;
- inputs: 28;
- small media: 16.

Nothing else gets a radius. That avoids the v1 look of 12-16 px on everything.

## 10. Popups and admin

**Popups.**
- The only popup is `ResponsiveSheet` (`src/components/ui/sheet.tsx`). It has three heights:
  - peek: one line and an action;
  - half: a short list;
  - full: Talk.
- **Phone.** A white sheet on the teal scrim with a 36x4 grab, a 32 px serif title and the close glyph at the top right. Swipe down closes it.
- **Laptop.** A 480 px margin card 24 px from the top-right edge, so the table stays visible beside it (TS 2, 7, 12).
- Never more than one sheet deep. A sheet opened from a sheet replaces it.
- No dialogs over dialogs, no toasts that carry decisions and no tooltips for meaning.

**Admin** has the same cool white and the same one voice, and it is calm.
- The queue comes first (J #10). There is one switcher, no tab row and no KPI wall.
- Hours together are tracked here only (H #2).
- There are no demo markers. Admin authorization is a launch item (C #8), not a label.

## 11. Checks

| Script | Fails when |
|-|-|
| `scripts/check-product-gates.mjs` | any disclaimer word, a city word outside `[data-allow-city]`, invented proof, an em dash, the Director visible without its trigger or failing to open with one, or banned words inside the Director. It warns when a screen's words are far outside the budget. |
| `scripts/check-ui-basics.mjs` | not exactly one visible h1, horizontal scroll at 390, a control under 44x44 (inline links inside a sentence are exempt), overlapping controls, or console and page errors. It warns when a flow step scrolls at 390x844. |
| `scripts/judge-path.mjs` | the end-to-end judge path breaks |
| Phase E (to write) | `check-words` (budget hard fail, more than one filled primary), `check-spacing` (off-scale gap, gutter, clear zone), `check-tokens` (hex outside `@theme`, lucide), `check-dead-ui`, `a11y-audit` (axe, grayscale), `run-checks` |

Shared routes and budgets are in `scripts/gates.config.mjs`. Reports are written to `shots/gates/*.json`.

## 12. What Pods is not (PB 8, the never-again list)

Pods never has:
- a tab bar or sidebar;
- card lists with status pills;
- a chat page as home;
- a hero, then features, then how-it-works, then FAQ;
- a centred headline, subtitle and button stack;
- a phone mockup on the landing;
- a dark gradient or aurora;
- glass;
- glossy blue pills;
- uppercase tracked eyebrows;
- lucide icons and AI sparkles;
- segmented progress bars;
- confetti;
- percentage bars in votes;
- explainer cards;
- a city pill;
- "Demo build" strips.

The founder's v2 screenshots in `pods-app/shots/before/` are the counterexample for every rule above.
