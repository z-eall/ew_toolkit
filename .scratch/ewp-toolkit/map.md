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
- Local project root: `C:\Users\Ultimate\Claude\ewp_toolkit`, git-initialized locally. GitHub remote: https://github.com/z-eall/ewp_toolkit.git.
- Reference repos: EWP (https://github.com/JereKuusela/valheim-expand_world_prefabs), WEC (https://github.com/JereKuusela/valheim-world_edit_commands, data docs at README_data.md).

## Decisions so far

- [Set up GitHub account and EWP Toolkit repo](issues/01-github-setup.md) — Repo created at https://github.com/z-eall/ewp_toolkit; local folder renamed to `ewp_toolkit` to match; remote wired, not yet pushed.
- [What's the technical shape of a Monaco-based validator on GitHub Pages + Actions?](issues/05-web-app-mechanics.md) — Confirmed $0-forever. Vite as bundler (monaco-yaml requires one), schema bundled at build time, single combined `schedule`-triggered workflow (regen + build + deploy) — a two-workflow split would silently break since `GITHUB_TOKEN` can't chain workflows. Full findings: [research/05-web-app-mechanics.md](research/05-web-app-mechanics.md).
- [Can key references be validated without full data-aware game data?](issues/04-reference-validation-feasibility.md) — Yes for `data.yaml` named templates (clean definition/usage pair, same-file and cross-file, no game data needed) — the concrete v1 feature. Custom saved keys are a weaker best-effort warning. Prefab names, global keys, and event names must wait. Full findings: [research/04-reference-validation-feasibility.md](research/04-reference-validation-feasibility.md).
- [Can EWP schema generation support multiple mod versions?](issues/03-multi-version-feasibility.md) — Ship latest-only for v1. No GitHub tags/releases exist; `publish/manifest.json`'s commit history gives a reliable ~30-version history instead, and the schema does change meaningfully across versions, so version-picker is a well-scoped ~1-2 day fast-follow once v1 is stable, not a v1 requirement. Full findings: [research/03-multi-version-feasibility.md](research/03-multi-version-feasibility.md).
- [How is EWP's YAML structure documented/derivable from Jere's repo?](issues/02-schema-source.md) — Docs + C# source together get most of the way, but a real residual gap exists: core YAML deserialization/coercion logic lives in a closed-source shared library, so at least one discrepancy (`filter`/`bannedFilter`) can't be settled from public material. Top level is a discriminator-less array needing a `oneOf` union; ~70 fields are C#-typed as string but semantically bool/number/enum with a function-syntax escape hatch; requiredness is conditional on `type`, not flat. Full findings: [research/02-schema-source.md](research/02-schema-source.md).
- [Resolve the `data:`/`name:` entry-key discrepancy in WEC's data system](issues/07-wec-entry-key-discrepancy.md) — Definitively resolved via source: `name:` is the only valid key for a WEC data entry's name property; `data:` is a copy-paste typo confined to one section of WEC's README, not a real alias — following it silently drops the entry. Schema accepts only `name:`, optionally lint-flags `data:` in that position. Full findings: [research/07-wec-entry-key-discrepancy.md](research/07-wec-entry-key-discrepancy.md).
- [Scope the data.yaml reference-validation feature for v1](issues/06-reference-validation-scope.md) — Undefined `data:` reference is a hard error; dead `data.yaml` entry is a low-severity info hint; custom-saved-key mismatch ships in v1 as a warning that points the user at `ewp_data.yaml` to verify before treating it as a real bug, rather than being deferred outright.
- [Decide policy for schema gaps where source/docs disagree or are closed-source](issues/08-gap-handling-policy.md) — `filter`/`bannedFilter` singular forms confirmed valid via live in-game testing (scalar shorthand for the plural list) — corrects ticket 02's "unresolvable" framing. `component.m_field`-style data keys validate as unconstrained strings, not a pattern (WEC's `data set=` command allows arbitrary custom key names too). Two `paint` enums scoped per-location. Deprecation follows Jere's own `docs/legacy.md`, no invented opinions.
- [Decide type-validation strategy given ~70 nullable-string C# fields with documented semantic types](issues/09-type-validation-strategy.md) — Enum fields (`type`, `paint`) validate strictly against the known list; bool/number-with-alt-syntax fields (`chance`, `admin`, etc.) accept the native type or an unconstrained string, no narrow function-only pattern. Conditional requiredness scoped to just `prefab`-required-per-`type`, modeled as a warning (mirrors EWP's own runtime severity) — no full per-type field-relevance matrix for v1.

## Not yet specified

- UI/UX design of the validator page (layout, error display style, file-upload vs. drag-drop vs. folder picker) — a `/prototype` question, framework (Vite) now decided.
- Repo structure/scaffold: how the schema-generation script, the web app, and the single combined GitHub Actions workflow (schema regen + build + deploy, per ticket 05) are organized within one repo, plus the one-time Pages "Build and deployment source → GitHub Actions" setting.
- Version-picker dropdown as a post-v1 fast-follow (deferred, not blocking this map — see ticket 03's decision).
- Branding/naming polish (site title/domain) beyond the working name "EWP Toolkit" — repo itself is now named `ewp_toolkit` at https://github.com/z-eall/ewp_toolkit.
- Contribution/license posture now that public release is intended (e.g. MIT license, README, how community feedback/issues get handled).

## Out of scope

- Goal 2 (AI-assisted YAML authoring/optimization prompts) — future map once Goal 1 ships.
- Goal 3 (local + FTP live environment integration/organization) — future map once Goal 1 ships.
- Goal 4 (companion mod development in Jere's style) — future map once Goal 1 ships.
- VS Code extension build — deliberately deferred; only the reusable schema/validation package is in scope now.
- Data-aware autocomplete/validation (real prefab/item value suggestions, full game-data index) — deferred past v1.
- Any collaboration with, or dependency on, the existing `valheimtools.stream` tool/schema owner — building fully independently.
