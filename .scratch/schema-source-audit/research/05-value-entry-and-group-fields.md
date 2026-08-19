# Do `valueEntry`/`valueGroup` in `generate.mjs` match WEC's actual value/value-group fields?

Research for the schema-source-audit map, ticket 05. Fetched directly from Jere Kuusela's public
GitHub repo `valheim-world_edit_commands` on 2026-08-19 via `raw.githubusercontent.com` and the
GitHub REST tree API (branch `main`) — these are the PRIMARY SOURCE, not docs, per the map's
standing rule.

Files fetched and read in full for this research:

- `README_data.md` (root)
- `WorldEditCommands/service/data/DataData.cs`
- `WorldEditCommands/service/data/DataLoading.cs`
- `WorldEditCommands/service/data/DataEntry.cs`
- Full repo tree listing via `api.github.com/repos/JereKuusela/valheim-world_edit_commands/git/trees/main?recursive=1`

---

## 1. The key structural fact: there is no separate "value entry" or "value group" C# class

`WorldEditCommands/service/data/DataData.cs` is the **one** class WEC deserializes every list item
in a data YAML file into — data entries, value entries, and value groups are not three distinct C#
types, they're one flat class with every field nullable:

```csharp
public class DataData
{
  [DefaultValue(null)]
  public string? name;
  ... // position, rotation, connection, bools, ints, hashes, floats, strings, longs, vecs, quats,
      // bytes, items, containerSize, itemAmount

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

(`DataData.cs`, full class body.) No `[Required]`/non-nullable field exists anywhere — matches
ticket 02's general EWP finding ("every field is structurally optional") extended to WEC's data
system too.

`WorldEditCommands/service/data/DataLoading.cs`'s `LoadEntry(string file, DataData data)` is what
actually interprets one deserialized `DataData` object, and it does so as three **independent,
non-exclusive** `if` branches, not a discriminated union:

```csharp
private static void LoadEntry(string file, DataData data)
{
  if (data.value != null) { ... }                       // value-entry mechanism
  if (data.valueGroup != null && data.values != null) { ... }  // value-group mechanism
  if (data.name != null) { ... }                         // data-entry mechanism
}
```

Nothing stops one YAML object from populating fields from more than one branch at once (e.g.
`name:` and `value:` on the same map) — WEC would just run both branches. The schema's `oneOf` of
`wecDataEntry` / `valueEntry` / `valueGroup` (each `additionalProperties: false`, each requiring a
disjoint field) is stricter than this: a hypothetical entry mixing `name:` with `value:` would fail
all three branches and be rejected. **This is not a confirmed real-world gap** — no README example
or prior ticket (07, 08, 13) shows entries mixing these mechanisms, so there's no evidence scripters
actually write that shape. Flagging it here as a structural note, not a recommended fix: the
existing three-way split matches every real example in the docs and is the same "match the
documented grammar, not the maximally-permissive C# type" judgment call ticket 09 already made
elsewhere in this schema.

---

## 2. Question 1 — Completeness: any fields beyond `value` / `valueGroup`+`values`?

**No.** `DataData.cs` has exactly three fields feeding the value/value-group mechanism: `value`,
`valueGroup`, `values`. The class's other three "leftover" fields — `persistent`, `distant`,
`priority` — are **not** read by either `if (data.value != null)` or
`if (data.valueGroup != null && data.values != null)` in `DataLoading.LoadEntry`. They're read only
inside `DataEntry`'s constructor (`WorldEditCommands/service/data/DataEntry.cs`), which is only
instantiated in the third branch, `if (data.name != null) { ... Data[hash] = new DataEntry(data); }`
— i.e. they're data-entry-only fields (ZDO `Persistent`/`Distant`/`Priority` replication overrides),
confirmed in `DataEntry.cs`:

```csharp
public IBoolValue? Persistent;
public IBoolValue? Distant;
public ZDO.ObjectType? Priority;
...
if (Persistent != null)
  zdo.Persistent = Persistent.GetBool(pars) ?? zdo.Persistent;
```

README_data.md independently confirms there's nothing else documented for value entries/groups: a
full-text pass over the file for "value"/"values"/"valueGroup" turns up exactly the "Value Entries"
section (plain `value:`) and the "Multiple parameter values" section (`valueGroup:`+`values:`) —
no mention of a weight/chance/condition field anywhere, and `persistent`/`distant`/`priority` don't
appear in the doc at all (undocumented data-entry-only fields, out of scope for this ticket).

**Conclusion: no gap.** `valueEntry`'s `{ value: str }` and `valueGroup`'s
`{ valueGroup: str, values: scalarArray }` (`generate.mjs:406-420`) already list every field either
mechanism uses.

---

## 3. Question 2 — `values:` scalar typing: any other valid value kind?

Already correctly resolved by round 5 (ticket 13) for the *string vs. number* question — confirmed
here against the actual field declaration. `values` is declared `string[]? values;` in `DataData.cs`
— a flat array, one C# type (`string`) per element. YamlDotNet's default binder coerces bare YAML
scalars (`123`, `4.5`, `true`) to `string` without error when the target field is `string`, which is
exactly what the README's own example relies on:

```yaml
- valueGroup: randomLevel
  values:
  - 1
  - 2
  - 3
