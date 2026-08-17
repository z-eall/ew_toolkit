# How is EWP's YAML structure documented/derivable from Jere's repo?

Type: research
Status: resolved
Blocked by: (none)

## Question

Investigate Jere's EWP repo (https://github.com/JereKuusela/valheim-expand_world_prefabs) and the related WEC repo/docs (https://github.com/JereKuusela/valheim-world_edit_commands, README_data.md) to determine:

- Does Jere maintain sufficient README/wiki documentation of valid YAML keys, types, and enums to derive a structural schema, or does it require parsing C# source code?
- What's the actual shape of the data (nesting, key names, types, enums, required/optional fields)?
- Cross-check findings against the existing third-party schema at https://valheimtools.stream/ewp.json for gaps/discrepancies — treat it only as a cross-check reference, not authoritative.

Save findings to `.scratch/ewp-toolkit/research/02-schema-source.md`.

## Answer

Docs get you most of the way, but neither docs nor C# source alone (nor both together) is fully sufficient — there's a real, permanent residual gap. Full findings: [research/02-schema-source.md](../research/02-schema-source.md).

- **Docs** (`docs/scripting.md`, `functions.md`, `RPCs.md`, `legacy.md`) are unusually thorough — a genuine field-by-field prose spec, not an overview.
- **C# source** (`PrefabData.cs`) gives the authoritative structural key list and catches confirmed doc gaps: undocumented `separate` field, undocumented `terrainHeight` shorthand, undocumented `pos`/`position` and `rot`/`rotation` key aliases.
- **Neither resolves everything**: docs describe singular `filter`/`bannedFilter` fields that don't exist in current source (only plural `filters`/`bannedFilters` do) — and this can't be settled from public material because the actual YAML deserialization/coercion logic lives in a closed-source shared library not published in any of Jere's ~40 public repos. Some behavior can only be confirmed by testing against a live server.
- Separately, WEC's `component.m_field` data-key namespace is open-ended by design (confirmed in WEC's own README) — unenumerable from any source short of reflecting over Valheim's compiled game assembly.
- **Top-level structure**: a discriminator-less heterogeneous array — EWP rule entries, WEC data entries, value entries, and value groups are legally mixed in one list with no tag field. Schema must be a `oneOf` union, not one flat object.
- **Type nuance**: ~70 EWP rule fields are typed `string?` in C# even though docs describe them as bool/number/enum, because nearly every field also accepts function/range/list syntax resolved at runtime. Schema typing should follow documented semantics + a function-pattern escape hatch, not naive C# reflection.
- **Requiredness is conditional, not flat**: every field is structurally optional; real requiredness depends on `type`'s value (e.g. `globalkey`/`key`/`custom`/`event`/`time`/`realtime` don't need `prefab`). Needs `if`/`then` schema logic, not a flat `required` list.
- **Cross-check confirmed**: the third-party schema (`valheimtools.stream/ewp.json`) is a few versions behind, missing `separate`/`terrainHeight`, has a likely type bug (`pokeParameter`), and has no `oneOf` branch for WEC entries at all — it would reject realistic mixed-content script files. Reusable idea from it: the string-or-function-pattern typing approach.
