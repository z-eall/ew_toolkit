# Move the build into ew_toolkit as the ew_wiki Tool

Type: task
Status: resolved
Blocked by: 01

## Question

Move the proven Starlight prototype (including its working Monaco+monaco-yaml playground) from the standalone prototype folder into the actual `ew_toolkit` repo, as a new Tool folder named `ew_wiki`, applying whatever reshaping ticket 01 decided.

Concretely:
- Create the `ew_wiki` Tool folder inside `ew_toolkit`, following the same per-Tool independent-build pattern as `ewp_validator`.
- Set the site's base path to the nested `/ew_wiki/ewp/` subpath (not flat).
- Import (not copy) the shared `shared/` visual identity module per `AGENTS.md`.
- `npm install` inside the real repo must happen on Linux, not Windows, so the lockfile isn't cross-platform-broken (standing hub rule).
- Confirm the moved site still builds cleanly in its new location before closing this ticket.

## Answer

Created `ew_toolkit/ew_wiki/` as its own Tool folder — own `package.json` (name `ew-wiki`), own `astro.config.mjs`, own `tsconfig.json`/`.gitignore`, independent of the landing page and `ewp_validator`, matching the per-Tool pattern.

Carried over from the prototype (`ew_toolkit_wiki_prototype/starlight/`), applying ticket 01's reshape as the starting point rather than the prototype's old flat layout: `src/content/docs/` (hub `index.mdx` + `ewp/` group with concepts/reference/recipes/troubleshooting), `src/playground/` (the working Monaco+monaco-yaml setup, including the `path-browserify` CJS→ESM alias needed for `astro dev`), `src/assets/`, `src/content.config.ts`, `public/favicon.svg`. Dropped the two prototype-only artifacts that don't belong in the real Tool: `public/prototype-variant-switcher.js` and `src/styles/prototype-shared-palette.css` (the live variant-switching harness itself), plus every "PROTOTYPE — throwaway" comment in the carried files.

- **Base path**: `astro.config.mjs` sets `base: '/ew_wiki/'`; content lives under `docs/ewp/`, so real routes land at `/ew_wiki/ewp/...` — confirmed in the build output (`/ewp/index.html`, `/ewp/concepts/schema/index.html`, etc.).
- **Shared visual identity**: new `src/styles/theme.css` `@import`s `../../../shared/theme.css` (not copied) and maps its 5 values onto Starlight's own `--sl-color-*` variables — Variant A from ticket 01. Because `shared/theme.css`'s light-mode override already lives under `:root[data-theme="light"]`, one `:root` mapping block here is enough; no separate light-mode duplicate was needed (simpler than the prototype's variant CSS, which duplicated every block per variant). Starlight's own accent color is untouched, per ticket 01.
- **`npm install` on Linux, not Windows**: ran via WSL (`~/node22`, native Linux node 22) against a mirror of `ew_toolkit/{shared,ew_wiki}` (mirrored so the `shared/theme.css` relative `@import` resolves during a real build check) — never against the Windows-mounted path directly, and never `npm install`/`npm ci` from Windows. The resulting `package-lock.json` was copied back into `ew_toolkit/ew_wiki/`. No Windows-generated `node_modules`/lockfile exist in the repo folder.
- **Build verified clean in the new location**: `npm install` + `npm run build` inside WSL completed with no errors — 8 pages built (`/index.html`, `/ewp/index.html`, and one page per concepts/reference/recipes/troubleshooting file), Pagefind search index built. Two pre-existing, unrelated warnings carried over from the prototype (a >500kB chunk-size notice, and `@astrojs/sitemap` wanting a `site` option) — not part of this ticket's scope; not new regressions from the move.

Not touched (explicitly out of this ticket's scope, owned by ticket 08): landing-page Tool registration, GitHub Actions wiring for `ew_wiki`'s deploy.
