# Prefix/fuzzy value-group matching for nested `<...>` references — source audit

Sources fetched fresh from GitHub `main`, 2026-08-22 (raw file fetch via `curl`, not the
WebFetch summarizing pass, matching this round's established practice):

- `JereKuusela/valheim-expand_world_prefabs`, `ExpandWorldPrefabs/service/data/Functions.cs`
  (1138 lines, byte-identical to round4's fetch — `wc -l` re-confirmed). Read in full;
  this audit's new close-read is `Replace`/`ResolveFunctions` (lines 24-88) and
  `TryReplaceFunction`/`GetFunction` (lines 89-124), which round4's research covered only
  at the "dispatch order" level (its own §1a), not at the character-level splice mechanics
  nested groups depend on.
- `ewp_toolkit/ewp_validator/src/referenceValidation.ts` (this repo, 1066 lines), read in
  full — `walkKeySegments`/`findGroupEnd`/`splitTopLevel` (108-173), `keyToPattern`/
  `keyToSubject`/`hasLiteral`/`keysCompatible` (286-346), `isRecognizedFunctionGroup`
  (459-463), `scanUnrecognizedFunctionHeads` (587-626), the `dataUsages` dynamic-reference
  branch (882-897), and the value-group exclusion gate (982-1008).
- Ground truth reused without re-deriving, per this ticket's own framing:
  `research/01-wec-value-entry-callback-source-audit.md` (confirms `ResolveValue`/
  `TryGetValueFromGroup` hash the **whole**, unsplit bracket text against
  `DataLoading.ValueGroups`, case-insensitively) and
  `validator-round4/research/05-string-template-function-source-audit.md` (the ~110-name
  built-in function catalog and dispatch order).

---

## Q1 — Resolution order: is an inner `<...>` group resolved to its runtime value BEFORE the outer group's value-group lookup runs?

**Yes, confirmed directly from source — and the mechanism is more specific than "inside-out": it resolves exactly one innermost, currently-unresolved bracket pair at a time, splices the result back into the string, and only re-scans from that point once the splice makes the *next* level up look like a single clean pair.**

`Replace`/`ResolveFunctions` (`Functions.cs:24-88`):

- `Replace` (24-64) finds each *top-level* `<...>` span in the source string (tracking a
  `nesting` counter so a top-level span can itself contain nested `<...>`) and hands each
  one to `ResolveFunctions`.
- `ResolveFunctions` (65-88) is the part that matters here. It is **not** a recursive
  descent — it's a single forward scan with a splice-and-rewind step:
  ```csharp
  for (int i = 0; i < str.Length; i++) {
    var end = str.IndexOf(">", i);
    if (end == -1) break;
    i = end;
    var start = str.LastIndexOf("<", end);
    if (start == -1) continue;
    var length = end - start + 1;
    if (TryReplaceFunction(str.Substring(start, length), allValues, out var resolved)) {
      str = str.Remove(start, length);
      str = str.Insert(start, resolved);
      i = start - 1; // Resolved could contain functions, so need to recheck the same position.
    } else {
      i = end;
    }
  }
  ```
  `str.IndexOf(">", i)` finds the next `>` forward, then `str.LastIndexOf("<", end)` finds
  the nearest `<` backward from it — together these always locate the **innermost** still-
  bracketed pair (the first `>` you hit scanning forward can only be closed by the nearest
  `<` behind it, by construction, as long as no group has been resolved away yet). That
  substring is handed to `TryReplaceFunction` (89-104), which is exactly the "try function
  dispatch, else fall back to `ResolveValue`/value-group lookup" path round5 research/01
  already traced.
- **On success** (`resolved != rawKey`): the matched span, brackets included, is removed
  and the resolved text is spliced in at the same position (`Remove`+`Insert`), and the
  scan index rewinds to `start - 1` so it re-passes over the splice point — this is what
  lets a second round find the *next* level up as a now-clean single bracket pair, and
  also what lets a resolved value that itself contains `<...>` (e.g. a value-group entry
  whose value is another template) get re-resolved.
- **On failure** (`resolved == rawKey`, i.e. neither function dispatch nor the value-group
  fallback matched anything): **nothing is spliced.** The string is left byte-for-byte
  unchanged, brackets included, and the scan just moves `i` past that failed span
  (`i = end`) to keep looking for the next `>`.

**Consequence for nested groups, confirmed by hand-tracing both of the ticket's worked
examples against this exact algorithm:**

- `<requiredWorldLevel_<prefab>>` — innermost pair `<prefab>` is found first.
  `GetFunction("prefab", "")` hits `GetGeneralFunction`'s `"prefab" => prefab` case
  directly (`Functions.cs:129`, confirmed a real no-arg built-in — see round4's catalog),
  so it always succeeds and splices in the live prefab name, e.g. `<requiredWorldLevel_blackforge_ext1>`.
  The scan rewinds, now sees a single clean pair, and `TryReplaceFunction` runs
  `ResolveValue` on the **whole flattened string** `requiredWorldLevel_blackforge_ext1`
  against `DataLoading.ValueGroups` (research/01's confirmed lookup key) — a match if that
  exact family member is declared.
- `<realDayLock_<nameBoss_<int_location=0>>>` — innermost pair is `<int_location=0>`
  first (a real `ObjectFunctions` arg-function, `int` is in `ARG_OBJECT_FUNCTION_HEADS`),
  which resolves to some runtime ZDO int, splicing to e.g. `<realDayLock_<nameBoss_5>>`.
  The scan rewinds and next finds `<nameBoss_5>` as the new innermost pair.
  **This is the critical branch point:** if `nameBoss_5` *does* resolve — via a function
  (it isn't one, see Q3) or, more likely, its own `value:`/`valueGroup:` entry (e.g. a
  `nameBoss` family keyed by location index, resolving to a boss name like `Eikthyr`) — the
  splice reduces the string to `<realDayLock_Eikthyr>`, a single clean pair, and *that*
  gets the final `ResolveValue` lookup against the `realDayLock_*` family. **If it does
  *not* resolve**, the failure path leaves `<nameBoss_5>` completely untouched, brackets
  and all — and because `ResolveFunctions`'s pairing logic (`LastIndexOf("<")` /
  `IndexOf(">")`) always finds the *nearest* enclosing pair, the still-present inner
  brackets permanently prevent the outer `<realDayLock_...>` span from ever being seen as
  a single clean pair. **The outer `realDayLock_*` value-group lookup is never even
  attempted in that case — the whole expression is left broken at runtime too, not just
  flagged by a validator.** This is a real, source-confirmed consequence worth noting for
  ticket 06/07, not just a static-analysis artifact.

**Bottom line for the static-checking question this ticket exists to answer:** by the time
any outer group's value-group lookup runs, every nested group inside it has *already* been
collapsed to its resolved runtime string (or, on the failure branch, the whole outer lookup
never happens at all — either way, a static validator can never see the resolved runtime
suffix). **The only thing a static scan can ever know about the final looked-up string is
its literal skeleton**: the literal characters outside any nested `<...>` group, with each
nested group standing in for an unknowable runtime-resolved chunk — confirmed exactly
matching the ticket's own framing, and exactly the shape `keyToPattern` already builds.

---

## Q2 — Is prefix/fuzzy matching the right static approximation, and can an existing primitive be reused directly?

**Yes to both. `keyToPattern` (`referenceValidation.ts:286-294`) — already built for custom
saved keys and already reused once more for the `dataUsages` dynamic-reference branch
(`referenceValidation.ts:884-896`) — is *exactly* the right shape for this, with no
modification needed, and needs no new primitive.**

Why it's not just "close enough" but structurally exact:

- `keyToPattern` walks the reference text via `walkKeySegments`/`findGroupEnd`
  (`referenceValidation.ts:114-146`), which already treats **each balanced top-level
  `<...>` group, however deeply nested internally, as a single opaque token** — this falls
  straight out of `findGroupEnd`'s own depth-counting bracket matcher (114-124), which has
  no concept of "how many levels are inside," only "where does *this* group end." So
  `keyToPattern("realDayLock_<nameBoss_<int_location=0>>")` collapses the *entire* nested
  `<nameBoss_<int_location=0>>` span (multi-level nesting and all) to one `.*` — producing
  `^realdaylock_.*$` — with **zero special-casing needed for the double-nested example**.
  Single-nesting (`<requiredWorldLevel_<prefab>>` → `^requiredworldlevel_.*$`) and
  double-nesting produce the identically-shaped pattern through the identical code path.
  This directly answers the "tighter check possible" half of Q2: no tighter static check
  exists, because nesting depth carries no information a static scan could use anyway (Q1
  established the final string is never visible regardless of depth) — the skeleton-match
  is already the *exact* right approximation, not an over-approximation being tolerated for
  convenience.
- **Not an over-approximation for value-group names specifically:** the concern flagged in
  the ticket — "do value-group names ever contain a literal `_` a wildcard could wrongly
  span across, changing whether a real typo would still be caught?" — resolves cleanly:
  `.*` spanning underscores is *correct*, not sloppy, here. The ticket's own worked example
  proves it: the declared family includes `requiredWorldLevel_blackforge_ext2_vise`, i.e.
  the runtime-resolved suffix (a prefab name) can legitimately contain further underscores
  the static scan has no way to predict or bound. Constraining the wildcard to "no
  underscores" would falsely reject that real family member. Typo-catching for the parts
  that *are* statically visible is preserved by construction: the literal prefix before the
  first nested group (`requiredWorldLevel_`, `realDayLock_`) must still match character-
  for-character before the `.*` even engages, since `keyToPattern` anchors with `^...$` and
  escapes every literal char (`escapeRegex`, 267-269) — a scripter who typos the prefix
  itself (`reqiuredWorldLevel_<prefab>`) still produces a pattern that matches nothing in
  the declared family and still gets flagged. Nothing about this fix weakens the existing
  typo-detection surface; it only stops false-flagging the part that was never checkable.
- **Directional match, not `keysCompatible`'s bidirectional one — and that's the correct
  choice, not a shortcut.** `keysCompatible` (341-346) exists because custom-key names can
  be dynamic on *both* sides of a comparison (a `<save_...>` write and a `<load_...>` read
  can each contain their own nested groups). Value-group *declarations* are never dynamic
  — `valueGroupNames`/`DEFAULT_VALUE_GROUP_NAMES` are always populated from literal,
  fully-resolved strings (`value.value.split(",")[0]?.trim()` / `value.valueGroup.trim()`,
  lines 830/834; `DEFAULT_VALUE_GROUP_NAMES`, line 457, is a literal hardcoded set). So the
  match only ever needs to go one direction: build the pattern from the (possibly dynamic)
  *reference*, test it against each (always literal) *declared name* — precisely the shape
  the `dataUsages` dynamic-reference branch already uses (`keyToPattern(name)` tested
  against every `defName`, 892-895), not the two-sided `keysCompatible` used for custom
  keys. **Reuse that exact pattern, not `keysCompatible`.**
- `hasLiteral` (314-324) is the matching safety gate already used everywhere else in this
  file to stop a purely-wildcard reference from vacuously matching every declared name.
  Here it's effectively redundant-but-cheap insurance: `scanUnrecognizedFunctionHeads`
  already guarantees `head` (text before the first top-level `_`) never starts with `<`
  (line 622 — `if (!head || head.includes("<")) continue`), which means `inner` always has
  at least that literal head-prefix, so `hasLiteral(inner)` is already true by construction
  for every occurrence that reaches this gate. Include the check anyway for the same
  defense-in-depth reason the rest of the file uses it everywhere a wildcard pattern is
  built — free, and keeps the invariant local instead of implicit.

**No new matching primitive is needed.** `keyToPattern` requires no modification, no new
regex-building code, and no depth-aware logic — its existing balanced-bracket walk already
generalizes over arbitrary nesting depth for free.

---

## Q3 — Is `nameBoss` a real EWP function?

**No.** Cross-checked against round4's exhaustively-enumerated ~110-name built-in catalog
(`validator-round4/research/05-string-template-function-source-audit.md` §1b, itself
sourced from every case label in `Functions.cs:126-153,155-251` and
`ObjectFunctions.cs:34-55,60-80`, confirmed by grep for stray `.ToLower`/dispatch-affecting
calls with none found): no no-arg name (`GetGeneralFunction`/`GetGeneralParameter`) and no
argument-taking head (`GetValueFunction` in either `Functions.cs` or `ObjectFunctions.cs`)
is `nameBoss`, under any case variant (dispatch is case-sensitive per that research's §1c,
so `NameBoss`/`nameboss` wouldn't match either even if a near-miss existed — none does).

**What it actually is, resolved by Q1's mechanics plus the ticket's own framing:** the
declared `realDayLock_*` family (`realDayLock_Eikthyr`, `realDayLock_Elder`,
`realDayLock_Bonemass`, ...) is keyed by **boss name**, and `<nameBoss_<int_location=0>>`
sits exactly where a value that resolves to a boss name string would need to be, for the
outer `<realDayLock_<result>>` splice to land on a real declared family member (Q1's
success branch). The only way `nameBoss_5` (or whatever the resolved `int_location` value
is) can plausibly resolve at runtime is via **its own separate `value:`/`valueGroup:`
family** — e.g. a `nameBoss_0`/`nameBoss_1`/... entry set mapping a location index to a
boss name — **not shown in the user's pasted snippet**, matching option 2 from the ticket's
own framing of the ambiguity (not "missed from the function catalog," not "something else"
— a second, undeclared-in-this-batch value-group family). This is corroborating, not
independently re-derived: nothing in `Functions.cs`/`ObjectFunctions.cs` names or hints at
a `nameBoss` concept at all — it's absent from source entirely, which is exactly what
"real function, missed by the catalog" would need to *not* be true, and it is not.

**Consequence for ticket 06's scope, per the ticket's own question:** this does **not**
need to be handled as a structurally distinct case from the primary fix. `nameBoss_<...>`
is scanned by `scanUnrecognizedFunctionHeads` as its own independent occurrence (the file's
existing "no jump-past-match" design, `referenceValidation.ts:592-594`, already means a
nested unrecognized group gets its own pass through the loop) — it will independently hit
the same Q2 fuzzy-match gate, checked against `valueGroupNames` for a declared `nameBoss_*`
family, exactly like the outer `realDayLock_<...>` occurrence is. **One mechanism handles
both**, they just happen to nest inside each other in this example. If `nameBoss_*` truly
isn't declared anywhere in the loaded batch (the ticket's repro snippet), the fix
*correctly* still flags `<nameBoss_<int_location=0>>` as unrecognized — and per Q1's
failure-branch analysis, that flag would be pointing at a script that is *also* broken at
runtime (the outer `realDayLock` lookup never even runs), which is exactly the kind of true
positive this validator exists to catch. No special-casing needed; this is the fix working
as intended on an occurrence the pasted example just happened to leave undeclared.

---

## Q4 — Does the same concern apply to EWP's own built-in argument-taking functions (nested group in *argument* position)?

**No — already safely out of scope today, confirmed structurally, not by absence of a
counter-example.** The mechanism that protects this case is different from (and simpler
than) the value-group fix, and doesn't need to change:

- `isRecognizedFunctionGroup` (`referenceValidation.ts:459-463`) computes
  `head = splitTopLevel(inner, "_")[0] ?? inner` and checks *only* `head` against
  `KNOWN_ARG_HEADS`. `splitTopLevel` (148-173) treats any `<...>` group it encounters as
  opaque — it appends the whole group's text to the current segment without ever splitting
  on separators *inside* it (`cur += s.slice(i, end)`, line 160) — so a nested group sitting
  **after** a real function name is structurally invisible to the head-extraction step: for
  `<save_<pid>_score>`, the first *top-level* `_` is the one immediately after `save`
  (the `_` inside `<pid>` isn't top-level, and the group itself is atomic), so
  `head = "save"` regardless of what's nested later in the argument. `"save"` is in
  `ARG_FUNCTION_HEADS` (line 422), `isRecognizedFunctionGroup` returns `true`, and the
  whole occurrence is excluded from `scanUnrecognizedFunctionHeads`'s output entirely
  (line 620, `if (isRecognizedFunctionGroup(inner)) continue`) — it never reaches the
  value-group gate at all. Same reasoning applies to any `ARG_OBJECT_FUNCTION_HEADS` member
  (`<int_<fieldName>>` → head `"int"`, recognized, excluded) — the check only ever needs
  the head, and the head is only ever the *literal* prefix, by `splitTopLevel`'s own
  group-atomicity guarantee. Nesting depth or content inside the argument portion changes
  nothing about whether the head is recognized.
- The one case where a nested group genuinely *does* sit in head position — e.g. a
  hypothetical `<<int_x>_something>`, where the very first top-level segment is itself a
  group — is already deliberately excluded, but by a *different*, pre-existing guard: in
  `scanUnrecognizedFunctionHeads` itself (line 622,
  `if (!head || head.includes("<")) continue;`), documented in the code as "purely dynamic
  head, nothing to check." This is correct and requires no change: a function *name* that
  is itself only known at runtime has no literal spelling to validate against any table,
  static or fuzzy, for the same reason `hasLiteral` gates every other wildcard match in this
  file. This is a distinct, already-solved problem from the value-group case (which is about
  a recognized-*shape* reference whose runtime-resolved *value* can't be predicted, not
  about a reference with no literal name to check at all).

**Confirmed: no second, adjacent gap hiding in the same code path.** The value-group
exclusion gate (Q2's fix target) and `isRecognizedFunctionGroup` (function-name
recognition) are two independent checks over the same `head`/`inner` pair, and only the
former needs the fuzzy-match fix — the latter was already correct by construction before
this audit, for structural reasons (head-extraction is nesting-blind by design), not by
coincidence or missing test coverage.

---

## Recommendation for ticket 06

**Scope: one localized change to the value-group exclusion gate at
`referenceValidation.ts:982-1008`. No changes needed to `scanUnrecognizedFunctionHeads`,
`isRecognizedFunctionGroup`, `keyToPattern`, `hasLiteral`, or any other primitive — they are
either already correct (Q4) or already exactly fit for reuse as-is (Q2).**

Concretely, extend the existing gate (currently exact-match only, `.has(lowerHead)` /
`.has(lowerInner)`) with a fuzzy fallback that only engages when `inner` actually contains
an unresolved nested group:

```ts
for (const { fileId, head, inner, range } of templateFunctionOccurrences) {
  const lowerHead = head.toLowerCase();
  const lowerInner = inner.toLowerCase();
  let recognized =
    valueGroupNames.has(lowerHead) ||
    valueGroupNames.has(lowerInner) ||
    DEFAULT_VALUE_GROUP_NAMES.has(lowerHead) ||
    DEFAULT_VALUE_GROUP_NAMES.has(lowerInner);

  // Round5 ticket 05: `inner` can itself contain a nested `<...>` group whose
  // runtime value splices in BEFORE EWP's value-group lookup ever runs
  // (Functions.cs's ResolveFunctions resolves the innermost bracket pair
  // first, splices, and only then re-scans outward — confirmed source
  // research/05, §Q1). The only thing a static scan can ever know about the
  // final looked-up string is inner's literal skeleton around that nested
  // group, so match it the same way the dataUsages dynamic-reference loop
  // above already does: keyToPattern turns each nested group into a `.*`
  // wildcard (already correct for arbitrary nesting depth, per keyToPattern's
  // own balanced-bracket walk), tested against every literal declared name.
  if (!recognized && inner.includes("<") && hasLiteral(inner)) {
    const pattern = keyToPattern(inner);
    for (const vg of valueGroupNames) {
      if (pattern.test(vg)) { recognized = true; break; }
    }
    if (!recognized) {
      for (const vg of DEFAULT_VALUE_GROUP_NAMES) {
        if (pattern.test(vg)) { recognized = true; break; }
      }
    }
  }

  if (recognized) continue;
  problems.push({
    fileId,
    severity: "warning",
    kind: "template-function",
    message: templateFunctionMessage(head, suggestFunctionName(head)),
    range,
  });
}
```

Notes for implementation:

- `inner.includes("<")` is the cheap short-circuit — the fuzzy path only runs for
  occurrences that actually have a nested group; a plain misspelled name
  (`<reqiuredWorldLevel_blackforge>`, no nesting) skips straight to the existing warning,
  so nothing about ordinary typo detection changes.
- Iterate `valueGroupNames`/`DEFAULT_VALUE_GROUP_NAMES` rather than trying to build one
  combined pattern per occurrence and testing it against a joined string — both sets are
  already small (data.yaml value/valueGroup declaration counts, plus 4 hardcoded defaults),
  and this keeps the same "test pattern against each literal candidate" shape the
  `dataUsages` precedent already established, for a reviewer scanning both loops side by
  side.
- No message wording change is required for this fix specifically — `recognized` becoming
  `true` means the occurrence is filtered out before `templateFunctionMessage` is ever
  called, same as the exact-match path today. (The existing `valueGroupHedge` text in
  `templateFunctionMessage`, lines 574-576, already covers the *cross-file* scope gap for
  occurrences that still fall through; this fix reduces how often that fallback message is
  reached, it doesn't need to change what it says.)
- Test cases worth adding for ticket 06/07's follow-up test pass, straight from this audit:
  `<requiredWorldLevel_<prefab>>` against a declared `requiredWorldLevel_blackforge_ext2_vise`-style
  family (single nesting); `<realDayLock_<nameBoss_<int_location=0>>>` against a declared
  `realDayLock_Eikthyr`-style family **with `nameBoss_*` left undeclared** (double nesting,
  confirms the inner `nameBoss_<int_location=0>` occurrence is still correctly flagged on
  its own, per Q3's "one mechanism handles both" finding — it should NOT be silently
  swallowed just because it's nested inside another flagged occurrence); and a negative
  case, a nested-group reference whose literal prefix has a genuine typo
  (`<reqiuredWorldLevel_<prefab>>` against the same declared family) confirming it is still
  flagged, to guard against a future regression that makes the wildcard too permissive.
