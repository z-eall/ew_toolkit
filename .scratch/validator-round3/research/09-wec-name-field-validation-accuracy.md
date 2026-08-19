# WEC data-entry `name:` — numeric scalar validation accuracy

**Question:** Should `- name: 333` be a validation error (`/name must be string`) for a WEC data entry, or is that a false positive against EWP/WEC runtime behavior?

**Bottom line: false positive.** WEC deserializes `name` as a C# `string` and YamlDotNet coerces a bare numeric YAML scalar (`333`) to the string `"333"` without error — the entry registers normally. The validator’s current `str`-only schema is stricter than runtime. **Recommendation: accept numeric via `numberOrString` on `wecDataEntry.name`** (same coercion policy already used for other WEC string fields fed by plain YamlDotNet). No severity downgrade to warning — runtime accepts it as valid input. A follow-on in ticket 13 should also normalize numeric names in reference validation (`referenceValidation.ts` currently skips non-string `name` values).

Fetched from Jere Kuusela’s public GitHub repos (`main` branch) on 2026-08-19 via `raw.githubusercontent.com`, plus in-repo validator sources.

---

## 1. WEC source — `name` is `string`, registration uses it as a string key

### `DataData.cs` — deserialization target

Repo: `JereKuusela/valheim-world_edit_commands`, file `WorldEditCommands/service/data/DataData.cs`:

```csharp
public class DataData
{
  [DefaultValue(null)]
  public string? name;
  // ... ints, floats, strings, valueGroup, value, values, etc.
}
```

The YAML list item deserializes into `DataData`; `name` is declared **`string?`**, not `int` or a union type. No `[YamlMember]` alias — the YAML key is literally `name` (confirmed in prior ticket-07 research against the same file).

### `DataLoading.cs` — registration path

Repo: same, file `WorldEditCommands/service/data/DataLoading.cs`, method `LoadEntry`:

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

Observations:

- Registration is gated on `data.name != null` only — no type check beyond what deserialization already produced.
- The name is stored in `DataKeys` as whatever string YamlDotNet assigned to `data.name`, and hashed via `GetStableHashCode()` for the `Data` dictionary lookup used by `data load=<name>` / EWP `data:` references at runtime.
- There is **no** branch that reads a numeric alternate property; if deserialization yields a non-null string (including one coerced from a number), the entry registers.

Loading uses `Yaml.LoadListsFromDirectory<DataData>(...)` from the `ServerDevcommands` dependency (`DataLoading.cs:40–41`). That helper is not published in a browsable GitHub repo under Jere’s account (404 on `valheim-server_devcommands`), but prior schema-source research (ticket 06) confirmed WEC data YAML goes through **plain YamlDotNet** with camelCase naming — the same stack EWP exposes in its own public `ExpandWorldPrefabs/service/Yaml.cs` (`DeserializerBuilder().WithNamingConvention(CamelCaseNamingConvention.Instance).Build()`).

### EWP `DataStorage.cs` — out of scope for this question

The ticket mentions `DataStorage.cs`; that file lives in **`valheim-expand_world_prefabs`** (`ExpandWorldPrefabs/service/DataStorage.cs`) and implements EWP’s **custom saved key** storage (`type: key`, `<save_…>`, `<load_…>`). It does **not** parse or register WEC `data.yaml` entry names. WEC data-entry naming is owned entirely by WEC’s `DataLoading.cs` / `DataData.cs` above (see also `ew_toolkit/.scratch/validator-round2/research/07-custom-key-source-verification.md` §0).

---

## 2. YamlDotNet coercion — numeric scalar → `string` property

