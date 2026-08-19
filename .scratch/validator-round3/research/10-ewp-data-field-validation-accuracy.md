# EWP rule entry `data:` — list vs. string validation accuracy

**Question:** Should `data:` as a YAML list of typed value lines (e.g. `- int, isCustom, 1`) be accepted on an EWP rule entry, or is ajv's `/data must be string` a false positive?

**Bottom line: not a false positive.** EWP's `Data.data` is a C# **`string`**, not `string[]`. At runtime the field is passed through `DataValue.String(...)` and resolved by `DataHelper.Get(...)` as **one** value — either a `data.yaml` entry name or a single `type, key, value` shorthand. Typed-value **lists** belong on **`filters:` / `bannedFilters:`** (and on WEC data entries as `ints:` / `floats:` / …), not on the rule action's `data:` key. **`data: str` in the schema matches source.** The ticket repro would fail YamlDotNet deserialization (or leave `data` empty) at runtime, not apply the intended injection. **Recommendation: keep the schema as-is; optionally improve the ajv message when `data` is an array** (suggest scalar shorthand or `filters:` / a named `data.yaml` entry). Do **not** widen to `strArray`, add a precheck peel, or suppress ajv for this shape.

Fetched from Jere Kuusela's public GitHub repo `JereKuusela/valheim-expand_world_prefabs` (`main` branch) on 2026-08-20 via `raw.githubusercontent.com`, plus in-repo validator sources.

---

## 1. EWP source — `data:` is scalar-only on rule entries (all action types)

### `PrefabData.cs` — deserialization target

Repo: `JereKuusela/valheim-expand_world_prefabs`, file `ExpandWorldPrefabs/PrefabData.cs`:

```csharp
public class Data
{
  // ...
  [DefaultValue("")]
  public string data = "";
  // ...
  [DefaultValue(null)]
  public string[]? filters = null;
  [DefaultValue(null)]
  public string[]? bannedFilters = null;
}
```

The top-level rule `data` field is **`string`**, default `""`. Multi-line typed filters use **`filters` / `bannedFilters` as `string[]?`**, not `data`.

The compiled runtime model mirrors this — `Info.Data` is a single string expression:

```csharp
public class Info
{
  // ...
  public IStringValue? Data;
}
```

Nested shapes that also carry a `data` key (`SpawnData`, `ObjectData`) declare it as **`string?`**, not an array:

```csharp
public class SpawnData
{
  public string? data;
}
public class ObjectData
{
  public string? data;
  public string[]? filters;
  public string[]? bannedFilters;
}
```

There is **no** C# type path where a YAML sequence under rule `data:` deserializes into a live field.

### `PrefabLoading.cs` — consumption path (applies to `type: create` and siblings)

File `ExpandWorldPrefabs/PrefabLoading.cs`, method `FromData`:

```csharp
var d = t.Type != ActionType.Destroy ? data.data : "";
// ...
Data = DataValue.String(d),
```

Every non-destroy rule type reads **`data.data` as one string** and wraps it in `DataValue.String`. There is no loop over a list, no join of multiple lines, and no alternate property for a sequence form.

### `PrefabManager.cs` — runtime application

File `ExpandWorldPrefabs/PrefabManager.cs`, method `Handle`:

```csharp
var data = DataHelper.Get(info.Data, f);
// ...
if (data != null)
{
  ZdoEntry entry = new(zdo);
  entry.Load(data, f);
  // ...
}
```

`DataHelper.Get` is invoked on **`IStringValue?`** — one resolved string (named template or inline triple). Multiple ZDO fields come from a **named** `data.yaml` entry referenced by that string, not from a YAML list under `data:`.

### `Yaml.cs` — no list rewrite for rule `data:`

File `ExpandWorldPrefabs/service/Yaml.cs`, `PreParse` rewrites legacy **scalar** forms for `spawn:`/`swap:` → `spawns:`/`swaps:`, singular `filter:` → `filters:`, and compact `objects:` list items → `ObjectData` mappings. **There is no rewrite rule for `data:` as a YAML list** on rule entries (confirmed by full-file read — `HandleObjects` only sets nested **`data:` as a string scalar** inside object mappings: `result.Add("    data: " + parts[2]);`).

Unlike `spawn`/`swap` (documented scalar shims with PreParse support — see schema-source-audit ticket 01), **`data:` has no documented or implemented list variant** at the rule-entry level.

