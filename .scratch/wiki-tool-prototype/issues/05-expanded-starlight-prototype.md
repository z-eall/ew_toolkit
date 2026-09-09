# Expand the Starlight prototype into a fuller local site, with a real playground

Type: prototype
Status: resolved

## Question

Starlight is the clear framework pick after [ticket 01](01-starlight-prototype.md) and [ticket 04](04-maintenance-scale-comparison.md)'s research. Before finalizing that pick and the go/no-go on [ticket 03](03-compare-and-decide.md), the maintainer wants to see a fuller, more realistic picture of the actual wiki: more of the site shape, and the interactive playground piece that was deliberately deferred earlier in this map.

**Starlight only** — do not build an equivalent in VitePress; the framework question is settled.

Extend the existing prototype at `C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\starlight\` (same folder, don't start a new one) with:

1. **One representative page each** for the 3 remaining sections from the original research report's IA ([ew-toolkit-wiki-interactive-guide-research.md](../../../../research_reports/ew-toolkit-wiki-interactive-guide-research.md), "Site structure" section): **Reference**, **Recipes**, and **Troubleshooting**. Lightweight/representative content is fine — the goal is to see the overall site shape and sidebar depth, not to write the real content catalog. Use Starlight's `autogenerate` sidebar option (confirmed in ticket 04's research) so the sidebar reflects the folder structure rather than a hand-written list, since that's one of the reasons Starlight won.
2. **A real embedded Monaco + monaco-yaml playground** on the Recipes page (or its own "Try it" page) — this is the interactive piece explicitly deferred until a framework was picked. Reuse the validator's existing setup as a starting point rather than reinventing it:
   - Schema: `C:\Users\Ultimate\Claude\ew_toolkit\ewp_validator\src\schema.generated.json`
   - Wiring pattern: `C:\Users\Ultimate\Claude\ew_toolkit\ewp_validator\src\main.ts` (see `configureMonacoYaml` call and surrounding comments) — the validator runs monaco-yaml with `validate: false` and does its own custom structural pre-check (a bigger, separate mechanism from ticket 10's map) to produce errors. For this prototype, don't reimplement that custom pre-check — turn on monaco-yaml's own `validate: true` instead, so the playground shows real (if less finely-tuned) live schema errors with much less wiring. Note this simplification clearly in the Answer so it isn't mistaken for the real validator's error quality.
   - Pre-seed the editor with a small starting YAML snippet relevant to whichever Recipe page it sits on.
3. Keep it throwaway and local — no git repo, no deploy, same as the rest of this map.

This ticket exists to answer: does the fuller site (more sections, real sidebar auto-generation, an actual live-validating playground) still feel right, and does it surface anything a 3-page slice couldn't?

Use the `/prototype` skill. Update the Answer with the folder path (same as before), how to run it, what was added, and how the Monaco embed went (friction, anything that didn't reuse as cleanly as expected).

## Answer

**Local folder** (same as before): `C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\starlight\`

**Run it**:

```
cd C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\starlight
npm install    # picks up the new monaco-editor/monaco-yaml deps
npm run dev
```

Both `npm run dev` and `npm run build` verified clean — 7 pages, no build errors, no browser console errors on the pages that carry the playground. `npm run build` + `npm run preview` also verified separately.

### What was added

- **Reference** → `src/content/docs/reference/prefab-key.md`: one exhaustive-style entry (the `prefab` key) in the "every key, every type, every constraint" pattern the real Reference section would use — a table of applies-to/type/required/constraint, an example, and a note on why an unrecognized prefab name isn't a structural error (data-aware autocomplete is out of scope, per CONTEXT.md).
- **Recipes** → `src/content/docs/recipes/custom-spawn-on-world-start.mdx`: a task-oriented "spawn a prefab once on world start" recipe using `<Steps>`, ending in the live Monaco playground (see below). `.mdx` (not `.md`) because Starlight only allows importing components — the playground — from MDX pages; `index.mdx` already set that precedent for the Start Here page.
- **Troubleshooting** → `src/content/docs/troubleshooting/reference-problem.md`: one diagnosis-category page ("Reference problem," from CONTEXT.md's Reference validation), following the message-quality-checklist shape (what this probably means / smallest fix) even though this prototype's own doc text isn't validator-generated — same voice, so wiki and validator wording won't diverge later.
- **Sidebar**: `astro.config.mjs` now uses `items: [{ autogenerate: { directory: '...' } }]` for Concepts/Reference/Recipes/Troubleshooting (Start Here stays a manual `slug` entry, since it's the single root page, not a folder). Confirmed live: the sidebar lists exactly the files on disk in each folder, and adding `reference/prefab-key.md` etc. required zero sidebar edits. One correction versus ticket 04's research: this Starlight version (0.42) removed the old `{ label, autogenerate }` group shorthand in v0.39 — the group now needs `items: [{ autogenerate: {...} }]` instead. `astro build` failed immediately with a clear, actionable error message pointing at the exact fix, so this cost about a minute, not a design question.

### The Monaco + monaco-yaml playground

Built as `src/playground/MonacoPlayground.astro` (plain `.astro` component, not a React/Vue component), imported into the Recipes MDX page and pre-seeded with a 4-line EWP snippet (`prefab: Boar`, `type: spawn`, `data: starter_boar`, `onStart: true`) matching that recipe. The schema file was copied verbatim (not modified) to `src/playground/schema.generated.json`.

**Simplification, as flagged in the ticket**: the validator wires `configureMonacoYaml(monaco, { validate: false, ... })` and does its own structural-pre-check pass (a separate, much bigger mechanism — shape arbitration, ajv fallback, the whole priority stack in `ewp_validator/AGENTS.md`) to produce diagnosis-quality errors. This playground instead uses monaco-yaml's own `validate: true`. It shows real, live, schema-backed red squiggles — e.g. it currently flags `type: spawn` against the schema's `oneOf` union — but the messages are ajv/schema-shaped, not the validator's tuned, plain-language diagnosis text. **Don't read this playground's error wording as a preview of the real validator's message quality** — that's the whole point of the simplification (it trades message quality for a much smaller amount of wiring, exactly as scoped).

**Astro-islands friction — the actual surprise**: the ticket assumed a `client:only`/`client:load` framework-component island would be the simplest path (per Astro's own docs). That turned out to be a red herring: `client:*` directives only apply to framework (React/Vue/Svelte/etc.) components. A plain `.astro` component's own `<script>` tag already ships to the browser and runs client-side automatically — no framework, no island directive, no new dependency (React/Vue) needed at all. This is simpler than what the ticket anticipated, and keeps the "minimal tooling" standing rule intact.

**The real friction was elsewhere — a dev-server-only Vite bug**, not the Astro/framework question:

- `monaco-yaml`'s `yaml.worker` imports `path-browserify` (a CommonJS package: `module.exports = posix`). In `astro dev`, Vite's on-demand esbuild transform doesn't apply CJS→ESM interop to that nested import before the worker (a native ES module worker) requests it, so the raw CJS file gets served as-is and throws `ReferenceError: module is not defined` at runtime — `path-browserify` has no `module` global in that context. This broke `hover`/`completion`/`validate` entirely in dev (the worker crashed before registering its request handlers).
- `astro build` does **not** have this problem — Rollup's commonjs plugin does full, correct interop at build time, so the production build (`npm run build` + `npm run preview`) worked and validated live on the first try, no config changes needed.
- Tried and rejected: `optimizeDeps.include: ['path-browserify']` (Vite did pre-bundle it, per `.vite/deps/_metadata.json`, but the worker's request never resolved to that bundled file — it kept hitting the raw source path and then a stale-hash `504 Outdated Optimize Dep` loop that never self-recovered, even across full server restarts and cache wipes); `vite.worker.format: 'es'`; bumping `monaco-editor` from `^0.52.0` (the validator's pinned version) to `^0.54.0` (matching monaco-yaml's own official Vite example, which has zero extra config) — none of these alone fixed dev.
- **What actually fixed it**: vendored `path-browserify`'s posix implementation as a genuine ESM module (`src/playground/path-browserify-esm.js` — same logic, MIT-licensed, copied from `path-browserify@1.0.1` and converted from `module.exports` to `export function`), then added a `resolve.alias` in `astro.config.mjs` pointing the bare `path-browserify` specifier at that file. This sidesteps the interop gap entirely instead of trying to coax Vite's optimizer into doing it. Confirmed clean afterward: no console errors, and the same live red-squiggle validation seen in production now shows up in `astro dev` too.
- This alias is dev-only insurance — `astro build` works with or without it (Rollup already handles the CJS interop correctly), but leaving it in for both is harmless and keeps dev/build behavior identical.

Net: `monaco-editor` bumped to `^0.54.0` and this alias are the only "didn't reuse as cleanly as hoped" items from the validator's setup; everything else (`configureMonacoYaml`'s shape, the `MonacoEnvironment.getWorker` wiring, the schema import) carried over unchanged.

### Does the fuller site still feel right?

Yes. The sidebar now visibly nests five real sections (Start Here, Concepts, Reference, Recipes, Troubleshooting) purely from folder structure, matching what ticket 04's research promised. The playground is the first genuinely interactive piece in the prototype and reads as a natural fit inside a Recipe's "try it" step, not a bolted-on demo. Nothing here surfaced a reason to reconsider the Starlight pick — the friction was a Vite/dev-server version-compatibility bug, not a Starlight-specific limitation, and it's now resolved rather than merely worked around.
