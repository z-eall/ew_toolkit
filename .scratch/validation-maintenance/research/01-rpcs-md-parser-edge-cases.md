# RPCs.md parser edge cases — research for build-time table generation

**Question:** What format edge cases must a `docs/RPCs.md` parser handle so ticket 02 can emit `OBJECT_RPC_PARAMS` / `CLIENT_RPC_PARAMS` without guessing?

**Bottom line:** EWP's RPC catalog is **152 fenced `yaml` blocks** (one RPC each) under two stable `##` section headers, not one monolithic YAML file. A reliable parser splits on ` ```yaml ` fences, classifies blocks by `objectRpc:` vs `clientRpc:`, extracts `- name:` plus indented `N:` param lines, and applies explicit normalization and override rules. **Hard-fail the build** on fetch/structure/orphan-line failures; keep a small override manifest for three ambiguous names, two variadic RPCs, and (optionally) two doc-typo merges. Type prefixes should be emitted **doc-faithful** (`name`, `enum_*`, `bytes` preserved); `checkRpcParams` already aliases `name`↔`string` and `int`↔`enum_*` at runtime.

Fetched `docs/RPCs.md` from Jere Kuusela's `valheim-expand_world_prefabs` (`main` branch) on 2026-08-20, cross-checked against `ewp_validator/src/rpcValidation.ts` and [validator-round3 research 08](../../validator-round3/research/08-rpc-validation-source-audit.md).

---

## 1. Section structure — object vs client RPC blocks

### Document layout

| Region | Anchor | Lines (approx.) | Content |
|--------|--------|-----------------|---------|
| Preamble | `# Expand World Prefabs: RPCs` | 1–4 | Intro prose — **ignore** |
| Hit-data reference | `## Data types` → `### Hit data` | 5–46 | Documents `hit` KV fields — **ignore** (not RPC entries) |
| Object catalog | `## Object RPCs` | 48–1143 | Component-scoped RPC examples |
| Client catalog | `## Client rpcs` | 1145–1309 | Global client RPC examples |

**Stable extraction anchors (use these, not `###` headers):**

1. **`## Object RPCs`** — begin object pass; end at next `##` of equal level.
2. **`## Client rpcs`** — note **lowercase `rpcs`**; begin client pass; end at EOF.
3. **` ```yaml ` … ` ``` `** — each RPC is an isolated fenced block (152 total in current doc).
4. Inside a fence: **`objectRpc:`** or **`clientRpc:`** on its own line classifies the block.
5. **`- name: <RpcName>`** — RPC identity (required for extraction).

### What `### Component` headers are (and are not)

Object RPCs are grouped under ~40 `### ArmorStand`, `### ItemStand`, … headings. These are **documentation-only** — the same RPC name can appear under multiple components with different signatures (see §4). The parser must **not** route or key tables by component name.

Client RPCs have **no** `###` subsections — only an intro paragraph and sequential yaml fences.

### Typical block shapes

**Object block (standard):**

```yaml
# Sets item to a specific slot.
  objectRpc:
  - name: RPC_SetVisualItem
    target: all
    1: int, "index of the item slot"
    2: string, "name of the item"
```

**Client block (with variadic tail):**

```yaml
# Destroys an object.
  clientRpc:
  - name: DestroyZDO
    packaged: true
    1: int, "amount of ids"
    2: zdo, "zdo id"
    ...
```

**Metadata-only keys inside blocks (ignore for param tables):**

| Key | Example values | Notes |
|-----|----------------|-------|
| `target:` | `all`, `owner` (implicit), `<zdo>` | Documented dispatch hint |
| `source:` | `<zdo>` | Same |
| `packaged:` | `true` | Affects runtime serialization; not param count |

No blocks in the current doc use `delay`, `repeat`, `chance`, or `weight` inside the yaml fences (those are runtime YAML keys on real script entries, not doc examples).

### Line-ending requirement

GitHub `raw` content uses **CRLF**. Any line parser must split on `\r?\n` (or strip `\r` before `$`-anchored regexes). Failure to do so silently drops all param lines — a critical implementation detail for ticket 02.

---

## 2. Param line variants and doc typos

### Param line grammar (inside a `- name:` entry)

After the `- name:` line, recognize lines in this **order** (first match wins):

| Pattern | Regex / rule | Example | Action |
|---------|--------------|---------|--------|
| Numbered param | `^\s*(\d+):\s*(.+)$` | `    1: int, "slot index"` | Parse type + desc |
| Variadic marker | `^\s*\.\.\.\s*$` | `    ...` | Stop param collection; flag variadic |
| Orphan param (typo) | `^\s*-\s*(\d+):\s*(.+)$` | `  - 1: float, "amount of fuel"` | See typo recovery below |
| Metadata | `^\s*([a-zA-Z_]\w*):\s*(.+)$` | `    target: all` | Store/ignore (must **not** use `\w+` alone — digits would false-match) |
| Comment | `^\s*#` | `# Sets pose.` | Ignore |
| List key line | `^\s*objectRpc:` / `clientRpc:` | | Ignore (already classified) |

