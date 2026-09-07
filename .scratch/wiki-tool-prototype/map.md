# Wiki Tool Prototype — Map

Labels: wayfinder:map

## Destination

A throwaway, local-only prototype — living outside `ew_toolkit`, no git repo needed — that builds the same small slice of content in both **Astro Starlight** and **VitePress**: a real Start Here paragraph plus 2 Concepts pages (e.g. Scripter, Schema) using each tool's built-in components (Tabs/Steps/Asides). No Monaco/YAML playground yet.

Reaching the destination means: the maintainer has looked at both and made two calls — (1) which framework to use, and (2) go/no-go on building Tool #2 (the wiki) for real in the hub next.

This map resolves the "Choosing or building Tool #2" item the [EW Toolkit Hub map](../ew_toolkit/hub-map.md) deliberately left out of scope.

## Notes

- Domain: Valheim modding / EWP-family tooling — see [CONTEXT.md](../../CONTEXT.md). This map does not introduce new hub-wide vocabulary; it's scoped to deciding Tool #2's shape.
- Source research: [ew-toolkit-wiki-interactive-guide-research.md](../../../research_reports/ew-toolkit-wiki-interactive-guide-research.md) — surveyed docs platforms, game/mod doc patterns, "wall of text" UX research, and live-YAML-playground feasibility. Recommended Astro Starlight (fallback: VitePress) + a Monaco+monaco-yaml playground, phased so IA/writing style is proven before the playground is built.
- Skills every session should consult: `/prototype` for the two framework-comparison tickets; `/grilling` and `/domain-modeling` for the comparison/decision ticket.
- **Plain-language primer** (for whoever picks up this map without docs-tooling background):
  - **Static site generator** — a tool that turns plain text/Markdown files into a full website (navigation, styling, pages) automatically. You write content, it builds the site.
  - **Astro Starlight** — a docs-website-in-a-box built on Astro. Pre-loaded with search (Pagefind, on by default), Tabs, Steps, Cards, and a sidebar out of the box — less to build yourself.
  - **VitePress** — a similar box built on Vue instead. Has its own built-in local search too (minisearch-based) but it's opt-in (one config line), not on by default like Starlight's. Fewer ready-made components (Tabs-equivalent is free via `::: code-group`, but Steps/Cards/Asides need hand-building) — but it shares **Vite** — the same build tool `ew_toolkit`'s other Tool already uses — so it fits the existing toolbox more closely.
  - Analogy: Starlight is a pre-furnished apartment (lots comes included); VitePress is an empty apartment in a building you already live in (less furniture, same landlord/plumbing as the rest of the hub).
  - **Monaco / monaco-yaml** — Monaco is the code-editing box that powers VS Code (colors, red-squiggle errors). `monaco-yaml` teaches it EWP's YAML rules specifically, so it can flag mistakes live in the browser — a mini embedded version of the validator. This is the "playground" piece from the research report; deliberately not part of this map (see Not yet specified).
- Standing preferences carried over from the hub map: reuse existing free/open tooling over custom builds; minimal tooling. Both don't strictly apply here since this prototype is throwaway and never deploys — but the framework choice made here will inherit them once real hub work starts.
- Why Monaco is deferred rather than prototyped now: the framework choice (Starlight vs. VitePress) is the genuinely open, high-uncertainty question this map exists to answer. Monaco+monaco-yaml reuse is comparatively low-risk (same library the validator already runs) — building it now risks wiring it twice, once per framework, for a piece better tested once, in whichever framework wins.

## Decisions so far

