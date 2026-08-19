# RPC validation — cross-check against EWP source

**Question:** How does EWP parse/dispatch `objectRpc` / `clientRpc`, is the validator table complete (e.g. `RPC_SetVisualItem`), what false positives/negatives exist in `checkRpcParams`, and what optimizations are worth doing?

**Bottom line: the current approach is directionally correct but manually maintained.** EWP treats each RPC entry as an open `Dictionary<string,string>`, parses numbered keys in numeric order via `Parse.Kvp("type, value")`, and never validates parameter counts or types at load time — only at send time when converting to `object[]`. The hand-maintained `OBJECT_RPC_PARAMS` / `CLIENT_RPC_PARAMS` tables match all **134** RPC names in `docs/RPCs.md` (minus three deliberately omitted ambiguous names); `RPC_SetVisualItem` matches docs exactly. **Recommendation for ticket 12:** (1) **generate the param tables from `docs/RPCs.md`** in `schema/generate.mjs` (or a sibling script) to stop drift; (2) add a **type-alias map** aligned with `RpcInfo.GetParameters` (`name` ≡ `string`; bare `int` acceptable for `enum_*` per `Parse.Enum*` fallbacks); (3) optionally add **missing-parameter info warnings**; (4) keep **warning-only** severity and **no component-aware signature checks** unless the rule entry's `prefab:` can disambiguate (e.g. `SetVisualItem` vs `RPC_SetVisualItem`). Do not downgrade extras/non-string issues — EWP accepts them, but the validator's job is doc-aware nudging, not runtime enforcement.

Fetched from Jere Kuusela's `valheim-expand_world_prefabs` (`main` branch) on 2026-08-20 via `raw.githubusercontent.com`, plus in-repo validator sources.

---

## 1. How EWP parses and dispatches `objectRpc` / `clientRpc`

### YAML deserialization — open string dictionary

`PrefabData.cs` declares RPC lists as **`Dictionary<string, string>[]`** — not a fixed POCO:

```csharp
// PrefabData.cs:142-144
public Dictionary<string, string>[]? objectRpc = null;
public Dictionary<string, string>[]? clientRpc = null;
```

YamlDotNet deserializes with camelCase naming (`ExpandWorldPrefabs/service/Yaml.cs` — `DeserializerBuilder().WithNamingConvention(CamelCaseNamingConvention.Instance)`). Every key on an RPC list item (including bare numeric keys like `1`, `2`, …) becomes a dictionary entry whose **value must be a string** at the C# layer. Inline descriptions in quotes (`int, "index of the item slot"`) are part of that single string value; EWP ignores the description portion.

The validator schema mirrors this (`ewp_validator/schema/generate.mjs:120-139`): `rpcEntry` keeps `additionalProperties: { type: "string" }` so numbered params are allowed strings, not a closed property list.

### Loading — one `ObjectRpcInfo` / `ClientRpcInfo` per list item

`PrefabLoading.cs` converts each dictionary to an RPC info object with no extra validation:

```csharp
// PrefabLoading.cs (ParseObjectRpcs / ParseClientRpcs)
var allRpcs = data.objectRpc.Select(s => new ObjectRpcInfo(s)).ToArray();
// ...
var allRpcs = data.clientRpc.Select(s => new ClientRpcInfo(s)).ToArray();
```

Weighted vs unweighted RPCs split on whether a `weight:` key parsed to non-null (`PrefabLoading.cs` — same pattern as spawns/pokes).

### `RpcInfo` constructor — `name`, `target`, numbered params

`RpcInfo.cs` reads known metadata keys, then collects **only keys that parse as integers** as call parameters, sorted numerically:

```csharp
// RpcInfo.cs:35-76 (constructor excerpt)
if (lines.TryGetValue("name", out var name))
  Hash = name.GetStableHashCode();

if (lines.TryGetValue("target", out var target)) {
  if (target == "all") Target = RpcTarget.All;
  else if (target == "search") Target = RpcTarget.Search;
  else if (target == "owner") Target = RpcTarget.Owner;
  else { Target = RpcTarget.ZDO; TargetParameter = DataValue.String(target); }
}
// delay, repeat, repeatInterval, repeatChance, chance, weight, overwrite, source, packaged ...

Parameters = [.. lines
  .OrderBy(p => int.TryParse(p.Key, out var k) ? k : 1000)
  .Where(p => Parse.TryInt(p.Key, out var _))
  .Select(p => Parse.Kvp(p.Value))];
```

Observations:

