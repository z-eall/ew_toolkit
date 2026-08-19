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
- [Prototype the landing page](issues/18-landing-page-prototype.md) — Row layout (button per Tool + description beside it, styled after https://valheimtools.stream/'s row list but in this map's own minimalist dark chrome, not that site's colors), a tagline subtitle under the h1, and a light/dark theme toggle (dark default, persisted in `localStorage`) — the toggle wasn't one of the original open questions, added during user review. Shipped directly to `src/main.ts`/`src/style.css`. Follow-on same session: fixed top nav (Home, Tools in order, Support always last) persistent across every page including the validator, plus a placeholder Support page (`/support/`, donation links TODO) — see ticket 18's Answer for the full breakdown.
- [Standing rule for icon/symbol consistency in user-facing text vs. UI chrome](issues/19-icon-symbol-consistency-standing-rule.md) — Diagnosis-message UI hints (message-quality checklist item 7) must name a control in plain words only, never an emoji/glyph — message text is escaped (XSS boundary) and can never actually carry a symbol matching the real button. Compared three mocked-up options (plain text / trailing icon / accent bar) plus an inline-mid-sentence icon variant; picked plain text for zero added cost to the clipboard/copy-export path. Surfaced a broader need, tracked separately: [Add a shared icon/token module](issues/20-shared-icon-token-module.md).
- [Add a shared icon/token module; migrate the validator to it and fix existing drift](issues/20-shared-icon-token-module.md) — New `shared/` directory holds the icon-path registry and identity color palette (bg/panel/border/text/muted/hover); both `tsconfig.json`s widened to reach it, no workspace tooling added. `src/nav.ts` and `ewp_validator/src/main.ts` migrated to import icons instead of copy-pasting them; both `style.css` files migrated to reference the shared identity tokens. Fixed the `--info` drift (Landing page's reused-as-text-color variable renamed, no longer colliding with the validator's actual severity blue). Severity colors stay validator-local by design — see message-quality checklist item 8.

## Not yet specified

- **Does the Tool-adding mechanism actually hold up a second time?** Absorbing the validator as Tool #1 proves the mechanism once, but genuinely validating "adding a Tool" as repeatable needs a real Tool #2 — which is out of scope for this map (see below). Revisit once a Tool #2 is chosen.
- **The theme-toggle mechanism itself is still duplicated**, not just its colors/icons. `src/nav.ts` and `ewp_validator/src/main.ts` each independently implement the same `localStorage`-backed dark/light toggle logic — spotted while resolving [Add a shared icon/token module](issues/20-shared-icon-token-module.md), but a behavior change (not just values) is a bigger, riskier migration than that ticket's scope, so it wasn't folded in. Revisit once there's a second real Tool to prove the shared-behavior pattern against, same reasoning as the Tool-adding-mechanism item above.

## Out of scope

- **Choosing or building Tool #2** — this map decides only the mechanism for adding a Tool, not which mod/utility comes next or how it works. Separate future map, mirroring how the validator got its own.
- **General Valheim world-editing scope widening** beyond Jere Kuusela's mods — speculative future tier per ticket 15 on the validator's map, not pre-built for here.
- **Validator page layout tweaks** (the sidebar/editor/Problems panel from the validator's ticket 11) — belongs as a fast-follow ticket on the validator's own (frozen) map, not this one. Not tracked anywhere until the user opens that ticket there.
- **Live-edit-and-save-back-to-local-disk feature** for the validator's editor — same as above: a validator feature, belongs on the validator's own map as a fast-follow ticket, not this hub map.
- **Auth, analytics, or any dynamic backend** — the hub stays a pure static site, same as the validator today.
- **Auto-discovery/manifest-based Tool registration** — deferred past v1's hardcoded list; revisit only if managing the list by hand becomes painful.
