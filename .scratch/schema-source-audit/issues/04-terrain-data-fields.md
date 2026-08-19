# Verify terrainData's field-name list and `paint` enum against EWP's `TerrainData` class

Type: research
Status: resolved
Blocked by: (none)

## Question

`terrainData` in `ewp_validator/schema/generate.mjs` (`additionalProperties: false`)
models EWP's `TerrainData` class (`ExpandWorldPrefabs/PrefabData.cs`), used
for `terrain:` array items.

Verify against current `main` branch source
(https://github.com/JereKuusela/valheim-expand_world_prefabs):

1. **Completeness**: every public field on `TerrainData` present in the
   schema? List anything missing.
2. **No stale fields**: every schema property still real in source?
3. **`terrain[].paint` enum values**: the schema's `TERRAIN_PAINT_ENUM` is
   `["ClearVegetation", "Cultivate", "Dirt", "Paved", "Reset"]`, matching C#'s
   `TerrainModifier.PaintType` enum names. Confirm that enum's current member
   list is still exactly these 5 values (not more/fewer) — note this field is
   already confirmed case-insensitive
   ([research/13-round8-type-case-sensitivity.md](../../ew_toolkit/research/13-round8-type-case-sensitivity.md)
   §2, `service/Parse.cs:427`), so only completeness of the *set*, not casing,
   needs checking here.
4. **Structural shape**: field types match source (numbers, radii, bools).

Current schema: `ewp_validator/schema/generate.mjs`, `const terrainData =`
and `TERRAIN_PAINT_ENUM`. Background: [research/02-schema-source.md](../../ew_toolkit/research/02-schema-source.md),
[research/08-gap-handling-policy...](../../ew_toolkit/issues/08-gap-handling-policy.md)
(the two separate `paint` enums, scoped per-location).

## Answer

No gap found. Full findings: [research/04-terrain-data-fields.md](../research/04-terrain-data-fields.md).

- **Completeness**: `TerrainData` (`PrefabData.cs:735-767`) has exactly 15 fields
  (`delay`, `pos`, `position`, `square`, `resetRadius`, `levelRadius`, `levelOffset`,
  `raiseRadius`, `raisePower`, `raiseDelta`, `smoothRadius`, `smoothPower`,
  `paintRadius`, `paintHeightCheck`, `paint`) — same 15, same names, as
  `terrainData` in `generate.mjs:214-235`.
- **No stale fields**: confirmed, same 1:1 match.
- **`terrain[].paint` enum**: `TerrainModifier.PaintType` is a base-game type not
  defined in the EWP repo (only consumed, via `Enum.TryParse`, at
  `service/Parse.cs:427` and `PrefabData.cs:867-869`). Best available EWP-repo
  source is `docs/scripting.md:443`, which documents exactly
  `ClearVegetation, Cultivate, Dirt, Paved and Reset` — matching
  `TERRAIN_PAINT_ENUM` exactly. Doc also states numeric values are *not* supported
  for this field, so a possible larger raw-assembly enum (if one exists) is
  explicitly out of scope for what this field accepts.
- **Structural shape**: every `TerrainData` field is `string?` in C# (expression-
  parsed via `DataValue.Float`/`.Bool`/`.Vector3`/`.String`,
  `PrefabData.cs:825-840`), matching the schema's `numberOrString`/`boolOrString`/`str`
  usage.

No schema change recommended.
