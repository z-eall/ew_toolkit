# Register and deploy ew_wiki

Type: task
Status: resolved
Blocked by: 07, 09

## Question

Ship v1 for real:

- Register `ew_wiki` on the landing page's hardcoded Tool list (name/subpath/description), per the hub's "Tool registration" convention.
- Wire the GitHub Actions build so `ew_wiki` deploys to its `/ew_wiki/ewp/` subpath alongside the existing Tool(s).
- Confirm the live deployed site matches the locally-verified build from ticket 07.

## Answer

Registered `ew_wiki` on the landing page (`src/main.ts`'s `tools` list, `src/nav.ts`'s `navItems`) as "Expand World Wiki," falling back to the toolbox icon like the pattern already documents. Added it to `scripts/build-hub.mjs`'s `tools` array and a matching `npm ci` step in `.github/workflows/build-deploy.yml`.

Building the full combined hub (not just `ew_wiki` alone, which every prior ticket's build-check had verified) surfaced a real, previously-undiscovered bug: `ew_wiki/astro.config.mjs`'s `base` was `/ew_wiki/`, as if it were the deploy root — but this hub is a GitHub Pages project site served at `/ew_toolkit/`, so the real path is `/ew_toolkit/ew_wiki/` (matching `ewp_validator/vite.config.ts`'s own nested base). Fixed the base, then found every hand-written cross-link across all 31 `.mdx` pages (166 occurrences) was a hardcoded `/ew_wiki/...` absolute path that Astro does not auto-rewrite for base changes — fixed those, plus one more in `index.mdx` using an `href=` attribute instead of markdown-link syntax (missed by the first regex pass). Verified via a full WSL rebuild (33 pages) and a real browser pass through the built `dist/`, following links from the landing page into the wiki and back.

Also addressed mid-ticket: the maintainer asked that entering `ew_wiki` from the hub feel like switching tabs, not leaving the site (same as `ewp_validator`). `ew_wiki`'s Starlight `Header.astro` had no connection to the hub's own nav at all. Added the hub's `site-nav` bar (Home / EWP Validator / Expand World Wiki / Support, Changelog link, theme toggle) to it, reusing `shared/icons.ts` and the `--bg`/`--panel`/`--border`/`--text`/`--muted` tokens `ew_wiki/src/styles/theme.css` already mapped from `shared/theme.css`. Starlight keeps its own separate theme-persistence key (`starlight-theme`) written by an inline anti-flash script before this component even mounts — bridged it to the hub's `ew-toolkit-theme` key on load and on toggle so a theme choice carries across the hub and the wiki in both directions (verified live: toggling in the wiki and navigating to the landing page and to EWP Validator all showed the same theme). This closes the interactive-widget-adjacent work matching what tickets 09/17-22 already established for the rest of the site.

Persisted as a standing rule (both worktrees' `AGENTS.md`, UI/UX consistency mechanism 4): every Tool must hand-render the hub's site-nav bar and use the full nested `base` path it's actually deployed at, so this exact bug-class doesn't recur for a future Tool.

The user asked this session to push everything and let CI deploy live — pushed after this ticket closed. CI's `Build and deploy` run finished green (build 49s, deploy 10s), and the live site at `https://z-eall.github.io/ew_toolkit/ew_wiki/` was confirmed directly: fully styled, hub nav present with "Expand World Wiki" active, theme toggle working. v1 is live.

