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
              `<a class="nav-link${item.key === current ? " active" : ""}" href="${item.href}">${item.label}</a>`,
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