**Do not** treat `### Hit data` option bullets (`- damage:`, `- blunt:`) as RPC params — they live outside yaml RPC fences.

### Variant catalog (observed in current doc)

| Variant | Count | Example | Parser handling |
|---------|-------|---------|-----------------|
| Quoted description | ~majority | `1: string, "name of the item"` | Split on **first comma** (mirrors EWP `Parse.Kvp`); strip quotes from desc |
| Bare (unquoted) desc | 1 | `ChatMessage` → `2: int, type` | Type = `int`, desc = `type` |
| Enum slash list + `#` comment | 8 | `enum_trap, Armed/Disarmed/Triggered  # - int, 0/1/2` | Type = token before first comma; prefer `# - int, …` suffix for **desc** (see §3) |
| Int slash + `#` comment | 1 | `Say` → `1: int, 0/1/2 # Whisper, normal, shout` | Type = `int`; desc from either side of `#` |
| Variadic ellipsis | 2 | `DestroyZDO`, `LocationIcons` | Collect prefix params only; require manifest entry |
| Zero-param RPC | many | `- name: RPC_Tap` only | Emit `[]` |
| Doc typo: orphan list item | **2** | `RPC_AddFuelAmount`, `RPC_SetFuelAmount` | Typo recovery rule (below) |

### Doc typo — orphan `- N:` list items (FN-3 class)

Fireplace section documents fuel amount RPCs incorrectly:

```yaml
  objectRpc:
  - name: RPC_AddFuelAmount
  - 1: float, "amount of fuel"    # ← leading "-" makes YAML list sibling, not param
```

Same pattern for `RPC_SetFuelAmount`. EWP would load **two** list entries (name-only + nameless param blob). The hand table correctly models **one** param each.

**Recommended typo-recovery rule:** when a block's `- name: X` entry has **zero** params and the **very next line** at the same `-` list level is `- N: type, desc`, **merge** that param into the preceding entry and emit a **build warning** (`merged orphan param for RPC_AddFuelAmount`). **Hard-fail** on any other `- N:` orphan (unknown typo class).

### Signature conflicts from duplicate names

Automated pass (first-wins map + conflict detection):

| RPC | First doc (kept) | Second doc (conflicts) | Hand-table policy |
|-----|------------------|------------------------|-------------------|
| `RPC_DestroyAttachment` | ArmorStand: `1× int` | ItemStand: 0 params | **Omit** from table |
| `RPC_DropItem` | ArmorStand: `1× int` | ItemStand: 0 params | **Omit** |
| `RPC_Extract` | Beehive: 0 params | SapCollector: `1× zdo` | **Omit** |

~10 other names appear in multiple component sections with **identical** signatures (e.g. `RPC_RequestOwn`, `RPC_Damage`, `RPC_AddFuel`) — first occurrence is sufficient; later copies are redundant.

`SetVisualItem` (ItemStand, 3 params) and `RPC_SetVisualItem` (ArmorStand, 4 params) are **different names** — both belong in the object table.

---

## 3. Type normalization — generator emit vs runtime aliases

### Inventory of type prefixes in current doc (19 unique)

`bool`, `bytes`, `enum_damagetext`, `enum_message`, `enum_reason`, `enum_terrainpaint`, `enum_trap`, `float`, `hash`, `hit`, `int`, `long`, `name`, `quat`, `string`, **`string list`**, `userinfo`, `vec`, `zdo`

### Emit rules for generated tables

| Doc token | Emit `type` | Emit `desc` | Rationale |
|-----------|-------------|-------------|-----------|
| `name` | **`name`** (preserve) | quoted or bare desc | Docs intentionally distinguish; runtime has no converter |
| `string` | `string` | as parsed | |
| `string list` | **`string`** | append `(string list …)` or use hand-table phrase `"string list (unusable)"` | EWP treats unknown prefixes as passthrough strings; literal `string list` in YAML would type-mismatch (FN-6) |
| `enum_*` | **`enum_*`** (preserve) | prefer `# - int, 0/1/2` → normalize to `0=X, 1=Y, …` when present | Matches current hand-table style |
| `bytes` | **`bytes`** | `"unusable"` | MapData only; keep doc-faithful |
| `int`, `long`, `float`, `bool`, `vec`, `quat`, `hash`, `hit`, `zdo`, `userinfo` | unchanged | as parsed | |
| **New/unknown prefix** | — | — | **Hard-fail** build with type name + RPC (forces manifest update) |

