# Verify itemEntry's field-name list against WEC's Item shape

Research for ticket 06. Fetched directly from Jere Kuusela's public GitHub repo
(`JereKuusela/valheim-world_edit_commands`, branch `main`) on 2026-08-19 via
`raw.githubusercontent.com` and the GitHub Contents API — docs were checked
first, then cross-checked against the actual C# deserialization target class,
which is the PRIMARY SOURCE for this question (not the docs).

Files fetched and read in full for this research:

- `README_data.md` (root) — the "Loot generation" section (lines 239–319)
  documents the item-entry shape.
- `WorldEditCommands/service/data/DataData.cs` (81 lines) — defines `ItemData`,
  the actual class YamlDotNet deserializes each `items[]` entry into.
- `WorldEditCommands/service/data/DataValues.cs` (lines 149–248) — defines
  `ItemValue`, which wraps a deserialized `ItemData` and shows exactly how
  each field is consumed/typed downstream.
- `WorldEditCommands/service/data/PlainDataEntry.cs` (lines 123–169) —
  `GetItems`, the reverse direction (binary ZDO item data → `ItemData`),
  useful as a second, independent confirmation of each field's real shape.
- `WorldEditCommands/data/DataLoading.cs` (139 lines) — confirms `DataData`
  (which embeds `ItemData[]? items`) is loaded via
  `Yaml.LoadListsFromDirectory<DataData>`, i.e. plain YamlDotNet
  deserialization, no custom item-list parsing layer.

Directory listings fetched via the GitHub Contents API to locate these files:
`WorldEditCommands/`, `WorldEditCommands/data/`, `WorldEditCommands/service/`,
`WorldEditCommands/service/data/`.

---

## 1. Completeness: field-name list

`DataData.cs` lines 55–82, the `ItemData` class (this is the ground truth —
every `items[]` entry deserializes into exactly this class, nothing more,
nothing less, per the standard YamlDotNet `additionalProperties`-free binding
used throughout WEC):

```csharp
public class ItemData
{
  public string pos = "";
  [DefaultValue(1f)]
  public float chance = 1f;
  [DefaultValue("")]
  public string prefab = "";
  [DefaultValue("1")]
  public string stack = "1";
  [DefaultValue("1")]
  public string quality = "1";
  [DefaultValue("0")]
  public string variant = "0";
  [DefaultValue("0")]
  public string durability = "0";
  [DefaultValue("0")]
  public string crafterID = "0";
  [DefaultValue("")]
  public string crafterName = "";
  [DefaultValue("0")]
  public string worldLevel = "0";
  [DefaultValue("false")]
  public string equipped = "false";
  [DefaultValue("false")]
  public string pickedUp = "false";
  [DefaultValue(null)]
  public Dictionary<string, string>? customData;
}
```

That's exactly 13 fields: `pos`, `chance`, `prefab`, `stack`, `quality`,
`variant`, `durability`, `crafterID`, `crafterName`, `worldLevel`, `equipped`,
`pickedUp`, `customData`.

`ewp_validator/schema/generate.mjs` lines 352–370, `itemEntry`:

```js
const itemEntry = {
  type: "object",
  properties: {
    pos: str,
    chance: numberOrString,
    prefab: str,
    stack: numberOrString,
    quality: numberOrString,
    variant: numberOrString,
    durability: numberOrString,
    crafterID: numberOrString,
    crafterName: str,
    worldLevel: numberOrString,
    equipped: boolOrString,
    pickedUp: boolOrString,
    customData: str,
  },
  additionalProperties: false,
};
```

**Verdict: complete and correct.** The schema's 13 property names are an exact
1:1 match against `ItemData`'s 13 fields — no field present in source is
missing from the schema, and no field in the schema is stale/invented. This
also matches `README_data.md` lines 261–282 ("Item properties" list), which
documents the same 13 names. Docs and source agree here.

---

## 2. Structural shape: field types

Per-field comparison of `ItemData`'s C# type (`DataData.cs`) against how each
field is actually consumed in `ItemValue` (`DataValues.cs` lines 227–241,
constructor body) against the schema's typing:

| Field | C# type (`DataData.cs`) | Consumed as (`DataValues.cs`) | Schema type | Match? |
|---|---|---|---|---|
| `pos` | `string` | `Parse.Vector2Int(data.pos)` (line 233) — plain string, not parameter-substitutable | `str` | Yes |
| `chance` | `float` (not string!) | `public float Chance = data.chance;` (line 229) — **direct assignment, no `DataValue.*` wrapper** | `numberOrString` | Yes (see note below) |
| `prefab` | `string` | `DataValue.String(data.prefab, ...)` (line 228) | `str` | Yes |
| `stack` | `string` | `DataValue.Int(data.stack, ...)` (line 230) | `numberOrString` | Yes |
| `quality` | `string` | `DataValue.Int(data.quality, ...)` (line 235) | `numberOrString` | Yes |
| `variant` | `string` | `DataValue.Int(data.variant, ...)` (line 236) | `numberOrString` | Yes |
| `durability` | `string` | `DataValue.Float(data.durability, ...)` (line 231) | `numberOrString` | Yes |
| `crafterID` | `string` | `DataValue.Long(data.crafterID, ...)` (line 237) | `numberOrString` | Yes |
| `crafterName` | `string` | `DataValue.String(data.crafterName, ...)` (line 238) | `str` | Yes |
| `worldLevel` | `string` | `DataValue.Int(data.worldLevel, ...)` (line 240) | `numberOrString` | Yes |
| `equipped` | `string` | `DataValue.Bool(data.equipped, ...)` (line 234) | `boolOrString` | Yes |
| `pickedUp` | `string` | `DataValue.Bool(data.pickedUp, ...)` (line 241) | `boolOrString` | Yes |
| `customData` | **`Dictionary<string, string>?`** | `data.customData?.ToDictionary(kvp => kvp.Key, kvp => DataValue.String(kvp.Value, ...))` (line 239) | **`str`** | **No — GAP** |

