# EWP's complete string-template function catalog — source audit (everything but save/load/clear)

Research verifying `ewp_validator/src/referenceValidation.ts`'s awareness gap: `KEY_HEAD_RE`
(line 180) only recognizes 4 function heads (`save`/`save++`/`save--`/`load`/`clear`). This
audits the *rest* of EWP's `<...>` function catalog — everything documented in `docs/functions.md`
that round2 ticket 07 did not touch. `<save_X>`/`<save++_X>`/`<save--_X>`/`<load_X>`/`<clear_X>`
are already fully source-verified in
`.scratch/validator-round2/research/07-custom-key-source-verification.md` and are **not**
re-derived here — cite that file for those five heads.

Fetched directly from `raw.githubusercontent.com` / `api.github.com`,
`JereKuusela/valheim-expand_world_prefabs`, branch `main`, 2026-08-22, saved locally and read
in full with a line-numbered reader (not the WebFetch summarizing pass — round 04's research
flagged that pass as "close paraphrase," so this audit uses direct file fetches for
byte-exact citations):

- `docs/functions.md` (219 lines) — the complete function reference doc, read in full.
- `ExpandWorldPrefabs/service/data/Functions.cs` (1138 lines) — read in full, not just the
  save/load/clear sections round2 covered. Contains the base `GetGeneralFunction` and
  `GetValueFunction` dispatch switches, `Replace`/`ResolveFunctions`/`TryReplaceFunction`
  (the top-level `<...>` resolution engine), and every math/text/vector/long/time handler.
- `ExpandWorldPrefabs/service/Parse.cs` (448 lines) — read in full. Confirms `Kvp`/`TryKvp`
  (already covered by round2) plus every `TryInt`/`TryFloat`/`TryAngleRadians`/etc. parser used
  by the handlers above — all silently-tolerant `TryParse`-style parsers, no throwing behavior.
- `ExpandWorldPrefabs/service/data/ObjectFunctions.cs` (242 lines) — a subclass of `Functions`
  that overrides `GetFunction`/`GetGeneralParameter`/`GetValueFunction` to add the ZDO/object-data
  functions (`<int_X>`, `<float_X>`, `<string_X>`, `<item_X>`, `<pdata_X>`, `<zdo>`, `<pid>`,
  etc.) that `docs/functions.md`'s top section documents but that do not appear in `Functions.cs`
  itself — this file had to be discovered via a full repo tree listing
  (`api.github.com/repos/.../git/trees/main?recursive=1`), since round2's research never needed it.
- `ExpandWorldPrefabs/Api.cs` (86 lines) — the plugin-extension registration surface
  (`RegisterFunctionHandler`/`RegisterValueFunctionHandler`), consulted first in the dispatch
  chain, checked to confirm it is a *separate*, case-insensitive namespace from EWP's own
  built-in switch statements (see §1c).
- `ExpandWorldPrefabs/service/data/ZdoHelper.cs` (209 lines) — backs `ObjectFunctions`'
  `<int_X>`/`<float_X>`/etc.; shows exactly what "X" resolves against (ZDO extra-data, then a
  reflected component field via `Humanoid.m_name`-style paths) — the runtime-state dependency
  central to §3's feasibility verdict.

---

## 1. Complete recognized function-name inventory, argument shapes, and case sensitivity

### 1a. Two dispatch tables, one dispatch order

Every `<...>` group is resolved through `Functions.GetFunction` (`Functions.cs:106-124`), which
tries, **in this exact order**, stopping at the first non-null result:

1. `Api.ResolveFunction(key)` — third-party plugin functions taking no argument (`Functions.cs:108`).
2. `ExecuteCode(key)` — Expand World Code's arbitrary-name hook (`Functions.cs:110`).
3. `GetGeneralFunction(key, defaultValue)` — built-in, no-argument functions (`Functions.cs:112`,
   table at `Functions.cs:126-153`; overridden/extended by `ObjectFunctions.GetGeneralParameter`,
   `ObjectFunctions.cs:33-55`, when the object-data context is available).
