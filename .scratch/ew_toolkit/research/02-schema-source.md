# How is EWP's YAML structure documented/derivable from Jere's repo?

Research for ticket `.scratch/ew_toolkit/issues/02-schema-source.md`. All claims below are cited to a specific file/URL in Jere Kuusela's own repos (primary sources), fetched directly via the GitHub raw-content and REST API on 2026-08-17. Branch is `main` for both repos; EWP's `main` was last touched 2026-08-15 (two days before this research), current published version is **1.58.0/1.58.1** (see "Versioning" note in Q4).

Repos and files actually read for this research:

- `JereKuusela/valheim-expand_world_prefabs` (EWP): `README.md`, `developers.md`, `examples_bosses.md`, `examples_farming.md`, `examples_object_filtering.md`, `examples_progression.md`, `examples_structures.md`, `docs/scripting.md`, `docs/functions.md`, `docs/RPCs.md` (partial), `docs/hacks.md`, `docs/legacy.md`, and C# source: `ExpandWorldPrefabs/PrefabData.cs`, `ExpandWorldPrefabs/PrefabLoading.cs`, `ExpandWorldPrefabs/ExpandWorldPrefabs.cs`, `ExpandWorldPrefabs/Paint.cs`, `ExpandWorldPrefabs/ExpandWorldPrefabs.csproj`, `publish/manifest.json`.
- `JereKuusela/valheim-world_edit_commands` (WEC): `README.md`, `README_data.md`, and the repo's file tree (`WorldEditCommands/**`).
- `https://valheimtools.stream/ewp.json` (third-party schema, cross-check only).

---

## 1. Is doc/wiki coverage sufficient, or is C# source required?

