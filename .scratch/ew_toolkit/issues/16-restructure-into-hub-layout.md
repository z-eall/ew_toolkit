# Rename repo to `ew_toolkit` and restructure into hub layout

Type: task
Status: resolved
Blocked by: (none)

## Question

Restructure the current `ewp_toolkit` repo in place so it becomes the EW Toolkit hub repo: rename it, move the validator's existing source into a subfolder that will build to its own subpath, and add a new root landing page alongside it. This is the foundational step every other ticket on this map depends on.

Supersedes the validator map's [ticket 14](14-rebrand-to-ew-toolkit.md), which planned a plain rename — the hub destination needs more: the repo becomes the hub itself, not just a renamed validator. Ticket 14's rename plan (especially the `vite.config.ts` `base` gotcha) is directly reusable here.

**Known shape (from charting), to work out precisely when this ticket is resolved:**

- **[USER — GitHub settings]** Rename the repo `ewp_toolkit` → `ew_toolkit`. GitHub auto-redirects old URLs/clones. Pages URL becomes `https://z-eall.github.io/ew_toolkit`.
- **[CLAUDE]** Move the validator's current root-level source (`src/`, `schema/`, its `vite.config.ts`, etc.) into a subfolder that will build to a subpath — exact subfolder name and whether it's `/ewp_validator/` or something else is part of resolving this ticket.
- **[CLAUDE]** Add a new root-level landing page project (see ticket 18) alongside the moved validator folder.
- **[CLAUDE]** Update the validator's `vite.config.ts` `base` to match its new subpath under the renamed repo (must exactly match or assets 404 — the same gotcha ticket 14 flagged).
- **[CLAUDE]** Re-point the local git remote to `https://github.com/z-eall/ew_toolkit.git`.
- **[CLAUDE]** Display/text sweep: `index.html` title, `README.md`, `CONTEXT.md` H1, `package.json` name, this map's own file names/links if any need updating.
- **[USER or later session]** Rename the local folder `C:\Users\Ultimate\Claude\ewp_toolkit` → `ew_toolkit` — offline step, not mid-session (same reasoning as ticket 14).

Resolving this ticket should fix the exact subfolder layout and confirm the move doesn't break the validator's existing tests/build.

## Answer

**Resolved 2026-08-17.** Subfolder name is `ewp_validator` (subpath `/ew_toolkit/ewp_validator/`), matching what was floated during charting.

Done this session (`[CLAUDE]` steps):

- Moved the validator's `src/`, `schema/`, `vite.config.ts`, `tsconfig.json`, `index.html`, `package.json`, `package-lock.json` into `ewp_validator/` via `git mv` (history preserved).
- Updated `ewp_validator/vite.config.ts` `base` to `/ew_toolkit/ewp_validator/`.
- Updated `ewp_validator/package.json` name to `ewp-validator`, `ewp_validator/index.html` title to "EWP Validator".
- Added a new root-level landing page project: `package.json`, `vite.config.ts` (`base: "/ew_toolkit/"`), `tsconfig.json`, `index.html`, `src/main.ts`, `src/style.css`. Deliberately minimal/placeholder — a single hardcoded Tool entry (EWP Validator) — since visual design is [ticket 18](18-landing-page-prototype.md)'s job, not this one's.
- Display/text sweep: `README.md` rewritten for the hub, `CONTEXT.md` H1 → "EW Toolkit", `.gitignore`'s `schema.generated.json` path updated to `ewp_validator/src/schema.generated.json`.
- Confirmed the move didn't break anything: `ewp_validator` still builds (`npm run build`) and its full test suite still passes (48/48) from its new location; the new root landing page also builds and typechecks clean.

**Update 2026-08-17 (later same day):** all outstanding items done —

- **[USER]** GitHub repo renamed `ewp_toolkit` → `ew_toolkit`.
- **[USER]** Local folder renamed `C:\Users\Ultimate\Claude\ewp_toolkit` → `ew_toolkit`.
- **[CLAUDE]** Local git remote re-pointed: `git remote set-url origin https://github.com/z-eall/ew_toolkit.git`.
- **[CLAUDE]** Ticket 17 landed first, so CI already builds/tests/deploys both projects — no longer a blocker.
- **[CLAUDE]** Standardized `.scratch/ewp-toolkit/` (hyphen — a leftover from before the underscore convention was settled) to `.scratch/ew_toolkit/` via `git mv`, and swept every `.scratch/ewp-toolkit/...` path reference across the repo (workflow, `scripts/build-hub.mjs`, `ewp_validator/vite.config.ts`, `ewp_validator/schema/generate.mjs`, `src/main.ts`, `README.md`, and the map/ticket files' own internal links) to the new path. Historical prose mentioning the old `ewp_toolkit` repo name (GitHub URLs cited in older tickets, `MARKER_OWNER`/Monaco URI identifier strings) was left as-is — those are dated records or internal-only identifiers, not live paths.

Verified after the rename: `npm run build:hub` at the new root still produces the combined `dist/` (landing page + `dist/ewp_validator/`), and `ewp_validator`'s 48-test suite still passes from the new location.

This ticket is now fully closed out — nothing left outstanding.