```

(`README_data.md`, "Multiple parameter values" section, quoted verbatim above.) This is the same
fact round 5 already fixed the schema for (`scalarArray` = string|number|boolean).

**No other value kind is valid**, confirmed by the C# type itself:

- **Nested list** (`values: [[1,2], [3,4]]`): impossible — `string[]` cannot bind a YAML sequence
  node per element; YamlDotNet would throw a deserialization exception (an unhandled type
  mismatch), not silently coerce it. No README example or WEC source path produces or expects a
  nested array here.
- **Explicit `null`** (`values: [1, null, 3]`): not documented anywhere, and while YamlDotNet would
  likely bind a null scalar to a null `string` array element without throwing, `DataLoading.LoadEntry`
  then does `foreach (var value in data.values) ValueGroups[hash].Add(value)` — adding a `null`
  string into the value-group's `List<string>`, which is a real bug surface in WEC itself if it ever
  happened, not a documented/intended shape a validator should treat as valid input to accept.

**Conclusion: no gap.** `scalarArray` (`string | number | boolean`, `generate.mjs:42-43`) is the
complete and correct type for `values:` — already fixed in round 5, re-confirmed here directly
against `DataData.cs`'s field declaration rather than just the README prose round 5 cited.

---

## 4. Question 3 — Are `value` / `valueGroup`+`values` genuinely required?

**Not required in the sense of causing a WEC parse error if omitted — but functionally necessary,
and the schema's `required` is the right call for a different reason: it's what makes the entry do
anything as a value entry/group.**

Nothing in `DataData.cs` marks any field `[Required]` — same "structurally everything is optional"
pattern ticket 02 found for EWP's `PrefabData.cs`. And `DataLoading.LoadEntry`'s guards are plain
null-checks that **silently skip**, not validate-and-throw:

```csharp
if (data.value != null) { ... }                              // valueEntry mechanism
if (data.valueGroup != null && data.values != null) { ... }  // valueGroup mechanism
```

So:

- A list item with `value:` absent (and nothing else) doesn't error — `LoadEntry` just runs none of
  its three branches and the entry is a silent no-op in WEC.
- A list item with `valueGroup: someName` but **no** `values:` also doesn't error — the `&&`
  guard means the branch is skipped entirely (not "partially applied with a default"), so the group
  never gets registered. Same for `values:` present without `valueGroup:`.

**This means the schema's `required: ["value"]` and `required: ["valueGroup", "values"]`
(`generate.mjs:410, 418`) are not literal WEC-parse requirements — they're the correct encoding of
"what must be present for this branch to have any observable effect."** An entry missing them isn't
rejected by WEC with an error; it's accepted by WEC and does nothing, which is exactly the kind of
silent-no-op mistake a validator exists to catch. Flagging it as invalid (via `required`) is the
right behavior for a *linter*, even though it isn't what "required" would mean if read as "WEC
throws without this." No fix needed — this is the same "structurally optional, but the schema
tracks the field combination that actually accomplishes what the entry says it wants to do" judgment
call round 8/ticket 02 established as generally correct in the EWP-side schema.

One clarification worth recording: `data.value`'s actual runtime shape is a **compound
`"name, actualValue"` KVP string**, not a bare literal — confirmed by
`DataLoading.LoadEntry`'s `Parse.Kvp(data.value)` call and every README example
(`value: level, 3`, `value: mag, <color=#FF00FF>`). The schema's `valueEntry.value` is typed as a
plain `str` (`generate.mjs:409`), which already accepts this — JSON Schema has no way to
structurally distinguish "a string containing a comma-separated name+value" from any other string,
so there's nothing more precise to encode here without inventing a regex the docs don't specify one
for. No gap; noting it only so a future reader doesn't mistake `value: str` for "value entries hold
a literal value" — they hold a `name, value` pair as one string.

---

## 5. Summary

| Question | Answer | Citation |
|---|---|---|
| Extra fields beyond `value`/`valueGroup`+`values`? | No — `persistent`/`distant`/`priority` exist on the shared `DataData` class but are read only by the `name:`-gated data-entry branch, never by the value/value-group branches | `DataData.cs` (field list); `DataLoading.cs` `LoadEntry` (three independent `if` branches); `DataEntry.cs` (`Persistent`/`Distant`/`Priority` fields) |
| Any other `values:` element kind (nested list, null)? | No — `values` is `string[]?`; a nested sequence can't bind to `string` (YamlDotNet type-mismatch), and null elements aren't documented or intended even if technically not throwing | `DataData.cs:` `public string[]? values;` |
| Are `value` / `valueGroup`+`values` genuinely required? | Not a WEC parse-time requirement (no `[Required]` anywhere, guards silently skip) — but schema-required is still correct because omitting them makes the entry a silent no-op, which a validator should flag | `DataData.cs` (no `[Required]`/non-nullable fields); `DataLoading.cs` `LoadEntry` (null-guarded branches, no throw) |

**Overall: no schema gap found.** `valueEntry` (`generate.mjs:406-412`) and `valueGroup`
(`generate.mjs:414-420`) already match WEC's actual `DataData`/`DataLoading` source exactly, field
for field. The one structural note worth recording (§1) — that WEC's three data-list mechanisms
share one non-exclusive C# class rather than three disjoint ones — has no evidence of real-world use
mixing them, so no schema change is recommended; the existing three-way `oneOf` split continues to
match every documented and previously-tested example.
