# Validator Round 5 — Value-Entry Callback & RichText False Negatives — Map

Label: wayfinder:map

## Destination

Four scripter-reported false-negative gaps in `ewp_validator`'s `<...>`
string-template function validation (the `<function>` check built in
[Validator Round 4](../validator-round4/map.md) ticket 06) are closed:

1. A WEC (`world_edit_commands`) **value entry** — declared as
   `- value: name, value` in a data file and read back with `<name>` in a
   script — is never flagged as an unknown EWP function name, for every
   shape WEC's own data rules actually allow (not just the single-line
   `name, value` case Round 4 already happens to cover).
2. A RichText markup tag used inside a `value:` (or other string) body —
   `<br>`, `<#RRGGBB>` / `<#RGB>` / named-color tags, `<size=N>`,
   `</color>`, `</b>`, `</i>`, and whatever else Valheim's own chat/UI text
   actually supports — is recognized and never flagged as an unknown EWP
   function name, even though it isn't an EWP function at all.
3. A value-group **name family** declared with a shared literal prefix and a
   *runtime-dynamic* suffix (e.g. `requiredWorldLevel_blackforge`,
   `requiredWorldLevel_blackforge_ext1`, … all declared, then referenced as
   `<requiredWorldLevel_<prefab>>` — the actual suffix only known once
   `<prefab>` resolves at runtime) is recognized by prefix/fuzzy match
   against the declared family, instead of being flagged as unknown just
   because the literal suffix can't be known statically. Includes
   multi-layer nesting (`<realDayLock_<nameBoss_<int_location=0>>>`).
4. A malformed nested `<...>` reference — an extra bracket or an extra
   underscore that would make EWP's own parser resolve the reference
   differently than the scripter intended, silently no-op'ing instead of
   erroring — is caught and flagged as a **warning**, distinct from "unknown
   function name" (the reference may use recognizable names throughout; the
   bug is in how they're nested/joined, not in any single name).
5. A recognized no-arg parameter name carrying a `=default` fallback value
   (e.g. `<par2=H4sIAAAA...>`, the digit-suffixed `parN` form with a
   base64-looking default) is recognized the same way `<par2>` bare already
   is — instead of being flagged as unknown just because the existing
   no-arg check only matches an exact, whole-bracket string with no `=`
   suffix allowed. Includes confirming, from source, whether `=default` is
   a general mechanism available to any function (no-arg and argument-taking
   alike) or scoped narrower than that.

Reaching the destination means: all five gaps are either implemented and
live-verified, or — where research concludes the existing behavior is
already correct for a sub-case — that conclusion is recorded with its
reasoning, same bar as every other round map in this repo. Items 3-5 were
reported after items 1-2 were already implemented and verified in the live
preview; per explicit instruction they're added to this same map rather
than a new round, since they're the same `<function>` check and the same
scripter's real-file follow-up findings.

## Notes

