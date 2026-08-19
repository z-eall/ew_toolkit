# Does `ewpRuleEntry` match EWP's current `Data` class field-by-field?

Research for [issues/01-ewp-rule-entry-fields.md](../issues/01-ewp-rule-entry-fields.md). Fetched
directly from Jere Kuusela's `JereKuusela/valheim-expand_world_prefabs` repo, branch `main`, via
`raw.githubusercontent.com`, on 2026-08-19 — this is the PRIMARY SOURCE, not docs. Current published
version per `publish/manifest.json` (same fetch): `1.58.0`.

Files fetched and read in full for this research:

- `ExpandWorldPrefabs/PrefabData.cs` (875 lines)
- `ExpandWorldPrefabs/PrefabLoading.cs` (287 lines)
- `ExpandWorldPrefabs/service/Parse.cs` (448 lines)
- `ExpandWorldPrefabs/service/Yaml.cs` (439 lines)
- `docs/legacy.md` (43 lines)

Schema under audit: `ewp_validator/schema/generate.mjs`, the `ewpRuleEntry` definition (`const
ewpRuleEntry = {...}`, lines 245–348), plus its nested shapes `spawnData`, `objectData`, `pokeData`,
`terrainData`, `rpcEntry`.

---

## 1. Completeness: does every public field on `Data` have a schema property?

**No — one field is missing: the top-level `delay` field.**

`PrefabData.cs` line 137:

```csharp
[DefaultValue(null)]
public float? delay;
```

This is a real, currently-used field, distinct from `spawnDelay`. `PrefabLoading.cs` line 36:

```csharp
float? spawnDelay = data.delay == null && data.spawnDelay == null ? null : Math.Max(data.delay ?? 0f, data.spawnDelay ?? 0f);
```

`delay` and `spawnDelay` are combined (`Math.Max`) into the effective delay applied to every entry in
`spawn:`/`swap:`/`spawns:`/`swaps:` that doesn't set its own per-item `delay`. So `delay:` is a
legitimate top-level rule field today, not a doc artifact — this exact fact was already flagged once
before, in a different context: `research/02-schema-source.md` line 170 calls out that a third-party
schema (`valheimtools.stream/ewp.json`) wrongly treats `delay` as force-invalid/deprecated, when
`PrefabData.cs` line 137 shows it's real and working. That finding was about the *third-party*
schema — it was never checked against **this project's own** `ewpRuleEntry`, and `ewpRuleEntry` also
has no `delay` property (checked: not in `withFilterFields({...})`'s object literal, `generate.mjs`
lines 248–346, and no property named `delay` exists anywhere in `ewpRuleEntry`).

**Effect**: `- prefab: Foo\n  type: create\n  spawn: [...]\n  delay: 2` — a valid, real EWP script
using the shared spawn/swap delay shorthand — is currently rejected by the schema as an unknown
property (`additionalProperties: false` on `ewpRuleEntry`).

**Fix**: add `delay: numberOrString` to `ewpRuleEntry`'s properties (same kind as `spawnDelay`,
`removeDelay`, `pokeDelay` — all `numberOrString` already).

Every other field on the `Data` class (`PrefabData.cs` lines 12–181, 81 fields total) has a matching
`ewpRuleEntry` property. Full field-by-field walk (both directions) is in §2 below since it doubles
as the staleness check.

---

## 2. No stale fields: does every `ewpRuleEntry` property still exist on `Data`?

**Yes — no stale fields found.** Walked every property in `ewpRuleEntry` (`generate.mjs` lines
248–346, including the five added by `withFilterFields`) against `PrefabData.cs`'s `Data` class (lines
12–181) and confirmed each has a live C# field at the cited line:

