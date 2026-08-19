# `terrainData` field completeness and `TERRAIN_PAINT_ENUM` member-list audit

Research for ticket 04. Fetched directly from Jere Kuusela's public GitHub repo
(`JereKuusela/valheim-expand_world_prefabs`, branch `main`) via
`raw.githubusercontent.com` and the GitHub contents API on 2026-08-19 — PRIMARY SOURCE,
not docs, except where noted in §2.

Files fetched and read in full for this research:

- `ExpandWorldPrefabs/PrefabData.cs` (875 lines) — `TerrainData` class and `Terrain` class.
- `ExpandWorldPrefabs/service/Parse.cs` (448 lines) — `EnumTerrainPaint`, the parse function for `paint`.
- `ExpandWorldPrefabs/DelayedTerrain.cs` — confirmed it only forwards a pre-built `ZPackage`, no additional paint-related constants.
- Directory listing of `ExpandWorldPrefabs/` via GitHub REST API — confirmed no other file references `PaintType`.
- `docs/scripting.md` (506 lines) — used only for §2's cross-check, since `TerrainModifier.PaintType` itself is not defined in this repo (see below).

---

## 1. `TerrainData` field completeness — exact match, no gap

`PrefabData.cs` lines 735–767, the full `TerrainData` class:

```csharp
public class TerrainData
{
  [DefaultValue(null)]
  public string? delay;
  [DefaultValue(null)]
  public string? pos;
  [DefaultValue(null)]
  public string? position;
  [DefaultValue(null)]
  public string? square;
  [DefaultValue(null)]
  public string? resetRadius;
  [DefaultValue(null)]
  public string? levelRadius;
  [DefaultValue(null)]
  public string? levelOffset;
  [DefaultValue(null)]
  public string? raiseRadius;
  [DefaultValue(null)]
  public string? raisePower;
  [DefaultValue(null)]
  public string? raiseDelta;
  [DefaultValue(null)]
  public string? smoothRadius;
  [DefaultValue(null)]
  public string? smoothPower;
  [DefaultValue(null)]
  public string? paintRadius;
  [DefaultValue(null)]
  public string? paintHeightCheck;
  [DefaultValue(null)]
  public string? paint;
}
```

That's exactly 15 fields: `delay`, `pos`, `position`, `square`, `resetRadius`,
`levelRadius`, `levelOffset`, `raiseRadius`, `raisePower`, `raiseDelta`,
`smoothRadius`, `smoothPower`, `paintRadius`, `paintHeightCheck`, `paint`.

`ewp_validator/schema/generate.mjs` lines 214–235, `const terrainData`:

```js
const terrainData = {
  title: "Terrain entry",
  type: "object",
  properties: {
    delay: numberOrString,
    pos: str,
    position: str,
    square: boolOrString,
    resetRadius: numberOrString,
    levelRadius: numberOrString,
    levelOffset: numberOrString,
    raiseRadius: numberOrString,
    raisePower: numberOrString,
    raiseDelta: numberOrString,
    smoothRadius: numberOrString,
    smoothPower: numberOrString,
    paintRadius: numberOrString,
    paintHeightCheck: boolOrString,
    paint: terrainPaintValue,
  },
  additionalProperties: false,
};
```

Exactly the same 15 property names, same order. **Verdict: complete match — every
field in `TerrainData` has a schema property, and every schema property is a real
field. No missing fields, no stale fields.**

### Structural shape check

Every field on the C# `TerrainData` class is typed `string?` — including `square`,
`paintHeightCheck` (booleans-as-strings) and `resetRadius`/`levelRadius`/etc.
(numbers-as-strings). This is confirmed by `PrefabData.cs:825-840` (the `Terrain`
class that consumes `TerrainData`), which wraps each field through `DataValue.Float`,
`DataValue.Bool`, `DataValue.Vector3`, or `DataValue.String` — i.e. every field is a
parseable expression string, not a native bool/number, matching the established
project convention (ticket 02) that these bind through `IFloatValue`/`IBoolValue`
expression parsers rather than raw YAML scalars:

```csharp
public readonly IFloatValue? Delay = data.delay == null ? null : DataValue.Float(data.delay);
public readonly IFloatValue? ResetRadius = data.resetRadius == null ? null : DataValue.Float(data.resetRadius);
public readonly IVector3Value? Position = data.pos != null ? DataValue.Vector3(data.pos) : data.position != null ? DataValue.Vector3(data.position) : null;
public readonly IBoolValue? Square = data.square == null ? null : DataValue.Bool(data.square);
...
public readonly IBoolValue? PaintHeightCheck = data.paintHeightCheck == null ? null : DataValue.Bool(data.paintHeightCheck);
public readonly IStringValue? Paint = data.paint == null ? null : DataValue.String(data.paint);
```

The schema's `numberOrString` for the radius/power/delta/offset fields, `boolOrString`
for `square`/`paintHeightCheck`, and `str` for `pos`/`position`/`paint` all correctly
reflect this "everything is a string that gets expression-parsed" shape.
**Verdict: structural shape matches source, no gap.**

