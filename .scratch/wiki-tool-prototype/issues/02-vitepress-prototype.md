# Build the VitePress prototype

Type: prototype
Status: resolved

## Question

Build a throwaway VitePress site (local-only, outside `ew_toolkit`, no git repo needed) covering the **same content** as [the Starlight prototype](01-starlight-prototype.md), for a fair side-by-side comparison:

- A **Start Here** page: ≤2 short paragraphs on what EWP/WEC is and what this toolkit does.
- Two **Concepts** pages, using terminology verbatim from [CONTEXT.md](../../../CONTEXT.md): **Scripter** and **Schema**, ≤150 words each.
- VitePress has no first-party Tabs/Steps/Cards components (per the research report) — hand-build the minimal equivalent using plain Vue-in-Markdown, or note where you'd need to.

This ticket exists to answer: how much extra hand-building does VitePress need to reach the same reading experience as Starlight's built-ins, and does it still feel right?

Use the `/prototype` skill to build it. Link the resulting local folder path from this ticket's Answer.

## Answer

**Folder**: `C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\vitepress\` — throwaway, not a git repo, not connected to `ew_toolkit`.

**How to run it**:
```
cd C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\vitepress
npm install
npm run docs:dev      # dev server, defaults to http://localhost:5173
npm run docs:build    # production build → docs/.vitepress/dist
```

**What was built** (manual install, not the `npm init vitepress@latest` interactive scaffolder — installed `vitepress` + `vue` as devDependencies directly and hand-wrote `docs/.vitepress/config.mts`, since the interactive scaffolder's prompts aren't worth fighting for a 3-page throwaway):

- `docs/index.md` — **Start Here** page. 2 short paragraphs on EW/EWP/WEC (verbatim terms from `CONTEXT.md`) and what the toolkit does, plus a "Getting started in 3 steps" numbered walkthrough.
- `docs/concepts/scripter.md` — **Scripter** concept page, CONTEXT.md definition + avoid-note verbatim, 120 words including code, with a minimal-example/common-mistake EWP YAML pair.
- `docs/concepts/schema.md` — **Schema** concept page, same treatment, 127 words, EWP YAML pair (`chance` as a number vs. wrongly-quoted string).
- `docs/.vitepress/config.mts` — nav + sidebar linking all three pages.
- `docs/.vitepress/theme/Steps.vue` + `theme/index.ts` — a hand-built numbered-steps component, globally registered so `<Steps>`/`<template #step-N>` works directly in Markdown.

Both `npm run docs:dev` (confirmed via browser screenshot — Start Here page and the 3-step walkthrough render correctly, dark mode included) and `npm run docs:build` (`build complete in 3.36s`, no errors) succeeded.

**Built-in vs. hand-built, concretely**:

- **Concepts pages' tabs**: no extra work. VitePress ships `::: code-group` as a first-party Markdown container — wrapping two fenced code blocks with `[minimal example]`/`[common mistake]` titles was enough to get a working tabbed toggle (verified in-browser). This is the one spot VitePress matches Starlight's built-ins for free.
- **Start Here's numbered steps**: real hand-building. VitePress has no Steps/Tabs/Cards components at all (unlike Starlight). Getting a numbered-steps block meant writing a small Vue SFC (`Steps.vue`, ~50 lines: template + scoped CSS for the numbered circle, using VitePress's own `--vp-c-brand-1` theme variable so it inherits light/dark automatically) and registering it globally in `theme/index.ts` so it's usable from Markdown via `<Steps>` + named slots per step. This took maybe 15–20 minutes for someone already comfortable with Vue SFCs — not hard, but it's a real component to write, test, and maintain per "shape" (Steps, Cards, Asides, etc.) that Starlight would give for free. For a docs site with more than one or two custom UI shapes, this cost compounds — every Tabs/Steps/Card/Aside variant is a new component to hand-roll and keep in sync with the theme, whereas Starlight's equivalents are import-and-use.

**Net for the framework decision**: VitePress's code-group tabs are genuinely as good as Starlight's built-in Tabs for the code-comparison use case. The steps/callout-style components are where VitePress's "empty apartment" framing from the map holds — one hand-built component was cheap, but it's evidence of an ongoing tax rather than a one-time cost, since the real IA in `Not yet specified` will likely need Steps, Cards, and Asides at minimum.
