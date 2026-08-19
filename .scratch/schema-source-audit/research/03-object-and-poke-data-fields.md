# Verify objectData/pokeData's field-name lists against EWP's ObjectData/PokeData classes

Fetched directly from Jere Kuusela's public GitHub repo on 2026-08-19 via
`raw.githubusercontent.com` (branch `main`) — this is the PRIMARY SOURCE, not docs. Same
rigor/citation style as `research/13-round8-type-case-sensitivity.md`.

File fetched and read in full for this research:

- `ExpandWorldPrefabs/PrefabData.cs` (875 lines, fetched via
  `curl https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/ExpandWorldPrefabs/PrefabData.cs`)

Schema file read: `ewp_validator/schema/generate.mjs`.

---

## 1. Completeness: every `ObjectData` field present in `objectDataBaseProperties`?

`PrefabData.cs` lines 682–712, `ObjectData` class, full field list in source order:

```csharp
public class ObjectData
{
  [DefaultValue("")]
  public string prefab = "";
  [DefaultValue(null)]
  public string? maxDistance;
  [DefaultValue(null)]
  public string? minDistance;
  [DefaultValue(null)]
  public string? maxHeight;
  [DefaultValue(null)]
  public string? minHeight;
  [DefaultValue(null)]
  public string? position;
  [DefaultValue(null)]
  public string? offset;
  [DefaultValue(null)]
  public string? data;
  [DefaultValue(null)]
  public string[]? filters;
  [DefaultValue(null)]
  public string[]? bannedFilters;
  [DefaultValue(null)]
  public string? filterLimit;
  [DefaultValue(null)]
  public string? weight;
  [DefaultValue(null)]
  public string? self;
  [DefaultValue(null)]
  public string? condition;
}
```

14 fields: `prefab`, `maxDistance`, `minDistance`, `maxHeight`, `minHeight`, `position`,
`offset`, `data`, `filters`, `bannedFilters`, `filterLimit`, `weight`, `self`, `condition`.

Schema, `generate.mjs` lines 171–183:

```js
const objectDataBaseProperties = withFilterFields({
  prefab: str,
  maxDistance: numberOrString,
  minDistance: numberOrString,
  maxHeight: numberOrString,
  minHeight: numberOrString,
  position: str,
  offset: str,
  data: str,
  weight: numberOrString,
  self: boolOrString,
  condition: str,
});
```

`withFilterFields` (`generate.mjs` lines 49–58) adds `filter`, `filters`, `bannedFilter`,
`bannedFilters`, `filterLimit` on top of the 11 fields listed explicitly. Combined, the schema's
`objectDataBaseProperties` has 16 keys: the 14 above, plus singular `filter` and `bannedFilter`.

**Result: every one of the 14 real `ObjectData` fields is present in `objectDataBaseProperties`.
No field from source is missing from the schema.**

### The two extra keys (`filter`, `bannedFilter`) are not stale — pre-existing, cited precedent

The schema also declares singular `filter: str` and `bannedFilter: str`, which do **not** appear
as literal C# fields on `ObjectData` (only the plural array fields `filters`/`bannedFilters` do,
confirmed above). This is not a new discrepancy this round surfaced — it's already documented and
justified in the schema itself, at `generate.mjs` lines 45–48:

```js
// filter/bannedFilter singular forms are real (live-tested, not a typo — see
// ticket 08) even though the current C# source only declares the plural
// filters/bannedFilters array fields. Singular = one value, plural = array of
// the same value type, same underlying property.
```

and independently corroborated by `.scratch/ew_toolkit/research/02-schema-source.md` lines 42–49,
which records the project owner live-testing `filter: int, pickedUp, 1` (singular inline),
`filters: [...]` (plural list), and `filter: isFromPlayerInventory` (singular bareword) on a
running server and confirming all three are accepted equivalently. That finding applies to the
top-level `Data` class's own `filters`/`bannedFilters`/`filterLimit` fields (`PrefabData.cs` lines
131–135, same plural-only shape), and by the same YAML-deserializer-level coercion mechanism it
applies equally to `ObjectData`'s identically-shaped `filters`/`bannedFilters` fields. **Verdict:
`filter`/`bannedFilter` in `objectDataBaseProperties` are intentional, evidence-backed extensions
of the literal C# field list, not a stale/hallucinated field. No fix needed.**

## 2. Completeness: every `PokeData`-specific field present in `pokeData`'s own properties?

`PrefabData.cs` lines 655–681, `PokeData` class:

```csharp
public class PokeData : ObjectData
{
  [DefaultValue(null)]
  public string? delay;
  [DefaultValue(null)]
  public string? repeat;
  [DefaultValue(null)]
  public string? repeatInterval;
  [DefaultValue(null)]
  public string? repeatChance;
  [DefaultValue(null)]
  public string? chance;
  [DefaultValue(null)]
  public string? connected;
  [DefaultValue(null)]
  public string? target;
  [DefaultValue(null)]
  public string? parameter;
  [DefaultValue(null)]
  public string? pars;
  [DefaultValue(null)]
  public string? limit;
  [DefaultValue(null)]
  public string? random;
  [DefaultValue(null)]
  public string? evaluate;
}
```