### `chance` note (not a bug)

`chance` is the one field that's a genuine C# `float` rather than a `string`
in `ItemData` — unlike every other numeric-looking field (`stack`, `quality`,
`variant`, `durability`, `crafterID`, `worldLevel`), it is assigned directly
(`Chance = data.chance`, `DataValues.cs:229`) instead of going through a
`DataValue.Int`/`DataValue.Float` wrapper. Practically this means `chance`
does **not** support the parameter-substitution / range / list dynamic-value
syntax (`<param>`, `1;2;0.5`, etc. from `README_data.md`'s "Dynamic data
entries" section) that the other numeric fields do — it's a plain float.
This doesn't affect schema *type* correctness though: `DataData.cs` is loaded
via plain YamlDotNet (`DataLoading.cs:40`, `Yaml.LoadListsFromDirectory<DataData>`),
and YamlDotNet's default scalar-to-primitive conversion parses the scalar's
text value the same way regardless of whether it was written quoted
(`chance: "0.5"`) or bare (`chance: 0.5`) — both produce the string `"0.5"` at
the node level, then get parsed to `float`. So `numberOrString` remains
correct for `chance`, it's just permissive for a different reason than the
other fields (it's YamlDotNet scalar coercion, not the mod's own
`DataValue` parameter-substitution layer). No schema change needed here; flagging
only in case a future ticket wants to special-case "does this field support
`<param>` syntax" documentation.

### `customData` — confirmed gap

`customData` is **not a string** in source. It's `Dictionary<string, string>?`
(`DataData.cs:80-81`), deserialized by plain YamlDotNet as a YAML **mapping**
node, and consumed as a dictionary (`DataValues.cs:239`,
`data.customData?.ToDictionary(...)`). This is independently confirmed by the
reverse-direction code path, `PlainDataEntry.cs`'s `GetItems` (binary → YAML),
lines 141–164:

```csharp
var dictionary = new Dictionary<string, string>();
var num3 = pkg.ReadInt();
for (var j = 0; j < num3; ++j)
{
  dictionary[pkg.ReadString()] = pkg.ReadString();
}
...
list[i] = new()
{
  ...
  customData = dictionary.Count > 0 ? dictionary : null,
  ...
};
```

This is exactly the code path exercised by WEC's own `data dump=name` /
`data save=name` commands (per `README_data.md` lines 7–8, 18) — i.e. real,
in-the-wild `data.yaml` files containing chest/item loot with mod-added custom
data will have `customData` written out by WEC itself as a YAML mapping, e.g.:

```yaml
- name: Chest
  items:
  - pos: 2, 1
    prefab: MagicallyStuffedShroom
    customData:
      SomeModKey: someValue
      AnotherKey: 42
```

`README_data.md` line 279–281 corroborates this in prose: "customData: Custom
data of the item. **This is a list of key-value pairs.** These are only used
by modded items." — i.e. the docs already say it's key-value pairs, not free
text; the schema's `str` typing doesn't match even the docs, let alone the
source.

**The current schema (`customData: str`, `generate.mjs:367`) requires
`customData` to be a plain YAML string scalar.** Any real `customData:
{key: value, ...}` mapping — which is exactly what WEC itself both writes and
reads — would be rejected by `itemEntry`'s `additionalProperties: false` +
`str`-typed `customData`, because a YAML mapping node fails JSON Schema
`{"type": "string"}` validation. This is a false rejection of valid WEC/EWP
YAML, the exact class of bug this audit is hunting for.

---

## 3. Legacy/alias field names

No evidence of any deprecated or alternate item-entry field name. `ItemData`
(`DataData.cs:55-82`) has exactly one C# field per documented property, with
no `[YamlMember(Alias = ...)]` attributes or manual alias-resolution code
anywhere in `DataData.cs`, `DataValues.cs`, or `PlainDataEntry.cs`. This is
unlike the top-level `wecDataEntry` case (`name:` vs. `data:`, ticket 07),
which is a documented typo, not a deserialization-level alias — no comparable
alias/typo pattern was found for any `ItemData` field in this pass.

---

## 4. Recommendation for `ewp_validator/schema/generate.mjs`

Fix `customData`'s type in `itemEntry` (currently `generate.mjs:367`,
`customData: str`). It should accept an object whose values are strings
(matching `Dictionary<string, string>`), not a plain string scalar:

```js
const stringMap = { type: "object", additionalProperties: str };
// ...
const itemEntry = {
  type: "object",
  properties: {
    // ...unchanged...
    customData: stringMap,
  },
  additionalProperties: false,
};
```

(Reuse an existing `object`-of-`str` helper if one already exists elsewhere in
`generate.mjs`; if not, a small `stringMap` constant next to `str`/`strArray`
at the top of the file, as sketched above, keeps it consistent with the
project's existing type-alias style.)

No other change needed for `itemEntry`: field-name completeness (§1) and every
other field's type (§2) were confirmed correct against source, and no
alias/legacy names exist to add (§3).
