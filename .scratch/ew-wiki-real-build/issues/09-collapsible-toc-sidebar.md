# Collapsible, scroll-following TOC sidebar

Type: task
Status: open
Blocked by: none

## Question

The right-hand "On this page" TOC is good, but wants a collapse/expand toggle (like a bookmark panel) — collapsed by default, expanding to show animated minimal bullet points that track scroll position. Split out from ticket 04 (maintainer asked for it alongside content fixes; not a content edit, so kept separate).

This is a real UI component build, not a config change: overriding Starlight's default `TableOfContents` component, plus client-side JS for the collapse state and scroll-spy animation. Needs its own design pass (where does the toggle live, what does "collapsed" look like — icon-only rail? fully hidden?, does collapse state persist across page loads via localStorage) before implementation.

**Scope addition (2026-09-07):** maintainer also asked for a "back to top" button. Folding it in here rather than building it standalone — Starlight has no built-in one, and it's the same right-side page-navigation area this ticket is already redesigning. Include in the design pass: does jumping to top live on the TOC panel itself (e.g. clicking its title) or as its own small control within the same panel.

**Sequencing note (2026-09-07):** deploy (ticket 08) now also blocks on this ticket, not just 07 — the maintainer wants this built and reviewed before v1 ships, not left for a post-launch pass.

**Scope addition (2026-09-07):** the top-right header controls (theme mode switch, GitHub link) are Starlight's own default styling and don't visually match the toolkit hub's own header treatment (`ew_toolkit/src/style.css`/`nav.ts`) — maintainer wants them adjusted for alignment. Not its own ticket since it's the same header area this ticket already touches (the TOC toggle likely lands in this same top bar); include in the design pass.

## Answer

