# Collapsible, scroll-following TOC sidebar

Type: task
Status: resolved
Blocked by: none

## Question

The right-hand "On this page" TOC is good, but wants a collapse/expand toggle (like a bookmark panel) — collapsed by default, expanding to show animated minimal bullet points that track scroll position. Split out from ticket 04 (maintainer asked for it alongside content fixes; not a content edit, so kept separate).

This is a real UI component build, not a config change: overriding Starlight's default `TableOfContents` component, plus client-side JS for the collapse state and scroll-spy animation. Needs its own design pass (where does the toggle live, what does "collapsed" look like — icon-only rail? fully hidden?, does collapse state persist across page loads via localStorage) before implementation.

**Scope addition (2026-09-07):** maintainer also asked for a "back to top" button. Folding it in here rather than building it standalone — Starlight has no built-in one, and it's the same right-side page-navigation area this ticket is already redesigning. Include in the design pass: does jumping to top live on the TOC panel itself (e.g. clicking its title) or as its own small control within the same panel.

**Sequencing note (2026-09-07):** deploy (ticket 08) now also blocks on this ticket, not just 07 — the maintainer wants this built and reviewed before v1 ships, not left for a post-launch pass.

**Scope addition (2026-09-07):** the top-right header controls (theme mode switch, GitHub link) are Starlight's own default styling and don't visually match the toolkit hub's own header treatment (`ew_toolkit/src/style.css`/`nav.ts`) — maintainer wants them adjusted for alignment. Not its own ticket since it's the same header area this ticket already touches (the TOC toggle likely lands in this same top bar); include in the design pass.

**Scope revision (2026-09-11), supersedes the line above:** restyling isn't the right call — since `ew_wiki` runs as a sub-tool under the `ew_toolkit` hub, the hub's own top banner already provides a dark/light toggle, so Starlight's own theme-select in `ew_wiki`'s header would just be a duplicate control. No GitHub login is required for this wiki either, so that link goes too. Both are removed from the header entirely (not restyled), leaving just the site title and search.

## Answer

Design pass done via `ew_toolkit:prototype` (3 structurally different variants — icon rail, click-the-heading, compact pill+FAB — see `.scratch/ew-wiki-real-build/prototypes/toc-sidebar-3variants-prototype.html`, captured on branch `prototype/toc-sidebar-widget`). Maintainer picked **Variant A**: an icon rail (`☰` toggle, `↑` back-to-top) that's always visible, pushing open a panel anchored to the rail itself. Collapsed by default, state persisted via `localStorage`.

Two round-2 fixes came out of live-testing the prototype, both carried into the real build: the panel anchors via `position: relative`/`absolute` directly to the rail (not the surrounding sidebar column, which drifted at real browser widths and put the panel in a "weird spot"); and heading links call `scrollIntoView()` explicitly instead of relying on plain `<a href="#id">` anchor-jumps, which don't reliably fire in some contexts.

**Scope revision, same round:** the header controls (theme select, GitHub link) are dropped entirely rather than restyled — `ew_wiki` runs as a sub-tool under the `ew_toolkit` hub, whose own top banner already provides dark/light mode, and no GitHub login applies here.

Landed as two new components, wired in via `astro.config.mjs`'s `components` map:
- [`src/components/CollapsibleToc.astro`](../../../ew_wiki/src/components/CollapsibleToc.astro) — overrides Starlight's `TableOfContents`. Builds its own heading list (reusing the page's real heading ids), wires the collapse toggle + `localStorage` persistence, drives section-jump via `scrollIntoView()`, and runs its own `IntersectionObserver` for scroll-spy (`aria-current` on the active link).
- [`src/components/Header.astro`](../../../ew_wiki/src/components/Header.astro) — overrides Starlight's `Header`. Renders just the site title and search; drops `ThemeSelect`/`SocialIcons`/`LanguageSelect`. `astro.config.mjs`'s `social` entry removed too since it's now unused.

Verified live via the `ew-wiki` dev server (not just `build-check.sh`): toggle open/close, panel anchoring under scroll, click-to-jump landing on the correct heading with the panel's current-link highlight updating, back-to-top, and `localStorage` persistence across a real page reload — all confirmed working on `advanced-triggers-time.mdx`. `npm run build` via WSL also verified clean (33 pages, no errors).
