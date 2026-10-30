// [U1] Design system sandbox (client). Theme switch flips <html data-theme> for this page only (not persisted);
// ?theme=dark opens it in dark for screenshots.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LayoutGroup } from "motion/react";
import {
  ArrowRight,
  Backpack,
  Ban,
  BellOff,
  CalendarDays,
  CircleCheck,
  CircleUserRound,
  Clock,
  CloudRain,
  Flag,
  Globe,
  LogOut,
  MapPin,
  MessageCircleQuestion,
  Moon,
  MoreHorizontal,
  Pin,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Share,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  Users,
  Lock,
  BadgeDollarSign,
  Car,
  Bell,
  Download,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  AuroraBackground,
  CirclePeople,
  Logo,
  LogoAnimated,
  LogoMark,
  PodHue,
  PodsGlyph,
  RepeatGlyph,
  ThreeCircleArt,
  VerifiedSeal,
  WidenGlyph,
  fireConfettiCircles,
  type LogoMotion,
} from "@/components/brand";
import {
  AlertDialog,
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  ChipGroup,
  CommitMeter,
  Countdown,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  EmptyState,
  GlassCard,
  IconButton,
  Input,
  Kbd,
  ListGroup,
  ListRow,
  MapTile,
  NumberTicker,
  OtpInput,
  PhoneInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ProgressBar,
  ProgressRing,
  RadioCard,
  RadioCardGroup,
  ResponsiveSheet,
  SectionHeader,
  Segmented,
  Select,
  SelectCard,
  SheetClose,
  Skeleton,
  SkeletonBubbles,
  SkeletonPodCard,
  SkeletonText,
  Spinner,
  Stat,
  Stepper,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  Textarea,
  Tooltip,
  VerifiedBadge,
  notify,
  type StackPerson,
} from "@/components/ui";

/* ── layout helpers ──────────────────────────────────────────────────────── */

const SECTIONS = [
  ["brand", "Logo & motion"],
  ["colour", "Colour"],
  ["type", "Type"],
  ["buttons", "Buttons"],
  ["inputs", "Inputs"],
  ["selection", "Selection"],
  ["people", "People"],
  ["covers", "Pod covers"],
  ["cards", "Cards & glass"],
  ["overlays", "Overlays"],
  ["progress", "Progress & time"],
  ["feedback", "Loading & empty"],
  ["lists", "Lists & nav"],
  ["icons", "Icons"],
] as const;

function Section({ id, title, kicker, children, className }: { id: string; title: string; kicker: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
        <div>
          <p className="text-overline text-primary-soft-text">{kicker}</p>
          <h2 className="mt-1.5 text-heading-xl text-fg">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Specimen({ label, children, className, note, bodyClassName }: { label: string; children: ReactNode; className?: string; note?: ReactNode; bodyClassName?: string }) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xs", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
        <span className="font-mono text-[12px] text-fg-muted">{label}</span>
        {note && <span className="text-caption text-fg-subtle">{note}</span>}
      </div>
      <div className={cn("flex-1 p-4 md:p-6", bodyClassName)}>{children}</div>
    </div>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-2 font-mono text-[11px] text-fg-subtle">{children}</p>;
}

/* ── page ────────────────────────────────────────────────────────────────── */

export function Showcase() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    const q = new URLSearchParams(window.location.search).get("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the URL once after mount (no window during prerender)
    if (q === "dark") setTheme("dark");
    return () => {
      if (prev) root.setAttribute("data-theme", prev);
      else root.removeAttribute("data-theme");
    };
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="glass sticky top-0 z-header border-x-0! border-t-0! shadow-xs!">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:px-8">
          <Logo className="h-6 md:h-7" />
          <span className="hidden h-5 w-px bg-border-strong sm:block" />
          <span className="hidden text-label text-fg-muted sm:block">Design system</span>
          <Badge tone="ai" size="xs" className="hidden sm:inline-flex">
            v1.1
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Segmented
              label="Theme"
              size="sm"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: <span className="hidden sm:inline">Light</span>, icon: <Sun strokeWidth={1.75} /> },
                { value: "dark", label: <span className="hidden sm:inline">Dark</span>, icon: <Moon strokeWidth={1.75} /> },
              ]}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1320px] gap-10 px-4 md:px-8">
        <nav aria-label="Sections" className="sticky top-24 hidden h-fit w-44 shrink-0 py-10 xl:block">
          <p className="mb-3 text-overline text-fg-subtle">Components</p>
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-sm px-2.5 py-1.5 text-[14px] text-fg-muted transition-colors hover:bg-sunken hover:text-fg">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 py-8 md:py-10">
          <Hero />
          <div className="mt-14 flex flex-col gap-16 md:mt-20 md:gap-24">
            <BrandSection />
            <ColourSection />
            <TypeSection />
            <ButtonsSection />
            <InputsSection />
            <SelectionSection />
            <PeopleSection />
            <CoversSection />
            <CardsSection />
            <OverlaysSection />
            <ProgressSection />
            <FeedbackSection />
            <ListsSection />
            <IconsSection />
          </div>
          <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 pb-10 text-caption text-fg-subtle">
            <span>Tokens: src/styles/tokens.css · Components: src/components/ui, src/components/brand</span>
            <span>Every value on this page is sample data.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

/* ── hero ────────────────────────────────────────────────────────────────── */

function Hero() {
  const [k, setK] = useState(0);
  return (
    <div className="relative isolate overflow-hidden rounded-2xl text-white shadow-lg">
      <AuroraBackground intensity={0.62} />
      <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-[1.1fr_1fr] md:items-center md:p-12 lg:p-14">
        <div className="flex flex-col gap-5">
          <Badge tone="solid" size="sm" className="w-fit border-white/15! bg-white/10! text-white! backdrop-blur-md">
            <Sparkles strokeWidth={1.75} /> Pods design system
          </Badge>
          <h1 className="text-display-xl">
            Glossy, but calm. <span className="text-signal-300">Built from three circles.</span>
          </h1>
          <p className="max-w-md text-body-lg text-neutral-300">
            Every primitive the app is made of, in every state. Tokens only, lucide at 1.75, springs from the brand.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" trailingIcon={<ArrowRight strokeWidth={1.75} />} onClick={() => document.getElementById("buttons")?.scrollIntoView({ behavior: "smooth" })}>
              See components
            </Button>
            <Button variant="glass" size="lg" leadingIcon={<RotateCcw strokeWidth={1.75} />} onClick={() => setK((x) => x + 1)}>
              Replay intro
            </Button>
          </div>
        </div>
        <GlassCard tone="dark" radius="2xl" padding="lg" className="grid min-h-[200px] place-items-center md:min-h-[280px]">
          <LogoAnimated variant="intro" onDark replayKey={k} className="w-full max-w-[380px]" />
        </GlassCard>
      </div>
    </div>
  );
}

