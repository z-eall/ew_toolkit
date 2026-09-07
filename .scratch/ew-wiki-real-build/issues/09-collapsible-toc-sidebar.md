# Collapsible, scroll-following TOC sidebar

Type: task
Status: open
Blocked by: none

## Question

The right-hand "On this page" TOC is good, but wants a collapse/expand toggle (like a bookmark panel) — collapsed by default, expanding to show animated minimal bullet points that track scroll position. Split out from ticket 04 (maintainer asked for it alongside content fixes; not a content edit, so kept separate).

This is a real UI component build, not a config change: overriding Starlight's default `TableOfContents` component, plus client-side JS for the collapse state and scroll-spy animation. Needs its own design pass (where does the toggle live, what does "collapsed" look like — icon-only rail? fully hidden?, does collapse state persist across page loads via localStorage) before implementation.

## Answer

