# Poke parameter naming: colons and semicolons in `parameter:` / `type: poke, …`

Research for validator round 3 ticket 11. Primary sources: Jere Kuusela's
[`valheim-expand_world_prefabs`](https://github.com/JereKuusela/valheim-expand_world_prefabs)
(`main` branch, fetched 2026-08-19) and the local `ewp_validator` schema / lint
passes.

---

## Question recap

Should these pass validation?

```yaml
- prefab: Player
  type: create
  poke:
  - self: true
    parameter: some:thing;likethis
```

```yaml
- prefab: Player
  type: poke, some:thing;likethis
  commands:
  - s hello
```

How does EWP parse poke `parameter:` values and inline `type: poke, …` strings?
Are `:` / `;` valid delimiters or likely typos?

---

## 1. EWP C#: how poke arguments are built

### 1a. `parameter:` (and legacy `pokeParameter:`)

`PokeData.parameter` is a plain `string?` (`PrefabData.cs` ~670). At runtime,
`Poke.GetArgs(Functions f)` resolves it like this (`PrefabData.cs` ~482–492):

```csharp
public string[] GetArgs(Functions f)
{
  if (Parameters != null)
    return [.. Parameters.Select(f.Replace)];
  else
  {
    var pokeParameter = f.Replace(Parameter ?? "");
    if (Evaluate?.GetBool(f) != false)
      pokeParameter = PokeEvaluate(pokeParameter);
    return pokeParameter.Split(' ');
  }
}
```

- **Delimiter:** ASCII **space** only (`String.Split(' ')`).
- **Colons / semicolons:** not split points. `some:thing;likethis` becomes a
  **single** argument token after substitution and optional math evaluation.
- **`PokeEvaluate`:** splits on spaces, then evaluates tokens that contain
  `*`, `/`, `+`, or `-` (excluding a leading minus). A token like
  `some:thing;likethis` is left unchanged (`PrefabData.cs` ~495–511).

### 1b. `pars:` (preferred modern form)

When `pars` is set, `GetArgs` uses `Parse.ToArr(data.pars)` instead of
`parameter` (`PrefabData.cs` ~468, ~484–485). `Parse.ToArr` delegates to
`Parse.Split`, which defaults to **comma** as the separator
(`service/Parse.cs` ~147–151, ~119–120):

```csharp
public static string[] Split(string arg, bool removeEmpty = true, char split = ',')
public static string[] ToArr(string str, bool removeEmpty = true) => [.. Split(str, removeEmpty)];
```

- **Delimiter:** comma.
- **`some:thing;likethis` with no comma → one parameter**, same as `parameter:`.
- Docs: “Structure is strictly defined. Parameter values with commas won't cause
  additional parameters.” (`docs/scripting.md` ~346–348).

### 1c. Dispatch: what happens to those args

`DelayedPoke` calls `poke.GetArgs(f)` and passes the resulting `string[]` to
`Manager.Handle(ActionType.Poke, args, zdo)` (`DelayedPoke.cs` ~55–56, ~79–80,
~137–145). No further splitting or charset filtering occurs before dispatch.

Legacy top-level `pokeParameter` follows the same space-split path inside
`PrefabManager.Poke` / `PokeGlobal` (`PrefabManager.cs` ~289–291, ~307–309).

---

## 2. EWP C#: inline `type: poke, …` trigger parameters

### 2a. Parsing the `type:` scalar

Every rule's `type` string is parsed in `InfoType`'s constructor
(`PrefabData.cs` ~716–727):

```csharp
var types = Parse.Kvp(line);   // first comma only
// ...
Parameters = types.Value != "" ? types.Value.Split(' ') : [];
```

`Parse.Kvp` splits on the **first comma** only (`service/Parse.cs` ~187–191).
For `poke, some:thing;likethis`:

| Step | Result |
|------|--------|
| `Parse.Kvp` | key `poke`, value `some:thing;likethis` |
| `Enum.TryParse(..., true, ...)` | `ActionType.Poke` |
| `Parameters` | `["some:thing;likethis"]` — one token |

Colons and semicolons are **not** trigger-parameter delimiters. Only **spaces**
split multiple trigger parameters (same rule as docs: “parameter1 parameter2”,
`docs/scripting.md` ~13–15).

Those parameters are stored on `Info.Args` (`PrefabLoading.cs` ~42, ~79) and used
when a poke event arrives.

### 2b. Matching incoming poke args

`InfoSelector.CheckArgs` compares `info.Args` to the incoming poke `args`
(`InfoSelector.cs` ~248–256):

```csharp
private static bool CheckArgs(Info info, string[] args)
{
  if (info.Args.Length == 0) return true;
  if (info.Args.Length > args.Length) return false;
  for (int i = 0; i < info.Args.Length; i++)
    if (!Helper.CheckWild(info.Args[i], args[i])) return false;
  return true;
}
```

`Helper.CheckWild` (`Helper.cs` ~13–66) treats the pattern as:

1. Comma-separated **alternatives** (each re-checked recursively).
2. `*` wildcards (prefix/suffix/infix).
3. If the **incoming** value parses as float **and** the pattern is float-like
   or **contains `;`**, a **`min;max` float range** via `Parse.FloatRange`.
4. Otherwise case-insensitive **exact string equality**.

Implications for `type: poke, some:thing;likethis`:

- Against a non-numeric incoming arg `some:thing;likethis` → exact match ✓
  (ticket example 2 works as intended if the poker sends that literal token).
- Against a **numeric** incoming arg, the `;` in the pattern can accidentally
  engage range logic (`Helper.cs` ~59–63): `Parse.StringRange("some:thing;likethis")`
  yields min `"some:thing"`, max `"likethis"`, both parsed as `0` by
  `Parse.Float`. A poke arg of `"0"` could match unintentionally. This is a
  runtime footgun, not a parse failure.

### 2c. Docs vs practice for `type: poke` parameters

`docs/scripting.md` says `poke` triggers “When `pokes` field is used” (~32) and
does not document trigger parameters for `poke`. In practice, parameters **are**
used as poke-arg filters; official examples use simple barewords:

| Source | Example |
|--------|---------|
| `docs/hacks.md` ~68–69 | `type: poke, grow` |
| `docs/hacks.md` ~91–92 | `type: poke, unattach` |
| `docs/hacks.md` ~116–117 | `type: poke, glue` |
| `docs/hacks.md` ~158–159 | `type: poke, update` |
| `docs/hacks.md` ~199–200 | `type: poke, joints` |
| Local validator tests | `type: poke, cooldownFrostseerBlobSpawner`, `type: poke, assignTeamLead 1,2 front` |

No published EWP example uses `:` or `;` inside a poke parameter or poke trigger
filter string.

---

## 3. Documented delimiter cheat sheet (poke-specific)

| Field / context | Documented split | `some:thing;likethis` |
|-----------------|-------------------|------------------------|
| `poke[].parameter` | spaces (`par0 par1 …`) | **1** arg |
| `poke[].pars` | commas (`par0, par1, …`) | **1** arg (no comma) |
| Legacy `pokeParameter` | spaces (via `Split(' ')`) | **1** arg |
| `type: poke, …` trigger params | spaces after first comma | **1** param |
| `type: key, …` / `keys:` | space / `,` or `;` between entries | *(different subsystem)* |
| Filter shorthand `type, key, value` | commas | *(different subsystem)* |
| Numeric ranges in filters / time | semicolon `min;max` | *(different subsystem)* |

Semicolons and colons **are** meaningful elsewhere in EWP (keys lists, ranges,
ZDO ids `uid:idx`), but **not** as poke-parameter delimiters.

---

## 4. Current validator coverage

### 4a. JSON Schema (`ewp_validator/schema/generate.mjs`)

| Field | Schema | Poke-specific constraint |
|-------|--------|--------------------------|
| `poke[].parameter` | `{ type: "string" }` | none |
| `poke[].pars` | `{ type: "string" }` | none |
| `pokeParameter` | `{ type: "string" }` | none |
| `type` / `types[]` | `typeValue` pattern: `^(poke\|…)(\s*,.*)?$` | accepts any suffix after comma |

Schema intentionally allows any string (ticket 09 policy: unconstrained strings
where EWP accepts function syntax and odd literals).

### 4b. `formatLint.ts`

Only inspects **YAML mapping keys** for stray `:` (e.g. `filter::`). Values
like `parameter: some:thing;likethis` are untouched (`formatLint.ts` ~14–15,
~25–35).

### 4c. `referenceValidation.ts`

No poke-parameter logic. Poke entries participate only in:

- nested `filter` / `data` data.yaml reference checks,
- legacy `data:` format info notices.

`parseTypeKeyParameter` applies only to `type: key, …`, not `type: poke, …`
(`referenceValidation.ts` ~108–117, ~511–516).

### 4d. Gap

Nothing validates:

- whether poke args look like bareword identifiers vs punctuation-heavy strings,
- consistency between `pars` (comma) and `parameter` (space) conventions,
- the `type: poke, …` suffix beyond the enum prefix (schema `,.*` tail).

Both ticket repro cases **correctly pass** today because EWP accepts them and the
validator has no opinionated poke-parameter lint.

---

## 5. Repro cases (expected runtime behavior)

### Case A — `parameter: some:thing;likethis` under `type: create`

```yaml
- prefab: Player
  type: create
  poke:
  - self: true
    parameter: some:thing;likethis
```

**EWP:** pokes self with args `["some:thing;likethis"]`.  
**Validator today:** pass (schema + lint + reference).

### Case B — `type: poke, some:thing;likethis`

```yaml
- prefab: Player
  type: poke, some:thing;likethis
  commands:
  - s hello
```

**EWP:** rule fires when an incoming poke's first arg equals `some:thing;likethis`
(case-insensitive), then runs commands.  
**Validator today:** pass.

### Case C — if the author meant *two* parameters

| Intent | Correct spelling |
|--------|------------------|
| two args via `parameter:` | `parameter: some:thing likethis` |
| two args via `pars:` | `pars: some:thing, likethis` |
| two trigger filters | `type: poke, some:thing likethis` |

Ticket shapes silently collapse to one token — a plausible typo, not a runtime
error.

### Case D — contrast: `pars:` with comma (documented style)

From `docs/hacks.md` ~67, ~89, ~115:

```yaml
pars: grow, <par1>
pars: unattach
pars: glue, <par2>
```

Commas here are intentional delimiters; colons appear only inside `<…>` function
calls, not as parameter separators.

---

## 6. Recommendation

**Do not error.** EWP treats `some:thing;likethis` as one valid literal token in
both contexts; an error would be a false positive against runtime behavior.

**Optional low-severity warning (info or warning)** when a poke-related string
contains `:` or `;` outside `<…>` function groups:

| Location | Suggested check |
|----------|-----------------|
| `poke[].parameter` | warn if value matches `/[:;]/` and has no `<` |
| `poke[].pars` | warn on `;` (never a `pars` delimiter); warn on `:` outside `<…>` |
| `pokeParameter` | same as `parameter` |
| `type` / `types[]` where leading word is `poke` | warn on `;` or `:` in the comma suffix |

Message shape (example):

> Poke parameter `some:thing;likethis` is one token at runtime (split on spaces
> for `parameter:` / `type: poke, …`, on commas for `pars:`). If you meant
> multiple parameters, use spaces or commas instead. This still works if the
> literal name is intentional.

**Rationale for warn-not-error:**

- Documented examples use simple identifiers; punctuation strongly correlates with
  delimiter confusion (keys lists, filter ranges, YAML typos).
- Semicolon in `type: poke, …` filters can interact with `CheckWild` range logic
  for numeric poke args (§2b) — worth surfacing, not blocking.
- Legitimate opaque tokens remain possible; a warning preserves EWP fidelity.

**If scope must stay minimal:** **no change** is also defensible — current pass
behavior matches EWP exactly; the warning is UX-only.

**Do not implement in this ticket** — feeds
[13-entry-field-validation-corrections.md](../issues/13-entry-field-validation-corrections.md).

---

## Sources

| Claim | Source |
|-------|--------|
| `parameter` space-split, `PokeEvaluate` | [`PrefabData.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabData.cs) `Poke.GetArgs`, `PokeEvaluate` |
| `pars` comma-split | [`PrefabData.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabData.cs) + [`service/Parse.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/service/Parse.cs) `ToArr`/`Split` |
| Poke dispatch | [`DelayedPoke.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/DelayedPoke.cs), [`PrefabManager.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabManager.cs) |
| `type:` comma + space param split | [`PrefabData.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/PrefabData.cs) `InfoType` |
| Trigger arg matching / `;` range | [`InfoSelector.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/InfoSelector.cs) `CheckArgs`, [`Helper.cs`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/ExpandWorldPrefabs/Helper.cs) `CheckWild` |
| Field docs (`parameter` vs `pars`) | [`docs/scripting.md`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/scripting.md) § Pokes |
| Real-world poke examples | [`docs/hacks.md`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/hacks.md) |
| Legacy `pokeParameter` | [`docs/legacy.md`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/legacy.md) |
| Validator schema | `ewp_validator/schema/generate.mjs` `pokeData`, `typeValue` |
| Validator lint / reference gaps | `ewp_validator/src/formatLint.ts`, `ewp_validator/src/referenceValidation.ts` |
