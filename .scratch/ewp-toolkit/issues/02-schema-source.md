# How is EWP's YAML structure documented/derivable from Jere's repo?

Type: research
Status: open
Blocked by: (none)

## Question

Investigate Jere's EWP repo (https://github.com/JereKuusela/valheim-expand_world_prefabs) and the related WEC repo/docs (https://github.com/JereKuusela/valheim-world_edit_commands, README_data.md) to determine:

- Does Jere maintain sufficient README/wiki documentation of valid YAML keys, types, and enums to derive a structural schema, or does it require parsing C# source code?
- What's the actual shape of the data (nesting, key names, types, enums, required/optional fields)?
- Cross-check findings against the existing third-party schema at https://valheimtools.stream/ewp.json for gaps/discrepancies — treat it only as a cross-check reference, not authoritative.

Save findings to `.scratch/ewp-toolkit/research/02-schema-source.md`.
