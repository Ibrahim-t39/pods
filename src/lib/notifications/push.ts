// [U8] Local push (J3: tier 3, kept tiny). Shows a notification through the service worker when permission is granted.
// Text goes through podLabel/maskText first (discreet by default). Nothing leaves the device.
"use client";

export type PushState = "unsupported" | "default" | "granted" | "denied";

export function pushState(): PushState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushState;
}

export async function requestPush(): Promise<PushState> {
  if (pushState() === "unsupported") return "unsupported";
  try {
    return (await Notification.requestPermission()) as PushState;
  } catch {
    return pushState();
  }
}

export async function showLocal(title: string, body: string, href = "/app/inbox"): Promise<boolean> {
  if (pushState() !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, data: { href }, icon: "/icons/icon-192.png", tag: href });
    else new Notification(title, { body, icon: "/icons/icon-192.png" });
    return true;
  } catch {
    return false;
  }
}
