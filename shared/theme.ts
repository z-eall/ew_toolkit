// Single source of truth for the Hub's dark/light toggle behavior — the
// `ew-toolkit-theme` localStorage key and its apply/toggle logic, previously
// reimplemented independently in ew_toolkit/src/nav.ts,
// ewp_validator/src/main.ts, and ew_wiki/src/components/Header.astro (which
// also had to reconcile Starlight's own separate `starlight-theme` key).
// See docs/agents/hub-tool-nav.md.
//
// A consumer with its own extra theme-dependent work (the validator's Monaco
// editor theme, the wiki's Starlight-key bridge) passes `onApply` rather
// than reimplementing applyTheme from scratch.
import { icon } from "./icons";
import { mountNavMenu } from "./navMenu";

export type Theme = "dark" | "light";
const THEME_KEY = "ew-toolkit-theme";

export function getStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme, themeButtonId = "theme-toggle", onApply?: (theme: Theme) => void): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.querySelector<HTMLButtonElement>(`#${themeButtonId}`);
  if (btn) {
    const label = theme === "dark" ? "Dark" : "Light";
    btn.innerHTML = `<span class="theme-icon" aria-hidden="true">${icon(theme === "dark" ? "moon" : "sun")}</span><span class="theme-label">${label}</span>`;
    btn.setAttribute("aria-label", `Theme: ${label}. Click to switch.`);
  }
  onApply?.(theme);
}

export function mountThemeToggle(themeButtonId = "theme-toggle", onApply?: (theme: Theme) => void): void {
  mountNavMenu(); // the phone drawer; every Tool already calls this function once per page
  applyTheme(getStoredTheme(), themeButtonId, onApply);
  document.querySelector<HTMLButtonElement>(`#${themeButtonId}`)?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") as Theme;
    applyTheme(current === "dark" ? "light" : "dark", themeButtonId, onApply);
  });
}
