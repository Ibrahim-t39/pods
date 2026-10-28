// Keyboard helpers. v3 has no tab sections to jump between; Escape closes sheets (handled by Sheet) and
// Ctrl/Cmd + . is the Director (director-panel.tsx).
export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.getAttribute("role") === "textbox";
}