/* ── brand ───────────────────────────────────────────────────────────────── */

function MotionTile({ variant, dark, children }: { variant: LogoMotion; dark?: boolean; children?: ReactNode }) {
  const [k, setK] = useState(0);
  const mark = variant === "loader" || variant === "breathe" || variant === "orbit" || variant === "assemble";
  return (
    <div className={cn("group relative flex flex-col overflow-hidden rounded-lg border", dark ? "border-transparent bg-ink" : "border-border bg-sunken")}>
      <div className="grid h-36 place-items-center px-6">
        <LogoAnimated variant={variant} onDark={dark} replayKey={k} className={mark ? "size-24" : "w-full max-w-[220px]"}>
          {children}
        </LogoAnimated>
      </div>
      <div className={cn("flex items-center justify-between border-t px-3 py-2", dark ? "border-white/10 text-neutral-300" : "border-border text-fg-muted")}>
        <span className="font-mono text-[12px]">{variant}</span>
        <button
          type="button"
          onClick={() => setK((x) => x + 1)}
          aria-label={`Replay ${variant}`}
          className={cn("pressable grid size-8 place-items-center rounded-pill", dark ? "hover:bg-white/10" : "hover:bg-surface")}
        >
          <Play size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function BrandSection() {
  return (
    <Section id="brand" kicker="Brand" title="Logo & motion">
      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen label="Logo · horizontal / stacked / mark / wordmark" bodyClassName="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
            <Logo className="h-10" />
            <Logo variant="stacked" className="h-20" />
            <LogoMark size={44} />
            <Logo variant="wordmark" className="h-8" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="grid h-20 place-items-center rounded-md bg-ink">
              <Logo onDark className="h-7" />
            </div>
            <div className="grid h-20 place-items-center rounded-md bg-signal-gloss">
              <Logo mono="white" className="h-7" />
            </div>
            <div className="col-span-2 grid h-20 place-items-center rounded-md border border-border bg-paper sm:col-span-1">
              <Logo mono="black" className="h-7" />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4 border-t border-border pt-5">
            {[
              ["bg-white", 72],
              ["bg-ink", 72],
              ["bg-white", 48],
              ["bg-ink", 48],
              ["bg-white", 32],
            ].map(([bg, s], i) => (
              <span
                key={i}
                className={cn("grid place-items-center rounded-icon shadow-[var(--shadow-md),inset_0_0_0_1px_rgb(15_16_21/0.06)]", bg as string)}
                style={{ width: s as number, height: s as number }}
              >
                <LogoMark size={(s as number) * 0.72} title="" />
              </span>
            ))}
            <span className="text-caption text-fg-muted">App icon · squircle 22.37%</span>
          </div>
          <Caption>Solid overlap fills, never blend modes · wordmark follows --color-text · min 88px lockup / 20px mark</Caption>
        </Specimen>
        <Specimen label="LogoAnimated" note="tap ▶ to replay" bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MotionTile variant="intro" />
          <MotionTile variant="assemble" />
          <MotionTile variant="loader" />
          <MotionTile variant="splash" dark />
          <MotionTile variant="typeon" />
          <MotionTile variant="breathe" />
          <MotionTile variant="orbit">
            <Avatar name="Chanda Mwale" seed="me" you size={36} />
          </MotionTile>
          <div className="col-span-1 flex flex-col justify-center gap-2 rounded-lg border border-dashed border-border-strong p-4 text-body-sm text-fg-muted sm:col-span-2">
            <span className="text-label text-fg">Reduced motion</span>
            Every variant renders the static logo; the loader keeps a soft dot pulse.
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── colour ──────────────────────────────────────────────────────────────── */

function Swatch({ cls, name, sub, ink }: { cls: string; name: string; sub: string; ink?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("h-16 rounded-md shadow-[inset_0_0_0_1px_rgb(15_16_21/0.06)]", cls)}>
        <div className={cn("p-2 text-[11px] font-semibold", ink ? "text-ink" : "text-white")}>Aa</div>
      </div>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold text-fg">{name}</div>
        <div className="font-mono text-[11px] text-fg-subtle">{sub}</div>
      </div>
    </div>
  );
}

function ColourSection() {
  const RAMPS = {
    ember: ["bg-ember-50", "bg-ember-100", "bg-ember-200", "bg-ember-300", "bg-ember-400", "bg-ember-500", "bg-ember-600", "bg-ember-700", "bg-ember-800", "bg-ember-900"],
    signal: ["bg-signal-50", "bg-signal-100", "bg-signal-200", "bg-signal-300", "bg-signal-400", "bg-signal-500", "bg-signal-600", "bg-signal-700", "bg-signal-800", "bg-signal-900"],
    grove: ["bg-grove-50", "bg-grove-100", "bg-grove-200", "bg-grove-300", "bg-grove-400", "bg-grove-500", "bg-grove-600", "bg-grove-700", "bg-grove-800", "bg-grove-900"],
  };
  const ramp = (h: keyof typeof RAMPS) => RAMPS[h].map((c) => <div key={c} className={`h-7 flex-1 ${c}`} />);
  return (
    <Section id="colour" kicker="Tokens" title="Colour">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Specimen label="Brand hues · pod semantics" bodyClassName="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            <Swatch cls="bg-ember-gloss" name="Ember" sub="interest pods" ink />
            <Swatch cls="bg-signal-gloss" name="Signal" sub="Pods itself · AI · you" />
            <Swatch cls="bg-grove-gloss" name="Grove" sub="community pods" ink />
          </div>
          <div className="flex flex-col gap-1.5 overflow-hidden rounded-md">
            <div className="flex">{ramp("ember")}</div>
            <div className="flex">{ramp("signal")}</div>
            <div className="flex">{ramp("grove")}</div>
          </div>
          <Caption>Ramps are illustration-only. Ember / Grove text uses --pod-text (lint-enforced).</Caption>
        </Specimen>
        <Specimen label="Semantic roles (flip with theme)" bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["bg-bg border border-border", "bg"],
            ["bg-surface border border-border", "surface"],
            ["bg-sunken", "sunken"],
            ["bg-primary-soft", "primary-soft"],
            ["bg-success-soft border border-success-border", "success-soft"],
            ["bg-warning-soft border border-warning-border", "warning-soft"],
            ["bg-danger-soft border border-danger-border", "danger-soft"],
            ["bg-info-soft border border-info-border", "info-soft"],
            ["bg-ink", "ink"],
          ].map(([c, n]) => (
            <div key={n} className="flex items-center gap-2.5">
              <span className={cn("size-9 shrink-0 rounded-sm", c)} />
              <span className="font-mono text-[12px] text-fg-muted">{n}</span>
            </div>
          ))}
        </Specimen>
      </div>
    </Section>
  );
}

/* ── type ────────────────────────────────────────────────────────────────── */

function TypeSection() {
  const rows: [string, string, string][] = [
    ["text-display-2xl", "display-2xl · Archivo 900 · 48→88", "Find your people."],
    ["text-display-xl", "display-xl · reveal", "You're in 4 pods."],
    ["text-display-lg", "display-lg · onboarding", "What do you like doing?"],
    ["text-heading-xl", "heading-xl · screen title", "Pods"],
    ["text-heading-md", "heading-md · plan card", "Sunday pickup run at Miller"],
    ["text-heading-sm", "heading-sm · names", "Hoopers"],
    ["text-body", "body 16", "Pods puts people who just moved into small local friend groups."],
    ["text-body-sm text-fg-muted", "body-sm / caption", "Sun, Nov 8 · 1:00 PM · 3 of 8 in"],
    ["text-overline text-fg-muted", "overline", "First hangout · planned by Pods"],
    ["text-mono text-fg-muted", "mono 13 · planner trace", "slots.sunday_afternoon = 7/8"],
  ];
  return (
    <Section id="type" kicker="Typography" title="Type">
      <Specimen label="Archivo display · Inter UI · JetBrains Mono data" bodyClassName="flex flex-col divide-y divide-border p-0! md:p-0!">
        {rows.map(([c, l, s]) => (
          <div key={l} className="grid gap-1 px-4 py-4 md:grid-cols-[220px_1fr] md:items-baseline md:gap-6 md:px-6">
            <span className="font-mono text-[11.5px] text-fg-subtle">{l}</span>
            <span className={cn(c, "min-w-0 break-words")}>
              {c === "text-display-2xl" ? (
                <>
                  Find your people. <span className="text-primary">Then keep them.</span>
                </>
              ) : (
                s
              )}
            </span>
          </div>
        ))}
      </Specimen>
    </Section>
  );
}

/* ── buttons ─────────────────────────────────────────────────────────────── */

function ButtonsSection() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const go = () => {
    setLoading(true);
    setDone(false);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1100);
  };
  return (
    <Section id="buttons" kicker="Actions" title="Buttons">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Specimen label="Button · variants" note="hover, press, focus live" bodyClassName="flex flex-col gap-6">
          <Row>
            <Button>I&apos;m in</Button>
            <PodHue hue="ember" asChild>
              <span className="contents">
                <Button variant="pod">Run it back</Button>
              </span>
            </PodHue>
            <PodHue hue="grove" asChild>
              <span className="contents">
                <Button variant="pod" leadingIcon={<CircleCheck strokeWidth={1.75} />}>
                  I went
                </Button>
              </span>
            </PodHue>
            <Button variant="secondary">See details</Button>
            <Button variant="ghost">Not now</Button>
          </Row>
          <Row>
            <Button variant="danger" leadingIcon={<Ban strokeWidth={1.75} />}>
              Block
            </Button>
            <Button variant="danger-quiet" leadingIcon={<Flag strokeWidth={1.75} />}>
              Report
            </Button>
            <Button variant="link">Why this plan</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </Row>
          <div className="rounded-lg bg-ink p-4">
            <Row>
              <Button variant="primary">Get started</Button>
              <Button variant="glass" trailingIcon={<ArrowRight strokeWidth={1.75} />}>
                See how it works
              </Button>
            </Row>
          </div>
        </Specimen>
        <Specimen label="Sizes · loading · success" bodyClassName="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <Button size="xl" block loading={loading} success={done} onClick={go}>
              {loading ? "Saving" : done ? "You're in" : "I'm in · tap me"}
            </Button>
            <Row>
              <Button size="lg">Large 48</Button>
              <Button size="md">Medium 40</Button>
              <Button size="sm">Small 32</Button>
            </Row>
            <Row>
              <Button size="md" variant="secondary" loading>
                Sending
              </Button>
              <Button size="md" variant="secondary" shape="rounded" leadingIcon={<CalendarDays strokeWidth={1.75} />}>
                Add to calendar
              </Button>
            </Row>
          </div>
          <div>
            <p className="mb-2.5 text-label text-fg">IconButton · 44 hit area</p>
            <Row>
              <IconButton label="More" icon={<MoreHorizontal strokeWidth={1.75} />} />
              <IconButton label="Share" variant="surface" icon={<Share strokeWidth={1.75} />} />
              <IconButton label="Notifications" variant="surface" badge icon={<Bell strokeWidth={1.75} />} />
              <IconButton label="Plan with AI" variant="primary" icon={<Sparkles strokeWidth={1.75} />} />
              <IconButton label="Settings" variant="glass" icon={<Settings strokeWidth={1.75} />} />
              <IconButton label="Loading" variant="surface" loading icon={<Search strokeWidth={1.75} />} />
              <IconButton label="Disabled" variant="surface" disabled icon={<Trash2 strokeWidth={1.75} />} />
            </Row>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── inputs ──────────────────────────────────────────────────────────────── */

function InputsSection() {
  const [name, setName] = useState("Chanda");
  const [bio, setBio] = useState("Just moved from Lusaka for work. Looking for a Sunday run and people to try the food spots with.");
  const [phone, setPhone] = useState("2065550142");
  const [otp, setOtp] = useState("4821");
  const [bad, setBad] = useState("381");
  return (
    <Section id="inputs" kicker="Forms" title="Inputs">
      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen label="Input · Textarea · Select" bodyClassName="flex flex-col gap-5">
          <Input label="First name" value={name} onChange={(e) => setName(e.target.value)} helper="Shown to your pods." />
          <Input label="Nickname" optional placeholder="What friends call you" />
          <Input label="Email" value="chanda@" onChange={() => {}} error="That email looks incomplete." />
          <Input label="City" value="Seattle, WA" onChange={() => {}} success="We're opening here." leading={<MapPin strokeWidth={1.75} />} />
          <Input label="Disabled" value="Locked after verification" disabled onChange={() => {}} />
          <Textarea label="About you" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} counter />
          <Select
            label="Pronouns"
            optional
            defaultValue=""
            placeholder="Choose"
            options={[
              { value: "she", label: "she/her" },
              { value: "he", label: "he/him" },
              { value: "they", label: "they/them" },
            ]}
          />
        </Specimen>
        <Specimen label="PhoneInput · OtpInput" bodyClassName="flex flex-col gap-7">
          <PhoneInput value={phone} onChange={setPhone} helper="Demo sign-in: no text is sent." />
          <div className="flex flex-col gap-2">
            <span className="text-label">Typing</span>
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label">Wrong code</span>
            <OtpInput value={bad} onChange={setBad} state="error" />
            <span className="text-caption text-danger-text">That code didn&apos;t match. 2 tries left.</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-label">Complete</span>
              <OtpInput value="482193" onChange={() => {}} state="success" length={6} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-label">Locked</span>
              <OtpInput value="" onChange={() => {}} state="locked" />
            </div>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── selection ───────────────────────────────────────────────────────────── */

const INTERESTS = [
  { value: "basketball", label: "Basketball", emoji: "🏀" },
  { value: "running", label: "Running & walking", emoji: "🏃" },
  { value: "hiking", label: "Hiking", emoji: "🥾" },
  { value: "guitar", label: "Guitar & jam", emoji: "🎸" },
  { value: "board", label: "Board games", emoji: "🎲" },
  { value: "books", label: "Books", emoji: "📚" },
  { value: "photo", label: "Photography", emoji: "📷" },
  { value: "climb", label: "Climbing & bouldering", emoji: "🧗", badge: "Waitlist" },
];

function SelectionSection() {
  const [picked, setPicked] = useState<string[]>(["basketball", "guitar", "hiking"]);
  const [limit, setLimit] = useState(false);
  const [single, setSingle] = useState<string | null>("weekly");
  const [radio, setRadio] = useState("license");
  const [sun, setSun] = useState(true);
  const [sat, setSat] = useState(false);
  const [slots, setSlots] = useState<string[]>(["afternoon"]);
  const [sw, setSw] = useState(true);
  const [consent, setConsent] = useState(false);
  const [seg, setSeg] = useState("upcoming");
  return (
    <Section id="selection" kicker="Choice" title="Selection">
      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen label="ChipGroup · max 3 (shakes on the 4th)" bodyClassName="flex flex-col gap-5">
          <ChipGroup
            multiple
            label="Interests"
            options={INTERESTS}
            value={picked}
            max={3}
            onChange={(v) => {
              setPicked(v);
              setLimit(false);
            }}
            onLimit={() => setLimit(true)}
          />
          <p className={cn("text-caption", limit ? "text-warning-text" : "text-fg-muted")} aria-live="polite">
            {limit ? "Pick up to 3. Unpick one to swap." : `${picked.length} of 3 picked`}
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-label">Single (radio) · sm</span>
            <ChipGroup
              label="How often"
              size="sm"
              value={single}
              onChange={setSingle}
              options={[
                { value: "weekly", label: "Every week" },
                { value: "biweekly", label: "Every 2 weeks" },
                { value: "monthly", label: "Monthly" },
                { value: "off", label: "Not sure", disabled: true },
              ]}
            />
          </div>
          <PodHue hue="grove" className="flex flex-wrap gap-2">
            <Chip selected emoji="🌍">
              Community pod hue
            </Chip>
            <Chip>Idle</Chip>
            <Chip dim>Dimmed</Chip>
          </PodHue>
          <div className="flex flex-col gap-4 border-t border-border pt-5">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-[15.5px] font-medium">Plan reminders</span>
                <span className="text-body-sm text-fg-muted">The day before and 2 hours before</span>
              </span>
              <Switch checked={sw} onCheckedChange={setSw} aria-label="Plan reminders" />
            </label>
            <label className="flex items-center justify-between gap-4 opacity-100">
              <span className="text-[15.5px] font-medium text-fg-subtle">Disabled</span>
              <Switch disabled aria-label="Disabled" />
            </label>
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              label="Use my answers to place me in community pods"
              description="Unticked by default. You can change this any time."
            />
          </div>
        </Specimen>
        <Specimen label="SelectCard · RadioCard · Segmented" bodyClassName="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <SelectCard
              title="Sunday"
              description="Afternoon"
              icon={<Sun strokeWidth={1.75} />}
              checked={sun}
              onCheckedChange={setSun}
              expanded={
                <ChipGroup
                  multiple
                  size="sm"
                  label="Sunday times"
                  value={slots}
                  onChange={setSlots}
                  options={[
                    { value: "morning", label: "Morning", icon: <Sunrise strokeWidth={1.75} /> },
                    { value: "afternoon", label: "Afternoon", icon: <Sun strokeWidth={1.75} /> },
                    { value: "evening", label: "Evening", icon: <Sunset strokeWidth={1.75} /> },
                  ]}
                />
              }
            />
            <SelectCard title="Saturday" description="Keep this day free" icon={<CalendarDays strokeWidth={1.75} />} checked={sat} onCheckedChange={setSat} />
          </div>
          <RadioCardGroup value={radio} onValueChange={setRadio} aria-label="ID type">
            <RadioCard value="license" checked={radio === "license"} title="Driver's license" description="Any US state" icon={<CircleUserRound strokeWidth={1.75} />} />
            <RadioCard value="passport" checked={radio === "passport"} title="Passport" description="Any country" icon={<Globe strokeWidth={1.75} />} />
            <RadioCard value="other" disabled checked={false} title="State ID" description="Coming at launch" icon={<ShieldCheck strokeWidth={1.75} />} />
          </RadioCardGroup>
          <div className="flex flex-col gap-3">
            <Segmented
              label="Events"
              value={seg}
              onChange={setSeg}
              options={[
                { value: "upcoming", label: "Upcoming", count: 2 },
                { value: "past", label: "Past" },
              ]}
            />
            <Segmented
              label="View"
              size="sm"
              block
              value={seg}
              onChange={setSeg}
              options={[
                { value: "upcoming", label: "List" },
                { value: "past", label: "Week" },
                { value: "map", label: "Map" },
              ]}
            />
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── people ──────────────────────────────────────────────────────────────── */

const CREW: StackPerson[] = [
  { id: "malik", name: "Malik" },
  { id: "ama", name: "Ama" },
  { id: "tobi", name: "Tobi" },
];
const ME: StackPerson = { id: "me", name: "Chanda", you: true };

function PeopleSection() {
  const [inn, setInn] = useState(false);
  const people = inn ? [...CREW, ME] : CREW;
  const locked = people.length >= 4;
  return (
    <Section id="people" kicker="People" title="People">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <Specimen label="Avatar · sizes · seal · status · you · open seat" bodyClassName="flex flex-col gap-6">
          <Row className="items-end gap-4">
            {([96, 64, 44, 36, 28, 24] as const).map((s, i) => (
              <Avatar key={s} size={s} name={["Ama Owusu", "Malik Brooks", "Tobi Adeyemi", "Jordan Lee", "Kezia Banda", "Dre Carter", "Sam Ruiz"][i]} seed={`p${i}`} verified={s >= 44} />
            ))}
          </Row>
          <Row className="gap-4">
            <Avatar size={44} name="Chanda Mwale" seed="me" you />
            <Avatar size={44} name="Malik Brooks" status="online" />
            <Avatar size={44} name="Ama Owusu" status="in" />
            <Avatar size={44} open />
            <AvatarStack size={36} people={[...CREW, { id: "j", name: "Jordan" }, { id: "k", name: "Kezia" }, { id: "d", name: "Dre" }, { id: "s", name: "Sam" }]} of={8} />
            <AvatarStack size={28} people={CREW} openSeats={2} of={6} />
          </Row>
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
            <VerifiedSeal size={14} />
            <VerifiedSeal size={16} />
            <VerifiedSeal size={22} />
            <VerifiedBadge withLabel />
            <span className="text-body-sm text-fg-muted">Ama, 24 · <VerifiedBadge size={14} /></span>
          </div>
        </Specimen>
        <Specimen label="M8 · RSVP: avatar flies in, count rolls, meter fills · M9 lock" bodyClassName="flex flex-col gap-5">
          <LayoutGroup>
            <Card elevation="ai" padding="md" className="rounded-[22px]">
              <div className="flex items-center gap-1.5 text-primary-soft-text">
                <Sparkles size={14} strokeWidth={1.75} />
                <span className="text-overline">First hangout · planned by Pods</span>
                <Badge tone="ai" size="xs" className="ml-1">
                  AI
                </Badge>
              </div>
              <h3 className="mt-2 text-heading-md">Sunday pickup run at Miller</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="neutral" size="md" icon={<Clock strokeWidth={1.75} />}>
                  Sun, Nov 8 · 1:00 PM
                </Badge>
                {locked ? (
                  <Badge key="locked" tone="success" size="md" icon={<Lock strokeWidth={1.75} />} className="pods-stamp">
                    Locked
                  </Badge>
                ) : (
                  <Badge tone="info" size="md">
                    Proposed
                  </Badge>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <AvatarStack people={people} of={8} size={30} layoutPrefix="rsvp" />
                <span className="text-[15px] font-semibold" aria-live="polite">
                  <NumberTicker value={people.length} /> of 8 in
                </span>
                <span className="text-caption text-fg-muted">{locked ? "· locked at 4" : "· 1 more to lock"}</span>
              </div>
              <CommitMeter className="mt-3" total={8} filled={people.length} threshold={4} locked={locked} />
              <div className="mt-5 flex gap-2.5">
                <Button
                  className="flex-1"
                  success={inn}
                  variant={inn ? "secondary" : "primary"}
                  onClick={(e) => {
                    const next = !inn;
                    setInn(next);
                    if (next) fireConfettiCircles({ origin: e.currentTarget });
                  }}
                >
                  {inn ? "You're in" : "I'm in"}
                </Button>
                <Button variant="secondary" className="flex-1">
                  See details
                </Button>
              </div>
            </Card>
          </LayoutGroup>
          <Caption>Tap I&apos;m in: shared-layout insert (bouncy), NumberTicker 3 → 4, segment fill, stamp + logo-circle confetti.</Caption>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── covers ──────────────────────────────────────────────────────────────── */

function CoversSection() {
  return (
    <Section id="covers" kicker="Imagery" title="Pod covers">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Specimen label="ThreeCircleArt · seeded by pod id" note="≤ 36px: discs + 3 dots" bodyClassName="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-4">
            <ThreeCircleArt seed="pod_hoopers" hue="ember" size={120} members={8} />
            <ThreeCircleArt seed="pod_southern_african" hue="grove" size={120} members={7} />
            <ThreeCircleArt seed="pod_pods" hue="signal" size={120} members={6} />
            <ThreeCircleArt seed="pod_strings" hue="ember" size={72} members={5} />
            <ThreeCircleArt seed="pod_adventist" hue="grove" size={72} members={9} />
            <ThreeCircleArt seed="pod_hoopers" hue="ember" size={56} />
            <ThreeCircleArt seed="pod_southern_african" hue="grove" size={44} members={7} />
            <ThreeCircleArt seed="pod_hoopers" hue="ember" size={36} />
            <ThreeCircleArt seed="pod_southern_african" hue="grove" size={28} />
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {Array.from({ length: 8 }, (_, i) => (
              <ThreeCircleArt key={i} seed={`pod_${i * 7 + 3}`} hue={i % 2 ? "grove" : "ember"} size={56} members={4 + (i % 7)} className="w-full! h-auto! aspect-square" />
            ))}
          </div>
        </Specimen>
        <Specimen label="PodHue · interest = Ember, community = Grove" bodyClassName="flex flex-col gap-3">
          {(
            [
              ["ember", "pod_hoopers", "Hoopers", "Interest pod · 8 members", "Needs your RSVP", "warning"],
              ["grove", "pod_southern_african", "Community pod", "Community pod · 7 members · Sun, Nov 15", "2 of 7 in", "success"],
            ] as const
          ).map(([hue, seed, name, sub, status, tone]) => (
            <PodHue key={seed} hue={hue}>
              <Card interactive padding="sm" className="flex items-center gap-3.5 p-3.5!">
                <ThreeCircleArt seed={seed} hue={hue} size={56} members={hue === "ember" ? 8 : 7} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-heading-sm">{name}</div>
                  <div className="truncate text-body-sm text-fg-muted">{sub}</div>
                  <Badge tone={tone} size="sm" className="mt-1.5">
                    {status}
                  </Badge>
                </div>
              </Card>
            </PodHue>
          ))}
          <PodHue hue="ember">
            <div className="flex items-center gap-3 rounded-lg border border-pod-soft-border bg-pod-soft p-3.5">
              <span className="grid size-10 place-items-center rounded-[12px] bg-pod-gloss text-pod-on shadow-[var(--shadow-inset-gloss)]">
                <RefreshCw size={20} strokeWidth={1.75} />
              </span>
              <span className="text-body-sm text-pod-text">Pod surfaces read --pod-* tokens: soft, text, gloss, glow.</span>
            </div>
          </PodHue>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── cards ───────────────────────────────────────────────────────────────── */

function CardsSection() {
  const [k, setK] = useState(0);
  return (
    <Section id="cards" kicker="Elevation" title="Cards & glass">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-overline text-fg-subtle">E1 card</p>
          <p className="mt-2 text-heading-sm">Surface + border + xs</p>
          <p className="mt-1 text-body-sm text-fg-muted">List rows, pod cards, settings.</p>
        </Card>
        <Card elevation="e2">
          <p className="text-overline text-fg-subtle">E2 lifted</p>
          <p className="mt-2 text-heading-sm">Shadow md</p>
          <p className="mt-1 text-body-sm text-fg-muted">Plan card, next-up hero.</p>
        </Card>
        <Card interactive tabIndex={0}>
          <p className="text-overline text-fg-subtle">Interactive</p>
          <p className="mt-2 text-heading-sm">Hover lifts E1 → E2</p>
          <p className="mt-1 text-body-sm text-fg-muted">Press settles to .985.</p>
        </Card>
        <Card key={k} elevation="ai" orbit className="rounded-[22px]" style={{ ["--orbit-radius" as string]: "22px" }}>
          <div className="flex items-center justify-between">
            <p className="text-overline text-primary-soft-text">AI hairline · M7</p>
            <button type="button" onClick={() => setK((x) => x + 1)} className="pressable grid size-8 place-items-center rounded-pill text-fg-muted hover:bg-sunken" aria-label="Replay orbit">
              <Play size={14} strokeWidth={1.75} />
            </button>
          </div>
          <p className="mt-2 text-heading-sm">Orbit once, then settle</p>
          <p className="mt-1 text-body-sm text-fg-muted">Ember → Signal → Grove.</p>
        </Card>
      </div>
      <div className="relative mt-4 isolate overflow-hidden rounded-2xl p-5 md:p-10">
        <AuroraBackground intensity={0.75} />
        <div className="relative grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
          <GlassCard tone="dark" radius="xl">
            <p className="text-overline text-neutral-300">Locked</p>
            <p className="mt-1 text-heading-md text-white">Sunday pickup · 1 PM</p>
            <div className="mt-3 flex items-center gap-2.5">
              <AvatarStack people={[...CREW, ME]} of={8} size={28} />
              <span className="text-[14px] font-semibold text-white">4 of 8 in</span>
            </div>
          </GlassCard>
          <GlassCard radius="xl" className="text-fg">
            <p className="text-overline text-fg-muted">E3 glass (theme)</p>
            <p className="mt-1 text-heading-md">Tab bar, top bar, docks</p>
            <p className="mt-1 text-body-sm text-fg-muted">blur 18 · saturate 1.4 · solid fallback</p>
          </GlassCard>
          <GlassCard radius="pill" padding="none" className="flex h-16 items-center justify-around gap-2 px-3 md:w-64">
            {[
              [<PodsGlyph key="p" filled size={23} />, "Pods", true],
              [<CalendarDays key="e" size={23} strokeWidth={1.75} />, "Events", false],
              [<CircleUserRound key="u" size={23} strokeWidth={1.75} />, "Profile", false],
            ].map(([icon, label, on]) => (
              <span key={label as string} className={cn("flex flex-col items-center gap-0.5 rounded-pill px-4 py-1.5 text-[11px] font-semibold", on ? "bg-primary-soft text-primary-soft-text" : "text-fg-muted")}>
                {icon}
                {label}
              </span>
            ))}
          </GlassCard>
        </div>
      </div>
    </Section>
  );
}

/* ── overlays ────────────────────────────────────────────────────────────── */

function OverlaysSection() {
  const [sheet, setSheet] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [alert, setAlert] = useState(false);
  const [reason, setReason] = useState("busy");
  return (
    <Section id="overlays" kicker="Layers" title="Overlays">
      <Specimen label="ResponsiveSheet (vaul < 768 · Radix dialog ≥ 768) · AlertDialog · menus · toasts" bodyClassName="flex flex-col gap-5">
        <Row>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Can&apos;t make it
          </Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            Drawer (desktop)
          </Button>
          <Button variant="danger-quiet" leadingIcon={<LogOut strokeWidth={1.75} />} onClick={() => setAlert(true)}>
            Leave pod
          </Button>
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="secondary" trailingIcon={<MoreHorizontal strokeWidth={1.75} />}>
                Menu
              </Button>
            </DropdownTrigger>
            <DropdownContent align="start">
              <DropdownLabel>Hoopers</DropdownLabel>
              <DropdownItem icon={<Pin strokeWidth={1.75} />}>Pin plan</DropdownItem>
              <DropdownItem icon={<BellOff strokeWidth={1.75} />} shortcut="⌘M">
                Mute for 8 hours
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem tone="danger" icon={<Flag strokeWidth={1.75} />}>
                Report pod
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" leadingIcon={<Sparkles strokeWidth={1.75} />}>
                Why this plan
              </Button>
            </PopoverTrigger>
            <PopoverContent arrow>
              <p className="text-heading-sm">Why this plan</p>
              <p className="mt-1 text-fg-muted">7 of 8 of you are free Sunday afternoons, and Miller is indoors, so rain won&apos;t cancel it.</p>
            </PopoverContent>
          </Popover>
          <Tooltip content="Directions" shortcut="D">
            <IconButton label="Directions" variant="surface" icon={<Car strokeWidth={1.75} />} />
          </Tooltip>
        </Row>
        <Row>
          <Button size="sm" variant="secondary" onClick={() => notify("You're in for Sunday", { undo: () => notify("Undone") })}>
            Toast + Undo
          </Button>
          <Button size="sm" variant="secondary" onClick={() => notify.success("Plan locked: 4 of 8 in")}>
            Success
          </Button>
          <Button size="sm" variant="secondary" onClick={() => notify.error("Couldn't save.", { retry: () => notify("Retrying") })}>
            Error + Retry
          </Button>
          <Button size="sm" variant="secondary" onClick={() => notify.info("Plan pinned in Pod details")}>
            Info
          </Button>
        </Row>
        <ResponsiveSheet
          open={sheet}
          onOpenChange={setSheet}
          title="Can't make it?"
          description="Only you see this. It helps Pods plan the next one."
          footer={
            <>
              <SheetClose>
                <Button size="xl" block>
                  Send privately
                </Button>
              </SheetClose>
              <SheetClose>
                <Button size="lg" variant="ghost" block>
                  Suggest another time
                </Button>
              </SheetClose>
            </>
          }
        >
          <RadioCardGroup value={reason} onValueChange={setReason} aria-label="Reason">
            <RadioCard value="busy" checked={reason === "busy"} title="Busy that day" icon={<CalendarDays strokeWidth={1.75} />} />
            <RadioCard value="time" checked={reason === "time"} title="Wrong time" icon={<Clock strokeWidth={1.75} />} />
            <RadioCard value="feel" checked={reason === "feel"} title="Not feeling it" icon={<Moon strokeWidth={1.75} />} />
          </RadioCardGroup>
          <p className="mt-4 flex items-center gap-2 text-caption text-fg-muted">
            <Lock size={14} strokeWidth={1.75} /> Your pod only sees the count, never your reason.
          </p>
        </ResponsiveSheet>
        <ResponsiveSheet open={drawer} onOpenChange={setDrawer} variant="drawer" title="Notifications" description="Pods batches messages so your phone stays calm.">
          <ListGroup>
            <ListRow icon={<CalendarDays strokeWidth={1.75} />} iconTone="primary" title="New plans" trailing={<Switch defaultChecked aria-label="New plans" />} />
            <ListRow icon={<Bell strokeWidth={1.75} />} title="Reminders" description="Day before · 2 hours before" trailing={<Switch defaultChecked aria-label="Reminders" />} />
            <ListRow icon={<Users strokeWidth={1.75} />} title="Chat" description="Batched every 30 minutes" trailing={<Switch aria-label="Chat" />} />
          </ListGroup>
        </ResponsiveSheet>
        <AlertDialog
          open={alert}
          onOpenChange={setAlert}
          icon={<LogOut strokeWidth={1.75} />}
          title="Leave Hoopers?"
          description="You'll stop getting plans and messages from this pod. Nobody is told why."
          destructive
          confirmLabel="Leave pod"
          onConfirm={() => {
            notify("You left Hoopers");
          }}
        />
      </Specimen>
    </Section>
  );
}

/* ── progress ────────────────────────────────────────────────────────────── */

function ProgressSection() {
  const [step, setStep] = useState(3);
  const [n, setN] = useState(4);
  return (
    <Section id="progress" kicker="Status" title="Progress & time">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Specimen label="ProgressRing · NumberTicker" bodyClassName="flex items-center gap-6">
          <ProgressRing value={n} max={6} label={`${n}/6`} sublabel="joined" size={104} />
          <ProgressRing value={5} max={6} tone="grove" size={72} label="5" />
          <div className="flex flex-col gap-2">
            <span className="font-display text-[44px] leading-none font-semibold">
              <NumberTicker value={n * 7} />
            </span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => setN((x) => Math.max(0, x - 1))}>
                −
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setN((x) => Math.min(6, x + 1))}>
                +
              </Button>
            </div>
          </div>
        </Specimen>
        <Specimen label="Stepper · ProgressBar · CommitMeter" bodyClassName="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Stepper total={6} current={step} />
            <Button size="sm" variant="ghost" onClick={() => setStep((s) => (s % 6) + 1)}>
              Next
            </Button>
          </div>
          <ProgressBar value={62} label="Uploading photo" />
          <ProgressBar value={100} tone="grove" label="Done" />
          <CommitMeter total={8} filled={3} threshold={4} notchLabel className="mb-4" />
        </Specimen>
        <Specimen label="Countdown (demo clock) · Stat" bodyClassName="flex flex-col gap-4">
          <Row>
            <Countdown pill start="2026-11-08T13:00:00-08:00" end="2026-11-08T15:00:00-08:00" />
            <Countdown pill start="2026-11-04T12:00:00-08:00" end="2026-11-04T14:00:00-08:00" />
            <Countdown pill start="2026-11-04T08:30:00-08:00" end="2026-11-04T10:30:00-08:00" />
            <Countdown start="2026-11-05T13:00:00-08:00" />
          </Row>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <Stat label="Hours together" value={6} suffix="h" caption="Sample data" icon={<Clock strokeWidth={1.75} />} />
            <Stat label="Hangouts" value={3} caption="Sample data" icon={<RefreshCw strokeWidth={1.75} />} />
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── feedback ────────────────────────────────────────────────────────────── */

function FeedbackSection() {
  return (
    <Section id="feedback" kicker="States" title="Loading & empty">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Specimen label="Skeleton (M19) · matches final layout" bodyClassName="flex flex-col gap-4">
          <SkeletonPodCard />
          <SkeletonBubbles />
          <div className="flex items-center gap-3">
            <Skeleton circle className="size-11" />
            <SkeletonText lines={2} className="flex-1" />
          </div>
          <div className="flex items-center gap-2 text-body-sm text-fg-muted">
            <Spinner /> Spinner is for buttons only
          </div>
        </Specimen>
        <Specimen label="EmptyState · circle people" bodyClassName="grid gap-2 sm:grid-cols-2">
          <EmptyState compact art="seat" title="A seat for you" description="Pick an interest and we'll find your pod." action={<Button size="md">Pick interests</Button>} />
          <EmptyState compact art="waitlist" title="Almost a pod" description="We'll place you the moment 2 more people join." action={<Button size="md" variant="secondary">Notify me</Button>} />
          <EmptyState compact art="ring" title="Your pod" description="8 people, one plan at a time." />
          <EmptyState compact art={<CirclePeople variant="repeat" step={3} size={112} />} title="Round two. Locked." description="After each hangout, Pods asks the group if they want to run it back." />
        </Specimen>
      </div>
    </Section>
  );
}

/* ── lists ───────────────────────────────────────────────────────────────── */

function ListsSection() {
  const [tab, setTab] = useState("upcoming");
  const [tab2, setTab2] = useState("chat");
  return (
    <Section id="lists" kicker="Structure" title="Lists & nav">
      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen label="SectionHeader · ListGroup · ListRow" bodyClassName="flex flex-col gap-3">
          <SectionHeader title="Interest pods" count={2} action={<a href="#lists">See all</a>} />
          <ListGroup>
            <ListRow interactive chevron icon={<ShieldCheck strokeWidth={1.75} />} iconTone="primary" title="Safety center" description="Report, block, what we check" tabIndex={0} />
            <ListRow interactive chevron icon={<Lock strokeWidth={1.75} />} title="Privacy" value="Discreet" tabIndex={0} />
            <ListRow icon={<Bell strokeWidth={1.75} />} title="Notifications" trailing={<Switch defaultChecked aria-label="Notifications" />} />
            <ListRow interactive tone="danger" icon={<Trash2 strokeWidth={1.75} />} title="Delete my data" tabIndex={0} />
          </ListGroup>
          <div className="mt-2">
            <MapTile name="Miller Community Center" address="330 19th Ave E, Seattle, WA" />
          </div>
        </Specimen>
        <Specimen label="Tabs · underline (desktop) / segmented (mobile) · Kbd" bodyClassName="flex flex-col gap-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList
              label="Events"
              value={tab}
              tabs={[
                { value: "upcoming", label: "Upcoming", count: 2 },
                { value: "past", label: "Past" },
                { value: "invites", label: "Invites" },
              ]}
            />
            <TabsContent value="upcoming" className="pt-4 text-body-sm text-fg-muted">
              Sunday pickup run · Sun, Nov 8 · 1:00 PM
            </TabsContent>
            <TabsContent value="past" className="pt-4 text-body-sm text-fg-muted">
              Nothing yet.
            </TabsContent>
            <TabsContent value="invites" className="pt-4 text-body-sm text-fg-muted">
              No invites.
            </TabsContent>
          </Tabs>
          <Tabs value={tab2} onValueChange={setTab2}>
            <TabsList
              variant="segmented"
              label="Pod"
              value={tab2}
              className="w-full"
              tabs={[
                { value: "chat", label: "Chat" },
                { value: "plan", label: "Plan" },
                { value: "people", label: "People" },
              ]}
            />
          </Tabs>
          <div className="flex flex-wrap items-center gap-2 text-body-sm text-fg-muted">
            Switch pods <Kbd>⌘</Kbd>
            <Kbd>K</Kbd> · composer <Kbd>/</Kbd> · close <Kbd>Esc</Kbd>
            <span className="md:hidden">(keyboard hints show on desktop)</span>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

/* ── icons ───────────────────────────────────────────────────────────────── */

function IconsSection() {
  const icons: [ReactNode, string][] = [
    [<PodsGlyph key="a" />, "Pods"],
    [<CalendarDays key="b" strokeWidth={1.75} />, "Events"],
    [<CircleUserRound key="c" strokeWidth={1.75} />, "Profile"],
    [<Sparkles key="d" strokeWidth={1.75} />, "AI plan"],
    [<MapPin key="e" strokeWidth={1.75} />, "Where"],
    [<Clock key="f" strokeWidth={1.75} />, "When"],
    [<BadgeDollarSign key="g" strokeWidth={1.75} />, "Cost"],
    [<Backpack key="h" strokeWidth={1.75} />, "Bring"],
    [<CloudRain key="i" strokeWidth={1.75} />, "Rain plan"],
    [<MessageCircleQuestion key="j" strokeWidth={1.75} />, "Icebreaker"],
    [<CircleCheck key="k" strokeWidth={1.75} />, "I went"],
    [<RefreshCw key="l" strokeWidth={1.75} />, "Run it back"],
    [<VerifiedSeal key="m" size={24} />, "Verified"],
    [<ShieldCheck key="n" strokeWidth={1.75} />, "Safety"],
    [<Flag key="o" strokeWidth={1.75} />, "Report"],
    [<Ban key="p" strokeWidth={1.75} />, "Block"],
    [<LogOut key="q" strokeWidth={1.75} />, "Leave"],
    [<BellOff key="r" strokeWidth={1.75} />, "Mute"],
    [<WidenGlyph key="s" />, "Widened"],
    [<RepeatGlyph key="t" />, "Repeat"],
    [<Download key="u" strokeWidth={1.75} />, "Export"],
  ];
  return (
    <Section id="icons" kicker="Iconography" title="Icons">
      <Specimen label="lucide-react · stroke 1.75 · 24 in bars, 20 in rows · custom glyphs" bodyClassName="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
        {icons.map(([icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-md px-2 py-4 text-fg transition-colors hover:bg-sunken">
            {icon}
            <span className="text-caption text-fg-muted">{label}</span>
          </div>
        ))}
      </Specimen>
    </Section>
  );
}
