# Is EWP's `type:` field parsing case-insensitive? (and does this generalize?)

Research for round 8, prompted by live in-game testing (EWP 1.58) confirming `type: globalKey` and
`type: globalkey` behave identically. Fetched directly from Jere Kuusela's public GitHub repo on
2026-08-19 via `raw.githubusercontent.com` (branch `main`) — this is the PRIMARY SOURCE, not docs.

Files fetched and read in full for this research:

- `ExpandWorldPrefabs/PrefabData.cs`
- `ExpandWorldPrefabs/PrefabLoading.cs`
- `ExpandWorldPrefabs/Paint.cs`
- `ExpandWorldPrefabs/service/Parse.cs`
- `ExpandWorldPrefabs/service/Yaml.cs`
- Directory listings of `ExpandWorldPrefabs/` and `ExpandWorldPrefabs/service/` via the GitHub REST API (`api.github.com/repos/.../contents/...`).

---

## 1. Where `type`/`types` actually gets parsed

`PrefabLoading.cs` line 42, inside `FromData(Data data)`:

```csharp
var types = (data.types ?? [data.type]).Select(s => new InfoType(data.prefab, s)).ToArray();
```

So every string in `type`/`types` (the raw YAML scalar, typed `string?` on the `Data` class per
`PrefabData.cs`) is fed into the `InfoType` constructor, one instance per value. That constructor
is the entire answer:

`PrefabData.cs` lines 715–732:

```csharp
public class InfoType
{
  public readonly ActionType Type;
  public readonly string[] Parameters;
  public InfoType(string prefab, string line)
  {
    var types = Parse.Kvp(line);
    if (!Enum.TryParse(types.Key, true, out Type))
    {
      if (line == "")
        Log.Warning($"Missing type for prefab {prefab}.");
      else
        Log.Error($"Invalid type {types} for prefab {prefab}.");
      Type = ActionType.Create;
    }
    Parameters = types.Value != "" ? types.Value.Split(' ') : [];
  }
}
```

`Parse.Kvp(line)` splits the compact `"type param1 param2"` string into a key (the type name) and
the remaining value (space-joined params) — this is what lets both the `type:` scalar form and the
first token of a `"globalkey myKey"`-style compact string work the same way.

The actual name-to-enum resolution is `Enum.TryParse(types.Key, true, out Type)` — the second
positional argument to `Enum.TryParse<TEnum>(string, bool, out TEnum)` is `ignoreCase`, and it is
passed `true` explicitly.

**Verdict: `type`/`types` parsing is unambiguously case-insensitive**, confirmed directly in the
current `main` source, matching the user's live 1.58 in-game test (`globalKey` and `globalkey` both
resolve to `ActionType.GlobalKey`). There is no `.ToLower()`/normalization step anywhere upstream —
the case-insensitivity comes entirely from `Enum.TryParse`'s `ignoreCase` flag at the point where
the string is consumed.

Only side effect of a bad value: on no match, `InfoType` logs `Log.Error($"Invalid type ...")` and
silently falls back to `ActionType.Create` — i.e. a genuinely misspelled `type:` doesn't throw or
skip the rule, it degrades to `create` with a console error. Not part of the case-sensitivity
question, but worth remembering if the validator ever wants to explain *why* a bad type is risky
beyond "it won't validate."

---

## 2. Does this generalize? Yes — `Enum.TryParse(..., true, ...)` is the house style for every enum-shaped field

This is not something special-cased for `type`. Grepping `ExpandWorldPrefabs/service/Parse.cs`
(the shared parsing-helper module — see note in §3 below) turns up the identical
`Enum.TryParse(arg, true, out X)` pattern for every other field in EWP that binds to a real C#
enum:

```
Parse.cs:404:  if (key == "type") hit.m_hitType = Enum.TryParse(value, true, out HitData.HitType type) ? type : HitData.HitType.Undefined;
Parse.cs:411:  return Enum.TryParse(arg, true, out MessageHud.MessageType state) ? (int)state : Int(arg, 2);
Parse.cs:415:  return Enum.TryParse(arg, true, out BaseAI.AggravatedReason state) ? (int)state : Int(arg, 0);
Parse.cs:419:  return Enum.TryParse(arg, true, out Trap.TrapState state) ? (int)state : Int(arg, 0);
Parse.cs:423:  return Enum.TryParse(arg, true, out DamageText.TextType state) ? (int)state : Int(arg, 0);
Parse.cs:427:  return Enum.TryParse(arg, true, out TerrainModifier.PaintType state) ? (int)state : Int(arg, 0);
```

