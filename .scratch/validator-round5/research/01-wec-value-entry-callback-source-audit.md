# WEC value entries — declaration shapes and the real `<...>` false-positive

Sources fetched fresh from GitHub `main` branch, 2026-08-22, and read in full (raw file
fetches, not the WebFetch summarizing pass — the first WebFetch attempt at
`README_data.md` came back paraphrased/lossy, so it was re-fetched with `curl` and read
line-numbered):

- `README_data.md` (JereKuusela/valheim-world_edit_commands, `main`) — "Value entries"
  section, lines 180-237, read verbatim.
- `WorldEditCommands/service/data/DataLoading.cs` (139 lines, read in full) — `LoadEntry`,
  lines 50-80: the actual runtime code that turns a `value:`/`valueGroup:` YAML entry into
  a `DataLoading.ValueGroups` dictionary entry.
- `WorldEditCommands/service/data/DataData.cs` — the deserialization target class; confirms
  field types (`value: string?`, `valueGroup: string?`, `values: string[]?`).
- `WorldEditCommands/service/data/DataValues.cs` (271 lines, read in full) — confirms no
  other file in WEC's `data/` folder touches `value`/`valueGroup`/`values` parsing.
- `ExpandWorldPrefabs/service/Parse.cs` (`JereKuusela/valheim-expand_world_prefabs`,
  `main`) — `Kvp`/`TryKvp`, lines 187-197, the shared first-separator-only KVP splitter
  WEC's `Parse.Kvp` (imported from the sibling `ServerDevcommands` library, not in this
  repo) is textually identical to in every call site inspected.
- `ExpandWorldPrefabs/service/data/Functions.cs` (1138 lines) — `TryReplaceFunction`
  (lines 89-104), `ResolveValue`/`TryGetValueFromGroup` (lines 1077-1110). This is the
  code this repo's round-4 research (`05-string-template-function-source-audit.md` §2)
  already traced for the "unrecognized function name" fallback path; this audit re-reads
  it with a narrower question — **exactly what string gets hashed and looked up against
  `ValueGroups`** — which round 4 didn't need to pin down precisely.
- `ewp_toolkit/ewp_validator/src/referenceValidation.ts` (this repo), read in full.

---

## Answers to the ticket's three questions

### Q1 — Every declaration shape README documents; does the comma-split break on any of them?

**Exactly two shapes, both confirmed against `DataLoading.LoadEntry` (`DataLoading.cs:50-71`), not just the README:**

1. **`- value: name, someValue`** — a single YAML string field. Runtime: `Parse.Kvp(data.value)`
   (`DataLoading.cs:54`) splits on the **first** comma only (`Parse.cs:187-192`:
   `str.IndexOf(separator)`, not a full `.Split()`), Key = everything before it (untrimmed),
   Value = everything after it (trimmed). `data.value` is declared as a plain `string?`
   (`DataData.cs:44`) — YAML gives it no structure beyond "one scalar," so there is no
   block-scalar/multi-line/array variant of this shape: a `value: |`-style block scalar
   would just make the *whole* string (newlines included) the operand to one `Parse.Kvp`
   call, still split on its first comma. **No multi-value-per-entry variant exists for
   `value:`** — `LoadEntry` calls `Parse.Kvp` exactly once per entry.
   - Repeating `- value: name, X` across several list items with the *same* name IS a real
     way to build a multi-candidate random-pick pool (`DataLoading.cs:56-60`: each repeat
     `.Add()`s another candidate to the same `ValueGroups[hash]` list; it also logs
     `"Duplicate value group entry"` every time after the first, which is a mod-side
     nuance, not a validator concern). `referenceValidation.ts`'s `Set`-based
     `valueGroupNames` already handles repetition correctly (idempotent `.add()`).
2. **`- valueGroup: name` + `values: [...]`** (a YAML list) — `data.valueGroup: string?`,
   `data.values: string[]?` (`DataData.cs:42,46`). Runtime requires **both** fields present
   (`DataLoading.cs:62`: `if (data.valueGroup != null && data.values != null)`); each list
   entry is added as its own candidate (`DataLoading.cs:69-70`).