When YamlDotNet deserializes into a strongly typed `string` property, it runs scalar values through `TypeConverter.ChangeType`, which falls through to `Convert.ChangeType(value, destinationType, CultureInfo.InvariantCulture)` when no more specific converter applies ([YamlDotNet `TypeConverter.cs`](https://github.com/aaubry/YamlDotNet/blob/master/YamlDotNet/Serialization/Utilities/TypeConverter.cs)). An integer scalar bound to a `string` field becomes its decimal string form (`333` → `"333"`).

This is the **same mechanism** already documented and encoded in the ew_toolkit schema for other WEC `DataData` string fields:

| Field | C# type | README shows bare numbers? | Schema today |
|-------|---------|---------------------------|--------------|
| `values` (value group) | `string[]?` | Yes — `- 1`, `- 2`, `- 3` | `scalarArray` (string\|number\|boolean) |
| `stack`, `quality`, etc. (item entry) | `string` in `ItemData` | Often bare numbers | `numberOrString` |
| **`name`** | **`string?`** | **No — all examples are word identifiers** | **`str` only ← mismatch** |

Sources:

- `README_data.md` “Multiple parameter values” section — `values: [1, 2, 3]` under `valueGroup: randomLevel` ([raw README_data.md](https://raw.githubusercontent.com/JereKuusela/valheim-world_edit_commands/main/README_data.md)).
- `.scratch/schema-source-audit/research/05-value-entry-and-group-fields.md` §3 — “YamlDotNet's default binder coerces bare YAML scalars (`123`, `4.5`, `true`) to `string` without error when the target field is `string`.”
- `.scratch/schema-source-audit/research/06-item-entry-fields.md` — same coercion note for item numeric-looking string fields loaded via `Yaml.LoadListsFromDirectory<DataData>`.

**Expected runtime for `- name: 333`:** deserializes to `data.name == "333"`, passes the `!= null` guard, registers under hash of `"333"`. **`data load=333`** on the console passes the name as text and resolves the same entry.

No WEC source path rejects or special-cases numeric-looking names. No `[Required]` or custom validator on `name`.

---

## 3. Documentation and real-world examples — identifiers, not numbers

`README_data.md` field reference (line 56):

> `- name: Name of the data entry. Must be unique across all files.`

Every documented data-entry example uses **word identifiers**, never a bare numeric name:

- `- name: leveler`, `- name: Chest`, `- name: BigChest`, `- name: Test` (Getting started / loot sections).

A repo-wide search for `name:\s*\d` in ew_toolkit and WEC README finds **no** intentional numeric-only data-entry name example. Numeric bare scalars appear only where they are **values** (e.g. value-group `values:` lists, int list entries like `- level, 1,2,3`), not entry names.

So numeric names are **undocumented and uncommon**, but **not rejected by source**.

---

## 4. Current validator path — why the error fires

### Schema (`ewp_validator/schema/generate.mjs`)

```javascript
const str = { type: "string" };
// ...
const wecDataEntry = {
  // ...
  properties: {
    name: str,
    // ...
  },
  required: ["name"],
};
```

`wecDataEntry.name` is **`str` only** — not `numberOrString`, despite the generate.mjs comment block (lines 39–41) explicitly calling out that bare YAML numbers are a distinct parse shape from strings.

### Structural pre-check (`ewp_validator/src/structuralPrecheck.ts`)

For a guessed `wecDataEntry`, the item is validated with ajv against the branch schema. Type mismatches map to **Value problem** / **error** severity:

```typescript
kind = error.keyword === "required" ? STRUCTURE_PROBLEM_CATEGORY : VALUE_PROBLEM_CATEGORY;
message = `${error.instancePath || "(entry)"} ${error.message}`;
// → "/name must be string"
```

There is no WEC-specific override for `name` (unlike RPC params, which get custom messages/warnings at lines 426–454).

### YAML parse layer

The validator uses the `yaml` npm package (`itemNode.toJSON()`). A bare `333` stays **`number` in JS**, so ajv’s `type: "string"` fails even though WEC would coerce it. This is the same class of JSON-Schema-vs-YamlDotNet mismatch already solved for `values:`, item fields, and EWP numeric-tolerant fields via `numberOrString` / `scalarArray`.

### Reference validation gap (secondary)

`referenceValidation.ts` only indexes definitions when `typeof value.name === "string"`. If the schema were widened without updating reference checks, a numeric `name: 333` definition would not participate in cross-file `data:` reference validation, and `data: 333` references would also be skipped (`isBarewordReference` requires `typeof raw === "string"`). That is a **follow-on consistency fix**, not a reason to keep the structural error.

---

## 5. Comparison with nearby decisions

| Case | Runtime | Validator before fix | Fix applied |
|------|---------|------------------------|-------------|
| Value group `values: [1,2,3]` | Coerces to strings | Error on numbers | `scalarArray` (ticket 13 round 5) |
| Item `stack: 1` | Coerces to string | — | `numberOrString` (schema audit) |
| WEC `name: 333` | Coerces to `"333"` | **Error** | **Not yet fixed (this ticket)** |

The project’s established rule: when WEC’s plain YamlDotNet load coerces a bare scalar to the C# field type, the schema should accept the YAML parse shape (`numberOrString` or `scalarArray`), not emit a hard error.

---

## 6. Recommendation

| Option | Verdict |
|--------|---------|
| **Keep error** | Reject — contradicts WEC runtime; inconsistent with `values:` / item-field policy. |
| **Warning** | Unnecessary middle ground — runtime fully accepts the input. |
| **Accept numeric (`numberOrString`)** | **Recommended.** Matches WEC deserialization; removes false positive. |
| **Different message only** | Insufficient — the value is valid, not “almost valid.” |

**Implementation scope (for ticket 13, not this research pass):**

1. Change `wecDataEntry.properties.name` from `str` to `numberOrString` in `schema/generate.mjs`.
2. Regenerate schema / adjust tests in `generate.test.mjs` if any assert `name: str`.
3. Normalize numeric `name` to string in `referenceValidation.ts` when recording definitions and when comparing references (so `name: 333` ↔ `data: 333` cross-checks work).

Optional **info**-level style hint (“quote numeric names for clarity”) is **not** supported by source and would be invented policy — skip unless the user wants stricter authoring guidance beyond runtime truth.

---

## Sources cited

| Claim | Source |
|-------|--------|
| `name` is `string?` on `DataData` | [DataData.cs](https://github.com/JereKuusela/valheim-world_edit_commands/blob/main/WorldEditCommands/service/data/DataData.cs) |
| Registration reads `data.name` as string | [DataLoading.cs `LoadEntry`](https://github.com/JereKuusela/valheim-world_edit_commands/blob/main/WorldEditCommands/service/data/DataLoading.cs) |
| YamlDotNet int→string coercion | [YamlDotNet TypeConverter.cs](https://github.com/aaubry/YamlDotNet/blob/master/YamlDotNet/Serialization/Utilities/TypeConverter.cs); prior research `05-value-entry-and-group-fields.md`, `06-item-entry-fields.md` |
| EWP Yaml deserializer setup (proxy for WEC stack) | [ExpandWorldPrefabs/service/Yaml.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/service/Yaml.cs) |
| README name semantics + examples | [README_data.md](https://github.com/JereKuusela/valheim-world_edit_commands/blob/main/README_data.md) |
| Schema `name: str` | `ewp_validator/schema/generate.mjs` (`wecDataEntry`) |
| ajv error → “/name must be string” | `ewp_validator/src/structuralPrecheck.ts` |
| Reference check skips non-string names | `ewp_validator/src/referenceValidation.ts:466` |
| `DataStorage.cs` is EWP custom keys, not WEC entry names | `ExpandWorldPrefabs/service/DataStorage.cs`; `validator-round2/research/07-custom-key-source-verification.md` §0 |
