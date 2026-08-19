# Verify spawnData's field-name list and structural shape against EWP's `SpawnData` class

Research for `.scratch/schema-source-audit/issues/02-spawn-data-fields.md`. Fetched directly from
Jere Kuusela's public GitHub repo on 2026-08-19 via `raw.githubusercontent.com` (branch `main`) —
primary source, not docs. Same rigor/citation style as
`.scratch/ew_toolkit/research/13-round8-type-case-sensitivity.md`.

Files fetched and read in full for this research:

- `ExpandWorldPrefabs/PrefabData.cs` (875 lines) — `SpawnData` class (lines 323–363), `Spawn` class
  and its two constructors (lines 365–~520), the `Data` class's `spawn`/`swap`/`spawns`/`swaps`
  fields (lines 28–36).
- `ExpandWorldPrefabs/PrefabLoading.cs` (287 lines) — how `data.spawn`/`data.swap`/`data.spawns`/
  `data.swaps` are consumed (`FromData`, `ParseSpawns` overloads, lines 36–40, 198–218).
- `docs/legacy.md` (43 lines) — legacy spawn/swap format documentation.

Schema under audit: `ewp_validator/schema/generate.mjs`, `const spawnData = {...}` (lines 144–169).

---

## 1. Line-number cross-check confirms no drift since prior research

`.scratch/ew_toolkit/research/02-schema-source.md` (2026-08-17) already cited `SpawnData` at
`PrefabData.cs` lines 323–363. Re-fetching `main` today (2026-08-19, two days later) shows the class
starts at the identical line 323 and ends at 363 — the file has not shifted above this point, so
there's no reason to suspect drift in the class itself either. Confirmed by direct read of the fresh
download, not by trusting the old citation.

## 2. Field-by-field comparison: `SpawnData` (C#) vs `spawnData` (schema)

`PrefabData.cs` lines 323–363, the full class body:

```csharp
public class SpawnData
{
  public string? prefab;
  public string? snap;
  public string? pos;
  public string? position;
  public string? rot;
  public string? rotation;
  public string? data;
  public string? delay;
  public string? removeDelay;
  public string? repeat;
  public string? repeatInterval;
  public string? repeatChance;
  public string? chance;
  public string? weight;
  public string? owner;
  public string? attach;
  public string? connect;
  public string? triggerRules;
  public string? condition;
}
```

(`[DefaultValue(null)]` attributes omitted for brevity — every field is optional, all 19 are typed
`string?` at the C# level, per the project's established pattern of runtime-resolved
number/bool/function strings.)

`generate.mjs` lines 144–169, `const spawnData`:

```js
const spawnData = {
  title: "Spawn/swap entry",
  type: "object",
  properties: {
    prefab: str,
    snap: boolOrString,
    pos: str,
    position: str,
    rot: str,
    rotation: str,
    data: str,
    delay: numberOrString,
    removeDelay: numberOrString,
    repeat: numberOrString,
    repeatInterval: numberOrString,
    repeatChance: numberOrString,
    chance: numberOrString,
    weight: numberOrString,
    owner: numberOrString,
    attach: str,
    connect: str,
    triggerRules: boolOrString,
    condition: str,
  },
  additionalProperties: false,
};
```

**All 19 fields present on both sides, same names, same order.** No field on the C# class is
missing from the schema, and no schema property fails to correspond to a real C# field —
`additionalProperties: false` is safe here.

### Completeness (ticket Q1): no gap

Every one of `prefab`, `snap`, `pos`, `position`, `rot`, `rotation`, `data`, `delay`, `removeDelay`,
`repeat`, `repeatInterval`, `repeatChance`, `chance`, `weight`, `owner`, `attach`, `connect`,
`triggerRules`, `condition` exists on both sides. Nothing to add.

### No stale fields (ticket Q2): no gap

Every schema property maps to a real, still-present C# field. Nothing to remove.

### Structural shape (ticket Q3): schema's semantic typing matches how each field is consumed

Every `SpawnData` field is declared `string?` in C#, so reflection alone gives no type signal — the
schema's `str` / `numberOrString` / `boolOrString` choices have to be justified by how each field is
*consumed*. `PrefabData.cs` lines 385–413, the `Spawn(SpawnData data, ...)` constructor, is the
consuming code:

```csharp
Prefab = data.prefab == null ? new SimplePrefabValue(0) : DataValue.Prefab(data.prefab);
Pos = data.pos != null ? DataValue.Vector3(data.pos) : data.position != null ? DataValue.Vector3(data.position) : null;
Snap = data.snap == null ? null : DataValue.Bool(data.snap);
Rot = data.rot != null ? DataValue.Quaternion(data.rot) : data.rotation != null ? DataValue.Quaternion(data.rotation) : null;
Data = data.data == null ? null : DataValue.String(data.data);
Delay = data.delay == null ? ... : DataValue.Float(data.delay);
RemoveDelay = data.removeDelay == null ? null : DataValue.Float(data.removeDelay);
Repeat = data.repeat == null ? null : DataValue.Int(data.repeat);
RepeatInterval = data.repeatInterval == null ? null : DataValue.Float(data.repeatInterval);
RepeatChance = data.repeatChance == null ? null : DataValue.Float(data.repeatChance);
Chance = data.chance == null ? null : DataValue.Float(data.chance);
Weight = data.weight == null ? null : DataValue.Float(data.weight);
Owner = data.owner == null ? null : DataValue.Long(data.owner);
Attach = data.attach == null ? null : DataValue.ZdoId(data.attach);
Connect = data.connect == null ? null : DataValue.ZdoId(data.connect);
TriggerRules = data.triggerRules == null ? ... : DataValue.Bool(data.triggerRules);
// condition: Conditions.TryParse(data.condition, ...) — free-form boolean expression string
```