- [Build the Astro Starlight prototype](issues/01-starlight-prototype.md) — built at `C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\starlight\`; Start Here + Scripter/Schema Concepts pages, all built-in components (Steps, Aside, Tabs), zero friction, clean build.
- [Build the VitePress prototype](issues/02-vitepress-prototype.md) — built at `C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\vitepress\`; same content. Code-group tabs free; Steps needed a hand-built ~50-line Vue component (~15-20 min) — flagged as a recurring tax if Cards/Asides are needed too.
- [Expand the Starlight prototype into a fuller local site, with a real playground](issues/05-expanded-starlight-prototype.md) — added one representative page each for Reference, Recipes, Troubleshooting; sidebar switched to `autogenerate` (confirmed reflecting folder structure live). Embedded a real Monaco+monaco-yaml playground on the Recipes page reusing the validator's schema, with `validate: true` instead of the validator's custom precheck (schema-shaped errors, not tuned diagnosis text — flagged clearly so it isn't mistaken for the real validator's message quality). Main friction was a dev-server-only Vite/CJS-interop bug in monaco-yaml's worker (fixed by vendoring `path-browserify` as ESM), not anything Starlight-specific — production build worked first try. Verdict: fuller site still feels right, nothing here reopens the framework question.
- [Research maintenance/sustainability at wiki-hub scale](issues/04-maintenance-scale-comparison.md) — [full findings](../../../research_reports/ew-toolkit-wiki-starlight-vs-vitepress-scale.md). Starlight has real folder-based sidebar auto-generation and Zod-schema-validated frontmatter (Content Collections); VitePress has neither — both confirmed Starlight-only against each framework's own docs. Shared-module import fit is a wash (both Vite-based). Astro's multi-framework islands give more room for a future Monaco playground than VitePress's Vue-only model. New wrinkle: VitePress's stable 1.x line hasn't released since Jan 2025 (dev moved to an unreleased 2.0-alpha); Starlight is still pre-1.0 with occasional breaking changes in minor bumps — different-shaped risk, not a clean win either way.
- Content-review the 9 real candidate guide files — three parallel research reports ([theory-fundamental](../../../research_reports/ew-toolkit-wiki-content-review-theory-fundamental.md), [basic-use-cases](../../../research_reports/ew-toolkit-wiki-content-review-basic-use-cases.md), [advanced-use-cases](../../../research_reports/ew-toolkit-wiki-content-review-advanced-use-cases.md)) audited the real source guides the maintainer wants to eventually port. Found reusable style conventions (Steps/Aside/Tabs usage rules, code-fence tags, page-splitting, playground-suitability), and a recurring foundational-content gap: none of the 9 guides define "data," where YAML files live on disk, or singleplayer vs. dedicated-server differences, despite constant reliance on those ideas. Not filed as its own ticket — findings folded directly into ticket 03's Answer.
- [**Compare and decide**](issues/03-compare-and-decide.md) — **Framework: Starlight. Go/no-go: Go**, conditioned on the next map opening with two Foundations pages (Preparation/How to Start; Core Vocabulary) and a house-style ticket before any real guide content is ported. Full reasoning and conditions in the ticket's Answer.

## Not yet specified

- **Larger-scale IA validation** — even the expanded prototype (ticket 05) only tests one representative page per section, not the real content catalog. Whether Starlight holds up cleanly across a real multi-mod wiki (dozens+ of pages) is still only inferred from research plus a small sample, not proven at full scale. Revisit if early real build-out surfaces friction the research didn't predict.

## Resolved

- **Real content/IA build-out for Tool #2** — [ticket 03](issues/03-compare-and-decide.md) resolved "go." Scope has grown since this map was charted: no longer "port 9 sample guides," but "cover the whole EWP + WEC system, beginner → intermediate → advanced" — sizing and phasing deferred to a new future map's own destination-setting `/grilling` session, mirroring how this map's destination was pinned down before any tickets opened. That new map is the next step and hasn't been charted yet.

## Out of scope

- **Deploying anything from this prototype** — stays local-only; no GitHub Pages, no CI, no `/wiki/` subpath registration in the hub. That's real hub work, deliberately deferred past this map's destination.
- **Full Reference/Recipes/Troubleshooting content** — the research report's full IA (6 sections) is not being built here; this map only tests Start Here + 2 Concepts pages, enough to judge the reading experience.
