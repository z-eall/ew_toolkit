# EWP Toolkit

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
A value in one EWP YAML file that points at an id/key defined in a *different* EWP YAML file — the correlated-systems pain point driving multi-file support. Whether this is checkable without full data-aware groundwork is an open research question.

**Batch validation**:
Opening/uploading multiple EWP YAML files at once, each validated independently against the schema, with per-file, per-line error locations. Core v1 capability alongside single-file validation.

**EWP rule entry**:
A YAML list item shaped like EWP's own `Data` structure (`prefab`/`type`/filters/actions/etc.) — one of four legal shapes that can appear in a script file's top-level array.
_Avoid_: "script entry" (ambiguous with the other three shapes below)

**WEC data entry**:
A YAML list item with a `name:` key plus typed value lists (`ints`, `floats`, `strings`, etc.) — WEC's reusable data template, referenced by an EWP rule entry's `data:` field.

**Value entry / Value group**:
WEC's `value:` and `valueGroup:` list-item shapes — a value entry defines a single substitutable value; a value group randomly picks one value from a named pool. Both can appear anywhere in the same array as EWP rule entries and WEC data entries.

**Discriminator-less array**:
The fact that EWP rule entries, WEC data entries, value entries, and value groups all share one YAML list with no tag/type field distinguishing them — entry kind must be inferred structurally (which keys are present), not read off a field. Central constraint on how the schema's top-level shape has to work (a `oneOf` union, not one flat object).
