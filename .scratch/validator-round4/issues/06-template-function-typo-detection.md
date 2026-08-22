# Design and implement typo/invalid-function-name detection for EWP string templates

Type: grilling
Status: resolved
Blocked by: (none — ticket 05 resolved)
Parent: [Validator Round 4 map](../map.md)

## Question

Scripter's ask: `<string_X>` typo'd as `<strink_X>` (or any other
unrecognized function name, or a recognized function given a value it
doesn't accept) currently passes silently — should error.

This ticket only starts once
[ticket 05](05-string-template-function-source-audit.md)'s findings are in —
its answer determines both whether this is buildable at all (if unrecognized
function names are genuinely indistinguishable from legitimate literal
`<...>` text at parse time, this may not be) and what severity fits (silent
no-op at runtime → warning-with-suggestion; hard runtime failure →
error).

Grill toward a concrete answer once research lands:

1. **Detection mechanism**: adapt `referenceValidation.ts`'s existing
   `<...>` group-scanning primitives (`findGroupEnd`, `walkKeySegments`,
   `KEY_HEAD_RE`-style head matching) to recognize the *full* function-name
   set from ticket 05, not just `save`/`save++`/`save--`/`load`/`clear`.
   Reuse rather than re-implement the balanced-bracket scanning — this is
   exactly the kind of duplication the hub-wide standing rule warns against.
2. **Typo-distance design**: when a `<head_...>` doesn't match any known
   function name, decide the matching rule (edit-distance threshold?
   common-typo patterns like adjacent-key swaps? exact near-miss list from
   ticket 05?) — mirror `keysCompatible`'s "likely match" precedent in
   spirit, but note this is a different comparison (function name vs.
   function name, not saved-key vs. saved-key) so the algorithm doesn't
   need to be the same code, just the same rigor.
3. **False-positive risk**: literal `<...>` text that isn't a function call
   at all (the codebase already treats unbalanced brackets as "leave for
   structural pre-check," see `scanKeyOccurrences`'s comment at
   `referenceValidation.ts` ~236) — confirm the new check only fires on
   balanced `<head_...>` groups whose head isn't in the known-function set,
   never on freeform bracketed text that was never meant to be a function
   call.
4. **Severity + message**, per the hub-wide message-quality checklist
   ([EW Toolkit map](../../ew_toolkit/map.md) Notes): name the offending
   function head, suggest the likely intended one when confidence is high,
   and say what happens at runtime today (silent no-op vs. error) per
   ticket 05's findings — don't imply a fix will definitely change behavior
   if research shows it's ambiguous.
5. **"Invalid value" half of the ask** (a recognized function given a value
   it rejects): only pursue if ticket 05 found this is statically checkable
   without game-data access; otherwise record why it's deferred (same
   reasoning class as prefab-name/global-key checks being out of scope for
   [Cross-file reference](../../ew_toolkit/CONTEXT.md) validation).
6. **Duplication/clash check**: confirm no overlap with the existing
   `<save/load/clear>` custom-key logic (different function heads
   entirely) or with `formatLint.ts`'s stray-colon checks.

Implement once settled — this map's grilling tickets carry execution.

## Answer

Built on [ticket 05](../research/05-string-template-function-source-audit.md)'s source-verified
catalog (~110 built-in names across 4 dispatch tables, fetched fresh from `Functions.cs`/
`ObjectFunctions.cs` 2026-08-22).

1. **Detection mechanism**: reused `findGroupEnd`/`splitTopLevel` exactly as the ticket asked,
   rather than re-implementing balanced-bracket scanning. `scanUnrecognizedFunctionHeads()` mirrors
   `scanKeyOccurrences()`'s shape (char-by-char scan, no jump-past-match so nested groups still get
   their own pass) but generalizes the recognized-head set from save/load/clear to the full catalog,
   and mirrors the *real dispatch order* from ticket 05 §1a: the whole bracket contents are checked
   against the no-arg tables first, and only on a miss is the first top-level `_` split off and the
   head checked against the argument-taking tables (`isRecognizedFunctionGroup`). Getting this order
   right matters for `<par>` vs `<par_X>` (§2 below) — checking split-first would have missed that
   `par` is valid bare too.
2. **Typo-distance design**: unweighted Levenshtein, edit-distance ≤ 2, only when exactly one known
   name is at that minimum distance (a tie yields no suggestion rather than a coin-flip guess).
   Separately, and with full certainty rather than a distance heuristic: a head that matches a known
   name case-insensitively but not case-sensitively is reported as a **case mismatch**, not a fuzzy
   typo — source-confirmed in ticket 05 §1c that dispatch is plain case-sensitive `string switch`
   with no `.ToLowerInvariant()`/`OrdinalIgnoreCase` anywhere in the four tables, so `<String_x>` is
   provably, not probably, broken.
