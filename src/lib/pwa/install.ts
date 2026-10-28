// [U11] Install logic (ARCHITECTURE §13): capture beforeinstallprompt (Chromium) and detect iOS Safari, where
// there is no such event and the only path is Share → Add to Home Screen. U5's InstallPrompt and U8's Profile row
// render from useInstall(); this file has no UI.
"use client";

import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const HINT_KEY = "pods:ios-install-hint";
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let started = false;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

/** Start listening for install events. Idempotent; called by DemoRuntime on mount and lazily by useInstall. */
export function startInstallCapture() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

/** iPhone/iPad Safari (not Chrome/Firefox for iOS, which can't add to home screen the same way). */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const ios = /iPad|iPhone|iPod/.test(ua) || iPadOs;
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function hintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissIosHint() {
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* private mode: the hint just shows again */
  }
  emit();
}

export interface InstallState {
  /** Chromium: a native install prompt is ready. */
  canPrompt: boolean;
  /** iOS Safari, not installed: show the one-time "Tap Share → Add to Home Screen" hint. */
  showIosHint: boolean;
  /** Already running as an installed app. */
  standalone: boolean;
  /** canPrompt or iOS Safari not yet installed (for the Profile "Install Pods" row). */
  installable: boolean;
}

const SERVER: InstallState = { canPrompt: false, showIosHint: false, standalone: false, installable: false };
let cached: InstallState = SERVER;
let cachedVersion = -1;

function snapshot(): InstallState {
  if (cachedVersion === version) return cached;
  const standalone = installed || isStandalone();
  const ios = isIosSafari() && !standalone;
  const canPrompt = !!deferred && !standalone;
  cached = { canPrompt, standalone, showIosHint: ios && !hintSeen(), installable: canPrompt || ios };
  cachedVersion = version;
  return cached;
}

export function useInstall(): InstallState & { promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable"> } {
  const state = useSyncExternalStore(
    (cb) => {
      startInstallCapture();
      listeners.add(cb);
      cb();
      return () => listeners.delete(cb);
    },
    snapshot,
    () => SERVER,
  );
  return { ...state, promptInstall };
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const ev = deferred;
  if (!ev) return "unavailable";
  deferred = null;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === "accepted") installed = true;
  emit();
  return outcome;
}
