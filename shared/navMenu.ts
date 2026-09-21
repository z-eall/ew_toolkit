// The phone nav's open/close behavior (hamburger drawer). One shared copy:
// the markup comes from renderNavBar() and the styles from theme.css, so all
// Tools get the same drawer (mobile-support map, tickets 03 and 04).
//
// Wired through one document-level listener, added once. Every Tool already
// calls mountThemeToggle(), which calls mountNavMenu(), so no Tool needs its
// own call. Because the listener sits on the document, it keeps working when
// the wiki swaps the nav bar during a page transition.

/** Screens this narrow (or narrower) get the drawer; wider screens keep the full bar. */
export const PHONE_NAV_MAX_WIDTH = 767;

export type NavMenuEvent = "toggle" | "link" | "outside" | "escape" | "resize-wide";

/** The drawer's next state. Only the toggle button flips it; any other event closes it. */
export function nextNavMenuOpen(open: boolean, event: NavMenuEvent): boolean {
  return event === "toggle" ? !open : false;
}

function setOpen(nav: Element, open: boolean): void {
  nav.classList.toggle("menu-open", open);
  const button = nav.querySelector<HTMLButtonElement>(".nav-menu-toggle");
  button?.setAttribute("aria-expanded", String(open));
  button?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

let mounted = false;

export function mountNavMenu(): void {
  if (mounted || typeof document === "undefined") return;
  mounted = true;

  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    const nav = document.querySelector(".site-nav");
    if (!target || !nav) return;
    const open = nav.classList.contains("menu-open");
    if (target.closest(".nav-menu-toggle")) setOpen(nav, nextNavMenuOpen(open, "toggle"));
    else if (target.closest(".site-nav-links a")) setOpen(nav, nextNavMenuOpen(open, "link"));
    else if (open && !target.closest(".site-nav")) setOpen(nav, nextNavMenuOpen(open, "outside"));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const nav = document.querySelector(".site-nav");
    if (nav?.classList.contains("menu-open")) setOpen(nav, nextNavMenuOpen(true, "escape"));
  });

  window.matchMedia?.(`(min-width: ${PHONE_NAV_MAX_WIDTH + 1}px)`).addEventListener("change", (e) => {
    const nav = document.querySelector(".site-nav");
    if (e.matches && nav) setOpen(nav, nextNavMenuOpen(true, "resize-wide"));
  });
}