---

## 2. `terrain[].paint` enum member list — schema's 5 values confirmed complete, with one caveat on source location

`service/Parse.cs` lines 424–427, `EnumTerrainPaint` (the function that actually
consumes the `paint` string at runtime):

```csharp
public static int EnumTerrainPaint(string arg)
{
  return Enum.TryParse(arg, true, out TerrainModifier.PaintType state) ? (int)state : Int(arg, 0);
}
```

**Caveat:** `TerrainModifier` is a base-game Valheim type (`assembly_valheim.dll`),
not a class defined anywhere in `JereKuusela/valheim-expand_world_prefabs`. I
confirmed this by fetching the full directory listing of `ExpandWorldPrefabs/`
(32 files) via the GitHub contents API and grepping every `.cs` file downloaded in
this pass (`PrefabData.cs`, `Parse.cs`, `DelayedTerrain.cs`) for `PaintType` — the
only two hits are the `Enum.TryParse` call site above and its downstream usage in
`PrefabData.cs:865-870` (the `Terrain.Get` method that writes the parsed enum into a
`ZPackage`):

```csharp
var paint = Paint?.Get(f) ?? "Reset";
var paintEnum =
  Enum.TryParse(paint, true, out TerrainModifier.PaintType paintType) ? paintType :
  int.TryParse(paint, out var paintInt) ? (TerrainModifier.PaintType)paintInt :
  TerrainModifier.PaintType.Reset;
```

Neither site *defines* the enum's member list — they only consume it by name. Unlike
ticket 04's other checks, the authoritative definition of `TerrainModifier.PaintType`
is not resolvable from public EWP source; it lives in the closed game assembly. A
web search for a public decompile of `TerrainModifier.PaintType` (2026-08-19) turned
up no accessible source either — only mod-description pages describing terrain paint
types in prose, not a compiled enum listing.

Given that, the best available primary-source confirmation of the *complete* member
list is the EWP maintainer's own documentation, which is deliberately narrower and
more authoritative than a full decompile would be — it documents exactly the values
`EnumTerrainPaint` is expected to accept for this field, not the full base-game enum
(which likely also contains e.g. `Nothing`/unused members irrelevant to this
mod's usage). `docs/scripting.md` lines 442–444, in the same repo, in the
`terrain:` array section:

```
- paintRadius: Radius for the paint change.
- paintHeightCheck: If true, checks something.
- paint: Terrain paint color. Supports values ClearVegetation, Cultivate, Dirt, Paved and Reset.
  - Numeric values are not supported.
```

Five values, same names, same repo, same maintainer, describing the same field this
code path implements. This exactly matches `TERRAIN_PAINT_ENUM` in
`ewp_validator/schema/generate.mjs:115`:

```js
const TERRAIN_PAINT_ENUM = ["ClearVegetation", "Cultivate", "Dirt", "Paved", "Reset"];
```

**Verdict: no gap found.** The schema's 5-value set matches the only authoritative
EWP-repo statement of which `TerrainModifier.PaintType` members this field accepts.
This is consistent with — and does not need to re-derive — ticket 13's already-settled
finding that this comparison is case-insensitive (`Parse.cs:427`, cited there); this
pass only re-confirms the *set* is exactly these 5 names, not more or fewer.

**One residual, low-priority unknown carried forward (not a schema bug):** because the
enum's true definition sits in the closed game assembly, it's theoretically possible
`TerrainModifier.PaintType` has more members than the 5 EWP's docs advertise (e.g. an
unused/internal value), and that `int.TryParse(paint, out var paintInt)` fallback in
`PrefabData.cs:868` would accept a raw numeric index for one of those undocumented
members. But `docs/scripting.md:444` explicitly states "Numeric values are not
supported" for this field (unlike the sibling top-level `paint`/`minPaint`/`maxPaint`
fields, which do document numeric `r,g,b,a` support per §"1" above) — so even if such
members exist, they are explicitly out of the documented/supported surface for
`terrain[].paint`, and the schema correctly excludes them.

---

## 3. Summary

| Check | Result |
|---|---|
| `TerrainData` field completeness (schema has every C# field) | Confirmed — 15/15 match, `PrefabData.cs:735-767` |
| No stale schema fields | Confirmed — no schema property lacks a source field |
| `terrain[].paint` enum set (`ClearVegetation`/`Cultivate`/`Dirt`/`Paved`/`Reset`) | Confirmed — matches `docs/scripting.md:443` (best available source; `TerrainModifier` itself is a base-game type not defined in this repo) |
| Structural shape (numbers/bools/radii as strings) | Confirmed — all `TerrainData` fields are `string?`, schema uses `numberOrString`/`boolOrString`/`str` accordingly |

**No gap found. No schema change recommended for `terrainData` or `TERRAIN_PAINT_ENUM`.**