12 fields beyond inheritance: `delay`, `repeat`, `repeatInterval`, `repeatChance`, `chance`,
`connected`, `target`, `parameter`, `pars`, `limit`, `random`, `evaluate`.

Schema, `generate.mjs` lines 192–212:

```js
// PokeData extends ObjectData in C#.
const pokeData = {
  title: "Poke entry",
  type: "object",
  properties: {
    ...objectDataBaseProperties,
    delay: numberOrString,
    repeat: numberOrString,
    repeatInterval: numberOrString,
    repeatChance: numberOrString,
    chance: numberOrString,
    connected: boolOrString,
    target: str,
    parameter: str,
    pars: str,
    limit: numberOrString,
    random: boolOrString,
    evaluate: boolOrString,
  },
  additionalProperties: false,
};
```

The 12 fields listed after the `objectDataBaseProperties` spread are exactly, 1:1, the 12
`PokeData`-specific C# fields (same names, same order even). **No `PokeData`-specific field is
missing, and none of the 12 is stale relative to current source.**

## 3. Structural shape: does `PokeData` still literally extend `ObjectData`?

`PrefabData.cs` line 655: `public class PokeData : ObjectData`. Confirmed unchanged — `PokeData`
still literally inherits from `ObjectData` in current `main`. The schema's approach of spreading
`objectDataBaseProperties` into `pokeData`'s own `properties` (`generate.mjs` line 197,
`...objectDataBaseProperties`) is structurally faithful to this inheritance relationship.

## 4. The `objects`/`bannedObjects` dual-format union: does `Object(string line)` still exist and parse the same way?

`PrefabData.cs` lines 569–606, full body:

```csharp
public Object(string line)
{
  var split = Parse.ToList(line);
  HasPrefabFilter = split.Count > 0 && !string.IsNullOrWhiteSpace(split[0]);
  PrefabsValue = DataValue.Prefab(split[0]);
  MaxDistanceValue = new SimpleFloatValue(100f);

  if (split.Count > 1)
  {
    var range = Parse.StringRange(split[1]);
    if (range.Min != range.Max)
      MinDistanceValue = DataValue.Float(range.Min);
    MaxDistanceValue = DataValue.Float(range.Max);
  }
  if (split.Count > 2)
    filters = new Filters([split[2]], null, null);
  if (split.Count > 3)
  {
    WeightValue = DataValue.Int(split[3]);
  }
  if (split.Count > 4)
  {
    var range = Parse.StringRange(split[4]);
    if (range.Min != range.Max)
      MinHeightValue = DataValue.Float(range.Min);
    MaxHeightValue = DataValue.Float(range.Max);
  }
  if (split.Count > 5)
  {
    if (Conditions.TryParse(split[5], out var condition, out var error))
      Condition = condition;
    else
    {
      Log.Warning($"Invalid object condition '{split[5]}' for object '{split[0]}': {error}");
      Condition = Conditions.False(split[5]);
    }
  }
}
```

Confirmed: `Object(string line)` still exists at line 569, in the same `Object` class (line 516)
that also has `Object(ObjectData data)` (line 531, the nested-object-form constructor). It's a
plain positional split (`Parse.ToList(line)`, comma/space-delimited per `Parse.cs`) into up to 6
slots: prefab, distance-range, single filter, weight, height-range, condition — the same shape
`research/02-schema-source.md` line 101 already described ("legacy single-line strings ... a
dual-format union"). **Verdict: the `objectOrLegacyString` union in `generate.mjs` line 240
(`{ oneOf: [objectData, { type: "string" }] }`) remains structurally correct** — the schema doesn't
attempt to validate the internal shape of the legacy string (reasonably so, given it's a bare
positional format with no field names), and that's still the right call since the constructor is
unchanged.

---

## Summary

| Check | Result |
|---|---|
| Every `ObjectData` C# field present in `objectDataBaseProperties`? | Yes — all 14, `PrefabData.cs:682-712` |
| Any stale field in `objectDataBaseProperties` not backed by source? | No — the two extra keys (`filter`, `bannedFilter`) are a pre-existing, cited, live-tested extension (`generate.mjs:45-48`, `research/02-schema-source.md:42-49`), not new fabrication |
| Every `PokeData`-specific field present in schema's `pokeData`? | Yes — all 12, `PrefabData.cs:655-681`, exact 1:1 match with `generate.mjs:198-209` |
| `PokeData : ObjectData` inheritance still holds? | Yes — `PrefabData.cs:655` |
| `Object(string line)` legacy constructor still exists/parses the same? | Yes — `PrefabData.cs:569-606`, unchanged 6-slot positional shape |

**No gap found.** `objectData`, `pokeData`, and `objectOrLegacyString` in
`ewp_validator/schema/generate.mjs` are fully faithful to the current `main`-branch
`ExpandWorldPrefabs/PrefabData.cs` source as of 2026-08-19. No schema fix is suggested or needed
for this ticket.
