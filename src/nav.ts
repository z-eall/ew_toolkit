// Fixed top nav shared by every page in this app (Home, Support). Hardcoded
// list, v1 mechanism per .scratch/ew_toolkit/hub-map.md Notes — same
// principle as the Tool registry in main.ts. Order matters: Home first,
// then Tools in registration order, Support always last. Add future Tools
// between the last Tool and Support.
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

// Icon per nav item, keyed the same as navItems. Outline-only strokes (no
// fill, currentColor) so icons stay minimal and inherit the link's own
// color/state instead of clashing with the palette. Known keys get a
// hand-picked icon; any future Tool added to navItems without an entry here
// falls back to the toolbox default below rather than rendering blank.
const svgIcon = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const navIcons: Record<string, string> = {
  home: svgIcon(
    '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9"/><path d="M9.5 20v-6h5v6"/>',
  ),
  // Notepad with a folded corner + short ruled lines standing in for YAML
  // key/value text.
  ewp_validator: svgIcon(
    '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><path d="M8 11h3"/><path d="M8 14h6"/><path d="M8 17h4"/>',
  ),
  support: svgIcon(
    '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3h4l3.61 1.63A1 1 0 0 1 11 5.5v3.42a1 1 0 0 1-1 1H6"/><path d="M3 4h2v10H3z"/>',
  ),
};
const defaultNavIcon = svgIcon(
  '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 13h20"/><path d="M10 13v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1"/>',
);

export function iconFor(key: string): string {
  return navIcons[key] ?? defaultNavIcon;
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
      <button id="theme-toggle" class="theme-toggle" aria-label="Current theme, click to switch"></button>
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
