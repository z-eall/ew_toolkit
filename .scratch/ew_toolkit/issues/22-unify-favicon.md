Type: task
Status: resolved

## Question

Same "1 master, shared" family of bug as [ticket 21](21-unify-hub-tool-nav-bar.md), found while resolving it (maintainer, 2026-09-11): the browser-tab icon is also built 3 separate ways, and unlike the nav bar, one of the 3 isn't even the toolkit's own icon.

Confirmed by directly comparing the files:
- `ew_toolkit/public/favicon.png` and `ewp_validator/public/favicon.png` are byte-identical (same MD5) — an accidental match, not a shared source.
- `ew_wiki/public/favicon.svg` is a completely different file (different format, 696 bytes vs. 3.7KB) and `astro.config.mjs` has no `favicon:` override — this is almost certainly Starlight's own generic default icon, not the Hub's brand icon at all.

Unlike the nav bar (markup/CSS/behavior, shareable as code every build already imports), a favicon is a static binary asset each of the 3 independent builds (`ew_toolkit`, `ewp_validator`, `ew_wiki`) has to serve from its own `public/` folder — there's no "import a PNG at runtime" equivalent to `shared/navBar.ts`. This ticket needs to decide the actual sharing mechanism, not just declare "share it":

- Where does the one master file live (`shared/favicon.png`, or elsewhere)?
- What copies it into each Tool's own `public/` folder, and when — a step added to `scripts/build-hub.mjs` (already the multi-Tool build orchestrator per the Hub map's ticket 17), a small standalone script, or a pre-build npm hook per Tool?
- Does `ew_wiki` need an explicit `favicon:` entry in `astro.config.mjs` regardless, since Starlight won't pick up a `public/` file automatically the way a plain Vite app does? (confirm against Starlight's docs before assuming)
- One format (PNG or SVG) for all 3, or does each site legitimately need its own format/sizes (e.g. Starlight's own favicon schema, Apple touch icon conventions)? Source-verify before assuming PNG-everywhere is correct.

## Answer

Confirmed the real image first: `public/favicon.png` is a real hand-drawn hammer icon — the toolkit's actual brand mark, already correct on the landing page and `ewp_validator`. `ew_wiki/public/favicon.svg` was a completely different file (696B vs 3.7KB) — source-verified against Starlight's own `FaviconSchema` (`node_modules/@astrojs/starlight/dist/schemas/favicon.js`): it defaults to `/favicon.svg` when `astro.config.mjs` doesn't set a `favicon:` option, which it never did — `ew_wiki` was serving Starlight's own generic default icon, never the toolkit's, confirmed by byte-diffing the file (a plain sparkle/compass shape, nothing hammer-related).

**Mechanism** (a favicon is a static binary asset, not shareable as imported code the way the nav bar was — "1 master" here means 1 real source file, copied into place, not 1 file every consumer reads directly):
- **`shared/favicon.png`** — the one canonical master, a copy of the real hammer icon.
- **`scripts/sync-favicon.mjs`** — copies the master into `public/favicon.png`, `ewp_validator/public/favicon.png`, `ew_wiki/public/favicon.png`. Wired as each of the 3 Tools' own `predev`/`prebuild` npm script (`package.json`) — self-heals on every build/dev start, nothing to remember to run separately.
- **`ew_wiki/astro.config.mjs`** — added the missing explicit `favicon: '/favicon.png'`, so Starlight stops silently defaulting to its own bundled icon regardless of what's in `public/`.
- Deleted the stale `ew_wiki/public/favicon.svg`.

**Verified**: ran the sync script, confirmed all 3 `public/favicon.png` files + the `shared/` master are byte-identical (same MD5). Rebuilt the full combined hub via WSL — all 3 pages' built HTML now link `favicon.png` (`<link rel="icon" ... href=".../favicon.png">`), and the built `ew_wiki/dist/favicon.png` byte-diffs identical to the master. No more Starlight default anywhere.
