# WEC data-entry name key: `name:` vs `data:` — resolved via C# source

**Question:** WEC's `README_data.md` uses two different YAML keys for a data entry's identifying
name — `data:` in the "Dynamic data entries" section and `name:` everywhere else (including its
own field-reference table and every EWP example file). Which key(s) does the mod actually accept?

**Bottom line: `name:` is the only valid key. `data:` is not a recognized alias — it is a
documentation error that appears to have been copy-pasted through one section of the README.
The EWP Toolkit schema should treat `name:` as the sole valid key for a WEC data entry's name
property, and should flag/warn on `data:` used in that position (a YAML doc using `data:` there
will silently fail to register the entry — see "Runtime consequence" below).**

## Source of truth: the C# class backing a data entry

Repo: `JereKuusela/valheim-world_edit_commands`, file
`WorldEditCommands/service/data/DataData.cs` (fetched from `main` branch, full raw contents):

```csharp
using System.Collections.Generic;
using System.ComponentModel;

namespace Data;

public class DataData
{
  [DefaultValue(null)]
  public string? name;
  [DefaultValue(null)]
  public string? position;
  [DefaultValue(null)]
  public string? rotation;
  [DefaultValue(null)]
  public string? connection;
  [DefaultValue(null)]
  public string[]? bools;
  [DefaultValue(null)]
  public string[]? ints;
  [DefaultValue(null)]
  public string[]? hashes;
  [DefaultValue(null)]
  public string[]? floats;
  [DefaultValue(null)]
  public string[]? strings;
  [DefaultValue(null)]
  public string[]? longs;
  [DefaultValue(null)]
  public string[]? vecs;
  [DefaultValue(null)]
  public string[]? quats;
  [DefaultValue(null)]
  public string[]? bytes;
  [DefaultValue(null)]
  public ItemData[]? items;
  [DefaultValue(null)]
  public string? containerSize;
  [DefaultValue(null)]
  public string? itemAmount;

  [DefaultValue(null)]
  public string? valueGroup;
  [DefaultValue(null)]
  public string? value;
  [DefaultValue(null)]
  public string[]? values;
  [DefaultValue(null)]
  public string? persistent;
  [DefaultValue(null)]
  public string? distant;
  [DefaultValue(null)]
  public string? priority;
}
```

`DataData` (this is the class YAML data-entry documents deserialize into — see `DataLoading.cs`
below) declares a field literally named `name`. **There is no field named `data` anywhere on this
class.** No `[YamlMember(Alias = ...)]`, `[YamlAlias]`, or any other YamlDotNet renaming/aliasing
attribute appears anywhere in the file — every field is annotated only with
`System.ComponentModel.DefaultValueAttribute`, which controls YAML *serialization* omission of
default values, not key names or aliases.

The same absence of aliasing attributes was confirmed in the two related files:
- `WorldEditCommands/service/data/DataEntry.cs` (full file fetched) — no `[YamlMember]`/alias
  attributes anywhere; this class doesn't correspond directly to YAML keys, it's the runtime
  model built *from* a `DataData`.
- `WorldEditCommands/service/data/PlainDataEntry.cs` (full file fetched) — no `[YamlMember]`/alias
  attributes anywhere; used for ZDO→YAML export (`data dump`), not for parsing user-authored YAML.

## Confirming `name` (not `data`) is what actually gets read

`WorldEditCommands/service/data/DataLoading.cs`, method `LoadEntry(string file, DataData data)`:

```csharp
if (data.name != null)
{
  var hash = data.name.GetStableHashCode();
  if (Data.ContainsKey(hash))
    Log.Warning($"Duplicate data entry: {data.name} at {file}");
  DataKeys.Add(data.name);
  Data[hash] = new DataEntry(data);
}
```

This is the code path that registers a parsed YAML data entry into the mod's runtime `Data`
dictionary (keyed by hashed name, used later by `data load=<name>` etc.). It reads `data.name`
exclusively — the deserialized `DataData` object's `name` field. There is no corresponding branch
that reads any `data.data`-style property (again, no such field exists on `DataData`).

