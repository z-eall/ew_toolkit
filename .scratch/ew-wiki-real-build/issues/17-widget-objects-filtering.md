Type: task
Status: resolved
Blocked by: none

## Question

Build the "who's nearby" interactive widget for `objects-filtering.mdx` ("Filter: by Objects"): a top-down dot map where the reader places dummy objects at distances/levels, toggles `objectsLimit:`/`maxDistance:`/`weight:`, and sees live which objects the filter would count.

Same spirit and construction pattern as the existing `FilterLimitExplainer.astro` on `advanced-filter-plural.mdx` (plain Astro component, no UI framework, class-scoped so multiple instances can coexist, client-side `<script>` does the computation) — reuse that pattern, don't invent a new one.

Fold in the "same word, different job" caution: `objects:`'s own `weight:` key means something different from a rule's top-level `weight:` — the widget should make that distinction visible, not just the counting behavior.

Process: build a throwaway HTML mockup first via `ew_toolkit:prototype` if the design isn't already obvious from `FilterLimitExplainer.astro`'s precedent, then land the real Astro component, wire it into `objects-filtering.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only).

## Answer

Built `ObjectsNearbyExplainer.astro` — a two-scenario ("Does it become a commander?" pass/fail) top-down radar showing placed dots, a Back/Next/Reset story walkthrough, and a live checklist against `objectsLimit`/`weight`/`filter`, matching `FilterLimitExplainer.astro`'s construction pattern (plain Astro, scoped styles, client `<script>`). Wired into `objects-filtering.mdx` right after the `weight:`-caution `<Aside>`, using the page's own commander-boar example. Iterated through 8 prototype rounds (`objects-widget-*-prototype.html`, v2 through v8 plus a 3-variant round) before maintainer go-ahead, then several more rounds live on the real page fixing gaps the prototype didn't catch: a stray Starlight-global `margin-top: 16px` on non-first siblings (hit both the story buttons and the condition panel), hardcoded box heights that only worked at the prototype's own wide test layout, absolute-position checkbox glyph offsets, and iterative spacing tightening. Root causes and the fix written up as a standing memory rule (`feedback_widget_prototype_to_build_gap`) to apply to tickets 18-22 from round 1. Build verified clean via `build-check.sh` (33 pages).