| Key | Runtime behavior |
|-----|------------------|
| `name` | Hashed via `GetStableHashCode()` → Valheim RPC method hash |
| `target` | `all` → broadcast; `owner` (default); `search` → special; anything else → ZDO id expression via `DataValue.String` |
| `1`, `2`, … | Only keys matching `Parse.TryInt`; ordered 1, 2, 3… Non-numeric keys (`target`, `delay`, …) excluded |
| Param value | `Parse.Kvp(value)` → `(type, arg)` split on **first comma** (`Parse.cs:177-182`) |
| Quoted descriptions | Text after first comma is the **argument expression**, not metadata — quotes in docs examples are literal arg values or placeholders |

Default `target` is **`owner`**, not `all` (`RpcInfo.cs:37` sets `Target = RpcTarget.Owner` before parsing).

### Parameter conversion — type prefix drives `object[]` assembly

At invoke time, `GetParameters` runs `Functions.Replace` on each arg string, then switches on the type key (`RpcInfo.cs:139-170`):

Supported in **`GetParameters`** (outgoing RPC from YAML):

`int`, `long`, `float`, `bool`, `string`, `vec`, `quat`, `hash`, `hit`, `zdo`, `enum_message`, `enum_reason`, `enum_trap`, `enum_damagetext`, `enum_terrainpaint`, `userinfo`

**Not handled explicitly** (value stays as the post-`Replace` string, same as `string` at the ZNet layer):

- `name` — documented in `RPCs.md` for several RPCs (`SetOwner`, `RPC_SetSlotVisual`, `RPC_AddAmmo`, `SetTrigger`) but **no `if (type == "name")` branch**
- `bytes` — documented for `MapData`; only meaningful with `packaged: true`, and **`GetPackagedParameters` also has no `bytes` writer** — effectively unusable as documented

`RpcInfo.Types` HashSet (`RpcInfo.cs:22`) lists a **subset** of the above (missing `userinfo`, `enum_damagetext`, `enum_terrainpaint`, `name`, `bytes`). `IsType()` exists but is not used during YAML load — **no load-time type validation**.

Enum parsers accept **either** enum name **or** int fallback (`Parse.cs:318-331`), e.g. `EnumMessage` → `Int(arg, 2)` if parse fails.

### Dispatch — delayed queue → ZRoutedRpc

`RpcInfo.Invoke` applies `chance`, `delay`/`repeat*`, resolves `source`/`target`, builds `object[]`, then enqueues:

```csharp
// RpcInfo.cs:78-137, DelayedRpc.cs:8-17
DelayedRpc.Add(delay, source, targetPeer, zdoId, Hash, parameters, overwrite);
// delay <= 0 → immediate Manager.Rpc(...)
```

`PrefabManager.cs` calls `ObjectRpc` / `ClientRpc` / `GlobalClientRpc`, each iterating entries and calling `Invoke` / `InvokeGlobal`.

`HandleRPC.cs` is the **incoming** side (Harmony patch on `ZRoutedRpc.HandleRoutedRPC`) — maps select received RPCs to EWP `state` triggers. It does **not** parse YAML RPC entries. Useful for understanding **`SetVisualItem` vs `RPC_SetVisualItem`** (different Valheim components, different parameter layouts — `HandleRPC.cs:247-278`), but orthogonal to outgoing YAML validation.

### WEC overlap

**None.** WEC `DataData` / `DataLoading` handle `data.yaml` entries only. RPC lists live exclusively on EWP `PrefabData` rule entries. No shared code path.

---

## 2. Table completeness — `RPC_SetVisualItem` and peers

### Name coverage

Automated diff (2026-08-20): **134** unique `- name:` values in `docs/RPCs.md`; validator tables contain the same 134 names plus zero extras. Three doc names are **deliberately omitted** from validation (`rpcValidation.ts:19-25`):

| RPC | Why omitted |
|-----|-------------|
| `RPC_DestroyAttachment` | ArmorStand: 1× `int`; ItemStand: no params |
| `RPC_DropItem` | ItemStand only; no params |
| `RPC_Extract` | Beehive: no params; SapCollector: 1× `zdo` (`RPC_Extract__alt` in docs) |

### `RPC_SetVisualItem` — exact match

`docs/RPCs.md:99-104` (ArmorStand):

```yaml
  - name: RPC_SetVisualItem
    target: all
    1: int, "index of the item slot"
    2: string, "name of the item"
    3: int, "variant number of the item"
    4: int, "orientation of the item (0 = none, 1 = vertical, 2 = horizontal, 3 = all)"
```

Validator table (`rpcValidation.ts:32-37`):