Mapping each field's `DataValue.*`/`Conditions.*` sink to the schema's chosen type:

| Field | Consumed via | Schema type | Match? |
|---|---|---|---|
| `prefab` | `DataValue.Prefab` (string, wildcard/value-group) | `str` | Yes |
| `pos`/`position` | `DataValue.Vector3` (parses a `"x,z,y"`-style string) | `str` | Yes |
| `snap` | `DataValue.Bool` | `boolOrString` | Yes |
| `rot`/`rotation` | `DataValue.Quaternion` (parses a string) | `str` | Yes |
| `data` | `DataValue.String` | `str` | Yes |
| `delay` | `DataValue.Float` | `numberOrString` | Yes |
| `removeDelay` | `DataValue.Float` | `numberOrString` | Yes |
| `repeat` | `DataValue.Int` | `numberOrString` | Yes |
| `repeatInterval` | `DataValue.Float` | `numberOrString` | Yes |
| `repeatChance` | `DataValue.Float` | `numberOrString` | Yes |
| `chance` | `DataValue.Float` | `numberOrString` | Yes |
| `weight` | `DataValue.Float` | `numberOrString` | Yes |
| `owner` | `DataValue.Long` | `numberOrString` | Yes |
| `attach` | `DataValue.ZdoId` (string identifier, not numeric) | `str` | Yes |
| `connect` | `DataValue.ZdoId` | `str` | Yes |
| `triggerRules` | `DataValue.Bool` | `boolOrString` | Yes |
| `condition` | `Conditions.TryParse` (free-form expression string) | `str` | Yes |

No mismatches. Every field's schema type correctly reflects the runtime value it resolves to
(`Bool`→boolOrString, `Float`/`Int`/`Long`→numberOrString, everything else — including the
`ZdoId`-typed `attach`/`connect`, which are string identifiers, not numbers — → plain `str`).

### Legacy/alias names (ticket Q4): no additional aliases inside `SpawnData` itself; parent-level split already correctly modeled

`docs/legacy.md` documents legacy spawn/swap handling, but all of it is at the *parent array field*
level, not inside the nested `SpawnData` object shape:

> Old way of spawning.
> - `spawns`: Short-format for spawns without parameter support. Format is
>   `id, posX,posZ,posY, rotY,rotX,rotZ, data, delay, triggerRules`.
> - `spawn`: Single line short-format for spawns without parameter support.
> - `spawnDelay`: Delay in seconds for spawns and swaps.
> - `swaps` / `swap`: same, for swaps.

This reads as if `spawn`/`swap` could be a per-item dual-format array (nested object **or** legacy
string in the same array, the way `objects`/`bannedObjects` genuinely work — confirmed separately in
this audit via `objectOrLegacyString` in the schema). It is not. `PrefabData.cs` lines 28–36, the
`Data` class:

```csharp
public SpawnData[]? swap;
public string[]? swaps;
public SpawnData[]? spawn;
public string[]? spawns;
public float? spawnDelay;
```

`spawn`/`swap` (singular) are strictly typed `SpawnData[]?` — nested-object arrays only. `spawns`/
`swaps` (plural) are strictly typed `string[]?` — legacy-string arrays only. These are **two
separate fields each**, not one field accepting mixed item types. Confirmed by the consuming code,
`PrefabLoading.cs` lines 36–40 and 198–218: two distinct `ParseSpawns` overloads, one taking
`string[]`, one taking `SpawnData[]`, dispatched by which of `data.spawn`/`data.spawns` (or
`data.swap`/`data.swaps`) is non-null (`PrefabLoading.cs` line 39–40):

```csharp
var allSwaps = data.swap == null ? data.swaps == null ? null : ParseSpawns(data.swaps, spawnDelay, triggerRules) : ParseSpawns(data.swap, spawnDelay, triggerRules);
var allSpawns = data.spawn == null ? data.spawns == null ? null : ParseSpawns(data.spawns, spawnDelay, triggerRules) : ParseSpawns(data.spawn, spawnDelay, triggerRules);
```

The schema already models this correctly, at the `ewpRuleEntry` level (`generate.mjs` lines
324–328), as four separate fields rather than a `oneOf` union:

```js
spawn: { type: "array", items: spawnData },
swap: { type: "array", items: spawnData },
spawns: strArray,
swaps: strArray,
spawnDelay: numberOrString,
```

This is the right shape — no dual-format union needed here (unlike `objects`/`bannedObjects`, which
genuinely are per-item unions via the `Object(string line)` constructor). No legacy alias exists
*inside* the `SpawnData` object shape itself (e.g. no old name for `pos` vs `position` beyond the
two the schema already lists as separate properties, which are themselves the current, non-legacy
aliases per `Spawn`'s constructor — not a legacy/current pair).

---

## Verdict

**No gap found.** `spawnData` in `ewp_validator/schema/generate.mjs` (lines 144–169) is a complete,
accurate, field-for-field match of EWP's current `SpawnData` class (`PrefabData.cs` lines 323–363,
re-verified against `main` as of 2026-08-19, two days after the prior schema-source research pass
with no line drift): all 19 fields present on both sides, no stale schema properties, and every
field's `str`/`numberOrString`/`boolOrString` typing choice is independently justified by tracing it
through the `Spawn(SpawnData data, ...)` constructor's `DataValue.*` sink. The parent-level
`spawn`/`swap` vs. `spawns`/`swaps` split (nested-object array vs. legacy-string array, four
genuinely separate C# fields, not a per-item union) is also already modeled correctly in
`ewpRuleEntry`. No schema change recommended.
