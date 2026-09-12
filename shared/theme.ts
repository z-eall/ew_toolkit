// Single source of truth for the Hub's dark/light toggle behavior — the
// `ew-toolkit-theme` localStorage key and its apply/toggle logic, previously
// reimplemented independently in ew_toolkit/src/nav.ts,
// ewp_validator/src/main.ts, and ew_wiki/src/components/Header.astro (which
// also had to reconcile Starlight's own separate `starlight-theme` key).
// See .scratch/ew_toolkit/issues/21-unify-hub-tool-nav-bar.md.
//
// A consumer with its own extra theme-dependent work (the validator's Monaco
// editor theme, the wiki's Starlight-key bridge) passes `onApply` rather
// than reimplementing applyTheme from scratch.
export type Theme = "dark" | "light";
const THEME_KEY = "ew-toolkit-theme";

export function getStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme, themeButtonId = "theme-toggle", onApply?: (theme: Theme) => void): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.querySelector<HTMLButtonElement>(`#${themeButtonId}`);
  if (btn) btn.textContent = theme === "dark" ? "☾ Dark" : "☀ Light";
  onApply?.(theme);
}

export function mountThemeToggle(themeButtonId = "theme-toggle", onApply?: (theme: Theme) => void): void {
  applyTheme(getStoredTheme(), themeButtonId, onApply);
  document.querySelector<HTMLButtonElement>(`#${themeButtonId}`)?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") as Theme;
    applyTheme(current === "dark" ? "light" : "dark", themeButtonId, onApply);
  });
}
