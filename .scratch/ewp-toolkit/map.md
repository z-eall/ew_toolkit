# EWP Toolkit — Map

## Destination

A public, cost-free, self-updating web app ("EWP Toolkit") where a scripter opens one EWP YAML file or a batch of files and gets structural validation (bad keys, wrong types, spelling — flagged with exact file/line location) plus key/type autocomplete, each file checked independently. It runs on a JSON Schema built fresh from Jere's EWP source, regenerated and redeployed automatically by a scheduled GitHub Action, so it stays paired with EWP updates with no manual work. The schema/validation logic is architected as a reusable package so a VS Code extension is a cheap follow-on later (not part of this map).

Reaching the destination means: a scripter can hit a public URL, load one file or a batch, and get accurate structural errors plus autocomplete, with zero ongoing manual maintenance to keep pace with Jere's updates.

## Notes

- Domain: Valheim modding / EWP YAML scripting. See [CONTEXT.md](../../CONTEXT.md) for glossary (EWP, WEC, Scripter, Schema, Structural validation, Data-aware autocomplete, Cross-file reference, Batch validation).
- Skills every session should consult: `/grilling` and `/domain-modeling` for any ticket touching terminology or open decisions; `/research` for the AFK research tickets.
- Standing preference: cost stays at $0 — GitHub free tier only (Pages + Actions), no paid hosting/services.
- Prefer reusing existing free/open tooling (Monaco + monaco-yaml) over building a custom editor/validator from scratch.
- Independent from the existing `valheimtools.stream` tool/schema — used only as a cross-check reference (`https://valheimtools.stream/ewp.json`), not a dependency or source of truth.
- Local project root: `C:\Users\Ultimate\Claude\EWP_toolkit`, git-initialized locally. GitHub remote not yet created — see ticket 01.
- Reference repos: EWP (https://github.com/JereKuusela/valheim-expand_world_prefabs), WEC (https://github.com/JereKuusela/valheim-world_edit_commands, data docs at README_data.md).

## Decisions so far

- [What's the technical shape of a Monaco-based validator on GitHub Pages + Actions?](issues/05-web-app-mechanics.md) — Confirmed $0-forever. Vite as bundler (monaco-yaml requires one), schema bundled at build time, single combined `schedule`-triggered workflow (regen + build + deploy) — a two-workflow split would silently break since `GITHUB_TOKEN` can't chain workflows. Full findings: [research/05-web-app-mechanics.md](research/05-web-app-mechanics.md).

## Not yet specified

- UI/UX design of the validator page (layout, error display style, file-upload vs. drag-drop vs. folder picker) — a `/prototype` question, framework (Vite) now decided.
- Repo structure/scaffold: how the schema-generation script, the web app, and the single combined GitHub Actions workflow (schema regen + build + deploy, per ticket 05) are organized within one repo, plus the one-time Pages "Build and deployment source → GitHub Actions" setting.
- Version-picker dropdown implementation, if ticket 03 finds multi-version schema generation feasible.
- Reference-checking (same-file and/or cross-file) implementation, if ticket 04 finds it feasible without full data-aware work.
- Branding/naming polish (repo name, site title/domain) beyond the working name "EWP Toolkit."
- Contribution/license posture now that public release is intended (e.g. MIT license, README, how community feedback/issues get handled).

## Out of scope

- Goal 2 (AI-assisted YAML authoring/optimization prompts) — future map once Goal 1 ships.
- Goal 3 (local + FTP live environment integration/organization) — future map once Goal 1 ships.
- Goal 4 (companion mod development in Jere's style) — future map once Goal 1 ships.
- VS Code extension build — deliberately deferred; only the reusable schema/validation package is in scope now.
- Data-aware autocomplete/validation (real prefab/item value suggestions, full game-data index) — deferred past v1.
- Any collaboration with, or dependency on, the existing `valheimtools.stream` tool/schema owner — building fully independently.