- Domain: `ewp_validator` validation logic, specifically
  `referenceValidation.ts`'s `scanUnrecognizedFunctionHeads()` /
  `runReferenceValidation()` template-function check (built in
  [Validator Round 4](../validator-round4/map.md) ticket 06, source catalog
  in that round's [research/05](../validator-round4/research/05-string-template-function-source-audit.md)).
  Sibling to Round 4 (previous batch on this exact check, complete) and
  subject to the same standing rules from the
  [EW Toolkit map](../ew_toolkit/map.md) (hub-wide message-quality
  checklist, source-verify-first, $0/no-backend, low-maintenance) and the
  [Diagnosis Arbitration map](../diagnosis-arbitration/map.md)'s
  anti-duplication contract for any new diagnosis row.
- **Grounded at chart time** (2026-08-22), repro run directly against
  `referenceValidation.ts`'s current `runReferenceValidation()`:
  - The user's own minimal example for gap 1 (`- value: maxRangeToCity, 100`
    then `<maxRangeToCity>` in a `commands:` string) produces **zero**
    problems already — Round 4's existing `valueGroupNames` logic (lines
    ~754-759, ~909-911 of `referenceValidation.ts`) already registers a
    `value: name, ...` entry's name and excludes matching `<...>` heads from
    the unrecognized-function check. So the false negative the scripter is
    hitting in real files is **not** this exact shape — ticket 01 below
    exists to find the actual gap (multi-value/multi-line declarations?
    reference in a file where the declaration isn't in the loaded batch?
    some other WEC value-entry shape the README documents that this repo's
    code doesn't?), not to re-implement something that already works.
  - The user's example for gap 2 (RichText tags inside a `value:` body)
    reproduces cleanly and completely as given: `<#ddd>`, `</b>`, `<br>`,
    `<#00ff00>`, `</color>`, `<#fff000>`, `<size=15>` are all flagged as
    `template-function` warnings today. This gap is real and exactly as
    described.
- **Grounded again at follow-up chart time** (2026-08-22, after tickets
  01-04 landed), repro run directly against the post-ticket-04 code:
  - Gap 3's `requiredWorldLevel_<prefab>` example flags `<requiredWorldLevel...>`
    (and, separately in the same repro, `<displayName...>` from the sibling
    `<displayName_<prefab>>` reference in the same string) — confirmed real.
    The user's own pasted "reported message" for this example was actually
    an unrelated duplicate-`name:` warning from a different line of their
    real file, not the function-name warning — the *actual* false negative
    for this example is the `template-function` warning above, reproduced
    directly against a minimal file built from their two snippets.
  - Gap 3's multi-layer `<realDayLock_<nameBoss_<int_location=0>>>` example
    reproduces exactly as reported: `<realDayLock...>` is flagged with the
    message the user quoted, verbatim. The nested `<nameBoss_<int_location=0>>`
    group *also* gets its own separate flag today (scanUnrecognizedFunctionHeads
    doesn't jump past a match, so a nested group inside an already-unrecognized
    outer one still gets scanned) — `nameBoss` is not a declared value-group
    name and not a known EWP function in this repo's catalog either, so
    whether it's a real third thing (another value-group family with its own
    prefix pattern? a typo?) or just an artifact of the minimal repro not
    including its own declaration is exactly the kind of question ticket 05
    below needs to resolve alongside the prefix-matching design itself.
  - Gap 4 (malformed nested-bracket/underscore detection) has no existing
    code path at all — `scanUnrecognizedFunctionHeads`/`findGroupEnd`/
    `splitTopLevel` only reason about *balanced* brackets and top-level
    underscore splits; nothing today distinguishes "well-formed but unknown
    name" from "malformed in a way that changes EWP's own parse," so there's
    no false-negative repro to run yet — ticket 07 has to first establish,
    from EWP's own bracket/underscore parsing source, which malformed shapes
    are even distinguishable from a valid nested reference at static-analysis
    time, since ticket 05's own research (source-verified in round4 and
    round5-01 already) established that EWP resolves nested `<...>` groups
    inside-out before any split happens — an extra bracket or underscore
    inside an *inner* group may be syntactically invisible from the outside
    by the time the outer group's own head/split is evaluated.
- **Grounded a third time at follow-up chart time** (2026-08-22, after
  tickets 05-08 landed), repro run directly against the post-ticket-08 code:
  `<par2=H4sIAAAAAAAACu3YsQ2AMBADwA8TsBGrweaIMgrNSxRGuuviyu8yo6q2Wl37SwgAAADwtdYnxJif5yGYg2pK6R0bVFdK8b/sZbC2lOopexhkldL+o3MeYXUAAACg6wb32BzyoicAAA==>`
  is flagged as unknown; bare `<par2>` and underscore-form `<par_2>` are both
  already recognized. Root cause visible from the code without research:
  `isRecognizedFunctionGroup`'s no-arg branch is `KNOWN_NO_ARG_NAMES.has(inner)`
  — an *exact whole-string* match, so any `=...` suffix on a no-arg name (not
  just `par2`, any of the ~30 no-arg names) fails it, while the arg-taking
  branch already tolerates a suffix via its `_`-split. What still needs
  research, per the effort's own source-verify-first standing rule: whether
  `=default` is EWP's genuine, general fallback-value syntax across the board
  (only directly confirmed so far for `load`'s `<load_key=default>` shape,
  scoped inside the *argument* portion of an arg-taking call) or something
  narrower — ticket 09 exists to pin this down before ticket 10 designs the
  fix, so a guessed "just also allow `=` on no-arg names" doesn't
  under- or over-shoot what EWP's source actually does.
