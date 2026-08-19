# What does the EWP C# source actually enforce for custom saved keys?

Research verifying `ewp_validator/src/referenceValidation.ts`'s "Custom saved key" checks against
the primary C# source, rather than the reverse-engineered/observed behavior it was originally built
from. Fetched directly from Jere Kuusela's public GitHub repos on 2026-08-19 via
`raw.githubusercontent.com` / `api.github.com` (branch `main` throughout) — this is the PRIMARY
SOURCE, following the citation/rigor convention of `ew_toolkit/.scratch/ew_toolkit/research/13-round8-*`
and `13-round9-*`.

Files fetched and read in full for this research:

- `ExpandWorldPrefabs/service/DataStorage.cs` (204 lines) — the entire custom-key storage engine.
- `ExpandWorldPrefabs/service/data/Functions.cs` (1138 lines, relevant sections read in full) — where
  `<save_..>`/`<save++_..>`/`<save--_..>`/`<load_..>`/`<clear_..>` templates are actually dispatched
  and parsed.
- `ExpandWorldPrefabs/service/Parse.cs` — `Kvp`/`TryKvp`, the shared key/value splitting primitive
  both files above depend on.
- `ExpandWorldPrefabs.Tests/DataStorageTests.cs` (109 lines) — the project's own unit tests for
  `DataStorage`, useful as confirmation of intended behavior (wildcard ranges, `HasAnyKey`/`HasEveryKey`).
- `docs/functions.md` — the "Custom data related functions" section, to cross-check source-derived
  conclusions against the documented syntax (`<save_X_Y>`, `<save++_X>`, etc.).