Line 427 is the one directly relevant to the schema: it's `terrain[].paint`'s enum
(`TerrainModifier.PaintType` — `ClearVegetation`/`Cultivate`/`Dirt`/`Paved`/`Reset`, per
`docs/scripting.md`). Same `ignoreCase: true` pattern, so `terrain[].paint` is also case-insensitive
in current source, e.g. `paint: dirt`, `paint: Dirt`, `paint: DIRT` should all work identically.

### The *other* `paint` field (top-level `paint`/`minPaint`/`maxPaint`) uses a different mechanism, but arrives at the same case-insensitivity

This field isn't a real C# enum (`Paint.cs`/ticket 02's research already established this — it's a
`Color`-valued lookup, not an `Enum.TryParse` target). Its parser is `Parse.Color`, `Parse.cs` lines
440–447:

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
public static Color? Color(string arg, float defaultAlpha)
{
  var lower = arg.ToLowerInvariant();
  if (Paints.TryGetValue(lower, out var color)) return color;
  var split = Split(arg);
  if (split.Length < 3) return null;
  return new(Float(split[0]), Float(split[1]), Float(split[2]), split.Length > 3 ? Float(split[3]) : defaultAlpha);
}
```

Dictionary keys are stored lowercase, and the lookup key is `arg.ToLowerInvariant()` before the
`TryGetValue` — so `paint: Grass_Dark`, `paint: GRASS_DARK`, `paint: grass_dark` all normalize to
the same dictionary hit. Case-insensitive by a different mechanism (`.ToLowerInvariant()` +
lowercase-keyed dictionary) than `type`'s `Enum.TryParse(..., true, ...)`, but the net effect for
schema purposes is identical: any-case input is accepted.

### Booleans are also case-insensitive, same file

`Parse.cs` lines 160–165 / 358–359 (`admin`, `day`, `remove`, etc. — the "string-typed but really
bool" fields from ticket 02's research):

```csharp
public static bool Boolean(string arg) => arg.ToLowerInvariant() == "true";
public static bool BooleanTrue(string arg) => arg.ToLowerInvariant() == "false";
```

Same story: lowercased before comparison against a lowercase literal.

### Correction to prior research: the "closed-source shared library" premise in ticket 02 was wrong

Ticket 02 (`research/02-schema-source.md`, §1) concluded that `Parse`, `DataValue`, `Conditions`,
`Yaml.Init()` etc. live in a closed-source DLL not present in either public repo, because that
research pass only looked under `ExpandWorldPrefabs/*.cs` (the top-level folder) and didn't find
them there. They are in fact public source, just one directory level down, in
`ExpandWorldPrefabs/service/` (`Parse.cs`, `Yaml.cs`, `DataStorage.cs`, `FileLoading.cs`,
`Logger.cs`, `ServerClient.cs`, plus a `service/data/` subfolder). This research pass confirmed
`service/` exists and fetched `Parse.cs` (448 lines) and `Yaml.cs` (439 lines) directly — both
plain C#, MIT-repo-licensed like the rest of EWP, not a compiled reference. This doesn't mean
*everything* ticket 02 flagged as unenumerable is now resolved (`DataValue`/`Conditions` weren't
re-checked in this pass), but the "shared parsing/aliasing logic is invisible" premise needs
revisiting — `service/` is exactly where that logic lives, and it's public. Worth a follow-up pass
if the `filter`/`bannedFilter` singular-vs-plural question (already settled empirically in ticket
08) or the `Conditions` grammar ever need re-derivation from source instead of live testing.

### `Yaml.cs`: no global case-insensitive enum converter

Checked in case case-insensitivity was coming from a YamlDotNet-level naming convention or custom
`IYamlTypeConverter` for enums (which would mean *every* enum-bound field anywhere is
case-insensitive uniformly, deserialization-time). It isn't: `Yaml.cs`'s `Deserialize<T>` uses a
standard `DeserializerBuilder` (camelCase naming convention for property names, not enum values),
and `type` is deserialized as a plain `string` on the `Data` class (confirmed in `PrefabData.cs`) —
the enum resolution happens later, in application code (`InfoType`'s constructor, called from
`PrefabLoading.FromData`), not during YAML parsing. So the case-insensitivity is a property of the
*consuming* code, field by field, not a blanket YamlDotNet setting — but as shown above, the
consuming code consistently chooses case-insensitive comparisons everywhere it resolves an
enum-like string.

---

## 3. Summary table

| Field | Parser | Case-insensitive? | Citation |
|---|---|---|---|
| `type` / `types` | `Enum.TryParse(types.Key, true, out Type)` | Yes | `PrefabData.cs:722` |
| `terrain[].paint` | `Enum.TryParse(arg, true, out TerrainModifier.PaintType state)` | Yes | `service/Parse.cs:427` |
| `paint` / `minPaint` / `maxPaint` (top-level) | `arg.ToLowerInvariant()` against lowercase-keyed `Paints` dict | Yes | `service/Parse.cs:440-443` |
| `objectRpc`/`clientRpc` hit `type` sub-key (`HitData.HitType`) | `Enum.TryParse(value, true, ...)` | Yes | `service/Parse.cs:404` |
| Other engine enums parsed via `Parse.cs` (`MessageHud.MessageType`, `BaseAI.AggravatedReason`, `Trap.TrapState`, `DamageText.TextType`) | `Enum.TryParse(arg, true, ...)` | Yes | `service/Parse.cs:411,415,419,423` |
| `admin`/`day`/`night`/`remove`/etc. (bool-like strings) | `arg.ToLowerInvariant() == "true"/"false"` | Yes | `service/Parse.cs:160-165,358-359` |

Every enum-like or keyword-like string field checked in this pass is case-insensitive. No
counterexample (a case-sensitive comparison against a fixed keyword set) was found anywhere in
`Parse.cs` or `PrefabData.cs`.

---

## 4. Recommendation for `ewp_validator/schema/generate.mjs`

1. **`type` (and any `types` array entries)**: change the schema so the enum check is
   case-insensitive. The cleanest approach given the existing `TYPE_ENUM` array of canonical
   lowercase names: normalize the input value (`value.toLowerCase()`) before comparing against
   `TYPE_ENUM`, rather than expanding the enum/pattern to literally enumerate every case variant
   (which is unbounded — `globalKey`, `GLOBALKEY`, `GlobalKey`, `globalkey`, etc. are all
   individually valid to the C# `Enum.TryParse`). If the schema is JSON-Schema-based and can't
   normalize at validation time, use a case-insensitive regex per value (e.g.
   `/^(create|destroy|change|state|say|command|poke|globalkey|key|custom|event|time|realtime)$/i`)
   instead of a plain string enum.
2. **`terrain[].paint`**: same treatment — case-insensitive match against
   `clearvegetation|cultivate|dirt|paved|reset` (this is a separate enum from the top-level
   `paint`, per ticket 02's finding, unaffected by this change — just noting it needs the same
   case-insensitive fix).
3. **Top-level `paint`/`minPaint`/`maxPaint`**: if the schema validates these against the
   `cultivated|dirt|grass|grass_dark|patches|paved|paved_dark|paved_dirt|paved_moss` word-list (as
   opposed to only accepting numeric `r,g,b,a`), apply the same case-insensitive treatment — the
   underlying dictionary lookup lowercases input before comparing.
4. Keep canonical lowercase as the *suggested/documented* form in any autocomplete, hints, or
   generated examples — docs and every real-world EWP script use lowercase exclusively, so
   lowercase remains the idiomatic style even though other casings are accepted. This mirrors the
   ticket 08 precedent for `filter`/`bannedFilter`: accept the wider set the source actually
   supports, without necessarily promoting it in generated examples.
5. No change needed for fields that are validated as free-form strings already (e.g. the
   `component.m_field` data-key namespace, per ticket 08) — this finding only affects fields
   currently validated against a fixed keyword/enum list.