### Official docs — two formats, both scalar

`docs/scripting.md` (Actions section):

> `- data: Sets object data either with format \`name\` or \`type, key, value\`.`
> `- Format \`name\` can be used to set multiple values (entry name from \`data.yaml\`).`
> `- Format \`type, key, value\` is a shorthand to set a single data value.`

Both documented forms are **one scalar string**. Setting multiple values is done by referencing a **`data.yaml` named entry** (`data: ultra_bonemass`), not by listing typed lines under `data:`.

For **lists of typed value lines**, the same doc's "Multiple filters" section uses **`filters:` / `bannedFilters:`**:

```yaml
filters:
- hash, HelmetItem, HelmetBronze, 2
- hash, ChestItem, ArmorBronzeChest
```

Format: `type, key, value` (optional weight) **per list item** — the shape the scripter applied to `data:`, but on the **wrong key** for action-time object-data injection on `type: create`.

### Expected runtime for the ticket repro

```yaml
- prefab: Player
  type: create
  data:
  - int, isCustom, 1
```

YamlDotNet deserializing into `Data` where `data` is `string` cannot bind a YAML sequence. EWP's loader (`Yaml.cs` `Deserialize<T>`) catches deserialization exceptions and logs an error; the entry does not load with `data = "int, isCustom, 1"`. **This is not equivalent to valid config.**

**Correct equivalents:**

| Intent | Valid YAML |
|--------|------------|
| Single inline ZDO field | `data: int, isCustom, 1` |
| Multiple fields from a template | `data: myEntryName` (+ matching `- name: myEntryName` … in `data.yaml`) |
| Multiple typed **filter** lines (different purpose) | `filters:` / `bannedFilters:` list, not `data:` |

---

## 2. Schema generation — `ewpRuleEntry.properties.data` matches C#; contrast with list fields

### `ewp_validator/schema/generate.mjs`

Top-level rule entry:

```javascript
// Actions
data: str,
injectData: boolOrString,
```

`str` is `{ type: "string" }` — aligned with `PrefabData.cs` `public string data`.

Compare nearby shapes that **do** accept lists of typed lines:

| Location | Field | Schema | C# type | Role |
|----------|-------|--------|---------|------|
| `ewpRuleEntry` | `data` | `str` | `string` | Action: set/read object data (name or one triple) |
| `ewpRuleEntry` (via `withFilterFields`) | `filters` | `strArray` | `string[]?` | Filter: list of typed filter lines |
| `spawnData` / `objectData` | `data` | `str` | `string?` | Spawn initial data or legacy object-filter shorthand |
| `wecDataEntry` | `ints` / `floats` / … | `strArray` | `string[]?` on `DataData` | WEC template definition — **different file shape entirely** |

The scripter's mental model conflates **WEC data-entry typed lists** (`ints:`, `floats:`, … under `- name: …`) and **EWP filter lists** (`filters:`) with **EWP action `data:`**, which is intentionally scalar in source and docs.

### `ewp_validator/src/schema.generated.json`

Generated output mirrors the builder (EWP 1.58.0 stamp):

```json
"data": {
  "type": "string"
},
"filters": {
  "type": "array",
  "items": { "type": "string" }
}
```

No mismatch between generator and emitted schema for this field.

---

## 3. Validator path — why the error fires; where a fix would (not) go

### Structural pre-check (`ewp_validator/src/structuralPrecheck.ts`)

