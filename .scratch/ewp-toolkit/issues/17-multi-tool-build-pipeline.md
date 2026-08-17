# Build the multi-tool build/deploy pipeline

Type: task
Status: resolved
Blocked by: [16-restructure-into-hub-layout.md](16-restructure-into-hub-layout.md)

## Question

Extend the validator's existing single GitHub Actions workflow (`.github/workflows/`) so it builds every Tool independently (each keeps its own `package.json`/`vite.config`, per this map's Notes) and the landing page, copies each build's output into `dist/<subpath>/`, and deploys the combined `dist/` as one GitHub Pages artifact.

Needs to preserve what already works: the existing workflow's daily-scheduled schema regeneration + build + deploy for the validator (see the validator map's [ticket 05](05-web-app-mechanics.md)) must keep working once it's one step among several, not the whole workflow.

Plain root build scripts only — no workspace/monorepo tooling (npm workspaces, Turborepo, Nx) per this map's Notes, unless resolving this ticket surfaces a real reason plain scripts don't hold up.

## Answer

**Resolved 2026-08-17.** Added `scripts/build-hub.mjs`: a plain Node script (no workspace/monorepo tooling) that builds the landing page (`npm run build` at root, into `dist/`), then loops over a `tools` list (currently just `ewp_validator`) building each (`npm run build` in that Tool's folder) and copying its own `dist/` into `dist/<tool>/`. Exposed as `npm run build:hub` at root.

Updated `.github/workflows/build-deploy.yml`:
- `npm ci` at root and in `ewp_validator` (separate lockfiles, so both need their own install — dropped `setup-node`'s `cache: npm`, which only auto-detects a single root lockfile, in favor of correctness over speed for now).
- `npm test` in `ewp_validator` only (root landing page has no tests yet).
- `npm run build:hub` replaces the old plain `npm run build`, still runs before `upload-pages-artifact`, still uploads the same `dist` path — deploy step untouched.
- Preserved the existing triggers (push to main, daily schema-refresh schedule, manual dispatch) and the single-workflow design (see the workflow's own header comment on why a two-workflow split doesn't work here).

Verified locally: `npm run build:hub` produces `dist/index.html` + `dist/assets/` (landing page) and `dist/ewp_validator/index.html` + `dist/ewp_validator/assets/` (validator). Served the output with `vite preview --outDir dist` (which respects the configured `base`) and confirmed both `http://localhost:4173/ew_toolkit/` and `http://localhost:4173/ew_toolkit/ewp_validator/` resolve (200s, correct asset paths) — matching the `/ew_toolkit/...` base both `vite.config.ts` files already assume.

Adding a Tool #2 later means: give it its own `package.json`/`vite.config.ts` (with the matching subpath `base`), add it to the `tools` array in `scripts/build-hub.mjs`, and register it in the landing page's hardcoded list ([ticket 18](18-landing-page-prototype.md) territory). No CI changes needed for that case.

**Not yet safe to push/deploy** — same caveat as ticket 16: both `vite.config.ts` `base` values assume the renamed `ew_toolkit` repo, so the live Pages deploy will 404 until the GitHub rename actually happens (see ticket 16's outstanding `[USER]` steps).