`prefab`(15) `excludePrefab`(17) `type`(18) `types`(20) `fallback`(22) `separate`(24) `weight`(26)
`swap`(28) `swaps`(30) `spawn`(32) `spawns`(34) `spawnDelay`(36) `remove`(38) `removeDelay`(40)
`drops`(42) `data`(44) `command`(46) `commands`(48) `day`(50) `night`(52) `biomes`(54)
`bannedBiomes`(56) `minDistance`(58) `maxDistance`(60) `minAltitude`(62) `maxAltitude`(64) `minY`(66)
`maxY`(68) `minX`(70) `maxX`(72) `minZ`(74) `maxZ`(76) `environments`(78) `bannedEnvironments`(80)
`globalKeys`(82) `bannedGlobalKeys`(84) `keys`(86) `bannedKeys`(88) `events`(90) `eventDistance`(92)
`poke`(94) `pokes`(96) `pokeLimit`(98) `pokeParameter`(100) `pokeDelay`(102) `terrain`(104)
`objects`(107) `objectsLimit`(109) `bannedObjects`(111) `bannedObjectsLimit`(113) `locations`(115)
`locationDistance`(117) `bannedLocations`(119) `bannedLocationDistance`(121) `playerEvents`(123)
`bannedPlayerEvents`(125) `groups`(127) `bannedGroups`(129) `filters`(131) `bannedFilters`(133)
`filterLimit`(135) `triggerRules`(140) `objectRpc`(142) `clientRpc`(144) `minPaint`(147)
`maxPaint`(149) `paint`(151) `terrainHeight`(153) `minTerrainHeight`(155) `maxTerrainHeight`(157)
`injectData`(159) `owner`(162) `attach`(164) `connect`(166) `addItems`(168) `removeItems`(170)
`cancel`(172) `exec`(174) `admin`(176) `chance`(178) `condition`(180).

The two exceptions are the singular `filter`/`bannedFilter` properties added by `withFilterFields`
(`generate.mjs` lines 52–55) — these have no direct C# field (only `filters`/`bannedFilters` arrays
exist on `Data`), but this is a **known, already-confirmed-live legacy alias**, not staleness — see
§4.

Nested shapes checked the same way, also clean:

- `spawnData` (`generate.mjs` 144–169) vs. `SpawnData` (`PrefabData.cs` 323–363): exact match, 18
  fields both directions.
- `objectData`/`objectDataBaseProperties` (`generate.mjs` 171–190) vs. `ObjectData` (`PrefabData.cs`
  682–712): exact match (`prefab`, `maxDistance`, `minDistance`, `maxHeight`, `minHeight`,
  `position`, `offset`, `data`, `filters`, `bannedFilters`, `filterLimit`, `weight`, `self`,
  `condition`), plus the same known `filter`/`bannedFilter` singular aliases.
- `pokeData` (`generate.mjs` 193–212) vs. `PokeData : ObjectData` (`PrefabData.cs` 655–681): exact
  match (base `ObjectData` fields + `delay`, `repeat`, `repeatInterval`, `repeatChance`, `chance`,
  `connected`, `target`, `parameter`, `pars`, `limit`, `random`, `evaluate`).
- `terrainData` (`generate.mjs` 214–235) vs. `TerrainData` (`PrefabData.cs` 735–767): exact match,
  14 fields both directions (`pos`/`position` alias included on both sides).
- `rpcEntry` (`generate.mjs` 124–140) vs. `objectRpc`/`clientRpc`'s actual C# type
  (`Dictionary<string, string>[]?`, `PrefabData.cs` 142–144, a fully open string map, not a class) —
  schema correctly keeps this open (`additionalProperties: { type: "string" }`) rather than
  pretending it's a fixed shape; the listed known keys match `docs/scripting.md`'s documented set
  (not re-verified against docs in this pass, out of scope per the ticket).

**Verdict: zero stale fields.**

---

## 3. Structural shape: array-vs-scalar mismatches

**One real gap found: top-level `spawn`/`swap` can legally be a scalar string (the single-line
legacy-compact form), but the schema only accepts an array.** Three other pairs the ticket flagged by
name (`swap`/`swaps`, `poke`/`pokes`, `objects`/`bannedObjects`) were checked and found correct.

### `spawn`/`swap`: schema wrongly requires array-only

`PrefabData.cs` declares both strictly as arrays of objects:

