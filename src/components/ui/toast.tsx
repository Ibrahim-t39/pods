// [U1] Toast helpers over sonner (the <Toaster> lives in app/providers.tsx, U0). Dark pill, icon + text + action.
//   notify("You're in for Sunday", { undo: () => repo.rsvp(id, null) })
//   notify.error("Couldn't save.", { retry })   notify.success("Plan locked")
// role=status is set by sonner.
"use client";

import { toast } from "sonner";
import { createElement } from "react";
import { Icon } from "@/components/icons";

interface Opts {
  description?: string;
  undo?: () => void;
  retry?: () => void;
  action?: { label: string; onClick: () => void };
  duration?: number;
  id?: string;
}

function build(o: Opts = {}) {
  const action = o.undo ? { label: "Undo", onClick: o.undo } : o.retry ? { label: "Retry", onClick: o.retry } : o.action;
  return { description: o.description, action, duration: o.duration ?? (o.undo ? 8000 : 4000), id: o.id };
}

const icon = (name: "check" | "flag" | "why", cls: string) => createElement(Icon, { name, size: 18, className: cls });

export function notify(message: string, o?: Opts) {
  return toast(message, build(o));
}
notify.success = (message: string, o?: Opts) => toast(message, { ...build(o), icon: icon("check", "text-lamp") });
notify.error = (message: string, o?: Opts) => toast(message, { ...build(o), icon: icon("flag", "text-lamp"), duration: o?.duration ?? 6000 });
notify.info = (message: string, o?: Opts) => toast(message, { ...build(o), icon: icon("why", "text-lamp") });
notify.dismiss = (id?: string | number) => toast.dismiss(id);

export { toast };