**Short answer: docs get you most of the way (they're unusually thorough for a Valheim mod), but they have real, confirmed gaps that only the C# source fills — and the C# source itself has gaps that only a closed-source shared library (not published anywhere) can fill. A complete schema needs the docs (for semantics/enums/defaults) reconciled field-by-field against `PrefabData.cs` (for the authoritative key list/structure), and will still have a small residual of things that cannot be pinned down from public material alone.**

### What the docs give you

EWP has no wiki; all documentation lives in-repo as Markdown, linked from `README.md`:

- `docs/scripting.md` (506 lines) — the main spec. Organized into `Filters`, `Data filters`, `Multiple filters`, `Object filters`, `Actions`, `Spawns`, `Pokes`, `RPCs`, `Terrain`, `States`, `Functions`, `Hacks`. For nearly every field it gives a one-line description, default value, and whether it's a list/range/function-capable string. This is a genuine prose field-by-field spec, not just prose overview — e.g. it explicitly enumerates the `type` field's 14 valid values (`create`, `destroy`, `change`, `state`, `say`, `command` [deprecated], `poke`, `globalkey`, `key`, `custom`, `event`, `time`, `realtime`) with per-type parameter semantics. (`docs/scripting.md` lines 13–56)
- `docs/functions.md` (219 lines) — an apparently-exhaustive list of `<...>` functions (text, numeric, vector, long-number, custom-data, time), each with a one-line description.
- `docs/RPCs.md` (1308 lines) — per-object-component list of supported `objectRpc`/`clientRpc` names with typed parameter lists, plus a documented "hit data" complex type (`docs/RPCs.md` lines 11–47).
- `docs/legacy.md` (43 lines) — documents the old/deprecated single-line formats for `objects`, `pokes`, `spawns`/`swaps`.
- `docs/hacks.md` (181 lines) — explains non-obvious engine-level behaviors (scaling, attaching, server-side-only `ewp_` data keys) with worked YAML examples.
- `examples_bosses.md`, `examples_farming.md`, `examples_progression.md`, `examples_object_filtering.md` — worked full-file YAML examples (see Q2 for a full one). `examples_structures.md` (5 lines) is a stub — just a bullet list of planned topics with no content ("Faster beehives / Different wall health on different biomes / Faster boats" and nothing else).

### Confirmed gaps: fields that exist in source but are absent from every doc file

I diffed the documented field list against the authoritative YAML-binding class, `ExpandWorld.Prefab.Data` in `ExpandWorldPrefabs/PrefabData.cs` (lines 12–181) — this is the exact class YamlDotNet deserializes each top-level rule entry into (confirmed via `[DefaultValue(...)]` attributes on every field, and via `PrefabLoading.FromData(Data data)` in `ExpandWorldPrefabs/PrefabLoading.cs` which maps every field of `Data` into the runtime `Info` object). Grepping `docs/scripting.md` and `docs/legacy.md` for these names returns **no matches**:

- `separate` (`bool`, default `false`) — `PrefabData.cs` line 24. Not mentioned anywhere in `scripting.md` or `legacy.md`.
- `terrainHeight` (`string?`) — `PrefabData.cs` line 153, a combined shorthand for `minTerrainHeight`/`maxTerrainHeight` parsed in `PrefabLoading.cs` lines 76–90 (`format is either single value or min;max`). Not documented; only `minTerrainHeight`/`maxTerrainHeight` appear in `scripting.md`.
- Undocumented key aliases: `SpawnData` (the class backing entries in `spawn:`/`swap:` arrays) accepts **both** `pos`/`position` and `rot`/`rotation` as YAML keys for the same value (`PrefabData.cs` lines 329–336, confirmed used in `Spawn(SpawnData data, ...)` constructor line 388 and 390). `scripting.md`'s Spawns section (lines 297–331) only documents `pos` and `rot`. `TerrainData` has the same undocumented `pos`/`position` alias (`PrefabData.cs` lines 740–743).

### A discrepancy that source *cannot* resolve either

`scripting.md`'s "Data filters" section (lines 153–164) documents singular `filter:` and `bannedFilter:` fields ("Data filter that must match" / "must not match") as valid top-level (and, by the same pattern, object-filter) keys. **The current `Data`, `ObjectData`, and `PokeData` classes in `PrefabData.cs` have no such fields** — only the plural array fields `filters`/`bannedFilters` (+ `filterLimit`) exist (`PrefabData.cs` lines 131–135 for `Data`, lines 700–705 for `ObjectData`). `PrefabLoading.cs` line 60 also only ever reads `data.filters`/`data.bannedFilters`, never a singular `data.filter`.

This could mean the docs are stale (the field was renamed/removed and the docs weren't updated), or that there's a YAML-level alias/coercion for it — but **that cannot be confirmed from public source**, because the actual YamlDotNet deserializer setup (`Yaml.Init()`, called in `ExpandWorldPrefabs/ExpandWorldPrefabs.cs` line 27) and the parsing helpers used throughout `PrefabData.cs`/`PrefabLoading.cs` (`Parse`, `DataValue`, `Conditions`, `Functions`, `Log` — all `using Data;`/`using Service;`) are **not present in either the EWP or WEC repo's source tree**. They are referenced only as pre-built DLLs via `<Reference Include="YamlDotNet">` etc. in `ExpandWorldPrefabs.csproj` (`HintPath="..\..\Libs\..."`), i.e. compiled into a private shared library that isn't published under any obviously-named repo among Jere's ~40 public GitHub repos (checked; no `valheim-common`/`valheim-shared`/similar exists). **This is the clearest evidence that even full C# source access from both public repos is not sufficient for 100% schema completeness** — some parsing/aliasing behavior is simply invisible without decompiling the shipped DLL or testing empirically against a running server.

**UPDATE (resolved via live in-game testing, see [issues/08-gap-handling-policy.md](../issues/08-gap-handling-policy.md)):** the project owner tested all three forms in a running server and confirmed they are equivalent —
```yaml
filter: int, pickedUp, 1       # singular, inline triple
filters:                       # plural, list form
- int, pickedUp, 1
filter: isFromPlayerInventory  # singular, bareword data.yaml reference
```
This confirms the YAML-level alias/coercion hypothesis above: the closed-source deserializer does accept a scalar value for `filter`/`bannedFilter` as shorthand for a single-item `filters`/`bannedFilters` list. Schema should treat singular as `string` and plural as `string[]` on the same underlying property, both fully valid.

### A gap that's undocumented *by design*, confirmed by Jere himself

WEC's `README.md` "ZDO data keys" section (lines 304–432) states outright: *"Most should be self-explanatory. More explanation will be added later,"* followed by two long bullet lists of key names with **empty** descriptions (e.g. `` `addedDefaultItems`: `` with nothing after the colon), and: *"The field system adds `XXX.m_YYY` for each field where XXX is the component name and YYY is the field name."* This means the `data`/`filter`/`keys` mini-syntax's key namespace (`component.m_field`) is fundamentally open-ended — any field on any Unity component attached to any Valheim prefab is a legal key. That set is not enumerable from EWP or WEC source at all; it only exists in Valheim's own compiled game assembly (`assembly_valheim.dll`), which is neither source-available nor part of either mod repo. No amount of reading Jere's C# closes this gap — full enumeration would require reflecting over the game binary itself (or crowd-sourcing a key list, which is what the third-party schema partially attempts via free-text `examples`, not enforcement).

**UPDATE (per ticket 08's resolution):** the namespace is even broader than "real component fields" — WEC's `data set=int,isCustomData,1`-style commands let scripters attach arbitrary custom-named data keys with no tie to any real Unity component field at all. So this isn't just an open-ended-but-patterned (`Word.m_word`-shaped) namespace; it's two distinct legitimate shapes (real component field paths, and arbitrary user-chosen custom keys). Schema validates these fields as an unconstrained string, not a `Word.m_word` pattern.

### Verdict for Q1

| Question | Answer |
|---|---|
| Are the top-level key names of an EWP rule enumerable from docs alone? | Mostly yes, but with confirmed misses (`separate`, `terrainHeight`, `pos`/`position` & `rot`/`rotation` aliases). |
| Is `docs/scripting.md` internally self-consistent with current source? | No — the `filter`/`bannedFilter` singular fields it documents don't exist in the current `Data`/`ObjectData` classes, and this can't be resolved without the closed-source shared library or live testing. |
| Does reading `PrefabData.cs` give the authoritative structural field list? | Yes, for structure (key names, array-vs-scalar, nullability/optionality) — this is the actual YAML deserialization target. |
| Does `PrefabData.cs` give you semantics (defaults, enums, descriptions)? | Only partially — `[DefaultValue]` gives defaults, but enums like `type`'s 14 values, the two different `paint` enums, and the `condition` operator grammar are only in prose docs, not in this class. |
| Is there a data-key namespace that's unenumerable from *any* available source? | Yes — `component.m_field` keys, confirmed explicitly incomplete/open-ended by Jere's own WEC README. |

---

## 2. Actual shape of EWP's YAML data

### Top level: a heterogeneous array, not a single object schema

Every EWP script file (`expand_world/expand_prefabs*.yaml`) is a YAML **list**. But per `README.md` line 38: *"Script files support [data system] of World Edit Commands. You can freely mix scripts, data and values in the same file."* This is demonstrated in essentially every example file — e.g. `examples_bosses.md` (lines 19–38) mixes an EWP rule entry and a WEC data entry in the same list:

```yaml
- prefab: Bonemass
  type: create
  data: ultra_bonemass
  chance: 0.1

- name: ultra_bonemass
  strings:
  - Humanoid.m_name, Ultra Bonemass
  floats:
  - RandomSkillFactor, 1.5
  ints:
  - max_health, 10000
  - health, 10000.1
```

There is **no discriminator/tag field** — the loader must infer entry kind structurally (presence of `prefab`/`type` → EWP rule; presence of `name` + typed-list fields → WEC data entry; presence of `value` → WEC value entry; presence of `valueGroup` → WEC value group). This has a direct schema-design implication: the top-level array item schema needs to be a `oneOf`/`anyOf` union of several disjoint object shapes, not one flat object — and this is exactly the shape the third-party schema (Q4) does *not* model (see below).

### EWP rule entry shape (`ExpandWorld.Prefab.Data`, `PrefabData.cs` lines 12–181)

~70 fields, virtually all optional, grouped by scripting.md's own section headers:

- **Identity/trigger**: `prefab`, `excludePrefab` (strings, wildcard `*` + value-group support), `type` (compact `"type, param1 param2"` string), `types` (array form).
- **Selection**: `chance`, `weight`, `fallback`, `separate` (undocumented, see Q1).
- **Scalar filters** (all typed `string?` in C#, not native bool/number — see "type nuance" below): `admin`, `biomes`/`bannedBiomes`, `day`/`night`, `minDistance`..`maxAltitude` (9 range fields: X/Y/Z/distance/altitude min & max), `minPaint`/`maxPaint`/`paint`, `environments`/`bannedEnvironments`, `globalKeys`/`bannedGlobalKeys`, `keys`/`bannedKeys` (embedded `"key value"` mini-syntax), `events`/`eventDistance`, `locations`/`locationDistance`/`bannedLocations`/`bannedLocationDistance`, `playerEvents`/`bannedPlayerEvents`, `groups`/`bannedGroups`, `minTerrainHeight`/`maxTerrainHeight`/`terrainHeight`.
- **Structured filters**: `filters`/`bannedFilters` (`string[]` of `"type,key,value[,weight]"` or `"name[,weight]"` shorthand) + `filterLimit`.
- **Object filters**: `objects`/`bannedObjects` — arrays that accept **either** nested objects (`ObjectData` shape below) **or** legacy single-line strings (`Object(string line)` constructor, `PrefabData.cs` lines 569–606) — a dual-format union — plus `objectsLimit`/`bannedObjectsLimit`.
- **Actions**: `data`, `injectData`, `drops`, `addItems`/`removeItems`, `remove`, `removeDelay`, `command`/`commands`, `exec`, `owner`, `attach`, `connect`, `cancel`.
- **Spawns**: `spawn`/`swap` — same dual-format (nested `SpawnData` object array or legacy strings, `Spawn(string line, ...)` constructor lines 415–461) — plus legacy `spawnDelay`/`spawns`/`swaps`.
- **Pokes**: `poke` (array of `PokeData`, which *extends* `ObjectData`) + legacy `pokeLimit`/`pokeParameter`/`pokeDelay`/`pokes`.
- **RPCs**: `objectRpc`/`clientRpc` — typed in C# as `Dictionary<string, string>[]?` (`PrefabData.cs` lines 142–144), i.e. **not a fixed class shape at all** — an open flat string-map per entry. Documented keys per `scripting.md` (lines 384–410): `name`, `target`, `chance`, `weight`, `delay`, `repeat`, `repeatInterval`, `repeatChance`, `overwrite`, `source`, `packaged`, plus positional numeric keys `"1"`, `"2"`, `"3"`, ... for RPC call parameters.
- **Terrain**: `terrain` (array of `TerrainData`).
- **Condition**: `condition` — free-form boolean expression string; grammar documented in `scripting.md` lines 71–89 (`and`/`or`/`not`/`xor`/`in`/`not in`/`=`/`!=`/`>`/`<`/`>=`/`<=`, precedence via parens), but the actual parser (`Conditions.TryParse`) is in the closed-source library (not visible).

### Nested object shapes

- **`SpawnData`** (`PrefabData.cs` lines 323–363): `prefab`, `pos`|`position`, `rot`|`rotation`, `snap`, `data`, `delay`, `removeDelay`, `repeat`, `repeatInterval`, `repeatChance`, `chance`, `weight`, `owner`, `attach`, `connect`, `triggerRules`, `condition`. Also has a legacy single-line string form (space/comma-delimited positional parse).
- **`ObjectData`** (`PrefabData.cs` lines 682–712): `prefab`, `maxDistance`, `minDistance`, `maxHeight`, `minHeight`, `position`, `offset`, `data` (legacy single-filter shorthand — still functional, used via `Object(ObjectData data)` constructor line 566), `filters`, `bannedFilters`, `filterLimit`, `weight`, `self`, `condition`.
- **`PokeData`** (`PrefabData.cs` lines 655–681) = `ObjectData` + `delay`, `repeat`, `repeatInterval`, `repeatChance`, `chance`, `connected`, `target`, `parameter`, `pars`, `limit`, `random`, `evaluate`.
- **`TerrainData`** (`PrefabData.cs` lines 735–767): `delay`, `pos`|`position`, `square`, `resetRadius`, `levelRadius`, `levelOffset`, `raiseRadius`, `raisePower`, `raiseDelta`, `smoothRadius`, `smoothPower`, `paintRadius`, `paintHeightCheck`, `paint`.

### Type-system nuance: nearly everything is a "string" at the C# level

Fields that `scripting.md` prose describes as bool/number/list (`chance`, `admin`, `day`, `remove`, `minDistance`, etc.) are declared `string?` in `PrefabData.cs`, because almost every field additionally supports either a comma-list, a `min;max` range, or a `<function>` expression, resolved at runtime via `DataValue.Bool(...)`/`DataValue.Float(...)`/etc. (seen throughout `PrefabLoading.cs` lines 113–177). A schema generated naively from C# reflection alone would type everything as `string`, losing the semantic "this is really a number/bool" information that only the prose docs supply. (The third-party schema's approach of `"type": ["number","string"]` + a function-pattern regex, see Q4, is the right instinct for this.)

### Two different `paint` enums sharing one field name

- `paint`/`minPaint`/`maxPaint` (top-level filter fields, `scripting.md` lines 111–118): `cultivated, dirt, grass, grass_dark, patches, paved, paved_dark, paved_dirt, paved_moss`, or numeric `r,g,b,a`.
- `terrain[].paint` (`scripting.md` lines 442–444): a **different** enum — `ClearVegetation, Cultivate, Dirt, Paved, Reset` — which corresponds to the game's own `TerrainModifier.PaintType` enum, referenced but not defined in `Terrain.cs` (`PrefabData.cs` line 867: `Enum.TryParse(paint, true, out TerrainModifier.PaintType paintType)`). Both enums are correctly documented in prose; a schema must scope them per-location, not share one global "paint enum."

### Required vs. optional

Structurally, **every** field on `Data` is optional/nullable/has a default — YamlDotNet will happily deserialize `- {}`. "Requiredness" is a runtime/logical constraint, not a structural one: `PrefabLoading.cs` line 43 only *warns* (doesn't error) when `prefab == ""` and `type` isn't one of the prefab-less types (`globalkey`, `key`, `custom`, `event`, `time`, `realtime`). This means a JSON Schema can't express EWP's real requiredness rules with a flat `required: [...]` — it needs conditional (`if`/`then`) logic keyed on `type`, mirroring the type-dependent field relevance documented in `scripting.md` lines 34–46 (e.g. "There is no prefab or position for this type, so most fields won't work" for `globalkey`/`key`/`custom`/`event`).

---

## 3. WEC's `README_data.md` — the "data system" EWP scripts share

Fetched from `https://raw.githubusercontent.com/JereKuusela/valheim-world_edit_commands/main/README_data.md` (351 lines).

- **Data entry properties** (line 56–76): `name` (unique across all files), then 11 typed value lists: `ints`, `floats`, `strings`, `longs`, `vecs` (x,z,y order), `quats` (as vector y,x,z), `bytes` (base64), `bools` (stored as 0/1 ints), `hashes` (strings saved as ints), `items` (see below).
- **`items` list** (Loot generation section, lines 237–318): each item object supports `pos` (x,y slot), `chance`, `prefab`, `stack`, `quality`, `variant`, `durability`, `crafterID`, `crafterName`, `worldLevel`, `equipped`, `pickedUp`, `customData`. For **random loot** (no `pos` given), two extra data-entry-level properties apply: `containerSize` (default `4,2`) and `itemAmount` (single value or `min;max`).
- **Value entries**: `- value: key, val` — usable inline in the same files as data entries, referenced from data entries via `<key>` parameter substitution (lines 178–219).
- **Value groups**: `- valueGroup: name` + `values: [...]` — random-selects one value per resolution (lines 221–235); this is the same "value group" concept `scripting.md` line 7–10 references for the `prefab:` field's component-based grouping.
- **Dynamic data entries**: parameters (`<level>`), target-object auto-params (`<x>`,`<y>`,`<z>`, `<int_...>` etc.), simple math expressions, comma-separated lists (random pick), and `min;max;step;expression` ranges (lines 78–177, 152–176).
- **Pattern matching** (`match=`/`unmatch=` on WEC's `object`/`data` commands, lines 325–352): default-value and invalid-value handling rules that also apply to EWP's `keys`/`bannedKeys`/`filter` mini-syntax by cross-reference.

### A concrete documentation inconsistency inside WEC's own doc

The "Parameters" example under **Dynamic data entries** (README_data.md lines 92–98) writes the entry-name key as `data:`:

```yaml
- data: leveler
  ints:
  - level, <level>
```

...while the "Loot generation" section (lines 244–257) and every EWP example (`examples_bosses.md`, `examples_farming.md`, `examples_progression.md`) use `name:` for the exact same purpose (e.g. `- name: Chest`, `- name: ultra_bonemass`). This is either a genuine dual-alias (both `name:` and `data:` bind to the same entry-name property) or a copy-paste typo in Jere's own doc. **Not resolved in this pass** — the WEC repo does have public source for this (`WorldEditCommands/service/data/DataData.cs`, `DataEntry.cs`, `PlainDataEntry.cs`, confirmed present via the repo's file tree), but those files weren't read in this research session; recommend reading them before finalizing the schema for data-entry top-level keys.

### Why WEC matters for the EWP schema specifically

`scripting.md`'s own filter documentation cross-references WEC's format directly: *"Containers can be filtered by items. This is done by using 'items' from a data entry"* (line 183), and EWP's `data:`/`addItems:`/`removeItems:` action fields all resolve to WEC data-entry names (`docs/legacy.md` line 26: *"data: Optional. Entry in the data.yaml to be used as filter"*). Any EWP schema that doesn't also model WEC's data-entry/value/value-group shapes as valid top-level array items (see Q2) will reject realistic script files.

---

## 4. Cross-check against `https://valheimtools.stream/ewp.json`

Fetched successfully (HTTP 200, draft-07 JSON Schema, ~1050 lines including two very large `examples` arrays of prefab/item names). `"description": "YAML validation for EWP 1.55.0 (v0.18)"`.

**Version freshness**: EWP's own `publish/manifest.json` (fetched same session) reports `"version_number": "1.58.0"`, and `ExpandWorldPrefabs.cs` line 15 has `VERSION = "1.58.1"`. So the third-party schema is a few patch versions behind current `main` — consistent with it missing fields added since (see below). This is a general caution for any schema we build too: EWP ships frequently (last source touch was 2 days before this research), so a schema needs a refresh/versioning story, not a one-time snapshot.

### What it gets right / good ideas to reuse

- Correctly encodes the "most fields are really `string`, but semantically number/bool, because they support `<function>` syntax" nuance found in Q2: fields like `chance`, `day`, `admin`, `remove` are typed `["boolean"|"number", "string"]` with a `$ref` to a shared `patternParam` def (`^<[A-Za-z0-9\$=_\-\+<>/\.]+>$`). This matches what `PrefabData.cs` actually does at the C# level (everything nullable-string, functions resolved at runtime) better than a naive type-per-field guess would.
- It clearly did its own reverse-engineering beyond the docs in places — e.g. it marks `spawn[].snap` and `objects[].filterLimit` as `"(undocumented)"` in their description text, corroborating that these really aren't in `scripting.md` (I independently confirmed `snap` **is** documented for spawn in `scripting.md` line 306, so that particular "(undocumented)" tag is itself slightly wrong/stale — a small extra data point that this schema is not perfectly reliable either).
- Adds opinionated deprecation guardrails not strictly from EWP's runtime behavior — e.g. `poke[].data` and top-level `delay` are given `"not": {"required": [...]}"` to force a validation error, with comments like *"this is undocumented, force an error so people can upgrade."* Useful UX intent, but conflates "the author wants to discourage this" with "this is actually invalid" — `data.delay`/`ObjectData.data` **do** still exist and work in current EWP source (`PrefabData.cs` line 137 `public float? delay;`, and `ObjectData.data` at line 699, used at `PrefabData.cs` line 566). Worth not blindly inheriting these opinionated rejections into a from-source schema without separately deciding our own deprecation policy.

### Confirmed gaps (present in current source, absent from the third-party schema)

- `separate` — zero matches anywhere in the fetched file.
- `terrainHeight` — zero matches anywhere in the fetched file.

### A likely type error

- `pokeParameter` is typed `"number"` (line ~1003 of the fetched schema), but `PrefabData.cs` line 100 declares `public string pokeParameter = ""` — and `docs/hacks.md`'s examples use it for text like the poke argument (`pars: grow, <par1>`-style string data), not a numeric value. This looks like a straightforward mistake in the third-party schema.

### The big structural gap: no WEC entry shapes

The third-party schema's root is `"type": "array"` whose `items` is a single object schema (`additionalProperties: false`) matching only the EWP rule-entry (`Data`) shape. It has **no `oneOf`/union branch** for WEC's `name`/`ints`/`floats`/`strings`/... data entries, `value:` entries, or `valueGroup:` entries. Since `README.md` explicitly says these are meant to be mixed in the same files, and every non-trivial example file in the EWP repo does mix them (`examples_bosses.md`, `examples_farming.md`, `examples_progression.md` all interleave rule entries and `name:`/typed-list data entries in one list), **validating a real-world script file against this schema as-is would fail on the data entries** (`additionalProperties: false` would reject `name`, `ints`, `strings`, etc. sitting where a `Data` object is expected). This is the most consequential discrepancy for our purposes: any schema we build needs the top-level array to be a proper union of EWP-rule / WEC-data-entry / WEC-value / WEC-value-group shapes, not a single object schema.

### The unresolved discrepancy also appears here

The third-party schema **does** include `filter`/`bannedFilter` singular fields (top-level, and duplicated inside `objects[]`, `bannedObjects[]`, `poke[]` items) — matching current `scripting.md` docs, but *not* matching what's derivable from current `PrefabData.cs`/`ObjectData` source (see Q1). This third-party schema doesn't resolve the ambiguity either; it just sided with the docs. This remains open and should be settled by live-testing against a running EWP instance (or by reading the closed-source shared library, which isn't publicly available) before we decide how to model it.

---

## Summary / implication for schema-generation approach

1. Docs (`docs/scripting.md` + `docs/legacy.md` + `docs/functions.md` + `docs/RPCs.md`) are necessary — they're the only source for the `type` enum, function names, RPC names/params, condition-operator grammar, and per-field semantics/defaults in readable form.
2. C# source (`ExpandWorldPrefabs/PrefabData.cs` primarily, plus `PrefabLoading.cs` for how fields are actually consumed) is also necessary — it's the only source for the true, current key list (catches `separate`, `terrainHeight`, `pos`/`position` & `rot`/`rotation` aliases that docs miss) and for structural facts like "objects/spawn/poke accept either a nested-object array or legacy strings."
3. Neither is sufficient alone, and **even both together aren't fully sufficient**: the actual YAML deserialization/coercion behavior (aliasing, unmatched-property handling, the `filter`/`bannedFilter` question, the full `Functions`/`Conditions` grammar) lives in a closed-source shared library referenced only as a compiled DLL, not published in any of Jere's ~40 public repos. Some of this will need to be settled empirically (testing against a running server) rather than by reading.
4. WEC's `README_data.md` is a mandatory second doc source, not optional — EWP script files routinely mix EWP rule entries with WEC data/value/value-group entries in the same array with no discriminator field, and this is exactly the case the existing third-party schema fails to handle.
5. The third-party schema at `valheimtools.stream/ewp.json` is useful as a secondary cross-check (good instinct on the string/function-pattern typing, some real reverse-engineering evident) but has confirmed gaps (`separate`, `terrainHeight`), at least one likely type bug (`pokeParameter`), doesn't model WEC entries at all, and inherits the same unresolved `filter`/`bannedFilter` ambiguity the docs have — it should not be treated as ground truth, consistent with the ticket's framing.