```csharp
public SpawnData[]? swap;   // line 28
public SpawnData[]? spawn;  // line 32
```

But EWP does **not** deserialize the raw YAML directly — it runs every script file through a
text-level preprocessor first (`Yaml.cs`, `PreParse`, called from `Read<T>`/`ReadFile<T>`/
`ReadMixedFile` whenever `migrate: true`, e.g. `Yaml.cs` lines 47, 62, 80). `PreParse` (`Yaml.cs`
lines 178–242) rewrites a **scalar** `spawn:`/`swap:` line into the `spawns:`/`swaps:` array form
before YamlDotNet ever sees it:

```csharp
// Yaml.cs lines 194–205
if (line.StartsWith("  spawn: ") && !line.Contains("#") && line.Trim().Length > 6)
{
  // Convert to spawns list.
  result.Add("  spawns:");
  result.Add("  - " + line.Substring(9));
}
else if (line.StartsWith("  swap: ") && !line.Contains("#") && line.Trim().Length > 5)
{
  // Convert to swaps list.
  result.Add("  swaps:");
  result.Add("  - " + line.Substring(8));
}
```

This is documented, not incidental: `docs/legacy.md` lines 40 and 43 state, in EWP's own words:

> `spawn`: Single line short-format for spawns without parameter support.
>
> `swap`: Single line short-format for swaps without parameter support.

So `spawn: MyPrefab 1,2,3` (a bare string, 2-space top-level indent) is valid, documented, live EWP
YAML — semantically identical to `spawns: ["MyPrefab 1,2,3"]`. The current schema types `spawn`/
`swap` strictly as `{ type: "array", items: spawnData }` (`generate.mjs` lines 324–325), so this
scalar form is currently **rejected** as a type mismatch (and, since `additionalProperties: false`,
no other property picks it up either).

**Fix**: change `spawn`/`swap` in `ewpRuleEntry` to `{ oneOf: [{ type: "array", items: spawnData },
{ type: "string" }] }` — mirroring the existing `objectOrLegacyString` per-item union pattern already
used for `objects`/`bannedObjects` (see below), just applied at the field level instead of the
per-item level.

### `swap`/`swaps`, `poke`/`pokes`: already correct, no gap

- `swap: SpawnData[]?` / `swaps: string[]?` (`PrefabData.cs` lines 28, 30) — schema: `swap: {array of
  spawnData}`, `swaps: strArray` (`generate.mjs` lines 325, 327). Matches (`swap` itself has the
  scalar gap above, but the swap/swaps *pairing* shape is otherwise right).
- `poke: PokeData[]?` / `pokes: string[]?` (`PrefabData.cs` lines 94, 96) — schema: `poke: {array of
  pokeData}`, `pokes: strArray` (`generate.mjs` lines 331–332). Matches. Unlike `spawn`/`swap`,
  `Yaml.cs`'s `PreParse` has **no** rewrite rule for a bare `poke:` line (grepped the full file — no
  `"poke"` match anywhere in `Yaml.cs`), and `docs/legacy.md`'s "Old way of poking" section (lines
  17–26) lists `pokeDelay`/`pokeParameter`/`pokeLimit`/`pokes` but never a singular scalar `poke:`
  form the way it explicitly does for `spawn`/`swap`. So `poke` correctly stays array-only.

### `objects`/`bannedObjects`: schema's per-item `oneOf` is correct, confirmed by the same preprocessor

`Data.objects`/`Data.bannedObjects` are typed `ObjectData[]?` only (`PrefabData.cs` lines 107, 111) —
no C#-level string union. But `Yaml.cs`'s `PreParse` has a **third** rewrite rule, this one operating
per array item rather than on the whole field, that converts each compact-string list item under
`objects:`/`bannedObjects:` into a full `ObjectData` mapping before deserialization:

```csharp
// Yaml.cs lines 234–238
else if (line.StartsWith("  objects:") || line.StartsWith("  bannedObjects:"))
{
  objectsMode = true;
  result.Add(line);
}
```

