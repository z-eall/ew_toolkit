# EW Toolkit Hub — Map

Labels: wayfinder:map

## Destination

A public, $0-cost "EW Toolkit" hub at one GitHub Pages URL — one repo, one deploy — where a landing page at the root lists and links to each Tool, and each Tool builds independently into its own subpath (e.g. `/ewp_validator/`). The EWP validator is absorbed in as Tool #1.

Reaching the destination means: a visitor lands on the hub root, sees available Tools, opens one at its subpath, and a developer has a clear, repeatable mechanism for adding Tool #2 at a new subpath (whatever it turns out to be) without re-architecting the hub.

## Notes

- Domain: Valheim modding / EWP-family tooling. See [CONTEXT.md](../../CONTEXT.md) for glossary — this map introduces EW Toolkit, Tool, Hub, Landing page, Subpath, Tool registration.
- This map builds directly on the validator's own frozen map ([map.md](map.md)) — the validator is absorbed here as Tool #1, not rebuilt from scratch.
- Skills every session should consult: `/grilling` and `/domain-modeling` for any ticket touching terminology or open decisions; `/research` for AFK research tickets; `/prototype` for the landing page's visual design.
- Standing preferences carried over: $0 cost (GitHub Pages + Actions free tier only, no paid hosting); reuse existing free/open tooling over custom builds; minimal-tooling ethos (the validator's map chose one root `package.json`, no workspace tooling — this map continues that unless it proves painful).
- Local project root: `C:\Users\Ultimate\Claude\ew_toolkit` (git repo, GitHub remote https://github.com/z-eall/ew_toolkit.git). Renamed from `ewp_toolkit` on both GitHub and locally as part of [ticket 16](issues/16-restructure-into-hub-layout.md)'s restructuring, superseding the old map's ticket 14.
- Architecture locked during charting (2026-08-17):
  - Same repo, restructured in place (not a new repo) — preserves git history for free.
  - Each Tool keeps its own `package.json`/`vite.config`; a root build step runs each and copies output into `dist/<subpath>/` — no workspace/monorepo tooling (npm workspaces, Turborepo, Nx) unless plain scripts prove painful.
  - Landing page is its own small Vite/TS app (vanilla, no framework), matching the validator's existing `src/main.ts` style.
  - New Tools register via a hardcoded list (name/subpath/description) in the landing page source for v1 — no auto-discovery/manifest scanning.

## Decisions so far

- [Rename repo to `ew_toolkit` and restructure into hub layout](issues/16-restructure-into-hub-layout.md) — subfolder is `ewp_validator`; validator moved in, minimal placeholder landing page added at root. GitHub rename, local folder rename, and remote repoint are all done; `.scratch/ewp-toolkit/` was also standardized to `.scratch/ew_toolkit/` (underscore, matching convention).
- [Build the multi-tool build/deploy pipeline](issues/17-multi-tool-build-pipeline.md) — `scripts/build-hub.mjs` builds the landing page + each Tool and combines into `dist/<subpath>/`; CI updated to install/test/build both projects and deploy the combined artifact. Adding Tool #2 later just means adding it to the script's `tools` array. Still can't push/deploy until the GitHub rename happens (both `vite.config.ts` `base`s assume `ew_toolkit`).

## Not yet specified

- **Does the Tool-adding mechanism actually hold up a second time?** Absorbing the validator as Tool #1 proves the mechanism once, but genuinely validating "adding a Tool" as repeatable needs a real Tool #2 — which is out of scope for this map (see below). Revisit once a Tool #2 is chosen.
- **Landing page tagline/branding polish beyond layout** — carried over from the old map's ticket 14 as a still-open cosmetic bit; can be decided during ticket 18's prototyping or left off entirely.

## Out of scope

- **Choosing or building Tool #2** — this map decides only the mechanism for adding a Tool, not which mod/utility comes next or how it works. Separate future map, mirroring how the validator got its own.
- **General Valheim world-editing scope widening** beyond Jere Kuusela's mods — speculative future tier per ticket 15 on the validator's map, not pre-built for here.
- **Validator page layout tweaks** (the sidebar/editor/Problems panel from the validator's ticket 11) — belongs as a fast-follow ticket on the validator's own (frozen) map, not this one. Not tracked anywhere until the user opens that ticket there.
- **Live-edit-and-save-back-to-local-disk feature** for the validator's editor — same as above: a validator feature, belongs on the validator's own map as a fast-follow ticket, not this hub map.
- **Auth, analytics, or any dynamic backend** — the hub stays a pure static site, same as the validator today.
- **Auto-discovery/manifest-based Tool registration** — deferred past v1's hardcoded list; revisit only if managing the list by hand becomes painful.