The repro entry has `prefab` + `type`, so `guessBranch` returns `ewpRuleEntry` (not WEC's `data:`/`name:` typo path). Without diagnosis arbitration, ajv would report a generic `/data must be string` because a YAML list parses to a JS **array** while `ewpRuleEntry.properties.data` is `str`.

**Current behavior (ticket 13 / diagnosis arbitration):** `structuralPrecheck.ts` calls `diagnoseShapeMismatches()` from `shapeMismatchDiagnosis.ts` **before** ajv. Rule `ewp-top-level-scalar-data-filter-list` detects when a scalar field (`data`, `filter`, …) received a YAML list. For the ticket repro (`- int, isCustom, 1`), `looksLikeTypedValueLine` matches and ajv's `/data` path is suppressed in favour of:

> Invalid `data:` format — this looks like a filter line written as a YAML list. Use `data: int, isCustom, 1` on one line, or move it under `filters:` if you need multiple lines.

Fallback when no shape rule claims the path: `scalarDataFieldTypeMessage()` in `dataFieldValidation.ts`.

There is **no** legacy peel for list-form `data:` (unlike `delay`/`spawn` scalar shims). That is appropriate — **list-form `data:` is not live-tested legacy YAML**.

### Reference validation (`dataFieldValidation.ts` / `referenceValidation.ts`) — already handles scalar triple correctly

For `data: int, level, 3`, reference validation **skips** bareword checks (comma = inline triple, not a `data.yaml` name). A list-form value would not participate in reference checks anyway (`typeof raw === "string"` gate). No reference-layer change is implied by this ticket.

---

## 4. Repro matrix

| YAML fragment | Validator | Runtime (EWP source) | Verdict |
|---------------|-----------|----------------------|---------|
| `data:` + list `- int, isCustom, 1` | **Error** (shape-mismatch hint → `filters:` / scalar triple) | Deserialization failure / empty `data` | **True positive** — invalid shape |
| `data: int, isCustom, 1` | Pass structural | `DataValue.String` → single triple applied | Valid |
| `data: myTemplate` (+ defined `name:` entry) | Pass structural + ref check | `DataHelper.Get` → named `DataEntry` | Valid |
| `filters:` + list `- int, isCustom, 1` | Pass structural | `Filters` ctor parses each string line | Valid **filter**, not action `data` |

---

## 5. Comparison with ticket 09 (`wecDataEntry.name`)

Ticket 09 widened `name` because YamlDotNet **coerces** a bare numeric scalar into `string` at runtime while the JS YAML parser keeps it as `number` — schema was stricter than deserialization.

Ticket 10 is the **inverse class of bug**: the scripter wants a **sequence** accepted where C# declares **`string` only**. There is no coercion path from YAML list → `string data`; the analogous field for typed lines is **`filters:`**, which the schema already types as `strArray`.

---

## 6. Recommendation

| Option | Verdict |
|--------|---------|
| **Widen `data` to `strArray` / `oneOf[str, strArray]`** | Reject — contradicts `PrefabData.cs`, `PrefabLoading.cs`, and `scripting.md`; would validate YAML EWP cannot load. |
| **Precheck peel + suppress ajv** | Reject — nothing to peel; would hide real structural mistakes. |
| **Keep `data: str` (status quo)** | **Recommended.** Schema matches source. |
| **Better error message when `data` is array** | **Implemented** — `shapeMismatchDiagnosis.ts` (typed-line vs entry-name list variants) with `scalarDataFieldTypeMessage()` fallback in `dataFieldValidation.ts`. |

**Ticket 13 implementation scope:** no schema widening needed; UX layer already landed.

---

## Sources cited

| Claim | Source |
|-------|--------|
| `Data.data` is `string`, `filters` is `string[]?` | [PrefabData.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabData.cs) |
| `Info.Data` is `IStringValue?` | [PrefabData.cs `Info` class](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabData.cs) |
| `FromData` uses `DataValue.String(data.data)` | [PrefabLoading.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabLoading.cs) |
| `DataHelper.Get(info.Data, f)` applies one template | [PrefabManager.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabManager.cs) |
| No PreParse for list-form rule `data:` | [Yaml.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/service/Yaml.cs) |
| Docs: scalar `name` or `type, key, value`; lists on `filters:` | [docs/scripting.md](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/scripting.md) |
| Schema `data: str`, `filters: strArray` | `ewp_validator/schema/generate.mjs` (`ewpRuleEntry`, `withFilterFields`) |
| Generated `"data": { "type": "string" }` | `ewp_validator/src/schema.generated.json` |
| ajv → `/data must be string` (raw; suppressed when shape rule wins) | `ewp_validator/src/structuralPrecheck.ts` |
| Typed-line list on scalar `data:` → `filters:` hint | `ewp_validator/src/shapeMismatchDiagnosis.ts`; `shapeMismatchDiagnosis.test.ts` |
| Inline triple not a ref; scalar `data:` reference rules | `ewp_validator/src/dataFieldValidation.ts`; `dataFieldValidation.test.ts` |
| Prior ref feasibility: bareword vs triple heuristic | `.scratch/ew_toolkit/research/04-reference-validation-feasibility.md` |