- Standing preference carried from Round 4: source-verify against the real
  engine/mod source before writing any new recognition logic — a guessed
  allow-list is exactly the kind of thing that creates a *new* false-negative
  or false-positive class later. Both tickets below are `research` tickets
  for this reason, each blocking an implementation ticket, mirroring Round
  4's ticket 05 -> ticket 06 shape.
- This map's tickets carry execution for `task`-typed tickets and for
  `grilling`-typed tickets once the decision is settled, matching Round 4's
  convention.
- Skills: `/research` sub-agent for tickets 01, 02, 05, 07; `/grilling` +
  `/domain-modeling` for the implementation tickets if a research leg
  surfaces a genuine design choice (severity, message wording, scope
  boundary) rather than a mechanical "add these names to the allow-list" fix.
- Tickets 03/04 already source-verified and reused the wildcard/prefix
  matching machinery this file already has for custom saved keys
  (`keysCompatible`/`keyToPattern`/`keyToSubject`/`hasLiteral`,
  `walkKeySegments` treating each `<...>` group as a wildcard token) and for
  dynamic data-reference matching (~line 810's `/[<>]/.test(name)` branch).
  Ticket 05 should check whether gap 3's prefix/fuzzy value-group matching
  can reuse those same primitives directly rather than inventing new ones —
  strong prior art in this exact file for "part of the name is only known at
  runtime, match the declared skeleton instead."

## Decisions so far

- [Source-verify WEC's value-entry declaration/callback rules for the `<function>` check](issues/01-wec-value-entry-callback-source-audit.md) — the ticket's own declaration-side comma-split hypothesis was wrong (confirmed correct against WEC's `DataLoading.cs`); WEC "value entries" and EWP "value groups" are the exact same runtime mechanism (one shared `DataLoading.ValueGroups` dictionary). The real bug is on the *reference* side: `scanUnrecognizedFunctionHeads` checks the underscore-truncated `head` against `valueGroupNames`, but EWP's own runtime fallback hashes the full unsplit bracket text — so any value-group name containing an underscore (e.g. `level_multiplier`) resolves fine at runtime but is falsely flagged. The chart-time repro (`maxRangeToCity`, no underscore) missed this by accident. Also surfaced a secondary wording gap (no cross-file-scope hedge, unlike the custom-key/poke messages) and an explicitly out-of-scope residual edge case (an undeclared underscored name colliding with a real function head). Full findings + worked example: [research/01-wec-value-entry-callback-source-audit.md](research/01-wec-value-entry-callback-source-audit.md). Unblocks [ticket 03](issues/03-wec-value-entry-callback-fix.md).
- [Source-verify Valheim's RichText tag set for the `<function>` check](issues/02-valheim-richtext-tag-source-audit.md) — Valheim's chat/UI text is stock unmodified TextMeshPro (no Valheim-specific tag vocabulary, and no game-source repo under `Valheim-Modding` to check against); TMP's 33-tag table plus its `<#RGB>`/`<#RRGGBBAA>` hex shorthand is the real set. Closing tags and hex-color shorthand are recognized by pure shape (zero collision risk); `name=value` attribute tags and bare pair tags each need a short bounded allow-list (21 and 15 names) rather than open shape, to avoid silently swallowing a real EWP typo like `<load=foo>`. One resolved collision: TMP's `<i>` is already harmlessly recognized today via EWP's own `i` object function. Full findings + code sketch: [research/02-valheim-richtext-tag-source-audit.md](research/02-valheim-richtext-tag-source-audit.md). Unblocks [ticket 04](issues/04-valheim-richtext-tag-fix.md).
- [Fix the WEC value-entry callback false positive for underscored names](issues/03-wec-value-entry-callback-fix.md) — `scanUnrecognizedFunctionHeads` now carries the full unsplit bracket text alongside the underscore-truncated `head`, and the value-group exclusion gate checks both (matching EWP's own `ResolveValue` runtime lookup key, which is never truncated). `isRecognizedFunctionGroup` deliberately left head-based — that's correctly what EWP's function dispatch keys on. Also hedged `templateFunctionMessage`'s no-suggestion wording to mention the cross-batch value-group possibility, matching the custom-key/poke message precedent. No-underscore names are unaffected (`inner === head`) — confirmed no regression to Round 4's typo detection via the full suite (273/273, one new permanent test) plus a side-by-side repro of the typo/unknown-name/real-function cases. Full resolution detail: [issues/03-wec-value-entry-callback-fix.md](issues/03-wec-value-entry-callback-fix.md#answer).
- [Add recognition for Valheim RichText tags to the `<function>` check](issues/04-valheim-richtext-tag-fix.md) — new `isRichTextTag()` guard checked first in `scanUnrecognizedFunctionHeads()`, kept as a separate skip (not merged into the EWP name tables, so richtext names never pollute typo suggestions): closing tags and hex-color shorthand recognized by pure shape, `name=value` attribute tags and bare pair tags recognized via the two bounded allow-lists from ticket 02's research. Confirmed against the [Diagnosis Arbitration map](../diagnosis-arbitration/map.md)'s anti-duplication contract — same batch-wide-scan mechanism class as Round 4's poke-parameter matching, already ruled out of that catalog. Verified: full suite 275/275 (two new permanent tests), the user's exact original example now produces zero problems, and the allow-list boundary correctly still flags `<load=foo>` (a real argument-separator typo) rather than silently swallowing it. Full resolution detail: [issues/04-valheim-richtext-tag-fix.md](issues/04-valheim-richtext-tag-fix.md#answer).
- [Source-verify prefix/fuzzy value-group matching for nested `<...>` references](issues/05-prefix-fuzzy-value-group-matching-source-audit.md) — confirmed from `Functions.cs`'s `ResolveFunctions`: EWP always fully collapses an inner `<...>` group to its runtime value before the outer group's value-group lookup runs (one innermost-pair-at-a-time splice-and-rewind, not recursive descent), so a static scan can only ever know a reference's literal skeleton around each nested group — exactly what `keyToPattern` (already built and already reused once for this same "dynamic reference" shape) produces with zero modification, regardless of nesting depth. `nameBoss` is not a real EWP function — a second, undeclared-in-the-snippet value-group family, handled by the same fix with no special-casing. Confirmed no adjacent gap in function-argument position (`splitTopLevel` already treats nested groups as opaque). Full findings + code sketch for the exclusion-gate extension: [research/05-prefix-fuzzy-value-group-matching-source-audit.md](research/05-prefix-fuzzy-value-group-matching-source-audit.md). Unblocks [ticket 06](issues/06-prefix-fuzzy-value-group-matching-fix.md).
- [Fix prefix/fuzzy value-group matching for nested `<...>` references](issues/06-prefix-fuzzy-value-group-matching-fix.md) — localized extension to the value-group exclusion gate: a fuzzy fallback (only engaged when `inner` contains an unresolved nested group) builds a `keyToPattern(inner)` wildcard and tests it against every declared value-group name, reusing existing primitives with no new matching code. Verified against all three of ticket 05's recommended cases: single-nesting resolves while a sibling undeclared family still flags; double-nesting resolves only when *both* nested families are declared, with the inner occurrence correctly staying flagged on its own when only the outer family is declared; a genuine prefix typo (`<reqiuredWorldLevel_<prefab>>`) still flags, confirming the wildcard can't mask a real typo. Full suite 278/278 (three new permanent tests). Full resolution detail: [issues/06-prefix-fuzzy-value-group-matching-fix.md](issues/06-prefix-fuzzy-value-group-matching-fix.md#answer).
- [Source-verify malformed nested-function detection (extra bracket/underscore)](issues/07-malformed-nested-function-source-audit.md) — **corrects this ticket's own starting assumption**: the "leave for structural pre-check" comments across `referenceValidation.ts` describe a check that doesn't exist — `structuralPrecheck.ts`/`formatLint.ts` do zero bracket-balance checking on `<`/`>` in string content, so every unbalanced-bracket reference is invisible to every diagnostic in this repo today. Two hand-traced worked examples against `Functions.cs`'s real dispatch (`Parse.Kvp`'s naive first-`_`-occurrence split, `ResolveFunctions`'s innermost-first splice-and-rewind) confirmed real silent failure modes: a doubled `_` before a nested group corrupts the *saved value* (`"_3"` instead of `"3"`), and a redundant matched double-wrapper leaves stray `<`/`>` characters in otherwise-correct output. A real, narrower-than-"all malformations" subset is confidently detectable — surfacing `findGroupEnd`'s already-discarded `-1` signal, and a narrowly-scoped doubled-underscore-before-nesting heuristic — with a redundant-double-wrapper check flagged as optional/lower-priority pending a decorative-text false-positive gate. Full findings + concrete recommendation: [research/07-malformed-nested-function-source-audit.md](research/07-malformed-nested-function-source-audit.md). Unblocks [ticket 08](issues/08-malformed-nested-function-fix.md).
- [Fix malformed nested-function detection (extra bracket/underscore)](issues/08-malformed-nested-function-fix.md) — new `kind: "malformed-reference"`/`warning` diagnosis implementing ticket 07's two high-confidence recommendations only: doubled `_` immediately before a nested group in a save/load/clear key template (narrowly scoped — a legitimate literal `__` with no adjacent nesting stays unflagged), and surfacing `findGroupEnd`'s previously-discarded unbalanced-bracket signal (gated on a plausible reference-start character so a lone `<` in freeform comparison text like "Day < 5" stays unflagged). The optional redundant-double-wrapper check was deliberately skipped per that research's own decorative-text false-positive caveat. Also shortened `templateFunctionMessage`'s wording mid-session (same information, fewer words). Full suite 283/283 (5 new permanent tests), Round 4/5 regression pass unaffected. Full resolution detail: [issues/08-malformed-nested-function-fix.md](issues/08-malformed-nested-function-fix.md#answer).
- [Source-verify EWP's `=default` fallback-value syntax](issues/09-default-value-syntax-source-audit.md) — confirmed from `TryReplaceFunction` (`Functions.cs:89-104`): the `=`-split is unconditional and runs on the *entire* bracket text before any no-arg/arg-taking dispatch even starts, so every no-arg name syntactically tolerates a `=default` suffix, not just `par0`-`par9` — those are just the only names that actually *use* the value (via `GetArg`); every other no-arg name parses it and silently discards it. `par2` (hardcoded no-arg case label) and `par_2` (arg-taking, runtime-parsed index) are confirmed genuinely distinct dispatch routes that happen to converge on the same underlying helper. Full findings + worked traces: [research/09-default-value-syntax-source-audit.md](research/09-default-value-syntax-source-audit.md). Unblocks [ticket 10](issues/10-default-value-syntax-fix.md).
- [Fix the `=default` false negative on no-arg function names](issues/10-default-value-syntax-fix.md) — one change in `isRecognizedFunctionGroup`'s no-arg branch: strip a top-level `=` suffix via `splitTopLevel(inner, "=")[0]` (nesting-aware, matching EWP's own unconditional strip) before checking `KNOWN_NO_ARG_NAMES`, scoped to the whole no-arg table per ticket 09's findings rather than just `par`. Arg-taking branch untouched (already suffix-tolerant). Verified with all 6 of ticket 09's recommended cases as new permanent tests, plus a full Round 4/5 regression pass. Full suite 289/289 (6 new tests). Full resolution detail: [issues/10-default-value-syntax-fix.md](issues/10-default-value-syntax-fix.md#answer).

## Not yet specified

(none — every item the scripter raised this round, including both follow-up
waves, now has a resolved ticket; all five destination items are closed)

## Out of scope

- An undeclared, underscored, value-group-shaped `<...>` reference whose
  first segment happens to collide with a real EWP function head (e.g. a
  typo'd `<max_something>` with no `value: max_something` anywhere) — surfaced
  by [ticket 01](issues/01-wec-value-entry-callback-source-audit.md)'s
  research as a real but narrower, speculative residual gap distinct from
  this round's actual scripter-reported false positive. Deferred to a future
  ticket if it's ever actually hit, not bundled into
  [ticket 03](issues/03-wec-value-entry-callback-fix.md).