```csharp
// Yaml.cs lines 243–267 (HandleObjects), invoked while objectsMode is true for each
// "  - id, distance, data, weight, height" line
private static void HandleObjects(List<string> result, string line)
{
  var parts = line.Substring(4).Split(',');
  result.Add("  - prefab: " + parts[0]);
  if (parts.Length > 1) { /* ...minDistance/maxDistance... */ }
  if (parts.Length > 2) result.Add("    data: " + parts[2]);
  if (parts.Length > 3) result.Add("    weight: " + parts[3]);
  if (parts.Length > 4) { /* ...minHeight/maxHeight... */ }
}
```

This matches `docs/legacy.md` line 8's documented `- id, distance, data, weight, height` compact
format exactly. So even though the C# class itself only ever sees `ObjectData[]`, the *effective*
accepted YAML per list item really is "either a mapping or a compact string," which is exactly what
`ewp_validator`'s `objectOrLegacyString = { oneOf: [objectData, { type: "string" }] }`
(`generate.mjs` line 240) already encodes for `objects`/`bannedObjects` (lines 301–302). **No gap —
this one was modeled correctly**, even though the comment above it in `generate.mjs` (lines 237–239)
attributes it to the wrong mechanism (it cites the C# `Object(string line)` constructor,
`PrefabData.cs` lines 569–606, which is real but is actually only reachable via the separate legacy
`pokes: string[]` field, `PrefabLoading.cs` line 62 and line 221 `ParseObjects(string[] objects)` —
not via `objects`/`bannedObjects`, which always go through the `ObjectData[]` overload,
`PrefabLoading.cs` lines 56–57 and line 222). The accepted *shape* the schema encodes is right; only
the code comment's explanation of *why* is attributing it to the wrong C# mechanism. Low priority —
worth a one-line comment fix (attribute to `Yaml.cs`'s `PreParse`/`HandleObjects`, not
`Object(string line)`), not a schema behavior change.

---

## 4. Known aliases/legacy names: does the schema cover everything `docs/legacy.md` documents?

`docs/legacy.md` (43 lines) documents five legacy mechanisms. Checked each against `ewpRuleEntry`:

| Legacy form (`docs/legacy.md`) | Schema coverage | Verdict |
|---|---|---|
| `objects`/`bannedObjects` compact-string list items (lines 6–15) | `objectOrLegacyString` oneOf, §3 above | Covered |
| `pokes` compact-string list (lines 17–26) | `pokes: strArray` (`generate.mjs` 332) | Covered |
| `spawns`/`swaps` compact-string list (lines 30–39, 42) | `spawns`/`swaps: strArray` (`generate.mjs` 326–327) | Covered |
| `spawn`/`swap` single-line scalar (lines 40, 43) | **Not covered** — schema requires array | **Gap, see §3** |
| `spawnDelay` (line 41) | `spawnDelay: numberOrString` (`generate.mjs` 328) | Covered |

Also cross-checked the `filter`/`bannedFilter` singular aliases already flagged by ticket 08/research
02 (not re-litigated per the ticket's instruction, but re-confirmed live in current source this pass,
since `Yaml.cs` was fetched fresh anyway): `PreParse` has explicit rewrite rules for both the
top-level 2-space form and the nested 4-space form (`Yaml.cs` lines 206–232, converting `filter:`/
`bannedFilter:` lines into single-item `filters:`/`bannedFilters:` lists) — this confirms the
singular alias is a real text-level preprocessing step, not just empirically-observed runtime
behavior as ticket 08 established via live testing. `ewpRuleEntry` already models this correctly via
`withFilterFields` (`generate.mjs` lines 49–58), applied to both `ewpRuleEntry` itself and
`objectDataBaseProperties` (used by `objectData`/`pokeData`) — matching that `PreParse`'s nested
4-space rewrite applies inside `objects:`/`bannedObjects:`/`poke:` item blocks too.

No other legacy/alias mechanism was found in `Yaml.cs`'s `PreParse` (full file read; the only
rewrite branches are `spawn:`, `swap:`, `filter:`/`bannedFilter:` at two indent levels, and
`objects:`/`bannedObjects:` item-compaction — all five now accounted for above).