4. A **second split** on `_` (`Parse.Kvp(key, Separator)`, `Functions.cs:114` — same first-`_`
   split primitive round2 documented for `save`) to peel a function name off its argument, then:
   - `Api.ResolveValueFunction(key, arg)` — third-party plugin value functions (`Functions.cs:119`).
   - `ExecuteCodeWithValue(key, arg)` — Expand World Code's value-hook (`Functions.cs:121`).
   - `GetValueFunction(key, arg, defaultValue)` — built-in, argument-taking functions
     (`Functions.cs:123`, table at `Functions.cs:155-251`; overridden/extended by
     `ObjectFunctions.GetValueFunction`, `ObjectFunctions.cs:60-80`, which calls `base.GetValueFunction`
     first, `ObjectFunctions.cs:28`, so the base table's names win over the ZDO-specific ones on
     any collision — there are none in practice, the two tables don't share a key).

So there are, from source, **four separate name tables** to consider for a validator: the
`GetGeneralFunction` no-arg table, the `GetValueFunction` argument table (both `Functions.cs`,
usable in *any* string context including the general/rule-level `Replace` calls), and
`ObjectFunctions`' two overriding tables (`GetGeneralParameter`, `GetValueFunction`), which only
apply where an object/ZDO context exists (rule triggers/filters/actions operating on a specific
object — the vast majority of `expand_prefabs_*.yaml` usage). Plus the third-party/plugin surface
(`Api.cs`) and Expand World Code's `ExecuteCode`/`ExecuteCodeWithValue` hooks, both **not**
enumerable from this repo's source at all (arbitrary names registered at runtime by other mods)
— a validator cannot ever produce a "recognized function" superset covering those two without also
reading Expand World Code's own source, and even then a random third mod could add more via `Api.cs`.

### 1b. Full function-name list (built-in, this repo only)

**No-argument functions — `GetGeneralFunction`, `Functions.cs:126-153`:**
`prefab`, `safeprefab`, `par` (bare form only — see the `par`/`par_X` overload note below), `par0`
through `par9`, `day`, `ticks`, `x`, `y`, `z`, `snap`, `amount` (only when `args.Length < 2`, else
falls through — `Functions.cs:149`), `time`, `realtime`.

**No-argument functions — `ObjectFunctions.GetGeneralParameter`, `ObjectFunctions.cs:34-55`** (only
reachable when an object/ZDO context exists — these extend, not replace, the table above):
`zdo`, `pos`, `i`, `j`, `a`, `rad`, `deg`, `rot`, `pid`, `cid`, `platform`, `pname`, `pchar`,
`pvisible`, `owner`, `connected`, `biome`, `joints`.

**Argument-taking functions — `GetValueFunction`, `Functions.cs:155-251`** (68 names; argument
shape is what `value` — the whole remainder after the function-name `_` — must split into,
usually via `.Split(Separator)`/`Parse.Kvp`/`Parse.TryKvp`, `Separator = '_'`):

| Name(s) | Arg shape | Cites |
|---|---|---|
| `sqrt`,`round`,`ceil`,`floor`,`abs`,`sin`,`cos`,`tan`,`asin`,`acos` | 1 value (float/angle) | `Functions.cs:158-167` |
| `rad2deg`,`deg2rad`,`rad2vec`,`deg2vec` | 1 value (float/angle) | `Functions.cs:168-171`, `253-276` |
| `vec2deg`,`vec2rad` | 2 values, `_`-split via `TryKvp` | `Functions.cs:172-173`, `278-290` |
| `angle`,`distance`,`dot`,`cross`,`project`,`reflect` | 2 vectors, `_`-split via `Kvp`, each a comma/space-split 1-3-component vector | `Functions.cs:174-182`, `436-488`, `519-535` |
| `normalize`,`magnitude`,`sqrmagnitude`,`vecx`,`vecy`,`vecz` | 1 vector | `Functions.cs:178-186`, `460-517` |
| `lerp` | exactly 3 `_`-split parts: vector A, vector B, scalar T | `Functions.cs:183`, `490-499` |
| `atan` | 1 or 2 values (`Kvp`; 1-arg = `Atan(x)`, 2-arg = `Atan2`) | `Functions.cs:187`, `427-434` |
| `pow` | 2 values, `TryKvp` | `Functions.cs:188` |
| `log` | 1 or 2 values (`Kvp`; 1-arg = ln, 2-arg = log base Y) | `Functions.cs:189`, `606-613` |
| `exp` | 1 value | `Functions.cs:190` |
| `min`,`max` | any number of `_`-split values | `Functions.cs:191-192`, `292-303` |
| `add`,`sub`,`mul`,`div` | any number of `_`-split values; **overloaded**: if every operand strictly parses as a 2-3-component vector it does vector math, else falls back to scalar float math (`TryGetStrictVectorOperands`) | `Functions.cs:193-196`, `615-728` |
| `mod` | any number of `_`-split values, sequential scalar modulo | `Functions.cs:197`, `730-743` |
| `iter` | `_`-split, **minimum 4 parts**: `OP_MINI_MAXI_TEMPLATE` (rest re-joined as template) | `Functions.cs:198`, `305-314` |
| `iter2` | `_`-split, **minimum 6 parts**: `OP_MINI_MAXI_MINJ_MAXJ_TEMPLATE` | `Functions.cs:199`, `316-327` |
| `addlong`,`sublong`,`mullong`,`divlong`,`modlong` | any number of `_`-split values, long-typed arithmetic | `Functions.cs:200-204`, `745-812` |
| `randf`,`randomfloat` | 2 values, `TryKvp` + `TryFloat` both sides | `Functions.cs:205,208` |
| `randi`,`randomint` | 2 values, `TryKvp` + `TryInt` both sides | `Functions.cs:206,209` |
| `random` | 2 values; picks int or float math based on whether **either** operand contains a literal `.` (`HasFractionalMarker`) | `Functions.cs:207`, `814-828` |
| `hashof` | 1 value (text) → hash number, unconditional (no failure path) | `Functions.cs:210` |
| `textof` | 1 value, must `TryInt` | `Functions.cs:211` |
| `len` | 1 value (text), unconditional | `Functions.cs:212` |
| `lower`,`upper`,`trim` | 1 value (text), unconditional | `Functions.cs:213-215` |
| `left`,`right` | 2 values, `Kvp`: text, then an int char-count (defaults to `1` via `Parse.Int(kvp.Value, 1)` if unparsable) | `Functions.cs:216-217`, `830-854` |
| `mid` | 3 `_`-split values: text, start-int, length-int | `Functions.cs:218`, `856-870` |
| `proper` | 1 value (text), unconditional | `Functions.cs:219`, `872-885` |
| `search` | 2 or 3 `_`-split values: needle, haystack, optional start-int | `Functions.cs:220`, `887-900` |
| `calcf`,`calcfloat` | 1 value, math expression string (`Calculator.EvaluateFloat`) | `Functions.cs:221,223` |
| `calci`,`calcint` | 1 value, math expression string | `Functions.cs:222,224` |
| `calclong` | 1 value, math expression string | `Functions.cs:225` |
| `par` (value form) | 1 value, must `TryInt` — **distinct from the bare `<par>` no-arg function above; this is the `<par_X>` form** | `Functions.cs:226` |
| `rest` | 1 value, must `TryInt` | `Functions.cs:227` |
| `load`,`save`,`save++`,`save--`,`clear`,`key` | see round2 ticket 07 (`key` is a plain-read alias for `load`, `Functions.cs:248`, not covered by round2 but same underlying `DataStorage.GetValue` call — no separate parsing quirks) | `Functions.cs:228-232,248` |
| `rank`,`small`,`large` | 2+ `_`-split values: an index/rank int, then a variadic numeric list | `Functions.cs:233-235`, `907-953` |
| `eq`,`ne`,`gt`,`ge`,`lt`,`le` | 2 values, `Kvp`; numeric compare if both parse as float, else `OrdinalIgnoreCase` string compare (`eq`/`ne` only — `gt`/`ge`/`lt`/`le` require both to parse as float or return `defaultValue`) | `Functions.cs:236-241`, `955-1015` |
| `even`,`odd` | 1 value, must `TryInt` | `Functions.cs:242-243`, `1017-1031` |
| `findupper`,`findlower` | 1 value (text), unconditional | `Functions.cs:244-245`, `1033-1043` |
| `time` | 1 value, a .NET `DateTime` format string, unconditional (free-form) | `Functions.cs:246`, `1045-1065` |
| `realtime` | 1 or 2 `_`-split values: format string, optional float timezone offset | `Functions.cs:247`, `1066-1074` |
| `globalkey` | 1 value, `ZoneSystem.instance.GetGlobalKey` lookup | `Functions.cs:249` |

**Argument-taking functions — `ObjectFunctions.GetValueFunction`, `ObjectFunctions.cs:60-80`**
(11 names, only in object/ZDO context; extends, does not override, the table above per
`ObjectFunctions.cs:28`'s `base.GetValueFunction` precedence):

| Name | Arg shape | Runtime dependency | Cites |
|---|---|---|---|
| `string`,`float`,`int`,`long`,`bool`,`vec`,`quat` | 1 value: a ZDO extra-data key name, or a `Component.m_field[.m_subfield...]` dotted path (`ZdoHelper.GetField`, `Parse.Kvp(value, '.')` then reflection) | ZDO runtime state + Unity component reflection on the *actual spawned prefab* | `ObjectFunctions.cs:63-70,88-100`; `ZdoHelper.cs:14-127` |
| `hash` | 1 value, ZDO int field → resolved prefab/location name via `ZNetScene`/`ZoneSystem` | Live scene state | `ObjectFunctions.cs:68,93-98` |
| `byte` | 1 value, ZDO byte-array key | ZDO runtime state | `ObjectFunctions.cs:71,83-87` |
| `zdo` | 1 value, `zdo.GetZDOID(value)` | ZDO runtime state | `ObjectFunctions.cs:72` |
| `amount`,`quality`,`durability` | 1 or 2 `_`-split values: either an item-name/wildcard (amount only) or two ints (inventory X,Y slot coords) | Live inventory contents (parsed from `ZDOVars.s_items` on demand, `LoadInventory`) | `ObjectFunctions.cs:73-75,101-189,228-235` |
| `item` | 1 or 2 values, same X,Y-vs-name heuristic as `amount` | Live inventory | `ObjectFunctions.cs:76,101-108` |
| `pos` | 1 value, an XZY offset string added to the object's live position/rotation | ZDO runtime state | `ObjectFunctions.cs:77,237-241` |
| `pdata` | 1 value, a player-data key (`baseValue`, `possibleEvents`, or others per `PeerManager`, not enumerated in this repo's fetched files) | Live player/peer state | `ObjectFunctions.cs:78` |

### 1c. Case sensitivity — confirmed **case-sensitive** for all built-in dispatch, unlike `DataStorage` keys

All four built-in dispatch tables (`GetGeneralFunction`, `GetValueFunction` in `Functions.cs`;
`GetGeneralParameter`, `GetValueFunction` in `ObjectFunctions.cs`) are plain C# `key switch { "name"
=> ..., _ => null }` statements over the raw `key` string, with **no** `.ToLowerInvariant()`,
`.ToLower()`, or `StringComparer` anywhere in the four switch bodies (confirmed by grep across
`Functions.cs` for `ToLower|ToUpper|OrdinalIgnoreCase|StringComparer` — the only hits are inside
individual *handler bodies* operating on the already-dispatched *argument value*, e.g. `"lower"
=> value.ToLowerInvariant()` at `Functions.cs:213`, or the `eq`/`ne` value comparisons at lines
965/978 — none of them touch the dispatch `key` itself). C# `switch` on `string` uses ordinal,
case-sensitive comparison by default with no such calls present, so **`<String_x>`, `<INT_x>`, or
`<Save_foo_bar>` do not match `"string"`, `"int"`, or `"save"` and fall through as unrecognized**
(§2) — this directly contradicts round2 ticket 07's DataStorage-key finding and the ticket's own
prompt-text assumption; case sensitivity is **not** uniform across EWP and must not be assumed
either way per function family. (Contrast: `Api.cs:9-11`'s three plugin-handler dictionaries *are*
explicitly built with `StringComparer.OrdinalIgnoreCase` — third-party-registered function names
*are* case-insensitive — but that's a completely different code path from the built-in switches,
and out of a static validator's reach anyway since those names are runtime-registered, not
enumerable from source.)

One partial exception worth flagging for §2/§4: the **value-group fallback** that unrecognized
names fall through to (see §2) does lowercase — `group.ToLowerInvariant().GetStableHashCode()`
(`Functions.cs:1100,1122`) — so a value-group *name* match (a completely separate mechanism from
function dispatch) is case-insensitive, even though the function-name dispatch that precedes it is
case-sensitive.

---

## 2. What happens to an unrecognized function name?

**Not a simple binary of "literal passthrough" vs. "dropped" vs. "logged error" — there's an
intermediate step, and no logging occurs anywhere in this path.** Tracing `<strink_x>` through
`TryReplaceFunction` (`Functions.cs:89-104`):

1. `GetFunction("strink_x"...)` is called. It falls through `Api.ResolveFunction`,
   `ExecuteCode`, `GetGeneralFunction` (no match for `"strink_x"` as a whole no-arg name), splits
   on the first `_` to get `key="strink"`, `arg="x"`, then `Api.ResolveValueFunction`,
   `ExecuteCodeWithValue`, and finally `GetValueFunction("strink", "x", "")` — none of the 79
   built-in case labels match `"strink"`, hits the table's `_ => null` (`Functions.cs:250` or
   `ObjectFunctions.cs:79`), so `GetFunction` returns `null` (`Functions.cs:123-124`).
2. Back in `TryReplaceFunction`, `resolved == null`, so it falls to `ResolveValue(rawKey)` (plain
   context) or `ResolveConditionValue(rawKey)` (`allValues` / condition context) — `Functions.cs:101-102`.
3. `ResolveValue` (`Functions.cs:1077-1085`) treats the *entire original bracketed text* (e.g.
   `<strink_x>`) as a possible **value-group reference** (a completely unrelated EWP feature: named
   lists of values defined in `data.yaml`'s `values:` blocks, unrelated to functions). It strips
   the brackets and looks up `DataLoading.ValueGroups` by the lowercased hash of `strink_x`
   (`TryGetValueFromGroup`, `Functions.cs:1098-1110`). **If a scripter happens to have defined a
   value group literally named `strink_x`, the "typo'd function" silently resolves to a random
   value from that unrelated group instead of erroring** — a second, non-obvious failure mode
   worth flagging for ticket 06's design (a false-negative risk: the typo goes undetected *and*
   produces a plausible-looking, non-empty value).
4. If no matching value group exists either, `TryGetValueFromGroup` returns `false` and
   `ResolveValue` returns its own `value` parameter unchanged — which is `rawKey`, the original
   bracketed text (`Functions.cs:1084`, the final `return value;`).
5. `TryReplaceFunction` returns `resolved != rawKey` (`Functions.cs:103`) — since `resolved ==
   rawKey` in this fallback case, it returns **`false`**.
6. In `ResolveFunctions` (`Functions.cs:65-88`), a `false` return means the `if
   (TryReplaceFunction(...))` branch is skipped and the `else { i = end; }` branch runs
   (`Functions.cs:82-85`) — **the string is left completely untouched** and the scan just moves
   past this bracket group to continue looking for the next one.

**Net result: an unrecognized function name is left as a literal, untouched substring in the
final output string** (e.g. a chat message would print the literal text `<strink_x>`, a `data:`
field would carry the literal template forward unresolved) **— no error, no warning, no log call
anywhere in this chain** (confirmed: zero `Log.*`/`Logger.*` calls exist anywhere in
`Functions.cs`, verified by grep across the full 1138-line file). This matches round2 ticket 07's
finding for the custom-key system's own silence (§5 there) — EWP's runtime is consistently silent
on this whole class of scripter error, across both the key-storage layer and the function-dispatch
layer. A typo is a **silent no-op that degrades to inert literal text**, not a crash — exactly the
shape of bug a static linter earns its keep catching, since the game will never surface it.

---

## 3. Is "recognized function, invalid argument value" statically checkable?

**No, not in general — it falls into the same trap as prefab-name/global-key validation from
ticket 04, for the same root reason: most function arguments resolve against live runtime state
this validator has no access to. There is one narrow, genuinely closed-form exception.**

### 3a. The dominant case: runtime-state-dependent arguments — NOT checkable

The `ObjectFunctions.GetValueFunction` table (§1b's second table: `string`, `float`, `int`, `long`,
`bool`, `hash`, `vec`, `quat`, `byte`, `zdo`, `amount`, `quality`, `durability`, `item`, `pdata`)
is the practical majority of real-world EWP scripting (`<int_level>`, `<float_health>`,
`<string_Humanoid.m_name>` are all over the examples files ticket 04 read). Every one of these
resolves its argument against:

- **ZDO extra-data** (`ZDOExtraData.s_ints`/`s_floats`/etc., keyed by a hash of the argument
  string) — a dictionary populated by the *currently spawned object's actual data*, which depends
  on what `data:`/`strings:`/`ints:`/etc. blocks were applied to it at spawn/create time, elsewhere
  in the YAML (or, per ticket 04 precedent, by vanilla game logic or another mod entirely).
- **Component reflection** (`ZdoHelper.GetField`, `ZdoHelper.cs:107-127`): for the dotted
  `Component.m_field` form (e.g. `Humanoid.m_name`), it does `ZNetScene.instance.GetPrefab(prefabHash)`
  → `FindComponent(prefab, "Humanoid")` (a live Unity `GetComponentsInChildren` walk) →
  `.GetType().GetField("m_name")` (C# reflection on Valheim's actual compiled types). This is
  **exactly** ticket 04's "component/field paths inside data blocks... Unity/Valheim
  component-and-field names baked into the game, not scripter-invented identifiers" category
  (04's §2a) — a validator would need Valheim's own decompiled type/field index (a dramatically
  bigger and more volatile dataset than a prefab-name list) to know in advance whether
  `Humanoid.m_name` is a real field, whether `Humanoid.m_bosseven` (a typo of `m_bossEvent`) is
  invalid, or whether a given prefab even *has* a `Humanoid` component to find. None of that is
  present in this repo's own source or `docs/`.
- **Live inventory contents** (`amount`/`quality`/`durability`/`item`, `ObjectFunctions.cs:101-235`):
  depends on what's actually in the object's `Container` at the moment of evaluation — runtime
  state with no static analog at all.
- **Live peer/player state** (`pdata`, `pid`, `pname`, etc., via `PeerManager`): depends on which
  client currently controls the object — not even determinable at YAML-authoring time in principle,
  let alone statically.

For all of these, "is X a valid argument" has no fixed answer independent of which object the
template runs against and what the rest of the loaded (and *unloaded*, e.g. vanilla/other-mod)
configuration did to that object beforehand — the identical shape of unprovability ticket 04
established for `prefab`/`swap`/component-field references. **Verdict: out of scope, same reasoning
as 04, not merely "hard" but genuinely dependent on data this validator's file-scan can never see.**

### 3b. The pure-computation functions: technically "checkable" but there's nothing to check — invalid values silently degrade, they don't error

The `Functions.cs`-level math/text/vector/long functions (`add`, `sqrt`, `left`, `eq`, etc.) mostly
parse their arguments with `Parse.TryFloat`/`TryInt`/`TryKvp`, all of which are **non-throwing**
(confirmed in `Parse.cs`: every `TryXxx` wraps `float.TryParse`/`int.TryParse`/etc. with
`NumberStyles`/`CultureInfo.InvariantCulture` and returns `false` on failure, never throws — e.g.
`Parse.cs:68-71,83-86`). Every call site in `Functions.cs` that uses these already handles the
`false` case by falling back to `defaultValue` (an explicit `=value` suffix the scripter controls)
or an empty string — see essentially every row of §1b's table, all of which read `Parse.TryFloat(value,
out var f) ? ... : defaultValue`. **There is no "invalid value" error state to catch here at
all — EWP's own design already treats a bad numeric argument as "return the default/empty," not as
a bug.** A validator flagging `<add_foo_bar>` (non-numeric operands) as "invalid" would be manufacturing
an error EWP itself does not recognize as one; the actual runtime behavior is a quiet `0` (or
whatever `defaultValue` was set to), matching round2 ticket 07 §5's finding that EWP is uniformly
silent/tolerant rather than defensive. This category is *checkable* in the narrow sense that a
literal (non-`<...>`-wrapped) argument's shape is visible in the YAML text, but there's no useful
lint to build on top of it — flagging "this argument won't parse as a number" would just be
re-implementing `float.TryParse` against a value the scripter may have deliberately made
dynamic-looking, and the runtime consequence is graceful degradation, not breakage.

### 3c. The one real exception: `<iter_OP_...>`/`<iter2_OP_...>`'s `OP` parameter is a genuinely closed, source-enumerable set

`HandleIter`/`HandleIter2` (`Functions.cs:305-327`) take the first `_`-split segment as `operation`
and, after building a per-index `TEMPLATE` string, synthesize a brand-new function call
`<{operation}_{joined-per-index-results}>` and hand it back into the resolver
(`BuildIteratorReduceExpression`, `Functions.cs:336-364`, specifically the `return
$"<{operation}_{string.Join(...)}>"` at line 363). That synthesized string is then re-resolved
through the exact same `GetFunction` dispatch as any other `<...>` template (§1, §2) — meaning
**`OP` must be the name of some other function in this same catalog that accepts a variadic list of
`_`-separated numbers** (in practice: `add`, `sub`, `mul`, `div`, `mod`, `min`, `max`, or any other
reducer with that shape) for the reduce to do anything meaningful; an invalid `OP` doesn't error,
it just falls all the way through §2's unrecognized-function path (checked against value groups,
then left as inert literal text — now doubly unhelpful, since the literal left behind is the
synthesized intermediate string, not the scripter's original template). **This is the one place in
the whole non-save/load/clear catalog where "valid argument value" reduces to "is this string one
of a small, fixed, compile-time-enumerable set of names" — the same closed-form shape a validator
could realistically build a lint for, unlike everything in §3a.** No worked example of a bad `OP`
being caught or logged exists in the source (consistent with §2 — the fallback path never logs).

---

## Summary table

| Question | Answer | Citation |
|---|---|---|
| How many built-in function names exist total (this repo only)? | 14 no-arg (`GetGeneralFunction`) + 17 no-arg object-context (`GetGeneralParameter`) + 68 argument-taking (`GetValueFunction`, incl. save/load/clear/key already covered by round2) + 11 argument-taking object-context (`ObjectFunctions.GetValueFunction`) ≈ **110 distinct built-in names**, plus an unbounded, source-invisible set from `Api.cs`-registered plugins and Expand World Code | `Functions.cs:126-153,155-251`; `ObjectFunctions.cs:34-55,60-80` |
| Dispatch order | Plugin API → Expand World Code → built-in no-arg table → (split on first `_`) → plugin API (value) → Expand World Code (value) → built-in argument table; `ObjectFunctions` extends (doesn't replace) the built-in tables when an object context exists | `Functions.cs:106-124`; `ObjectFunctions.cs:16-31` |
| Case sensitivity of function-name dispatch | **Case-sensitive** — plain `string switch`, no `.ToLowerInvariant()`/`OrdinalIgnoreCase`/`StringComparer` on the dispatch key anywhere in any of the 4 built-in tables. Contrasts with `DataStorage`'s case-insensitive *key values* (round2) and with `Api.cs`'s explicitly case-insensitive *plugin* function-name dictionaries | `Functions.cs:126-153,155-251` (no lowering calls, confirmed by grep); `Api.cs:9-11` |
| Unrecognized function name at runtime | Falls through all dispatch tables (`null`), then is checked against `data.yaml` **value groups** (a same-syntax but unrelated feature) by lowercased-hash lookup; if no value group matches either, the original bracketed text is left completely unchanged in the output. **No log/warn/error anywhere in the path** | `Functions.cs:89-104` (`TryReplaceFunction`), `65-88` (`ResolveFunctions`), `1077-1110` (`ResolveValue`/`TryGetValueFromGroup`) |
| Is "valid function, invalid argument" statically checkable? | **No, for the dominant case** (ZDO/component/inventory/player-state-dependent functions — same class of runtime dependency ticket 04 ruled prefab names out for). **Not useful even where technically checkable** (pure math/text functions degrade silently to `defaultValue`/empty on a bad argument — EWP itself treats this as normal, not an error). **One narrow exception**: `<iter_OP_...>`/`<iter2_OP_...>`'s `OP` token is drawn from a small, fixed, source-enumerable set of reducer function names — genuinely checkable | `ObjectFunctions.cs` + `ZdoHelper.cs` (runtime dependency); `Parse.cs:68-86` (non-throwing `TryXxx`); `Functions.cs:305-364` (`iter`/`iter2`) |
| Near-miss function-name pairs worth flagging for ticket 06 | See §4 below — `randf`/`randi`/`random`/`randomfloat`/`randomint`; undocumented `calcf`/`calci` aliases; the 2-letter comparison family `eq`/`ne`/`gt`/`ge`/`lt`/`le` (valid-to-valid typos, not catchable by name-distance at all); `hash`/`hashof`; bare `<par>` vs. `<par_X>` (same name, different arity/table) | `Functions.cs:158-251` |

---

## 4. Near-miss / typo-risk function-name pairs (context for ticket 06)

- **`randf` / `randi` / `random` / `randomfloat` / `randomint`** — five real, all-recognized
  names clustered around the same "random number" concept, several only 3-6 characters apart
  (`randf` vs `randi` is a single-character edit; `random` vs `randomfloat`/`randomint` is a
  truncation/extension of the same word). All five are genuinely different functions with subtly
  different int-vs-float inference rules (`random`'s int/float choice depends on whether *either*
  operand contains a literal `.`, `Functions.cs:814-828` — the other four are fixed-type). High
  typo-confusion risk, and unlike most others below, a wrong-but-valid choice here can silently
  produce the wrong numeric type rather than erroring.
  (`Functions.cs:205-209`)
- **Undocumented aliases `calcf`/`calci`** exist in source (`Functions.cs:221-222`) alongside the
  documented `calcfloat`/`calcint`/`calclong` (`docs/functions.md:81-82`, `Functions.cs:223-225`)
  — `docs/functions.md` never mentions `calcf`/`calci` at all. Not a typo-pair risk so much as a
  documentation gap: a scripter who guesses the shorthand `calcf` (reasonable, given `calcfloat`
  exists) gets it right by luck; a validator built strictly from `docs/functions.md` alone (rather
  than source) would incorrectly flag `<calcf_...>` as unrecognized.
- **The 2-letter comparison family**: `eq`, `ne`, `gt`, `ge`, `lt`, `le` (`Functions.cs:236-241`)
  — all six are valid, all six are one or two characters apart from at least one sibling (`gt`↔`ge`,
  `lt`↔`le`, `eq`↔`ne` by a single letter each). Critically, **a typo here doesn't produce an
  unrecognized-function warning at all** — every member of this family is independently valid, so
  swapping `ge` for `gt` (a real, easy slip) silently changes "greater-or-equal" to "strictly
  greater" with no error signal of any kind, ever. This is fundamentally different from the
  ticket's `<strink_X>` example (unrecognized name, §2's silent-literal-passthrough case) — it's a
  **wrong-but-valid** choice, which no name-typo-distance check could ever catch, since there's no
  "invalid" name to flag. Worth noting explicitly for ticket 06 as a class of bug entirely outside
  typo-distance detection's reach.
- **`hash` vs. `hashof`** (`ObjectFunctions.cs:68` vs. `Functions.cs:210`) — both real, semantically
  near-inverses (`hash`: ZDO int field → prefab/location name; `hashof`: arbitrary text → hash
  number), sharing a 4-character common prefix. `textof` (`Functions.cs:211`, hash number → original
  text) is the actual inverse of `hashof`, adding a third easily-conflated name to the cluster.
- **Bare `<par>` vs. `<par_X>`** — same literal word, but resolved through two *different* dispatch
  tables with different arities and meanings: `<par>` alone is the no-arg "whole parameter string"
  form (`Functions.cs:131`, `GetGeneralFunction`), while `<par_X>` (any trailing `_something`) is
  the argument-taking "get parameter at index X" form (`Functions.cs:226`, `GetValueFunction`) —
  not a name-typo risk exactly, but a shape/arity trap worth the same design attention: a validator
  that tries to normalize "the function name" by stripping everything after the first `_` would
  conflate these two meaningfully-different forms.
- **`min`/`max` vs. `small`/`large`** — `min`/`max` (`Functions.cs:191-192,292-303`, exactly the
  smallest/largest of the operand list) and `small`/`large` (`Functions.cs:234-235,927-953`, the
  *Nth*-smallest/largest via an index parameter, spreadsheet-`SMALL`/`LARGE`-style) are easy to
  reach for interchangeably by a scripter who wants "the Nth value" but half-remembers the simpler
  name; not a character-distance typo pair, but a naming-confusion pair worth noting since both are
  valid and produce plausible-but-wrong results if swapped.

None of the pairs above were verified against real-world EWP script "in the wild" (no issue
tracker / Discord / Nexus comments were searched — out of scope for a source-code audit); they are
derived purely from the enumerated name list's own character-distance and semantic clustering.

---

## Confidence

High for everything sourced directly from the fetched files (§1's function inventory and argument
shapes, §1c's case-sensitivity finding, §2's unrecognized-function trace, §3a/§3b's runtime-vs-pure
classification) — every claim traces to a specific cited line in `Functions.cs`, `ObjectFunctions.cs`,
`Parse.cs`, or `ZdoHelper.cs`, fetched fresh from the `main` branch on 2026-08-22 and read in full
(not through the WebFetch summarizing pass round 04 flagged as approximate).

Medium for §3c's `iter`/`iter2` "closed enumerable OP set" claim: the *mechanism* (OP gets spliced
into a new `<{operation}_...>` string and re-resolved through the normal dispatch) is directly
confirmed from source (`Functions.cs:336-364`), but no worked example or unit test of an invalid
`OP` was found in this repo's fetched files to confirm empirically that it degrades exactly per §2
rather than hitting some other, iter-specific code path — the conclusion is derived by code-reading
the general case, not observed.

Low/unverifiable: `pdata`'s full set of valid key names (`ObjectFunctions.cs:78` just forwards to
`PeerManager.GetPlayerData(zdo, value)`; `PeerManager.cs` was not fetched in this pass, only
referenced by name — `docs/functions.md:33-35` documents two example keys, `baseValue` and
`possibleEvents`, but does not claim that list is exhaustive, and neither this research nor round2's
confirms it one way or the other). If ticket 06 wants to attempt any static enum-checking for
`pdata`'s argument specifically, `PeerManager.cs` needs its own fetch-and-read pass first.

The near-miss pairs in §4 are explicitly flagged as derived/inferred (character-distance and
semantic clustering over the enumerated name list), not sourced from any external typo-report or
issue tracker — treat them as design-brainstorming input for ticket 06, not verified incident data.