## The README's own reference table agrees with the source

`README_data.md` (fetched raw from `main`), line 56, in the "### Data properties" reference
section:

```
- name: Name of the data entry. Must be unique across all files.
```

This is the README's own authoritative field-reference listing (line 56, immediately following
the data-type list at lines 44–51), and it documents `name` — matching the C# field exactly. This
same section is what every EWP example file and the "Loot generation" section correctly follow
(e.g. `- name: Chest` at line 244, `- name: BigChest` at line 298).

## Where `data:` actually appears — confirmed as an isolated, contained typo

Grepping the full README (`README_data.md`, 351 lines) for entry-opening lines:

```
56:- name: Name of the data entry. Must be unique across all files.
93:- data: leveler
105:- data: someData
113:- data: someData
123:- data: leveler
135:- data: randomLeveler
147:- data: someData
157:- data: randomLeveler
163:- data: leveler
187:- data: leveler
202:- data: texter
214:- data: texter
232:- data: leveler
244:- name: Chest
288:- name: Chest
298:- name: BigChest
```

All 10 occurrences of `- data:` are confined to the "### Parameters" / "Dynamic data entries"
block (lines 93–232, under the "Data entries" walkthrough that covers parameters, target-object
substitution, expressions, lists, and ranges). Every other data-entry example in the same
document — the field reference itself (line 56) and the entirely separate "Loot generation"
section (lines 244, 288, 298) — uses `- name:`. This pattern (one contiguous section, ten repeats,
never appearing anywhere else, and contradicting the doc's own reference table two sections above
it) is consistent with a single early copy-paste error in that section's first example that then
propagated to every subsequent example copied from it, not a genuine second accepted key.

## Runtime consequence of following the buggy `data:` examples

Because `DataData` has no `data` field, a YAML document written as `- data: leveler` would
deserialize with `name` left at its default (`null`). In `DataLoading.LoadEntry`, the
`if (data.name != null)` guard would then be false, so the entry would **not** be added to the
`Data` dictionary at all — i.e., the entry silently fails to register (no error is inherently
guaranteed here; whether YamlDotNet is configured elsewhere in this mod to also throw on
completely unrecognized keys was not confirmed — the shared `Yaml`/deserializer setup lives in an
external `ServerDevcommands`/`Service` library referenced via `using` statements that isn't part
of this repo's own source tree, so its `IgnoreUnmatchedProperties` configuration could not be
inspected directly). Either way, a user following the `data:` examples literally ends up with a
non-functional or dropped entry, not a working alias.

## Recommendation for EWP Toolkit schema

- Treat `name:` as the sole valid key for a WEC data entry's identifying-name property.
- Do not accept `data:` as an alias.
- Consider a lint/warning rule: if a list item under a WEC data-entries file has `data:` as a
  top-level key alongside typical data-entry siblings (`ints:`, `floats:`, `strings:`, `vecs:`,
  etc.) but no `name:`, flag it as "likely meant `name:` — `data:` is not a recognized key (WEC
  README typo, confirmed against source)."

## Sources consulted (all fetched directly, `main` branch, JereKuusela/valheim-world_edit_commands)

- `WorldEditCommands/service/data/DataData.cs` — full raw source
- `WorldEditCommands/service/data/DataEntry.cs` — full raw source
- `WorldEditCommands/service/data/PlainDataEntry.cs` — full raw source
- `WorldEditCommands/service/data/DataLoading.cs` — full raw source
- `README_data.md` — full raw source, 351 lines
- Repo tree listings via `https://api.github.com/repos/JereKuusela/valheim-world_edit_commands/contents/WorldEditCommands/service/data` and `.../WorldEditCommands/service` (confirmed no separate `Yaml.cs`/deserializer-config file exists in this repo; that plumbing lives in an external shared library not inspected here)
