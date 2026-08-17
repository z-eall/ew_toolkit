# Decide repo structure/scaffold and initial bootstrapping

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Decide how `ewp_toolkit` is laid out now that the technical shape (Vite, Monaco/monaco-yaml, single combined schedule-triggered GitHub Actions workflow per ticket 05) and validation approach (tickets 06/08/09/10) are settled:

- Directory layout: where does the schema-generation script live vs. the web app vs. the GitHub Actions workflow file(s)?
- The one-time GitHub Pages "Build and deployment source → GitHub Actions" repo setting needs to be switched manually (per ticket 05) — when does that happen relative to the first working build?
- License: given the public/cost-free-for-community intent (from the original scoping), add a license now (e.g. MIT), or defer until there's actual code to license?
- Bare-minimum README: worth adding now for anyone who stumbles on the repo mid-build, or wait until v1 is functional?

See tickets [05](05-web-app-mechanics.md) and [10](10-discriminatorless-array-prototype.md) for the technical decisions this scaffolding needs to reflect.

## Answer

- **Directory layout**: `.github/workflows/build-deploy.yml` (single combined workflow, per ticket 05); `schema/generate.mjs` (plain Node script, no separate package.json); `src/main.ts` (Monaco + monaco-yaml wiring, structural pre-check per ticket 10) + `src/schema.generated.json` (gitignored, written by `generate.mjs` before build, not committed — avoids stale-schema drift in git history); `index.html`/`vite.config.ts`/`package.json` at repo root. One shared root `package.json` for the whole repo — no monorepo/workspace tooling, this project is too small to need it.
- **Pages source setting**: flip **now**, as part of this scaffolding pass, not after the first build attempt — `actions/deploy-pages` fails without it regardless of code correctness, so doing it first avoids a confusing false-negative failure later. **Done** — repo owner switched `github.com/z-eall/ewp_toolkit` → Settings → Pages → "Build and deployment" → Source to **"GitHub Actions."**
- **License**: **MIT, added now** — done as part of this ticket. Matches the project's public/cost-free/community-contribution intent from the original scoping; removes the all-rights-reserved-by-default gap on an already-public repo.
- **README**: **minimal version added now** — done as part of this ticket. States project name, one-line description, current status (early planning, not yet usable), and points at the map for anyone who wants the full picture.

Directory skeleton (`.github/workflows/`, `schema/`, `src/`) is not created empty in this pass — git doesn't track empty directories, and actual code content goes in during the build phase, which is out of this map's scope (planning/decisions only).