**Does the validator's comma-split break on either shape? No — confirmed correct for both,
and this is a re-confirmation of the ticket's own charted 2026-08-22 repro, not a new
finding.** `referenceValidation.ts:757` (`value.value.split(",")[0]?.trim()`) is
functionally identical to `Parse.Kvp`'s first-comma split for name extraction — JS
`"level, 3".split(",")[0]` and C#'s `str.Substring(0, str.IndexOf(','))` both yield
`"level"` (untrimmed in C#, but YAML's own scalar parsing already strips the whitespace
that would matter here, so the extra `.trim()` on the TS side is a no-op difference, not a
divergence). `referenceValidation.ts:760-763` handles shape 2 by reading `value.valueGroup`
directly (a plain string field, no splitting needed) — also correct. **Neither declaration
shape is where the real gap lives; see the concrete break below, which is on the
*reference* side, not the *declaration* side.**

### Q2 — Are WEC "value entries" and EWP "value groups" the same mechanism, or distinct?

**The same mechanism — not an alias, not a parallel feature, literally the same runtime
dictionary.** `DataLoading.cs:17` declares `public static readonly Dictionary<int,
List<string>> ValueGroups = [];` inside WEC's own `Data.DataLoading` class, populated by
`LoadEntry` (`DataLoading.cs:50-71`, shapes 1 and 2 above). EWP's `Functions.cs`
`TryGetValueFromGroup` (`Functions.cs:1098-1110`) reads from `DataLoading.ValueGroups` —
the identical static dictionary, same `Data` namespace, same class — hashed the identical
way on both the write side (`DataLoading.cs:23,55,64`:
`group.ToLowerInvariant().GetStableHashCode()` / `kvp.Key.ToLowerInvariant()...` /
`data.valueGroup.ToLowerInvariant()...`) and the read side
(`Functions.cs:1100`: `group.ToLowerInvariant().GetStableHashCode()`). This confirms
round 4's structural assumption (05's summary table, "value-group fallback...does
lowercase") from the write side this time, and confirms this repo's own code comment at
`referenceValidation.ts:694-698` ("DataLoading.cs's own `group.ToLowerInvariant()...`
lookup") is accurate. **There is no separate WEC-only "value entry" resolution path and no
separate EWP-only "value group" declaration path — WEC's README documents the
*declaration* syntax (`value:`/`valueGroup:`+`values:`), EWP's `Functions.cs` documents
the *lookup* mechanism (`<name>` unresolved-function fallback), and both are reading and
writing the one shared `DataLoading.ValueGroups` table.** Round 4's own scope note that
this fallback is "a completely unrelated EWP feature" from EWP's *function* catalog is
still correct (it's not one of the ~110 built-in function names) — it's just that "unrelated
feature" and "WEC value entry" turn out to be the exact same object, not two systems that
happen to share syntax.

### Q3 — Is there a scope in which a WEC-style `<name>` legitimately escapes the current exclusion check?

**Yes, two independent ways — one is the inherent cross-file limitation the ticket
anticipated, the other is a real parsing bug in the reference-side scan (detailed in the
next section) that is not scope-related at all.**

- **Cross-file scope (inherent, not fixable without changing what's fed to a validation
  run):** `runReferenceValidation` only sees `files: FileInput[]` passed into one call
  (`referenceValidation.ts:678`). If a `value:`/`valueGroup:` declaration lives in a
  `data.yaml` that isn't part of the same batch as the referencing `expand_prefabs_*.yaml`,
  `valueGroupNames` never learns the name and the reference gets flagged. **This is the
  same shape of limitation this file's own custom-saved-key check
  (`orphanKeyMessage`, `referenceValidation.ts:359-375`) and poke-parameter check
  (`referenceValidation.ts:926-937`) already accept and word as an info-severity hint**
  ("Verify in `expand_prefabs*/ewp_data.yaml`" / "a rule outside this batch... otherwise
  it's dead") rather than a hard flag. The value-group exclusion check, by contrast,
  currently has **no such hint at all** — an out-of-batch value entry produces the same
  `warning`-severity "doesn't match any known EWP function name" message
  (`templateFunctionMessage`, `referenceValidation.ts:514-525`) as a genuine typo, with no
  acknowledgment that a value-group declaration living elsewhere is a real possibility.
  This is a real (if secondary) gap worth closing alongside the parsing bug below, by the
  same design precedent already used twice in this file — not by suppressing the warning
  outright (which would defeat its purpose against real typos), but by wording it to
  mention the value-group possibility, matching how the custom-key/poke messages already
  hedge. This is a **wording/precedent fix**, not a structural one.
- **The parsing bug (not scope-related, reproducible within a single batch — this is the
  real false positive):** see below.

---

## The concrete break: reference-side underscore splitting, not declaration-side comma splitting

The ticket's hypothesis was that `value.value.split(",")[0]` (the **declaration**-side
parser) breaks on some undocumented shape. It doesn't — Q1 confirms it's correct for both
real shapes. **The actual bug is on the *reference* side**, in how
`scanUnrecognizedFunctionHeads` (`referenceValidation.ts:540-553`) decides what string to
look up against `valueGroupNames` for a `<...>` group that isn't a recognized EWP function.

**Source ground truth for what EWP actually looks up:** `TryReplaceFunction`
(`Functions.cs:89-104`) tries `GetFunction(key, defaultValue)` first — for a name with an
underscore, `GetFunction` (`Functions.cs:106-124`) does its own first-`_`-split
(`Parse.Kvp(key, Separator)`, `Functions.cs:114`, `Separator` is `'_'`) to try it as an
argument-taking function call. If that lookup also fails (no built-in function head
matches the pre-underscore segment), `GetFunction` returns `null`
(`Functions.cs:123-124`), and `TryReplaceFunction` falls through to
`ResolveValue(rawKey)` (`Functions.cs:102`, non-`allValues` context — the common case).
**Critically, `ResolveValue` does not reuse the `_`-split key — it takes the entire
original bracketed text** (`Functions.cs:1077-1085`: `sub = value.Substring(1,
value.Length - 2)` — the *whole* inner text between `<` and `>`, unsplit) and hashes
*that* against `DataLoading.ValueGroups` (`Functions.cs:1098-1110`,
`TryGetValueFromGroup`).

So at runtime, a value-group name is matched **whole**, never truncated at the first `_`.
`referenceValidation.ts`'s reference-side scan does the opposite: `scanUnrecognizedFunctionHeads`
computes `head = splitTopLevel(inner, "_")[0] ?? inner` (`referenceValidation.ts:548`) —
the same first-`_`-split primitive EWP uses for *function-argument* dispatch — and that
truncated `head` is the only thing later compared against `valueGroupNames`
(`referenceValidation.ts:909-911`: `valueGroupNames.has(lowerHead)`). **For a value-group
name containing no underscore this is a no-op (head === inner), which is exactly why the
ticket's own `maxRangeToCity` repro showed zero problems. For a value-group name
containing an underscore, it silently drops everything from the first underscore onward
before the lookup — producing a false "Unknown EWP function name" on a reference that
resolves correctly at runtime.**

### Worked example that breaks today

```yaml
- value: level_multiplier, 3

- name: leveler
  ints:
  - level, <level_multiplier>
```

Both lines are valid, source-confirmed WEC/EWP syntax (shape 1 from Q1; `<level_multiplier>`
is a plain value-group reference, same pattern as the README's own `<level>`/`<randomLevel>`
examples, just with an underscore in the name).

- **Runtime (traced above):** `GetFunction("level_multiplier", ...)` tries the no-arg table
  (no match), then splits on `_` → key=`"level"`, arg=`"multiplier"` → tries
  `GetValueFunction("level", "multiplier", ...)` — `"level"` is not one of the ~79
  argument-taking function names (`Functions.cs:155-251`), so this returns `null` too.
  `TryReplaceFunction` falls to `ResolveValue("<level_multiplier>")`, which hashes the
  **whole** `"level_multiplier"` string, finds it in `ValueGroups` (declared by the
  `value:` line), and resolves to `"3"`. **Works correctly, no error, no warning, at
  runtime.**
- **`referenceValidation.ts` today:** declaration line correctly adds
  `valueGroupNames.add("level_multiplier")` (Q1, no bug there). But
  `scanUnrecognizedFunctionHeads` sees `inner = "level_multiplier"`,
  `isRecognizedFunctionGroup` computes `head = "level"` (`referenceValidation.ts:461`),
  finds `"level"` is not in `KNOWN_ARG_HEADS` either, so the whole group is **not**
  filtered out as a recognized function and gets pushed with `head: "level"`
  (`referenceValidation.ts:548-551`). At the final check
  (`referenceValidation.ts:909-911`), `valueGroupNames.has("level")` is `false` (the set
  only has `"level_multiplier"`) — **the validator flags
  `'<level...>' doesn't match any known EWP function name — probably a typo of...` (or the
  plain no-suggestion message) on a perfectly valid, runtime-correct reference.** This is
  the real false positive the ticket was hunting for.

(Any value-group name with an underscore reproduces this — `level_multiplier` above,
or the ticket's own hypothetical `maxRangeToCity` would *not* reproduce it since it has no
underscore, which is exactly why the chart-time repro against that name came back clean.
A name like `max_range_to_city` would reproduce it immediately, and worse, would very
likely also get *silently swallowed* into `isRecognizedFunctionGroup` returning `true`
whenever its first segment happens to collide with a real function head — e.g.
`max_something` collides with the real `max` function head, `left_boundary` collides with
`left`, etc. — meaning some underscored value-group names produce the false positive above,
and others produce a *different*, opposite failure: they're wrongly treated as an already-
"recognized" function reference and never checked against `valueGroupNames` at all, so a
genuinely undeclared/typo'd `<max_something>` would pass through with **no warning at
all**, in either direction. Both directions trace to the same root cause: the scan
conflates "the head used for *function-argument* dispatch" with "the string used for
*value-group* lookup," when source confirms EWP itself never conflates them — it tries the
former first, and only falls back to the latter using the **full**, unsplit text.)

---

## Recommendation for `referenceValidation.ts`

**Primary fix — stop reusing the underscore-split `head` for the value-group lookup;
check the value-group set against the full, unsplit bracket contents instead, matching
`ResolveValue`'s actual runtime lookup key.**

Concretely:

1. `UnrecognizedFunctionOccurrence` (`referenceValidation.ts:535-538`) needs to carry the
   full `inner` text alongside `head` (or in place of it, keeping `head` only for the
   suggestion/message logic that legitimately wants the function-style head).
2. `scanUnrecognizedFunctionHeads` (`referenceValidation.ts:540-553`) already computes
   `inner` locally (line 546) — just also store it on the pushed occurrence.
3. The final gate at `referenceValidation.ts:909-911` should check
   `valueGroupNames.has(inner.toLowerCase()) || DEFAULT_VALUE_GROUP_NAMES.has(inner.toLowerCase())`
   — the full bracket text, not `lowerHead` — before falling through to push a problem.
   `lowerHead` should still gate `DEFAULT_VALUE_GROUP_NAMES` too if a group name without
   an underscore is intended (the current no-underscore-case behavior must not regress) —
   simplest is to check both `inner` and `head` against both sets (a name with no
   underscore has `inner === head`, so this is safe and doesn't need a special case).
4. This also incidentally fixes the "silently recognized as a function, never checked at
   all" half of the double failure mode noted above **only if** `isRecognizedFunctionGroup`
   is left as-is (it must be — that gate's job is genuinely "is this a function call,"
   which correctly *does* want the pre-underscore head, since that's what EWP's own
   `GetFunction`/`Parse.Kvp(key, '_')` dispatch actually keys on). The double-failure case
   (an underscored, *undeclared* value-group-shaped name whose first segment happens to
   collide with a real function head, e.g. `<max_something>` with no `value: max_something`
   anywhere) is a real residual gap this fix does **not** close — but it is a strictly
   narrower, lower-value problem (requires an accidental collision between a made-up name's
   first segment and one of ~79 specific function heads) than the false positive above,
   which is any legitimately-declared underscored value-group name at all. Flagging it here
   for ticket 03's awareness, not recommending it be solved in the same pass: closing it
   would require trying `isRecognizedFunctionGroup`'s function-style match *and* an
   `inner`-based value-group match *before* deciding a group is "recognized," which is a
   larger restructuring of the recognized/unrecognized split this file currently makes in
   one pass (`scanUnrecognizedFunctionHeads`) — worth a follow-up ticket, not bundled here.

**Secondary fix — word the value-group-adjacent "unknown function name" message to
acknowledge the cross-file scope limitation (Q3),** the same way
`orphanKeyMessage`/the poke-parameter message already do, e.g. appending something like
"…or an out-of-batch value-group declaration; verify in `data.yaml`" when the head/inner
looks name-entry-shaped (no strong signal exists to detect this reliably, so this is a
blanket wording addition, not a conditional one — same blanket-hedge approach the two
existing messages already take). This doesn't change *when* a problem fires, only what
the message says, so it's low-risk and can be a small addition inside
`templateFunctionMessage` (`referenceValidation.ts:514-525`).

**No fix needed for the declaration-side comma-split** (`referenceValidation.ts:757`) —
Q1 confirms it is already correct for both real WEC declaration shapes, and there is no
third shape in source or docs that would break it.
