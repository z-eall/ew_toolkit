# Verify spawnData's field-name list and structural shape against EWP's `SpawnData` class

Type: research
Status: resolved
Blocked by: (none)

## Question

`spawnData` in `ewp_validator/schema/generate.mjs` (`additionalProperties: false`)
is modeled on EWP's `SpawnData` class (`ExpandWorldPrefabs/PrefabData.cs`),
used for `spawn:`/`swap:` array items.

Verify against current `main` branch source
(https://github.com/JereKuusela/valheim-expand_world_prefabs):

1. **Completeness**: every public field on `SpawnData` has a matching schema
   property? List anything missing.
2. **No stale fields**: every schema property still real in source?
3. **Structural shape**: field types (string/number/bool-or-string per the
   project's existing typing policy, ticket 09) match source. Flag anything
   the schema treats as a plain string that source treats as a nested
   object/array, or vice versa.
4. **Legacy/alias names**: check `docs/legacy.md` for any old spawn-related
   field names still accepted.

Current schema: `ewp_validator/schema/generate.mjs`, `const spawnData =`.
Background: [research/02-schema-source.md](../../ew_toolkit/research/02-schema-source.md).

## Answer

No gap found. `spawnData` in `generate.mjs` (lines 144–169) matches EWP's current `SpawnData`
class (`PrefabData.cs` lines 323–363, re-verified against `main` on 2026-08-19) field-for-field:
all 19 fields present on both sides in the same order, no stale schema properties, and every
field's `str`/`numberOrString`/`boolOrString` typing is confirmed correct by tracing it through the
`Spawn(SpawnData data, ...)` constructor's `DataValue.*` consumption. The parent-level `spawn`/
`swap` (nested-object array) vs. `spawns`/`swaps` (legacy-string array) split is genuinely four
separate C# fields, not a per-item dual-format union (unlike `objects`/`bannedObjects`), and the
schema already models it correctly. No schema change recommended.

Full citations and field-by-field table: [research/02-spawn-data-fields.md](../research/02-spawn-data-fields.md).
