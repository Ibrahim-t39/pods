// Paths concept: display helpers in the pod's timezone. Pure; never reads Date.now().
const TZ = "America/Chicago";
const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o });
const wkS = f({ weekday: "short" });
const wkL = f({ weekday: "long" });
const md = f({ month: "long", day: "numeric" });
const hm = f({ hour: "numeric", minute: "2-digit" });
const h = f({ hour: "numeric" });

function tidy(t: string) {
  return t.replace(":00", "").replace(" ", " ");
}
export function whenShort(iso: string): string {
  const d = new Date(iso);
  return `${wkS.format(d)} ${tidy(h.format(d))}`;
}
export function dayLong(iso: string): string {
  return wkL.format(new Date(iso));
}
export function dateLong(iso: string): string {
  return md.format(new Date(iso));
}
export function span(a: string, b: string): string {
  const s = hm.format(new Date(a)).replace(":00", "");
  const e = hm.format(new Date(b)).replace(":00", "");
  const [sv, sp] = s.split(" ");
  const [ev, ep] = e.split(" ");
  return sp === ep ? `${sv}–${ev} ${ep}` : `${s}–${e}`;
}
