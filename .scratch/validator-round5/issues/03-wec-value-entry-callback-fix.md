Type: grilling
Status: resolved
Blocked by: 01

## Question

Given ticket 01's source-verified findings on WEC's actual "value entry"
declaration shape(s) and the concrete gap between those shapes and
`referenceValidation.ts`'s current `valueGroupNames` parsing (~lines
754-759, ~909-911), design and implement the fix that closes it — without
regressing the single-line case Round 4 already handles correctly.

Zoom ticket 01 (and its `research/01-...md` findings doc) for the actual
gap before starting; this ticket's shape depends entirely on what that
research finds; if it finds no real gap beyond the already-fixed single-line
case, record that conclusion here and close as out of scope rather than
inventing a fix for a problem that turned out not to exist.

## Answer

Implemented ticket 01's recommendation in `referenceValidation.ts`:

1. `UnrecognizedFunctionOccurrence` (and `templateFunctionOccurrences`) now
   carries the full, unsplit `inner` bracket text alongside the
   underscore-truncated `head`. `scanUnrecognizedFunctionHeads` already
   computed `inner` locally — just started returning it too.
2. The final exclusion gate now checks *both* `head` and `inner` (lowercased)
   against `valueGroupNames`/`DEFAULT_VALUE_GROUP_NAMES` before flagging.
   `isRecognizedFunctionGroup` was deliberately left untouched — it correctly
   stays head-based, since that's what EWP's own function dispatch
   (`GetFunction`'s first-`_` split) actually keys on; only the value-group
   fallback check needed the full text, matching `ResolveValue`'s real
   runtime lookup key.
3. Secondary fix from ticket 01: `templateFunctionMessage`'s no-suggestion
   branch now hedges that the reference could be a `value:`/`valueGroup:`
   entry declared in a file outside the validated batch, matching the
   existing custom-key/poke-parameter messages' wording precedent — it no
   longer reads as a flat, unqualified "you have a typo."

**Verified no regression to Round 4's `<function>` typo detection** — the
concern the invocation named explicitly. A no-underscore value-group name
has `inner === head`, so the added `inner` checks are strictly additive and
never change behavior for anything Round 4 already got right. Confirmed by:
running the full suite (273/273 passing, up from 272 — one new permanent
test added) and by a throwaway repro covering, side by side: (a) the new
underscored-name case now passes clean, (b) a real EWP function typo
(`<strink_foo>`) still gets flagged with its "probably a typo of
`<string...>`" suggestion, (c) a genuinely unknown/undeclared name still
gets flagged (now with the added cross-batch hedge in its message), and (d)
real EWP function calls (`<save_...>`, `<load_...=...>`, `<string_par_1>`)
are still recognized with zero false positives. Added a permanent test:
"does not flag a value/valueGroup entry name that contains an underscore
(round 5 ticket 03)" in `referenceValidation.test.ts`, alongside the
existing Round 4 value-group tests it sits next to.

The residual double-failure edge case from ticket 01's research (an
undeclared, underscored, value-group-shaped name whose first segment
happens to collide with a real function head) remains out of scope, as
already recorded on the map.
