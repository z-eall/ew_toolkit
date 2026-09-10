# Core Vocabulary page

Type: task
Status: resolved
Blocked by: 02

## Question

Write the Core Vocabulary page inside the Concepts section: one heading per term for `data`, `f=`, `par`, `poke`, `WEC`, `fallback`, and the save/load keys — all found undefined-but-load-bearing across the audited guides. One page, many short dictionary-style entries (mirrors `CONTEXT.md`'s own shape), not one page per term. Any term is free to be promoted to its own page later if it outgrows this section.

**Rescoped, before any content written** — surfaced while correcting the Preparation page: that page assumes the reader already knows what "data" and "script" mean, and neither term was even on this ticket's original list (`script` wasn't included at all). Revised shape:

- **`data` and `script` are promoted to their own pages** (`ewp/concepts/data.md`, `ewp/concepts/script.md`, siblings to the existing `schema.md`/`scripter.md`) — full explanations, not dictionary entries. The `data` page can reference/build on DhakhaR's `EWP_How_To_Use_Data.md` (the same source guide the Preparation page's client-side paths came from).
- **`par` and `poke` stay short dictionary entries on the shared Vocabulary page** — they already get full treatment as their own dedicated Recipe pages once ported (`EWP_Guide_to_PARS.md`, `EWP_Basic_Poke_Guide.md`, ticket 07), so the Vocabulary entry just defines them briefly and links to those guides rather than duplicating them.
- **`f=`, `WEC`, `fallback`, and the save/load keys stay short entries** — narrow enough not to need promotion yet (`WEC` in particular: map's Notes already decided it stays folded into EWP's guides for v1, not split out).
- Once `data.md`/`script.md`/Vocabulary exist, sweep the Preparation page (and anything else already written) to cross-link on first use, per the new `ew_wiki/AGENTS.md` "Cross-link on first use" rule — not scoped to this ticket alone, applies wiki-wide going forward.

## Answer

Built as three pages under `ewp/concepts/`, matching the rescoped shape:

- **`data.mdx`** — full explanation, built on DhakhaR's `EWP_How_To_Use_Data.md`: what a data entry is (a named, reusable bundle of field edits), the f=→data progression example, anatomy of a `name`/`ints`/`floats`/`strings` entry, `<placeholder>` + `par=` usage, and a pointer to Preparation for the client/server `data.yaml` split rather than re-explaining it.
- **`script.mdx`** — full explanation: a script is the `.yaml` file a scripter writes; EWP infers entry kind (rule entry / data entry / value entry/group) from which keys are present, no tag needed. Points to Preparation for "installing" a script and the data-before-scripts load-order habit rather than duplicating those.
- **`vocabulary.mdx`** — one shared page, one heading per remaining term: `f=`, `par`, `poke`, `WEC`, `fallback`, `save/load keys`. `par` and `poke` entries are intentionally short and note a fuller Recipe guide is "on its way" rather than linking to ticket 07 pages that don't exist yet — cross-link sweep needed once those port in, per the wiki-wide rule.

Also swept `preparation.mdx`'s first uses of **data**, **scripts**, and **WEC** to link to the new pages, per the map's Notes.

Verified: `npm install` + `npm run build` via WSL (native npm/astro weren't on the WSL PATH — reactivated via `nvm`, then `npm install` since `node_modules` wasn't present yet). Build completed clean, 12 pages (was 9), and every new cross-link's target anchor was checked against the actual generated heading IDs in `dist/` (`#f`, `#par`, `#wec`, and the three Preparation heading anchors all matched exactly).

**Bug found and fixed, wider than this ticket's own files:** the 3 new pages were first written as `.md`. Astro Starlight only runs `import`/component syntax (`<Tabs>`, `<Aside>`) through the `.mdx` pipeline — a `.md` file prints the import line as literal visible text and drops the component. Renamed all three to `.mdx`. The same bug turned out to already exist on `schema.md`/`scripter.md` from ticket 01/02 (they use the exact same `import { Tabs, TabItem }` pattern) — fixed those too, renamed to `.mdx`, left staged pending commit alongside this ticket's own changes.