3. **False-positive risk**: only balanced `<...>` groups are scanned (unbalanced brackets are left
   for structural pre-check, matching `scanKeyOccurrences`'s existing rule), and a head built
   entirely from a nested dynamic group (e.g. `<<par_1>_foo>`) is skipped — no literal spelling
   exists there to check, same reasoning as `hasLiteral` elsewhere in this file. The one *residual*
   false-positive class, disclosed rather than silently accepted: EWP's own value-group fallback
   (ticket 05 §2 step 3) means a `<...>` head can validly resolve as a value-group reference instead
   of a function call. Group names *defined in the loaded batch* (`value:`/`valueGroup:` entries)
   are tracked and excluded (case-insensitively, matching `DataLoading.cs`'s own lowercased-hash
   lookup); EWP's four hardcoded default groups (`wearntear`/`humanoid`/`creature`/`structure`,
   `DataLoading.cs`'s `LoadDefaultValueGroups`) are excluded unconditionally. What remains
   unavoidably out of reach: `material_*`/`itemtype_*`/live-component-name value groups, built at
   runtime from a `ZNetScene` prefab scan with no fixed, enumerable name list — same class of
   runtime-only dependency ticket 04's research already ruled out of scope for prefab/component-field
   checking, now confirmed to apply to value-group *names* too, not just function arguments.
4. **Severity + message**: **warning**, per the ticket's own framework (ticket 05 §2 confirmed this
   is a silent no-op, not a hard runtime failure — never a crash, but never doing anything either).
   Message names the offending head, suggests the likely-intended name when confident (case-mismatch
   stated with certainty; edit-distance match hedged as "probably a typo of"; no suggestion at all
   when nothing is close), and states the real runtime consequence in plain terms ("left as literal
   text — no error, and no function actually runs") rather than implying EWP will show any in-game
   error, since ticket 05 confirmed zero `Log.*` calls exist anywhere in this dispatch path.
5. **"Invalid value" half**: **deferred, not implemented**, per ticket 05 §3's verdict — the
   dominant case (ZDO/component/inventory/player-state-dependent arguments) is runtime-state-bound
   and not statically checkable at all (same reasoning class as prefab-name/component-field checks
   being out of scope), and the pure-computation functions degrade silently to `defaultValue`/empty
   on a bad argument rather than erroring, so there's no useful lint to build there either. The one
   narrow exception ticket 05 §3c found — `<iter_OP_...>`/`<iter2_OP_...>`'s `OP` token being drawn
   from a small, source-enumerable reducer-name set — is deliberately left for a future ticket: it's
   a genuine, separate static-check opportunity (verify `OP` is itself one of the recognized
   variadic-numeric-list functions), but ticket 05 flagged its own confidence there as only Medium
   (mechanism confirmed by code-reading, no observed worked example), and folding it into this
   ticket's already-broad function-name-typo scope would blur two different kinds of check into one
   PR. Recorded here as a graduation candidate, not silently dropped.
6. **Duplication/clash check**: no overlap with the existing `<save/load/clear>` custom-key
   definition/usage logic — those names are simply members of the recognized-head set here, so a
   correctly-spelled `<save_X_Y>` is never touched by this check, and a *misspelled* one (e.g.
   `<svae_x>`) is now caught by this check even though it was invisible to the custom-key scan
   (which only recognizes the four exact heads via `KEY_HEAD_RE`) — complementary, not duplicated.
   No overlap with `formatLint.ts`'s stray-colon check either (YAML key syntax, unrelated to
   `<...>` template contents). Confirmed against the
   [Diagnosis Arbitration map](../../diagnosis-arbitration/map.md)'s ownership rule too:
   `shapeMismatchDiagnosis.ts` owns *per-entry structural shape confusion* (one YAML item's fields
   don't match any expected shape, resolved via ajv-suppression); this check is *batch-wide
   definition/usage matching* against a name catalog — the same mechanism class as the existing
   custom-saved-key orphan check that already lives in `referenceValidation.ts`, not a new shape
   confusion. Belongs here, not there.

**Known limitation worth flagging explicitly** (not found during ticket 05's research, found while
implementing this one): `docs/functions.md` documents `<none>` ("Empty or lack of value when using
filters") but it does not appear in `Functions.cs`'s or `ObjectFunctions.cs`'s dispatch switches —
grepped across `Conditions.cs`, `Helper.cs`, `InfoSelector.cs`, `Parse.cs`, `DataHelper.cs`,
`PrefabHelper.cs` too, with no hit. It's included in the recognized-name set on the strength of the
official docs rather than a pinned source line (most likely handled by filter-comparison code this
research pass didn't fetch) — a documented, scripter-facing keyword should never be flagged as a
typo even without a byte-exact citation for it.

**Implementation**: `KNOWN_NO_ARG_NAMES`/`KNOWN_ARG_HEADS` (built from ticket 05's four tables),
`isRecognizedFunctionGroup`, `levenshtein`/`suggestFunctionName`, `templateFunctionMessage`, and
`scanUnrecognizedFunctionHeads` added to `referenceValidation.ts`; wired into
`runReferenceValidation()` as a new `templateFunctionOccurrences` collection pass (comment-blind,
via `stripLineComments`, matching the custom-key scan) filtered against batch-defined + default
value-group names before emitting. New `FileProblem.kind: "template-function"`, mapped into the
existing `REFERENCE_PROBLEM_CATEGORY` in `fileManager.ts`'s `REFERENCE_BRANCH_LABEL` — same
"reference checked against a known name catalog" family as the data.yaml and custom-key checks, no
new category needed. Tests cover: typo detection + suggestion, recognized bare/argument/object-context
names not flagged, case-mismatch reported distinctly, batch-defined and hardcoded-default value
groups excluded, comment-blindness, purely-dynamic heads skipped, and no-suggestion-when-ambiguous.
`npx vitest run` (254/254 passed) and `npx tsc --noEmit` (clean) both verified after the change.

Files: [referenceValidation.ts](../../../ewp_validator/src/referenceValidation.ts),
[referenceValidation.test.ts](../../../ewp_validator/src/referenceValidation.test.ts),
[fileManager.ts](../../../ewp_validator/src/fileManager.ts).
