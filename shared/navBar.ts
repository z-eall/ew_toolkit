// Single source of truth for the Hub's site-nav bar — the strip every Tool
// renders so arriving from the hub feels like switching tabs, not leaving
// the site (AGENTS.md's UI/UX-consistency mechanism 4). Previously this bar
// was hand-copied 3 times (ew_toolkit/src/nav.ts, ewp_validator/src/main.ts,
// ew_wiki/src/components/Header.astro) and drifted each time: main.ts never
// got a `ew_wiki` entry when that Tool registered, and each copy's CSS
// diverged in small ways (sticky-vs-not, a stray hover color). See
// docs/agents/hub-tool-nav.md.
//
// Fixing the *renderer* alone isn't enough — the Tool *registry* itself
// (which keys exist, in what order, with which icon) also has to live in
// exactly one place, or a 4th Tool repeats the same "3 copies, 1 forgotten"
// bug at the data level instead of the markup level. NAV_TOOLS is that one
// place; every consumer calls buildNavItems() against it rather than typing
// its own list.
import { icon, type IconKey } from "./icons";
import toolList from "./tools.json";

export interface NavToolMeta {
  key: string;
  label: string;
  icon: IconKey;
}

// Order matters: Home first, Tools in the order of shared/tools.json (the one
// list every script and page reads), Support always last. To add a Tool, add
// one entry to shared/tools.json and its folder; nothing else lists Tools.
export const NAV_TOOLS: NavToolMeta[] = [
  { key: "home", label: "Home", icon: "home" },
  ...(toolList as { key: string; label: string; icon: IconKey }[]).map(({ key, label, icon }) => ({ key, label, icon })),
  { key: "support", label: "Support", icon: "support" },
];

export const CHANGELOG_URL = "https://github.com/z-eall/ew_toolkit/releases";

export interface NavLinkItem {
  key: string;
  label: string;
  href: string;
  iconSvg: string;
  active: boolean;
}

// Each consumer resolves its own hrefs (landing uses Vite's BASE_URL,
// ewp_validator uses relative paths, ew_wiki uses Astro's base) — that
// routing logic stays local, but the registry (which keys/labels/icons
// exist) and the actual markup/CSS never do.
export function buildNavItems(current: string, hrefFor: (key: string) => string): NavLinkItem[] {
  return NAV_TOOLS.map((tool) => ({
    key: tool.key,
    label: tool.label,
    href: hrefFor(tool.key),
    iconSvg: icon(tool.icon),
    active: tool.key === current,
  }));
}

export function renderNavBar(items: NavLinkItem[], themeButtonId = "theme-toggle"): string {
  return `
    <nav class="site-nav">
      <div class="site-nav-links">
        ${items
          .map(
            (item) =>
              `<a class="nav-link${item.active ? " active" : ""}" href="${item.href}"><span class="nav-icon" aria-hidden="true">${item.iconSvg}</span>${item.label}</a>`,
          )
          .join("")}
      </div>
      <div class="nav-right">
        <a class="changelog-link" href="${CHANGELOG_URL}" target="_blank" rel="noopener noreferrer">Changelog</a>
        <button id="${themeButtonId}" class="theme-toggle" aria-label="Current theme, click to switch"></button>
      </div>
    </nav>
  `;
}