### Description normalization (cosmetic, not validation-critical)

Hand tables shorten descriptions vs raw doc prose. Recommended generator policy:

1. **Quoted desc** → strip outer quotes; use verbatim text.
2. **Enum / int line with `# - int, …` comment** → derive compact desc from the comment (e.g. `TopLeft/Center  # - int, 1/2` → `"1=TopLeft, 2=Center"`). Fallback: use bare slash list as desc.
3. **Unquoted bare word** (`type`) → use as desc.

`checkRpcParams` uses `desc` only in warning messages — exact wording is low risk.

### Runtime aliases already in `checkRpcParams` (do NOT duplicate in generator)

From `rpcValidation.ts` `rpcTypesCompatible()`:

| Declared in YAML | Documented in table | Compatible? |
|------------------|---------------------|-------------|
| `string` | `name` | yes |
| `name` | `string` | yes |
| `int` | `enum_*` | yes |
| `enum_*` | `int` | yes |

**Case sensitivity:** runtime is case-sensitive; validator warns on `Int` vs `int` when case-insensitive equal. Generator should emit **lowercase** doc types as written in RPCs.md.

---

## 4. Override manifest — variadic + three omitted RPCs

### Confirmed: still required after generation

| Override | Members | Why generation alone is insufficient |
|----------|---------|----------------------------------------|
| **`OMIT_RPCS`** | `RPC_DestroyAttachment`, `RPC_DropItem`, `RPC_Extract` | Same name, incompatible arity across components; objectRpc entries never declare component |
| **`VARIADIC_RPCS`** | `DestroyZDO`, `LocationIcons` | Docs show repeating tail after `...`; table intentionally stores **fixed prefix only** |
| **`PARAM_OVERRIDES`** | *(optional)* `RPC_AddFuelAmount`, `RPC_SetFuelAmount` | Only needed if typo-recovery rule (§2) is **not** implemented; otherwise auto-merge suffices |

### Variadic prefix shapes (must match hand tables)

| RPC | Prefix params to emit | Doc sample after prefix |
|-----|----------------------|-------------------------|
| `DestroyZDO` | `[{ type: "int", desc: "amount of ids" }]` | repeating `zdo` |
| `LocationIcons` | `[{ type: "int", desc: "amount of icons" }]` | repeating `vec` + `string` pairs |

Parser: collect params until `...`; assert RPC name ∈ `VARIADIC_RPCS`; emit prefix only.

### Omitted RPC behavior (unchanged)

`checkRpcParams` returns `[]` for names not in table — including omitted ambiguous RPCs. Do **not** emit placeholder entries.

### Post-generation sanity checks (recommended)