- `README.md` (EWP) plus the GitHub API repo listing for `JereKuusela` — to confirm whether a
  companion repo (`valheim-expand_world_data`, the closest match to "WEC" in the user's shorthand)
  shares any of this storage logic.
- `ExpandWorldData` repo tree listing (`api.github.com/repos/JereKuusela/valheim-expand_world_data/git/trees/main?recursive=1`)
  — checked for a `DataStorage.cs` equivalent.

---

## 0. Is there really a "WEC" companion that shares this logic? No.

`valheim-expand_world_data`'s tree has no `DataStorage.cs` (or anything resembling one) anywhere —
its `service/` and `service/data/` directories hold `Parse.cs`, `Yaml.cs`, `Calculator.cs`,
`DataData.cs`, `DataEntry.cs`, `DataHelper.cs`, `DataLoading.cs`, `DataValues.cs`, `Parameters.cs`,
`PrefabHelper.cs`, and the `values/` type converters — the data.yaml *entry* machinery (round 06/08's
subject), not custom-saved-key storage. `<save_..>`/`<load_..>`/`<clear_..>` and `keys:`/
`bannedKeys:`/`type: key` are entirely implemented in `ExpandWorldPrefabs` (this repo); nothing in
`valheim-expand_world_data` reads or writes `DataStorage`'s dictionary. **There is one implementation
of this feature, and it lives in EWP alone.** (Jere's account does list ten `valheim-expand_world_*`
repos in total — `_code`, `_events`, `_factions`, `_music`, `_rivers`, `_size`, `_spawns`, plus the
base `_world` and `_data` — none of the others were checked in depth since the question is specifically
about custom-saved-key storage, and this repo has no other file resembling a shared/duplicate
`DataStorage`.)

---

## 1. Naming/parsing rule for a saved key name — write vs. read, and scope

**Storage is a single flat, global, static `Dictionary<string, string>`. No scope or namespace concept
exists at all** — not per-object, not per-ZDO, not per-file. `DataStorage.cs:15`:

```csharp
private static Dictionary<string, string> Database = [];
```

`static`, one instance for the whole running world. Confirmed by `docs/functions.md:194`: "Custom
data can be used to replace global keys" — it is explicitly the same flat-namespace idea as vanilla
Valheim global keys, just mod-side instead of `ZoneSystem`-side (and not synced to clients, per the
same doc line).

### Write-time parsing (`save`/`save++`/`save--`) — NOT a uniform "everything but the last segment" split

This is the most consequential finding for the validator. Tracing the call chain in
`Functions.cs`:

1. `Replace`/`ResolveFunctions` (`Functions.cs:24-88`) finds the outermost `<...>` group, and —
   critically — **any nested `<...>` groups inside it are resolved first, inside-out**, before the
   outer group is ever treated as a function call (see §2 below for the full mechanism). So by the
   time a `<save_...>` template reaches the code below, any `<int_x=0>`/`<time>`/etc. nested inside
   it has already been replaced with its resolved literal string — the outer template is now a flat
   string with no brackets left inside it.

2. `TryReplaceFunction` (`Functions.cs:89-104`) strips the outer `<`/`>`, and splits on `=` via
   `Parse.Kvp(key, '=')` to peel off a `<load_X=default>`-style default value. For `save`/`save++`/
   `save--`/`clear` (no `=` present), this step is a no-op — `key` stays the full string, e.g.
   `save_foo_bar`.

3. `GetFunction` (`Functions.cs:106-124`) then does the **function-name split**:
   ```csharp
   var keyArg = Parse.Kvp(key, Separator);   // Separator = '_' (Functions.cs:17)
   key = keyArg.Key;                          // e.g. "save"
   var arg = keyArg.Value;                    // e.g. "foo_bar"
   ```
   `Parse.Kvp` (`Parse.cs:187-192`) splits on the **first** occurrence of the separator
   (`str.IndexOf(separator)`), not the last:
   ```csharp
   public static KeyValuePair<string, string> Kvp(string str, char separator = ',')
   {
     var index = str.IndexOf(separator);
     if (index < 0) return new(str, "");
     return new(str.Substring(0, index), str.Substring(index + 1).Trim());
   }
   ```
   So for `save_foo_bar`, `keyArg.Key = "save"`, `keyArg.Value = "foo_bar"` — everything after the
   first `_` becomes `arg`, passed whole into `GetValueFunction("save", "foo_bar", defaultValue)`.

4. `GetValueFunction` (`Functions.cs:155-251`) dispatches by the now-isolated function name:
   ```csharp
   "load"    => DataStorage.GetValue(value, defaultValue),   // value = arg, used AS-IS, no further split
   "save"    => SetValue(value),                             // value = arg, gets a SECOND split (see below)
   "save++"  => DataStorage.IncrementValue(value, 1),        // value = arg, used AS-IS, no further split
   "save--"  => DataStorage.IncrementValue(value, -1),       // value = arg, used AS-IS, no further split
   "clear"   => RemoveValue(value),                          // value = arg, used AS-IS, no further split
   ```
   **`load`, `save++`, `save--`, and `clear` all use `arg` directly as the storage key — no
   second split, so any `_` characters inside the key name are literal, part of the key.** Only
   plain `save` differs:
   ```csharp
   private string SetValue(string value)
   {
     var kvp = Parse.Kvp(value, Separator);   // second split, again FIRST '_'
     if (kvp.Value == "") return "";
     DataStorage.SetValue(kvp.Key, kvp.Value);
     return kvp.Value;
   }
   ```
   (`Functions.cs:409-415`) — `value` (`arg` from step 3, e.g. `"foo_bar"`) is split *again* on the
   first `_`: `kvp.Key = "foo"`, `kvp.Value = "bar"`. **The stored key is only the text up to the
   first `_` after `save_`; everything from that first `_` onward is the value being saved**, which
   can itself legally contain further `_` characters (e.g. `<save_foo_bar_baz>` → key `"foo"`,
   value `"bar_baz"`). This matches the documented syntax `<save_X_Y>` (`docs/functions.md:189`,
   "Saves custom data with key X and value Y") read literally: X is a single token up to the first
   `_`, Y is everything else.
   - `RemoveValue` (`Functions.cs:416-420`) confirms `clear`'s key is the whole remainder unsplit:
     `DataStorage.SetValue(value, "")` — a plain `SetValue` with an empty string, which
     `DataStorage.SetValue` (`DataStorage.cs:48-62`) treats as a delete (`SetValueSub` removes the
     dict entry when `value == ""`, `DataStorage.cs:112-121`).

**This directly contradicts `referenceValidation.ts`'s current write-key extraction**
(`scanKeyOccurrences`, lines 271-274):
```ts
if (head[1].startsWith("save")) {
  const segs = splitTopLevel(inner, "_");
  key = segs.length > 1 ? segs.slice(0, -1).join("_") : (segs[0] ?? "");
  ...
```
This treats `save`, `save++`, and `save--` identically, and for all three takes "every segment except
the last" as the key. Per source:
- For `save++`/`save--` there is **no key/value split at all** — the *entire* remainder is the key.
  Taking "all but the last `_`-segment" silently truncates a real key name whenever it contains a
  literal `_` (e.g. `<save++_boss_kill_count>` → EWP key is `"boss_kill_count"` in full; the
  validator currently extracts `"boss_kill"`, dropping `"count"`).
- For plain `save`, the split point is real, but it's the **first** `_` in the remainder, not the
  last — so `<save_foo_bar_123>` → EWP key `"foo"` / value `"bar_123"`, while the validator currently
  extracts key `"foo_bar"` (treating `"123"` as the discarded trailing value). A read of the literal
  key `"foo"` would never match this write under the validator's current logic; a read of `"foo_bar"`
  (which does not exist in `DataStorage`) would falsely appear compatible.

### Read-time parsing — matches source correctly, mostly

- `<load_NAME=default>`: `scanKeyOccurrences` (line 276) takes everything before the first top-level
  `=` as the key, matching `TryReplaceFunction`'s `Parse.Kvp(key, '=')` split (`=` is the separator
  there, first-occurrence semantics apply but there's normally only one `=`). Then the remainder
  (`NAME`, after `load_` is dropped by the head regex) is used whole — correct, no further split
  happens on the C# side for `load`, as shown above.
- `<clear_NAME>`: same "whole remainder" treatment (line 279-280) — correct, matches `RemoveValue`
  above.
- `keys: NAME value` / `bannedKeys: NAME value`: read via `parseKeysField`, first whitespace token is
  the key. This matches `DataStorage.HasAnyKey`/`HasEveryKey` (`DataStorage.cs:158-203`), which parse
  each entry with `Parse.Kvp(dataKey..., ' ')` — **space**, not underscore, as the key/value separator
  here (confirmed `Parse.cs:187`, generic on any `separator` argument; `HasAnyKey`/`HasEveryKey` pass
  `' '` explicitly). Correct as implemented.
- `type: key, NAME value`: `parseTypeKeyParameter` takes the first whitespace token after the `key,`
  prefix. `GetValueFunction`'s `"key" => DataStorage.GetValue(value, defaultValue)` (`Functions.cs:248`)
  confirms `type: key` is a plain read against the same `DataStorage`, keyed by whatever follows —
  and per `PrefabData.cs`'s `InfoType.Parameters` split (`Parse.Kvp(line)` then space-split, round 8's
  finding), `NAME` is indeed the first space-separated parameter. Correct as implemented.
  - Worth noting: this confirms `type: key` and `type: globalkey` are genuinely different storages —
    `"globalkey" => ZoneSystem.instance.GetGlobalKey(...)` (`Functions.cs:249`) hits Valheim's own
    vanilla global-key system, not `DataStorage` at all. The validator already scopes its check to
    `type: key` only (not `globalkey`), which is correct.

