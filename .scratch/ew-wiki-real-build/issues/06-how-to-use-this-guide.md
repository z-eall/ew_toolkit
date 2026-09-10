# "How to use this guide" page

Type: task
Status: closed — out of scope
Blocked by: 07

## Question

Write one reader-facing "How to use this guide" page (not a run of chapters): explain the colored callout boxes and the "Try it" live-editing box, plus a one-line reading-order pointer. Keep deeper authoring reasoning (why Steps vs. Tabs, etc.) in the internal house-style ticket (05) — different audience, different need. Open to revisiting if one page proves too thin in practice.

**Reordered after 05, before drafting**: checked whether this page duplicates Preparation — it doesn't (Preparation is EWP/Valheim environment facts, this is wiki-reading-conventions) — but found a real sequencing bug instead. The "Try it" live-editing box isn't wired into any real content page yet (only exists in the old prototype); explaining it now would describe a feature the reader can't see. Swapped the blocking order: this ticket now waits on 07 (which wires the playground into real pages), not the other way around.

## Answer

Superseded, not resolved. The interactive-widget phase (tickets 17-22) already gave the wiki 6 real interactive components — the Try-It playground would have been a second, weaker way to hit the same goal ("make it not read boringly"), and ticket 07's re-check confirmed it was never actually wired into any real page (see ticket 07's Answer). Maintainer's call: scrap the Try-It playground concept entirely rather than build a page around it, and drop this ticket's other half (callout boxes + reading-order page) along with it rather than salvaging a smaller version.

Cleanup done as part of closing this out: deleted `src/playground/` (`MonacoPlayground.astro`, `path-browserify-esm.js`, `schema.generated.json`), removed the now-unused `monaco-editor`/`monaco-yaml` deps from `package.json`, and removed the `path-browserify` Vite alias from `astro.config.mjs` that existed only to support them. `npm install` via WSL cleanly dropped 17 packages; `npm run build` verified clean afterward (33 pages, same count as before — nothing depended on the playground).