**Cache trap while verifying:** after renaming, a plain `npm run build` kept reproducing the broken render for `schema`/`scripter` even though `data`/`script`/`vocabulary` (brand-new file IDs) rendered correctly. Root cause: Astro's content-layer cache at `node_modules/.astro/data-store.json` keys parsed content by collection entry ID (the slug, e.g. `ewp/concepts/schema`) — renaming `.md`→`.mdx` keeps the same ID, so the store kept serving the stale markdown-only parse instead of re-running the file through the MDX pipeline. `rm -rf .astro dist` alone did not clear it — had to also clear `node_modules/.astro` (and `node_modules/.vite` for good measure) before a rebuild picked up the fix. Worth remembering for any future `.md`→`.mdx` rename in this repo.

Not done here, left for later: linking `par`/`poke` vocabulary entries to their full Recipe pages (ticket 07), and `f=` to a ported Understanding Fields guide — neither exists yet.

## Reworked after maintainer review (round 2)

First pass above was too advanced for a beginner-facing wiki and got reopened. Changes:

- **Deleted `schema.mdx`, `scripter.mdx`, `vocabulary.mdx`**, plus the placeholder `Reference`/`Recipes`/`Troubleshooting` sections entirely (`prefab-key.md`, `custom-spawn-on-world-start.mdx`, `reference-problem.md`) — maintainer call: stale placeholder scaffolding from early tickets was more confusing to keep around than to cut and rebuild later. `astro.config.mjs`'s sidebar updated to drop those three sections (commented, with the reason, rather than silently removed).
- **`data.mdx` and `script.mdx` rewritten**: simpler wording throughout (no "anatomy"), common beginner-relevant example fields (`level`, `max_health`) instead of `aggravatable`/`jumpForce`, no early `<placeholder>`/`par=` mechanic and no `poke` example — both were introducing a second unexplained concept while still teaching the first one. `script.mdx`'s example is now a plain single rule entry with no poke needed.
- **New page, `fields.mdx`** ("Understanding Fields"), built on `EWP_Understanding_Fields.md` — the discovery-via-autocomplete walkthrough (Components → fields → value, chaining edits, `object f=` vs `spawn_object f=`, `search_component`).
- **Directive section headings** throughout the new pages ("Why bother saving it", "What goes inside a script", "Start here: what Components are") instead of clinical ones ("Anatomy of a data entry").
- **Dropped the internal source-tier note** from the bottom of `data.mdx` — `docs/sources.md` is maintainer-facing, not reader-facing.
- **Sidebar order set explicitly** (`sidebar.order` frontmatter): Understanding Fields (1) → Understanding Data (2) → Start Writing a Script (3) — the actual learning order, not alphabetical.
- **New standing rule, `ew_wiki/AGENTS.md`** ("YAML indent in examples"): nested list items align with their parent key, not indented further — run through `ew_toolkit:writing-for-agents` before writing, landed as its own short section (not folded into "Content voice and depth", since it's a code-formatting rule, not a prose-voice one). Applies to every YAML snippet in the wiki; all three pages above already follow it.
- **`preparation.mdx`**: dropped the now-dead link to Vocabulary's `#wec` anchor (page no longer exists); data/script links unaffected.
- **Source guides relocated**: `ew_toolkit_wiki_prototype/guide-reference/` moved into the repo at `ew_wiki/guide-source/` (subfolders renamed `1-theory-fundamental`/`2-basic-use-cases`/`3-advanced-use-cases` at the time, filenames unchanged so existing citations in this map/tracker still resolve; renamed again to `1-beginner-guide`/`2-intermediate-guide`/`3-advanced-guide` later — see map.md) — the prototype folder no longer exists. Maintainer intends to add more script examples there directly; map's Notes "Source folder" path needs updating to match (see map.md).

Verified: `rm -rf .astro dist node_modules/.astro node_modules/.vite` + rebuild via WSL — clean, 7 pages (was 12). No stray literal `import` text on any page. No remaining links to `vocabulary`/`schema`/`scripter` anywhere in the built output (checked `dist/` directly). Screenshotted all three Concepts pages in the live preview.

## Round 3 — source-verification pass, complexity badges, Home page rework

**Fact-checked every claim in `fields.mdx`** against real source (not the original DhakhaR guide's say-so): cloned `expand_world_prefabs`, `world_edit_commands`, and its dependency `valheim-dev`/ServerDevcommands. Found one real error — `activationDistance` doesn't exist on `TeleportWorld`, the real field is `activationRange` (confirmed via `valheimtools.stream/wiki/components`, a per-component field-dump tool the maintainer pointed at, since none of the mod source repos document Unity component fields — they're runtime-reflected off the compiled game assembly). `search_component` was initially believed fabricated (absent from both EWP and WEC source) until the maintainer named its real home, ServerDevcommands. Separately, `type: spawn` (already shipped on `script.mdx`/`data.mdx`) was confirmed wrong against `ewp_validator`'s own schema — the real value is `type: create`; fixed both pages.

**`ew_wiki/AGENTS.md` hardened past a one-off bug fix**, per the maintainer's explicit ask for the same "never guess" rigor `ewp_validator` holds code to: new "Never guess" section naming the `type:spawn` incident as the cautionary example, and "Source-verify every guide fact" rewritten as a 4-step ordered checklist (schema.generated.json → mod GitHub source + ServerDevcommands → valheimtools.stream for Component/field names specifically → `docs/sources.md` for everything else). `docs/sources.md` updated to match: added the EWP/ServerDevcommands repos, a new "Valheim game data" section (Jotunn + valheimtools.stream, both tagged cross-check-only), and — this session — an explicit entry for `schema.generated.json` itself (it was step 1 of the checklist but had no listing of its own).

**Complexity badges**: added a `complexity: beginner | intermediate | advanced` frontmatter field (`src/content.config.ts` schema extension) rendered under the H1 via a new `PageTitle.astro` override, replacing the inline `<Badge>` markup every page had been hand-adding. New `ew_wiki/AGENTS.md` rule documents the frontmatter-only convention so no future page hand-adds the badge again.

**Home page rebuilt from a plain Starlight splash into a real hub page**: same doc layout/panels as EWP's sub-pages (not the splash template), title "Overview" with a muted "Choose a Guide" sub-line (mirrors the toolkit hub's own h1+tagline pattern), one guide-picker row per mod styled like the hub's own `.tool-btn`/`.tool-desc` pattern, `tableOfContents: false` (no "On this page" panel — the page has no sub-headings to list), `next: false` (no bottom pagination button on a hub page). The EWP row's description is the mod's own GitHub "About" line verbatim — new `ew_wiki/AGENTS.md` rule locks that in for any future mod row. Site renamed `Expand World Wiki` (was `EW Toolkit Wiki`); sidebar section stays abbreviated `Guide - EWP` (avoids wrapping) while the Home page's own button spells out the full `Guide - Expand World Prefabs`. `--sl-content-width` widened site-wide (56rem, was Starlight's 45rem default) so the "On this page" rail sits further right on every other page. Prev/next footer restyled flatter (no bordered-card/shadow), matching the hub's own flat-hover style, on every page that still has one.

**`guide-source/` moved to `docs/guide-source/`** (never git-tracked, plain filesystem move) — was a near-duplicate name next to `docs/sources.md`'s own folder; consolidating them under one `docs/` avoids the mix-up. `docs/sources.md`'s one internal path reference updated to match.

Verified each round via WSL clean rebuild (`rm -rf .astro node_modules/.astro node_modules/.vite dist/*` then `npm run build`) — steady at 6 pages throughout (the 3 Concepts pages + Preparation + Home; EWP's dead index redirect page was removed earlier). Screenshotted the final Home page layout in the live preview (`ew-wiki-preview`, port 4324).