---

## 2. Are dynamic `<...>` parameters resolved by EWP itself, or opaque to a separate engine?

**Resolved by EWP itself, inside-out, before the outer template is evaluated as a function.** This is
directly visible in `Functions.cs`'s `Replace`/`ResolveFunctions` pair:

- `Replace` (`Functions.cs:25-64`) walks the string tracking bracket nesting depth, and extracts each
  **top-level** (`nesting == 0` at entry) `<...>` group as one unit (including everything nested
  inside it), then hands that whole substring to `ResolveFunctions`.
- `ResolveFunctions` (`Functions.cs:65-88`) does the inside-out resolution:
  ```csharp
  var end = str.IndexOf(">", i);
  ...
  var start = str.LastIndexOf("<", end);
  ...
  if (TryReplaceFunction(str.Substring(start, length), allValues, out var resolved))
  {
    str = str.Remove(start, length);
    str = str.Insert(start, resolved);
    i = start - 1;  // recheck from here — resolved text may itself contain functions
  }
  ```
  `IndexOf(">")` finds the first closing bracket; `LastIndexOf("<", end)` finds the **nearest**
  preceding opening bracket — i.e., the innermost `<...>` pair is resolved first. The result is
  spliced back into the string in place, and the scan restarts from just before the splice point.
  This repeats until no more brackets remain.

Concretely, for `<save_captureblockercity<int_isRadarCity=0>_<time>>`:
1. Innermost `<int_isRadarCity=0>` resolves first (to, say, `"1"`).
2. `<time>` resolves next (to, say, `"123456"`).
3. The string is now flat: `save_captureblockercity1_123456` (no brackets left).
4. *Then* this flat string goes through `TryReplaceFunction` → `GetFunction` → the `save` split
   logic from §1: `Parse.Kvp("captureblockercity1_123456", '_')` → key `"captureblockercity1"`,
   value `"123456"`.