```typescript
RPC_SetVisualItem: [
  { type: "int", desc: "item slot index" },
  { type: "string", desc: "item name" },
  { type: "int", desc: "variant" },
  { type: "int", desc: "orientation: 0/1/2/3" },
],
```

Four params, same types, same order. The ticket repro YAML is **valid** — `checkRpcParams` returns `[]`.

### Same name, different component — `SetVisualItem`

`docs/RPCs.md:506-510` (ItemStand) documents **`SetVisualItem`** (no `RPC_` prefix) with a **different** 3-param shape: `string, int, int` (item / variant / level). The validator holds this as a **separate table entry** (`rpcValidation.ts:109-113`). EWP `HandleRPC.cs:247-262` confirms ItemStand's handler reads `(string item, int variant, int quality)` — not the ArmorStand 4-int layout.

**Mismatch risk is author error** (calling `RPC_SetVisualItem` on an ItemStand prefab), not a validator table bug. Disambiguation would require prefab/component context (see §4).

### Variadic client RPCs — table models prefix only

| RPC | Docs fixed prefix | Validator | Runtime |
|-----|-------------------|-----------|---------|
| `DestroyZDO` | `1: int` then repeating `zdo` | `[{ type: "int" }]` + `VARIADIC_RPCS` | Sends all numbered params in order |
| `LocationIcons` | `1: int` then `vec` + `string` pairs | `[{ type: "int" }]` + variadic | Same |

This is intentional (`rpcValidation.ts:305-308`).

### Doc formatting landmine (not a table bug)

`docs/RPCs.md:375-383` documents `RPC_AddFuelAmount` / `RPC_SetFuelAmount` with a **second list item** for param `1`:

```yaml
  - name: RPC_AddFuelAmount
  - 1: float, "amount of fuel"   # ← leading "-" makes this a separate RPC entry
```

Correct shape (matches every other RPC example):

```yaml
  - name: RPC_AddFuelAmount
    1: float, "amount of fuel"
```

