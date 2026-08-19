// Fixed top nav shared by every page in this app (Home, Support). Hardcoded
// list, v1 mechanism per .scratch/ew_toolkit/hub-map.md Notes — same
// principle as the Tool registry in main.ts. Order matters: Home first,
// then Tools in registration order, Support always last. Add future Tools
// between the last Tool and Support.
import { icon } from "../shared/icons";

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

const base = import.meta.env.BASE_URL;

export const navItems: NavItem[] = [
  { key: "home", label: "Home", href: base },
  { key: "ewp_validator", label: "EWP Validator", href: `${base}ewp_validator/` },
  { key: "support", label: "Support", href: `${base}support/` },
];

// Icon per nav item, keyed the same as navItems. Glyphs live in
// shared/icons.ts (Hub-wide, imported not copied — message-quality
// checklist item 8). Known keys get a hand-picked icon; any future Tool
// added to navItems without an entry here falls back to the toolbox
// default below rather than rendering blank.
const navIcons: Record<string, string> = {
  home: icon("home"),
  // Notepad with a folded corner + short ruled lines standing in for YAML
  // key/value text.
  ewp_validator: icon("file"),
  // "Buy me a coffee" cup — the donation convention, matching what the
  // Support page actually links to.
  support: icon("support"),
};
export const toolboxIcon = icon("toolbox");

export function iconFor(key: string): string {
  return navIcons[key] ?? toolboxIcon;
}

export type Theme = "dark" | "light";
const THEME_KEY = "ew-toolkit-theme";

export function getStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.querySelector<HTMLButtonElement>("#theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☾ Dark" : "☀ Light";
}

// Off-site link to the toolkit's changelog (GitHub Releases — see
// .scratch/changelog-automation/issues/04-site-side-link.md). Lives beside the
// theme toggle rather than as a full nav item: visible on every page without
// scrolling, but reads as secondary utility chrome, not a peer of Home/Tools/Support.
export const changelogUrl = "https://github.com/z-eall/ew_toolkit/releases";

export function navHtml(current: string): string {
  return `
    <nav class="site-nav">
      <div class="site-nav-links">
        ${navItems
          .map(
            (item) =>
              `<a class="nav-link${item.key === current ? " active" : ""}" href="${item.href}"><span class="nav-icon" aria-hidden="true">${iconFor(item.key)}</span>${item.label}</a>`,
          )
          .join("")}
      </div>
      <div class="nav-right">
        <a class="changelog-link" href="${changelogUrl}" target="_blank" rel="noopener noreferrer">Changelog</a>
        <button id="theme-toggle" class="theme-toggle" aria-label="Current theme, click to switch"></button>
      </div>
    </nav>
  `;
}

export function mountThemeToggle() {
  applyTheme(getStoredTheme());
  document.querySelector<HTMLButtonElement>("#theme-toggle")!.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") as Theme;
    applyTheme(current === "dark" ? "light" : "dark");
  });
}