So the dynamic parameters are **not** part of a separately-evaluated expression whose *result* is
substituted as an opaque whole for matching purposes — they're substituted as literal text at the
exact position they appear, and the *combined, fully-flattened string* (parameters included) is what
gets key/value-split by `save`'s logic. This validates the validator's general instinct ("treat each
`<...>` as an unknown/wildcard region since its resolved value isn't known statically") but means the
*wildcard placement relative to the key/value split point* matters a lot: a `<...>` group that sits
before the real (first-`_`) split point is part of the **key**, and a group after it is part of the
**value**, and getting the split point wrong (as `keyToPattern`/`scanKeyOccurrences` currently does
for `save`) can silently move a wildcard from where the value actually is into where the key is, or
vice versa.

---

## 3. Is the saved-key STRING NAME case-sensitive or case-insensitive at the storage layer?

**Case-insensitive**, but not via a `Dictionary` comparer — `Database` is a plain
`Dictionary<string, string>` with the CLR default (ordinal, case-sensitive) comparer
(`DataStorage.cs:15`, no `StringComparer` argument passed). Case-insensitivity instead comes from
**every single call site lowercasing the key with `.ToLowerInvariant()` before touching the dictionary**:

| Method | Lowercasing call | Citation |
|---|---|---|
| `GetValue` | `Database.TryGetValue(key.ToLowerInvariant(), ...)` | `DataStorage.cs:46` |
| `TryGetValue` | `Database.TryGetValue(key.ToLowerInvariant(), ...)` | `DataStorage.cs:47` |
| `SetValue` | `key = key.ToLowerInvariant();` (before dispatch to `SetValueSub`/wildcard) | `DataStorage.cs:51` |
| `IncrementValue` | `key = key.ToLowerInvariant();` | `DataStorage.cs:66` |
| `HasAnyKey` (non-wildcard branch) | `var key = kvp.Key.ToLowerInvariant();` | `DataStorage.cs:163` |
| `HasEveryKey` (non-wildcard branch) | `Database.TryGetValue(kvp.Key.ToLowerInvariant(), ...)` | `DataStorage.cs:199` |
| `MatchKeys` (wildcard prefix/suffix/contains matching) | `StringComparison.OrdinalIgnoreCase` throughout | `DataStorage.cs:92-104` |
| `LoadSavedData` (loading `ewp_data.yaml` from disk on startup) | `Database[kvp.Key.ToLowerInvariant()] = kvp.Value;` | `DataStorage.cs:26` |

Every write path lowercases before storing, so `Database`'s keys are *always* already-lowercase in
practice — combined with every read path also lowercasing its lookup key (or using
`OrdinalIgnoreCase` for the wildcard branch), the net effect is that `SAVE_Foo`, `save_foo`, and
`Save_FOO` are the same stored key. **`save_Foo` and `save_foo` (and `Foo`/`FOO`/`foo` read
anywhere) collide.**

The validator's `keysCompatible`/`keyToPattern`/`keyToSubject` functions (lines 305-352) currently
compare key strings with plain, case-sensitive regex/string equality — no `.toLowerCase()` anywhere in
that comparison path. This is a real gap: two differently-cased key names that are the *same* key at
runtime (e.g. a write `<save_CaptureCity_1>` and a read `keys: captureCity`) would currently be
flagged as an orphaned read and an orphaned write (two false positives) instead of being recognized as
the same key.

---

## 4. Validity constraints on the key name itself

**No character-set restriction, no reserved-prefix restriction, no length limit found anywhere in
`DataStorage.cs`, `Parse.cs`, or `Functions.cs`.** Any string is accepted as a key. Two narrow
exceptions, both behavioral rather than validating/rejecting:

- **Empty string is a silent no-op, not an error.** `SetValue`: `if (key == "") return;`
  (`DataStorage.cs:50`) — an empty-after-parsing key (e.g. a malformed `<save_>` where nothing
  follows) does nothing at all: no write, no exception, no log.
- **`*` is a reserved wildcard character, not a literal-allowed one for exact matching.** Every
  write/read path checks `key.IndexOf('*')` (`SetValue` line 52, `IncrementValue` line 67,
  `HasAnyKey`/`HasEveryKey` lines 165/187) and switches to `MatchKeys`-based fuzzy matching the
  moment a `*` appears anywhere in the key string — `*` can never be matched as a literal character
  in a key. `MatchKeys` (`DataStorage.cs:88-106`) supports four shapes: bare `*` (all keys), `*text*`
  (contains), `*text` (ends-with), `text*` (starts-with), and `pre*post` (starts-with + ends-with,
  for a `*` in the middle). Per `docs/functions.md:187,190`, this is a **documented feature**
  ("Wildcard * in the key name can be used to remove multiple keys at once" for `clear`, and "used to
  set multiple keys at once (these keys must already exist)" for `save`) that the validator does not
  currently model at all — a `<clear_boss_*>` write and a `keys: boss_1` read are semantically related
  (the clear can delete `boss_1`) but the validator's `keysCompatible` has no wildcard-`*` handling,
  only `<...>`-group wildcarding.

No other constraint exists — no regex, no disallowed character, no case restriction (see §3), no
length cap.

---

## 5. Does EWP tolerate an orphaned key gracefully, or log/warn/error?

**Fully silent in both directions — the validator's low-severity "hint" framing matches EWP's own
tolerance exactly.**

- **Read of a key that was never written**: `GetValue(key, defaultValue)` simply returns
  `defaultValue` on a dictionary miss (`DataStorage.cs:46`, plain `TryGetValue` fallback) — no log
  call anywhere in the method. `HasAnyKey`/`HasEveryKey` likewise just treat a missing key as "value
  doesn't match" / "no match" — no log. Confirmed by reading the entirety of `DataStorage.cs`: there
  is no `Log.*` call in the file at all (contrast with `PrefabData.cs`'s `InfoType`, round 8's
  finding, which *does* `Log.Error` on a bad `type:` value — the custom-key system has no equivalent).
- **Write with no matching read**: not applicable from EWP's own perspective — `SetValue`/
  `IncrementValue` always succeed unconditionally (create-or-update semantics, no "is anyone reading
  this?" check is possible or attempted). A write "orphaned" from the loaded YAML batch's perspective
  could still be read by: another loaded rule elsewhere, a console command, another mod entirely
  (`Database` is a single process-wide static field, nothing scopes it to EWP's own rule files) — so
  from EWP's own runtime behavior, there is no such thing as an "orphaned write" at all; every write
  is equally valid whether or not anything in the current file batch reads it back.
- **`save++`/`save--` on a previously-unset key**: creates it starting from `0` (`IncrementValue`,
  `DataStorage.cs:70`: `Parse.Long(GetValue(key, "0"), 0) + amount`) — silently initializes rather than
  erroring, matching docs' "Missing keys are created with value 1/-1."

So: **no case exists where the validator should escalate an orphaned custom-key read or write beyond
its current "info"/hint severity** — EWP itself never treats this as an error condition, warning, or
even a loggable event. The validator's severity choice is already correctly calibrated; only the
*matching logic* (key/value split point, case sensitivity, `*` wildcard) needs correction.

---

## Summary table

| Question | Answer | Citation |
|---|---|---|
| Scope/namespace | Flat, single global `static Dictionary<string,string>` — no per-object/per-file scoping | `DataStorage.cs:15` |
| `save++`/`save--`/`load`/`clear` key extraction | Whole remainder after the function-name prefix, **unsplit** — `_` chars inside are literal | `Functions.cs:155-251, 409-420` |
| `save` key extraction | Remainder split *again* on the **first** `_` only: text before it is the key, everything after (incl. further `_`) is the value | `Functions.cs:409-415`, `Parse.cs:187-192` |
| Dynamic `<...>` params in a key | Resolved inside-out by EWP's own `Replace`/`ResolveFunctions` *before* the outer template is evaluated — final flat string is what gets key/value-split | `Functions.cs:24-88` |
| Case sensitivity of the stored key | Case-**insensitive** — every call site does `.ToLowerInvariant()` (or `OrdinalIgnoreCase` for wildcard matches) before touching the dict; the `Dictionary` itself uses the default (case-sensitive) comparer, so insensitivity is enforced by convention at every call site, not the dict | `DataStorage.cs:26,46,47,51,66,92-104,163,199` |
| Key-name validity constraints | None on characters/length/prefix. Empty string is a silent no-op. `*` is a reserved wildcard, never literal | `DataStorage.cs:50,52,65-106` |
| Orphaned read/write behavior in EWP itself | Fully silent both directions — no log/warn/error anywhere in `DataStorage.cs`; a read of a never-written key just returns the default | `DataStorage.cs` (absence of any `Log.*` call) |
| Shared "WEC" implementation? | No — `valheim-expand_world_data` has no `DataStorage`-equivalent; this feature is EWP-only | repo tree comparison, §0 |

---

## Recommendation for `ewp_validator/src/referenceValidation.ts`

1. **Fix the `save` write-key extraction to split on the first top-level `_`, not the last.**
   `scanKeyOccurrences`'s `save`/`save++`/`save--` branch (lines 271-274) needs to stop treating all
   three the same:
   - For plain `save`: the key is everything up to (not including) the **first** top-level `_` in the
     inner content; everything from that `_` onward is the value being stored (irrelevant to key
     matching, can be discarded same as today). `splitTopLevel(inner, "_")[0]` is the key (a single
     first segment), not `segs.slice(0, -1).join("_")`.
   - For `save++`/`save--`: there is **no split at all** — the entire inner content (after the head
     regex strips `save++_`/`save--_`) is the key, verbatim, `_` characters included. Route these two
     through the same "whole remainder" branch `load`/`clear` already use, rather than the `save`
     branch.
   This is a correctness fix, not a tightening — the current logic both over-truncates `save++`/
   `save--` keys with literal underscores and mis-splits multi-segment `save` keys, producing both
   false "orphaned write" flags (real key never recognized because the extracted name is wrong) and
   false "orphaned read" flags (a read of the *actual* key, e.g. `"foo"` from `<save_foo_bar>`, won't
   match the validator's wrongly-extracted `"foo_bar"`).

2. **Add case-insensitive comparison to `keysCompatible`.** Lowercase both sides (or build
   `keyToPattern`/`keyToSubject` with a `i` regex flag and lowercase the subject) before comparing —
   `DataStorage`'s real behavior is `.ToLowerInvariant()`-normalized on every access, so `Foo`/`foo`/
   `FOO` are one key at runtime and should never be reported as reciprocally orphaned.

3. **Model the `*` wildcard**, at least loosely. A write like `<clear_boss_*>` or `<save_boss_*_1>`
   (existing-keys-only per docs) can plausibly satisfy/relate to a read of `boss_1`, `boss_2`, etc. A
   reasonable low-effort version: if a key contains a literal `*` outside any `<...>` group, treat that
   `*` as an additional wildcard segment in `keyToPattern` (`.*` in the regex, same mechanism already
   used for `<...>` groups) rather than requiring an exact literal match on it. This closes a real gap
   — right now a `*`-bearing key can never match anything via `keysCompatible` except itself, so any
   `<save_x_*>`/`<clear_x_*>` write is guaranteed to be flagged as orphaned even when it clearly
   relates to concrete reads in the same file.

4. **No severity change needed.** EWP's own runtime is silent on orphaned reads/writes in every case
   (§5) — keep these at `info`/hint severity, exactly as today. This part of the design was already
   correctly calibrated even before this research.

5. **No scope/namespace modeling needed.** Confirms the current design's implicit assumption (a
   single flat namespace across all loaded files) is exactly right — there's no per-object or
   per-prefab key scoping in the source to get wrong.

6. Optional/minor: since `GetGeneralFunction`/`GetValueFunction` resolve dynamic `<...>` groups
   inside-out before the `save`/`load`/etc. split happens (§2), a `<...>` group that straddles the
   real split point (e.g. `<save_foo<x>_bar>` where the dynamic group sits exactly at the boundary
   between what becomes the key and what becomes the value once `<x>` resolves) is genuinely
   ambiguous to a static text scanner — the validator can't know at analysis time whether the
   resolved text will land before or after the first literal `_`. This is an inherent limit of
   static analysis here, not a bug to fix; worth a one-line code comment near `keyToPattern` noting it
   explicitly, so a future maintainer doesn't mistake it for an oversight.

## Confidence

High. Every claim above traces to a specific line in a fetched, current (`main` branch,
2026-08-19) source file — no docs-only or inferred claims. The one area with residual uncertainty is
§2's edge case (a dynamic group straddling the real key/value split boundary): the *mechanism*
(inside-out resolution before the outer split) is confirmed directly from source, but no concrete
worked example of that specific edge case was tested in-game, only traced through the code by hand.
If anyone wants empirical confirmation matching round 8's live-test methodology, the equivalent test
would be: set up `<save_foo<int_bar=0>_baz>` with a rule that makes `bar` resolve to some digits, and
confirm via `ewp_data.yaml` on disk which exact string became the stored key.