EWP would load two entries: `{ name: RPC_AddFuelAmount }` (zero params) and `{ 1: "float, ..." }` (no `name`, useless hash). The validator table correctly expects one param (`rpcValidation.ts:90-91); copy-pasting the doc typo bypasses param checks on the name-only entry.

---

## 3. False positives / false negatives in `checkRpcParams`

Design intent (`ewp_validator/src/rpcValidation.ts:1-12`, `ewp_validator/src/structuralPrecheck.ts:456-492`): **warnings only**; suppress ajv's generic `/objectRpc/N/K must be string` when a clearer RPC message exists.

### Confirmed working (tests)

| Case | Source | Result |
|------|--------|--------|
| Extra param + non-string (`Message` param `4: true`) | `rpcValidation.test.ts:5-16`, `structuralPrecheck.test.ts:305-326` | Single **extra** warning; ajv `must be string` suppressed |
| Non-string documented param (`3: true`) | `rpcValidation.test.ts:18-27` | **not-a-string** warning |
| Wrong type prefix (`1: string` for `enum_message`) | `rpcValidation.test.ts:29-37` | **type-mismatch** warning |
| Valid `Message` shape | `rpcValidation.test.ts:39-47`, `structuralPrecheck.test.ts:328-338` | No issues |
| Unknown / omitted RPC name | `rpcValidation.test.ts:49-53` | Silent (by design) |
| Variadic tail params (`DestroyZDO` 2–3) | `rpcValidation.test.ts:55-63` | No **extra** warnings |
| Metadata keys ignored | `rpcValidation.test.ts:65-76` | No issues |

### False positives (valid at runtime, validator warns)

**FP-1 — `name` vs `string` type prefix**

EWP has no `name` converter; both remain strings (`RpcInfo.cs:139-170`). Docs use `name` for several params; declaring `string` triggers **type-mismatch**.

```yaml
objectRpc:
  - name: SetOwner
    1: long, 12345
    2: string, "PlayerName"    # docs say: 2: name, "owner name"
```

→ Warning on param `2`. Runtime: identical to doc-correct form.

**FP-2 — `int` vs `enum_*` type prefix**

`Parse.EnumMessage` / `EnumReason` / `EnumTrap` / `EnumDamageText` / `EnumTerrainPaint` all fall back to `Int(arg, default)` when enum name parse fails (`Parse.cs:318-331`). Using `int, 2` instead of `enum_message, 2` works at runtime.

```yaml
clientRpc:
  - name: ShowMessage
    1: int, 2                  # docs: enum_message, 2
    2: string, "Hello"
```

→ **type-mismatch** on param `1`; runtime OK.

**Fix for FP-1/FP-2:** type-alias groups in `checkRpcParams` mirroring `GetParameters` + `Parse.Enum*` behavior.

**FP-3 — type prefix case mismatch not warned**

EWP matches type keys with **case-sensitive** equality (`if (type == "int")` in `RpcInfo.GetParameters`). `checkRpcParams` compares declared vs documented types **case-insensitively** (`rpcValidation.ts:373`), so `Int, 0` vs documented `int` produces no warning even though EWP would leave the value as an unconverted string.

### False negatives (validator silent; may surprise authors)

**FN-1 — Missing documented parameters**

Only **present** keys are checked (`rpcValidation.ts:344-380`). Omitted indices never warn.

```yaml
objectRpc:
  - name: RPC_SetVisualItem
    target: all
    1: int, 0
    2: string, SwordIron
    # params 3 and 4 omitted — no validator output
```

EWP sends a 2-arg RPC; ArmorStand expects 4 — Valheim-side behavior undefined. Validator silent.

**FN-2 — Ambiguous RPC names skipped entirely**

```yaml
objectRpc:
  - name: RPC_Extract
    1: zdo, "<zdo>"
```

→ `[]` (`rpcValidation.test.ts:51-52`). Could be wrong for Beehive (0 params).

**FN-3 — Doc typo creates orphan list item** (see §2)

```yaml
objectRpc:
  - name: RPC_AddFuelAmount
  - 1: float, 5
```

First entry: no params, no warning. Second entry: no `name`, skipped by `structuralPrecheck.ts:468` (`typeof entryValue.name !== "string"`).

**FN-4 — Wrong RPC for prefab component**

```yaml
- prefab: ItemStand
  type: state, item
  objectRpc:
    - name: RPC_SetVisualItem      # ArmorStand RPC on ItemStand
      1: int, 0
      2: string, SwordIron
      3: int, 0
      4: int, 0
```

Validator: clean (table matches `RPC_SetVisualItem` docs). Runtime: wrong signature for ItemStand (`SetVisualItem` expects 3 params, no slot index).

**FN-5 — `bytes` / packaged MapData**

```yaml
objectRpc:
  - name: MapData
    packaged: true
    1: bytes, "unusable"
```

No type warning (table matches docs). `GetPackagedParameters` never writes `bytes` (`RpcInfo.cs:172-196`) — payload effectively broken. Validator cannot catch this without modeling `packaged` + type interactions.

**FN-6 — `GlobalKeys` pseudo-type `string list`**

`docs/RPCs.md:1183-1184` documents `1: string list, "unusable"`. The validator table normalizes this to `{ type: "string" }` (`rpcValidation.ts:257`). Authors copying the doc literally get a **type-mismatch** warning; runtime treats any unrecognized type prefix as a passthrough string anyway.

**FN-7 — Unknown type prefix with arbitrary string arg**

```yaml
objectRpc:
  - name: RPC_SetPose
    1: typo, 3
```

Not in table mismatch logic if typo ≠ doc type — actually **would** warn type-mismatch (`typo` vs `int`). But EWP would pass raw string `"3"` through to Valheim without converting to int — runtime failure mode validator doesn't describe.

### Ticket repro — not a false positive

The scripter's `RPC_SetVisualItem` example matches docs and table; it should produce **no RPC warnings**. Issues reported elsewhere likely concerned **other** RPC shapes (e.g. `Message` param `4: true` in `structuralPrecheck.test.ts:305-326`) or general rework appetite — not this specific YAML being wrong.

---

## 4. Optimization opportunities (payoff vs effort)

| Rank | Change | Payoff | Effort | Notes |
|------|--------|--------|--------|-------|
| **1** | **Generate `OBJECT_RPC_PARAMS` / `CLIENT_RPC_PARAMS` from `docs/RPCs.md`** at schema build time | **High** — eliminates manual sync; param types track Jere's docs automatically | **Medium** — needs YAML-block parser (handle variadic notes, `- 1:` doc bugs, enum comment lines) | Best ROI. Source of truth stays `docs/RPCs.md` unless switching to C# scrape of `RpcInfo` |
| **2** | **Type-alias map in `checkRpcParams`** (`name`→`string`; `int`↔`enum_*` per `Parse.Enum*`) | **Medium** — removes FP-1/FP-2 without losing signal | **Low** | Align with `RpcInfo.GetParameters` + `Parse.cs:318-331` |
| **3** | **Missing-parameter info/warning** when numbered keys skip indices or count < doc length (non-variadic) | **Medium** — catches FN-1 | **Low–medium** | Keep severity ≤ warning; EWP still accepts partial lists |
| **4** | **Detect orphan RPC list items** (entry with numeric keys but no `name`, or `name`-only entry followed by `- N:` sibling) | **Medium** — catches FN-3 / doc typo class | **Medium** | Structural check on `objectRpc`/`clientRpc` seq nodes, not just per-entry |
| **5** | **Component-aware signatures** using rule `prefab:` + docs section headers | **High** for FN-4 | **High** | Needs prefab→component map; defer unless scripter wants strict mode |
| **6** | **Scrape `RpcInfo` type list from C#** instead of docs | **Medium** — closer to runtime | **Medium** | Still won't encode per-component arity; docs remain needed for counts |
| **7** | **Shared `Parse.Kvp` with reference validation** | **Low** | **Low** | One-line `split(",", 2)` duplicate; only matters if comma-in-arg parsing must match EWP exactly |
| **8** | **Model `packaged: true` + `bytes` unusable** | **Low** (MapData only) | **Low** | Info note: "bytes params not serialized in packaged mode" |

### What not to do

- **Do not promote RPC param issues to errors** — EWP never rejects YAML for extra/wrong-type params; comments in `rpcValidation.ts:7-12` and schema (`generate.mjs:120-123`) are explicit.
- **Do not require `name` on rpc entries in schema** without a migration plan — runtime accepts broken entries silently (`Hash == 0`).
- **Do not fold `SetVisualItem` / `RPC_SetVisualItem`** — they are distinct hashes and signatures.

---

## 5. Recommendation (for ticket 12)

| Option | Verdict |
|--------|---------|
| **Keep hand-maintained tables** | Acceptable short-term; already complete vs docs today |
| **Generate tables from `docs/RPCs.md`** | **Recommended** — primary maintenance win |
| **Add type aliases + missing-param hints** | **Recommended** — cheap accuracy gains |
| **Component-aware validation** | Optional future; needs prefab map |
| **Close with no changes** | **Reject** — FP-1/FP-2 and FN-1/FN-3 are real, generation prevents future drift |

**Implementation sketch (not in scope for this research pass):**

1. Add `schema/parse-rpcs.mjs` (or extend `generate.mjs`) to emit RPC param JSON from `docs/RPCs.md`.
2. Import emitted tables in `rpcValidation.ts`; keep `VARIADIC_RPCS` + omitted ambiguous set as explicit overrides.
3. Extend `checkRpcParams` with `TYPE_ALIASES` and optional `missing` issue kind (warning or info).
4. Add tests: `RPC_SetVisualItem` ticket repro (clean); `SetOwner` with `string` instead of `name` (no warning after alias); missing param 3 on `RPC_SetVisualItem` (new warning); doc-typo two-list-item `RPC_AddFuelAmount` (structural hint).

---

## Sources cited

| Claim | Source |
|-------|--------|
| `objectRpc` / `clientRpc` are `Dictionary<string,string>[]` | [PrefabData.cs:142-144](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabData.cs) |
| Load → `ObjectRpcInfo` / `ClientRpcInfo` | [PrefabLoading.cs `ParseObjectRpcs` / `ParseClientRpcs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabLoading.cs) |
| Numbered-key extraction, `target`, param ordering | [RpcInfo.cs constructor](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/RpcInfo.cs) |
| Type conversion / packaged params | [RpcInfo.cs `GetParameters` / `GetPackagedParameters`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/RpcInfo.cs) |
| `Parse.Kvp` first-comma split | [Parse.cs:177-182](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/service/Parse.cs) |
| Enum int fallbacks | [Parse.cs:318-331](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/service/Parse.cs) |
| Delayed dispatch | [DelayedRpc.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/DelayedRpc.cs), [PrefabManager.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabManager.cs) |
| Incoming RPC / component-specific SetVisualItem | [HandleRPC.cs:247-278](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/HandleRPC.cs) |
| YamlDotNet camelCase | [Yaml.cs](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/service/Yaml.cs) |
| RPC catalog + `RPC_SetVisualItem` example | [docs/RPCs.md:99-104](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/RPCs.md) |
| Validator tables + `checkRpcParams` | `ewp_validator/src/rpcValidation.ts` |
| ajv suppression + integration | `ewp_validator/src/structuralPrecheck.ts:456-492` |
| Case-insensitive type compare | `ewp_validator/src/rpcValidation.ts:372-373` |
| Open rpcEntry schema | `ewp_validator/schema/generate.mjs:120-139` |
| Unit / integration tests | `ewp_validator/src/rpcValidation.test.ts`, `ewp_validator/src/structuralPrecheck.test.ts:305-338` |
