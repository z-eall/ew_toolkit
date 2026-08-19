# Verify objectData/pokeData's field-name lists against EWP's `ObjectData`/`PokeData` classes

Type: research
Status: resolved
Blocked by: (none)

## Question

`objectData` and `pokeData` in `ewp_validator/schema/generate.mjs` (both
`additionalProperties: false`) model EWP's `ObjectData` and `PokeData`
classes (`ExpandWorldPrefabs/PrefabData.cs`) — `PokeData` extends `ObjectData`
in C#, and the schema mirrors that by spreading `objectDataBaseProperties`
into both.

Verify against current `main` branch source
(https://github.com/JereKuusela/valheim-expand_world_prefabs):

1. **Completeness**: every public field on `ObjectData` present in the
   schema's shared `objectDataBaseProperties`? Every field specific to
   `PokeData` (beyond what it inherits) present in `pokeData`'s own
   properties?
2. **No stale fields**: every schema property still real in source?
3. **Structural shape**: does `PokeData` still literally extend `ObjectData`
   in current source, or has that relationship changed? Confirm the
   inheritance assumption the schema is built on still holds.
4. **The `objects`/`bannedObjects` dual-format union**: the schema accepts
   either a nested `objectData` object OR a legacy single-line string
   (`objectOrLegacyString`, citing a `Object(string line)` constructor in
   `PrefabData.cs`). Confirm that constructor still exists and still parses
   the same way.

Current schema: `ewp_validator/schema/generate.mjs`, `const objectData =` and
`const pokeData =`. Background: [research/02-schema-source.md](../../ew_toolkit/research/02-schema-source.md).

## Answer

No gap found. Fetched current `main` branch `ExpandWorldPrefabs/PrefabData.cs` (875 lines) and
checked field-by-field against `generate.mjs`:

1. **Completeness**: all 14 `ObjectData` C# fields (`PrefabData.cs:682-712`) are present in the
   schema's `objectDataBaseProperties` (`generate.mjs:171-183`). The schema's two extra keys,
   singular `filter`/`bannedFilter`, aren't stale/fabricated — they're the pre-existing, already-cited,
   live-tested precedent from ticket 08 (documented in `generate.mjs:45-48`, corroborated by
   `research/02-schema-source.md:42-49`), not a gap this round needed to flag.
2. **No stale fields**: confirmed none.
3. **`PokeData`-specific fields**: all 12 fields on `PokeData` (`PrefabData.cs:655-681`) match the
   schema's `pokeData` properties (`generate.mjs:198-209`) exactly, 1:1, same order.
4. **Structural shape**: `PokeData : ObjectData` inheritance still holds literally in current source
   (`PrefabData.cs:655`); the schema's spread of `objectDataBaseProperties` into `pokeData`
   (`generate.mjs:197`) correctly mirrors this.
5. **Dual-format union**: the legacy `Object(string line)` constructor still exists
   (`PrefabData.cs:569-606`) with the same unchanged 6-slot positional parse (prefab, distance-range,
   filter, weight, height-range, condition), so `objectOrLegacyString` (`generate.mjs:240`) remains
   correct as-is.

No schema change recommended. Full findings: [research/03-object-and-poke-data-fields.md](../research/03-object-and-poke-data-fields.md).
