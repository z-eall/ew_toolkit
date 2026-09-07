# Research maintenance/sustainability at wiki-hub scale: Starlight vs VitePress

Type: research
Status: resolved

## Question

The 3-page prototypes ([Starlight](01-starlight-prototype.md), [VitePress](02-vitepress-prototype.md)) can't show what happens at the scale of a large multi-topic wiki hub covering many of Jere Kuusela's mods, not just EWP. Research, against primary sources (official docs, source repos — not secondary write-ups), how Astro Starlight and VitePress compare on:

1. **Sidebar/nav maintenance as pages multiply** — does either support auto-generating navigation from folder/file structure, vs. hand-maintaining a manual list (already observed in the VitePress prototype's `config.mts`, which hand-lists every page)? Confirm Starlight's actual behavior here against its docs, don't assume.
2. **Content-schema consistency** — Astro's "Content Collections" reportedly let you enforce a typed schema on every page's frontmatter (e.g. every Concepts page must carry a title, category, avoid-list). Confirm what this actually does and its maturity/limitations. Does VitePress have any equivalent, or is frontmatter unchecked/plain there?
3. **Fit with the hub's existing shared-module rule** — [AGENTS.md](../../../AGENTS.md) requires every Tool to import a shared `shared/` module (icon paths, color palette) rather than copy it. Which framework makes importing a plain TS/CSS module from outside its own project root easier or harder? (May require inspecting each framework's build/aliasing docs, not just guessing.)
4. **Future interactivity flexibility** — Astro supports embedding React/Vue/Svelte/vanilla components side by side in the same project (its "islands" model); VitePress is Vue-only. Confirm this and note any real cost/benefit for a future Monaco/monaco-yaml playground or other interactive components.
5. **Maintenance signals** — release cadence, breaking-change history, how actively each project is maintained (commit/release frequency, open issue backlog), sourced from each project's own repo, not vibes.

## Answer

Full findings, cited source-by-source: [ew-toolkit-wiki-starlight-vs-vitepress-scale.md](../../../../research_reports/ew-toolkit-wiki-starlight-vs-vitepress-scale.md).

All 5 questions were confirmed against each framework's own docs and GitHub repo — no gaps or assumptions. Summary:

1. **Sidebar/nav**: Starlight's docs confirm a real `autogenerate: { directory: ... }` sidebar option that builds links straight from a docs folder (alphabetical, overridable per page via frontmatter). VitePress's own sidebar reference documents only manual array/object configuration — no folder-driven equivalent anywhere, matching what the VitePress prototype's hand-listed `config.mts` already showed.
2. **Content schema**: Astro Content Collections use Zod schemas that Astro's own docs say "guarantee" a predictable shape and error the build if a file's frontmatter doesn't match — stable since Astro 2.0 and still actively extended (build-time + "live" collections). VitePress frontmatter is plain YAML/JSON parsed via `gray-matter` with no validation of any kind documented.
3. **Shared `shared/` module fit**: turns out to be a wash. Both frameworks sit on Vite and both expose an identical `vite` config passthrough key for anything their own aliasing doesn't cover (Astro via `tsconfig.json` paths, VitePress via the same Vite `resolve.alias` mechanism) — neither framework's docs flagged importing a path outside the project root as harder than the other.
4. **Interactivity flexibility**: confirmed — Astro's islands architecture explicitly supports React/Preact/Svelte/Vue/Solid side by side via `client:*` directives, and by default ships zero JS unless a component opts in. VitePress compiles every Markdown file as a Vue SFC; its own docs document no path to other frameworks. This gives Astro more room for a future framework-agnostic Monaco/monaco-yaml playground.
5. **Maintenance signals**: both projects are actively developed (commits within the last day of checking, on 2026-09-03). Starlight is still pre-1.0 (`0.42.0`) and its own changelog shows breaking markup changes can land inside a minor bump — a real but small, frequent cost. VitePress's story is more notable: the stable `1.x` line the prototype was built on hasn't released since January 2025, with all current development on an unreleased `2.0.0-alpha` line (19+ alphas so far) — meaning adopting VitePress today means riding a maintenance-only major version pending an uncertain 2.0. VitePress also carries a much larger open issue/PR backlog (228/76) than Starlight (7/20).

**Net**: nothing here overturns the original research report's Starlight recommendation — auto-generated sidebars and schema-validated frontmatter are exactly the mechanisms that matter once page count grows past a 3-page prototype, and both are Starlight-only. The one new consideration for the go/no-go call is VitePress's stalled 1.x line, worth weighing against Starlight's own pre-1.0 breakage risk.