---

## 5. `TOP_LEVEL_PAINT_ENUM`: is the 9-value word-list still current?

**Yes — confirmed unchanged.** `service/Parse.cs` lines 429–439 (fetched fresh this pass, not reused
from research 13's citation):

```csharp
private static Dictionary<string, Color> Paints = new() {
  {"grass", UnityEngine.Color.black},
  {"patches", new(0f, 0.75f, 0f)},
  {"grass_dark", new(0.6f, 0.5f, 0f)},
  {"dirt", UnityEngine.Color.red},
  {"cultivated", UnityEngine.Color.green},
  {"paved", UnityEngine.Color.blue},
  {"paved_moss", new(0f, 0f, 0.5f)},
  {"paved_dirt", new(1f, 0f, 0.5f)},
  {"paved_dark", new(0f, 1f, 0.5f)},
};
```

Exactly the 9 keys `TOP_LEVEL_PAINT_ENUM` lists (`generate.mjs` lines 96–106): `cultivated`, `dirt`,
`grass`, `grass_dark`, `patches`, `paved`, `paved_dark`, `paved_dirt`, `paved_moss` (schema lists them
alphabetically; source declares them in a different order — same set). No addition, removal, or
rename since research 13 round 8's citation of the same dictionary. As research 13 already noted and
this pass reconfirms, this can't currently cause a false rejection regardless (`topLevelPaintValue`
has a permissive string fallback, `generate.mjs` lines 108–110), so this check is purely an accuracy
confirmation for future autocomplete/hint use, per the ticket's framing.

---

## Summary of findings

| # | Check | Verdict |
|---|---|---|
| 1 | Completeness | **Gap**: top-level `delay` (`PrefabData.cs:137`) has no `ewpRuleEntry` property — real, documented-adjacent field, currently rejected as unknown. |
| 2 | No stale fields | Clean — every `ewpRuleEntry`/nested-shape property maps to a live `Data`/`SpawnData`/`ObjectData`/`PokeData`/`TerrainData` field. |
| 3 | Structural shape | **Gap**: top-level `spawn`/`swap` must also accept a plain string (legacy single-line form, `Yaml.cs:194-205`, documented `docs/legacy.md:40,43`) — schema currently requires array-only. `swap/swaps`, `poke/pokes`, `objects/bannedObjects` pairs all confirmed correct as modeled. |
| 4 | Known aliases | One gap (same as #3: `spawn`/`swap` scalar form missing). `filter`/`bannedFilter` singular aliases re-confirmed via `Yaml.cs` source (not just live testing). All other `docs/legacy.md` forms already covered. |
| 5 | `TOP_LEVEL_PAINT_ENUM` | Clean — still exactly the 9 keys in `service/Parse.cs`'s `Paints` dictionary, re-fetched and re-confirmed this pass. |

## Concrete suggested schema fixes

In `ewp_validator/schema/generate.mjs`:

1. Add `delay: numberOrString` to the `withFilterFields({...})` object literal that defines
   `ewpRuleEntry`'s properties (`generate.mjs` ~line 250, alongside `chance`/`weight` in the
   "Selection" group, or its own comment noting it's the shared spawn/swap delay default per
   `PrefabLoading.cs:36`).
2. Change `spawn`/`swap` (`generate.mjs` lines 324–325) from
   `{ type: "array", items: spawnData }` to
   `{ oneOf: [{ type: "array", items: spawnData }, { type: "string" }] }` — same pattern as
   `objectOrLegacyString`, to accept the documented single-line legacy form.
3. (Low priority, no behavior change) Fix the comment above `objectOrLegacyString`
   (`generate.mjs` lines 237–239) to attribute the per-item string form to `Yaml.cs`'s `PreParse`/
   `HandleObjects` text-preprocessing rather than the C# `Object(string line)` constructor, which is
   real but not actually the mechanism reached for `objects`/`bannedObjects`.
