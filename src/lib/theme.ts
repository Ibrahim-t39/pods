// Theme: Pods has one theme (warm paper). Night is a state of the stage (data-light="night"), not a theme. DESIGN.md §2.
// THEME_SCRIPT runs before first paint (root layout) so there is never a white flash.
export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "pods:theme";

export const THEME_SCRIPT = `(function(){var r=document.documentElement;r.setAttribute("data-theme","light");if(!r.getAttribute("data-light"))r.setAttribute("data-light","paper")})();`;

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

export function setThemePref(p: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, p);
  } catch {
    /* ignore */
  }
  const r = document.documentElement;
  if (p === "system") r.removeAttribute("data-theme");
  else r.setAttribute("data-theme", p);
}
