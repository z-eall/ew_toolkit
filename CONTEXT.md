# EW Toolkit

QoL tooling for scripters who write YAML for Jere's ExpandWorld mod series in Valheim. This context covers the terminology for the tooling project itself, not Valheim or the mods' in-game mechanics.

## Language

**ExpandWorld (EW)**:
Jere Kuusela's family of Valheim mods (ExpandWorld Data, Prefabs, Events, etc.) that let users customize world/creature/item behavior via YAML config files.
_Avoid_: "the mod series" (be specific about which plugin when it matters)

**EWP (ExpandWorld Prefab)**:
The specific ExpandWorld plugin for defining and customizing prefabs (spawned objects, custom systems) via YAML. The primary target of this toolkit.
_Avoid_: "the prefab mod"

**WEC (World Edit Commands)**:
Jere's separate mod providing in-game admin commands and a related data system (e.g. random loot tables) that scripters reference alongside EWP. Treated as a secondary/reference source, not the primary target.

**Scripter**:
A Valheim player/modder who writes EWP YAML to build custom in-game systems or content, without necessarily writing C# mod code.
_Avoid_: "user" (ambiguous with tool end-users generally), "modder" (implies C# code authorship)

**Schema**:
A machine-readable definition of EWP's valid YAML keys, value types, and constraints, derived from Jere's source/docs, used to drive validation and autocomplete.
_Avoid_: "spec" (reserve for the toolkit's own planning specs, not EWP's structure)

**Structural validation**:
Checking a YAML document against the schema alone — valid keys, correct value types, spelling — with no lookups against actual game/EWP data. The v1 validation tier.
_Avoid_: "syntax validation" (undersells it — this checks schema conformance, not just YAML syntax)

**Data-aware autocomplete**:
Suggestions or checks that require real EWP/game data beyond the schema shape, e.g. confirming a referenced prefab name actually exists in-game. Deferred past v1.
_Avoid_: "smart autocomplete"

**Cross-file reference**:
A value in one EWP YAML file that points at an id/key defined in a *different* EWP YAML file — the correlated-systems pain point driving multi-file support. Resolved by [[Reference validation]] for the `data.yaml` namespace and, as a best-effort lint, for [[Custom saved key]]s; prefab names, global keys, and event names still need data-aware groundwork and remain unchecked.

**Batch validation**:
Opening/uploading multiple EWP YAML files at once, each validated independently against the schema, with per-file, per-line error locations. Implemented as the sidebar file list + Problems panel layout (ticket 11).

**Structural pre-check**:
The mechanism behind [[Structural validation]] for the [[Discriminator-less array]]: guess an array entry's intended shape (EWP rule entry / WEC data entry / value entry / value group) from which distinguishing keys are present, then validate against only that one shape's schema. Chosen over a naive `oneOf` because the union alone produces 13-15 unscoped errors per typo (see `prototype/oneof-union-error-quality`) — `oneOf` stays only the acceptance mechanism, never the error-reporting source.

**Reference validation**:
The v1 implementation of [[Cross-file reference]] checking, scoped to the one namespace with a clean structural definition/usage split: a `name:` entry anywhere in the loaded batch defines a `data.yaml` identifier; a bareword `data:`/`addItems:`/`removeItems:`/`drops:` value elsewhere in the batch (same file or not) uses it. An undefined reference is a hard error; a defined-but-unused entry is a low-severity hint. Distinct from [[Data-aware autocomplete]], which needs real game data this doesn't.

**Custom saved key**:
A scripter-chosen identifier written via the `<save_X_Y>` string template and read via `keys:`/`bannedKeys:`/`type: key` or the `<load_X>`/`<clear_X>` templates. [[Reference validation]] flags a one-sided read-without-write or write-without-read within the loaded batch as a warning, not an error — a key can legitimately be written by another mod or a console command outside the batch, so the check points the scripter at `expand_world/ewp_data.yaml` to verify rather than asserting a bug. Distinct from global keys, which are deliberately not checked (too many are set by vanilla game logic, not scripter YAML).

**EWP rule entry**:
A YAML list item shaped like EWP's own `Data` structure (`prefab`/`type`/filters/actions/etc.) — one of four legal shapes that can appear in a script file's top-level array.
_Avoid_: "script entry" (ambiguous with the other three shapes below)

**WEC data entry**:
A YAML list item with a `name:` key plus typed value lists (`ints`, `floats`, `strings`, etc.) — WEC's reusable data template, referenced by an EWP rule entry's `data:` field.

**Value entry / Value group**:
WEC's `value:` and `valueGroup:` list-item shapes — a value entry defines a single substitutable value; a value group randomly picks one value from a named pool. Both can appear anywhere in the same array as EWP rule entries and WEC data entries.

**Discriminator-less array**:
The fact that EWP rule entries, WEC data entries, value entries, and value groups all share one YAML list with no tag/type field distinguishing them — entry kind must be inferred structurally (which keys are present), not read off a field. Central constraint on how the schema's top-level shape has to work (a `oneOf` union, not one flat object).

**EW Toolkit** (umbrella/site):
The public site hosting all Tools for Jere Kuusela's Valheim mods, branded after the ExpandWorld flagship line. Umbrella scope is tiered: now/near-term = Jere's mods (ExpandWorld family + non-EW-named world-editing mods like WEC/SDC); future-only-if-required = general Valheim world editing. Distinct from the [[EWP Toolkit]] project, which is this specific Tool's own map/repo before the reframe.

**Tool**:
A discrete utility hosted on the [[Hub]], reachable at its own [[Subpath]]. The EWP validator is Tool #1.

**Hub**:
The [[EW Toolkit]] site's shell: a single repo, single GitHub Pages deploy, with a root landing page that lists and links to each [[Tool]]. Introduced by the [EW Toolkit Hub map](hub-map.md); not the same thing as any one Tool.

**Landing page**:
The Hub's root page — lists available Tools and links to each one's [[Subpath]]. Built as its own small Vite/TS app, matching the validator's existing tooling, no framework.

**Subpath**:
The URL path segment a Tool builds and deploys into under the Hub's single domain, e.g. `/ewp_validator/` for the validator. Each Tool's build stays independent; only the deployed output is joined under the Hub's one Pages URL.

**Tool registration**:
The mechanism by which a Tool gets listed on the [[Landing page]]. v1 is a hardcoded list (name/subpath/description) in the landing page source — no auto-discovery, since only 1-2 Tools are expected near-term.