1. **Count check:** expect exactly **134** unique RPC names across both tables (115 object + 19 client in current doc, minus 0 omitted from count since they're still *in* the doc but excluded from output → **131 emitted + 3 omitted = 134 doc names**).
2. **Diff gate:** on first adoption, byte-compare generated output against current hand tables (modulo desc wording); fail if `type` or param **count** differs for any non-omitted, non-variadic RPC.
3. **Conflict scan:** any new same-name signature mismatch not in `OMIT_RPCS` → hard-fail.

---

## 5. Failure mode when doc format changes

### Principle

Generated RPC tables are **required build inputs** for meaningful validation — unlike the optional EWP version stamp in `generate.mjs` (which warns and continues). **Prefer hard failure over silent drift.**

### Hard-fail conditions

| Condition | Error shape |
|-----------|-------------|
| HTTP non-200 fetching `RPCs.md` | `parse-rpcs: fetch failed HTTP …` |
| Missing `## Object RPCs` or `## Client rpcs` | `parse-rpcs: section anchor not found` |
| Zero yaml blocks with `objectRpc:` / `clientRpc:` | `parse-rpcs: no RPC blocks parsed` |
| Parsed unique name count `< 130` (threshold) | `parse-rpcs: suspiciously few RPCs (got N, expected ~134)` |
| Unrecoverable orphan `- N:` line | `parse-rpcs: orphan param line in <RpcName> block: …` |
| Same-name signature conflict not in `OMIT_RPCS` | `parse-rpcs: ambiguous RPC <name>: … vs …` |
| Variadic `...` on RPC not in `VARIADIC_RPCS` | `parse-rpcs: unexpected variadic marker on <name>` |
| Unknown type prefix | `parse-rpcs: unknown type '<type>' on <name> param <N>` |
| Param index gap (e.g. has `1` and `3`, no `2`) | `parse-rpcs: non-contiguous param index on <name>` |

### Warn-only conditions

| Condition | Action |
|-----------|--------|
| Typo-recovery merge (§2) | `console.warn` with RPC name |
| Duplicate name, identical signature | ignore subsequent copies (optional warn) |
| Desc normalization fallback used | optional debug log |

### Do NOT skip-with-warning for

- Missing sections, empty parse, or ambiguous new RPC names — these produce **wrong validation** if silently ignored.

### Suggested integration point

Extend `schema/generate.mjs` (or sibling `schema/parse-rpcs.mjs` called from it):

```text
node schema/generate.mjs
  ├─ fetch manifest.json (warn if fail)     ← existing
  ├─ fetch RPCs.md (fail if fail)           ← new
  ├─ parse → rpcParams.generated.ts         ← new
  └─ write schema.generated.json            ← existing
```

Wire `npm run generate` / CI so RPC parse failures block the same way TypeScript compile failures would.

---

## Parser spec recommendation (for ticket 02)

Implement `schema/parse-rpcs.mjs` with this contract:

### Input / output

- **Input:** raw markdown string from `https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/docs/RPCs.md`
- **Output:** `{ objectRpcParams, clientRpcParams }` as JSON or TypeScript module; shapes match existing `RpcParamDoc[]` records.

### Algorithm

```
1. SPLIT lines on \r?\n
2. LOCATE sections by /^## Object RPCs$/ and /^## Client rpcs$/
3. EXTRACT all /```yaml\r?\n([\s\S]*?)```/g fences within each section
4. FOR each fence:
     a. kind ← objectRpc: | clientRpc: (exactly one required; else fail)
     b. FIND - name: (\S+)
     c. FOR each subsequent line until fence end:
          • numbered N: → parseParam (first-comma split; strip # comments for type/desc)
          • ... → mark variadic; break param loop
          • - N: → orphan handler (merge-if-adjacent-empty-name else fail)
          • alpha metadata → ignore
     d. IF variadic → truncate to prefix per VARIADIC_RPCS manifest
     e. REGISTER in map (first-wins; detect signature conflicts)
5. APPLY OMIT_RPCS — delete from map
6. APPLY PARAM_OVERRIDES if any
7. RUN sanity checks (count, contiguous indices, known variadic set)
8. EMIT sorted-by-name tables
```

### `parseParam(raw)` helper

```javascript
function parseParam(raw) {
  const noComment = raw.split("#")[0].trim();
  const comma = noComment.indexOf(",");
  const type = (comma === -1 ? noComment : noComment.slice(0, comma)).trim();
  let desc = comma === -1 ? "" : noComment.slice(comma + 1).trim().replace(/^"(.*)"$/, "$1");
  const commentMatch = raw.match(/#\s*-\s*int,\s*(.+)$/i);
  if (commentMatch && type.startsWith("enum_")) {
    desc = normalizeEnumDesc(commentMatch[1]); // e.g. "0/1/2" → "0=X, 1=Y, 2=Z" optional
  }
  if (type === "string list") return { type: "string", desc: desc.includes("unusable") ? desc : `${desc} (string list)` };
  return { type, desc };
}
```

### Override manifest (`schema/rpcOverrides.mjs`)

```javascript
export const OMIT_RPCS = new Set([
  "RPC_DestroyAttachment",
  "RPC_DropItem",
  "RPC_Extract",
]);

export const VARIADIC_RPCS = new Set([
  "DestroyZDO",
  "LocationIcons",
]);

// Optional — omit if typo-recovery merge is implemented:
// export const PARAM_OVERRIDES = { RPC_AddFuelAmount: [...], RPC_SetFuelAmount: [...] };
```

### Tests ticket 02 should add

1. Full parse of pinned RPCs.md snippet → 134 names; emitted tables match hand types/counts for non-omitted RPCs.
2. `RPC_SetVisualItem` → 4 params, types `[int, string, int, int]`.
3. Orphan merge → `RPC_AddFuelAmount` → 1× `float`.
4. Conflict detector flags fake `RPC_Extract` variant when not omitted.
5. CRLF fixture → params not dropped.
6. Unknown type `typo` → build throws.

---

## Sources

| Claim | Source |
|-------|--------|
| Doc structure, 152 yaml blocks, 134 unique names | [RPCs.md](https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/docs/RPCs.md) (2026-08-20) |
| Hand tables, VARIADIC_RPCS, OMIT set | `ewp_validator/src/rpcValidation.ts` |
| Runtime dispatch, type behavior | [validator-round3 research 08](../../validator-round3/research/08-rpc-validation-source-audit.md) |
| EWP `Parse.Kvp` first-comma split | EWP `Parse.cs` (cited in research 08) |
| generate.mjs warn-vs-fail precedent | `ewp_validator/schema/generate.mjs` |
