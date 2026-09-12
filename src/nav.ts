// Landing page's own thin wrapper around the shared nav-bar mechanism
// (shared/navBar.ts, shared/theme.ts) - see
// .scratch/ew_toolkit/issues/21-unify-hub-tool-nav-bar.md. The Tool
// registry itself (which keys/labels/icons exist) now lives in
// shared/navBar.ts's NAV_TOOLS, not here - this file only supplies the
// landing page's own href-resolution (Vite's BASE_URL) and re-exports a
// couple of icon helpers main.ts/support.ts use for non-nav purposes
// (the tool-row buttons on the landing page itself).
import { icon, type IconKey } from "../shared/icons";
import { buildNavItems, renderNavBar, NAV_TOOLS } from "../shared/navBar";
import { mountThemeToggle as sharedMountThemeToggle } from "../shared/theme";

const base = import.meta.env.BASE_URL;

function hrefFor(key: string): string {
  if (key === "home") return base;
  if (key === "support") return `${base}support/`;
  return `${base}${key}/`;
}

const iconByKey: Record<string, IconKey> = Object.fromEntries(NAV_TOOLS.map((t) => [t.key, t.icon]));
export const toolboxIcon = icon("toolbox");

export function iconFor(key: string): string {
  const k = iconByKey[key];
  return k ? icon(k) : toolboxIcon;
}

export function navHtml(current: string): string {
  return renderNavBar(buildNavItems(current, hrefFor));
}

export function mountThemeToggle(): void {
  sharedMountThemeToggle();
}
