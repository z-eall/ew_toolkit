Type: grilling
Status: resolved
Blocked by: 05

## Question

Given ticket 05's source-verified findings on how EWP resolves a nested
`<...>` value-group reference (e.g. `<requiredWorldLevel_<prefab>>`,
`<realDayLock_<nameBoss_<int_location=0>>>`) and its recommendation for
which existing matching primitive to reuse (or new one to add), design and
implement the fix in `referenceValidation.ts`'s value-group exclusion gate
— without regressing anything tickets 01/03 (underscore full-text matching)
or 02/04 (RichText tags) already fixed, and without weakening the
typo-detection Round 4 built (a nested-group reference with NO matching
declared family at all must still be flagged).

Zoom ticket 05 (and its `research/05-...md` findings doc) before starting;
this ticket's shape depends entirely on what that research finds, including
its answer to the `nameBoss` sub-question — that may turn out to be a
second, related fix bundled into this same ticket, or its own follow-up,
depending on what ticket 05 concludes.

## Answer

Implemented ticket 05's recommendation exactly, as a localized extension to
the value-group exclusion gate in `referenceValidation.ts` (no changes
needed elsewhere — `scanUnrecognizedFunctionHeads`, `isRecognizedFunctionGroup`,
`keyToPattern`, and `hasLiteral` were all already correct or already fit for
reuse, per ticket 05's Q2/Q4). A fuzzy fallback now engages only when `inner`
contains an unresolved nested `<...>` group (cheap short-circuit via
`inner.includes("<")`, guarded by `hasLiteral`): builds a wildcard pattern
via the existing `keyToPattern(inner)` and tests it against every declared
`valueGroupNames`/`DEFAULT_VALUE_GROUP_NAMES` entry. Ordinary exact-match
lookups (tickets 01/03's underscore fix) run first and are unaffected;
plain misspelled names with no nesting skip the fuzzy path entirely and hit
the existing warning unchanged.

Verified with all three of ticket 05's recommended test cases plus a
regression pass, before adding permanent tests:
- Single-nesting (`<requiredWorldLevel_<prefab>>`) now resolves against the
  declared family; the sibling `<displayName_<prefab>>` in the same string
  correctly stays flagged (no `displayName_*` family declared).
- Double-nesting (`<realDayLock_<nameBoss_<int_location=0>>>`) resolves
  cleanly when *both* the `realDayLock_*` and `nameBoss_*` families are
  declared — confirming ticket 05's "one mechanism handles both nested
  layers independently" finding, not a special case.
- Same double-nesting example with only `realDayLock_*` declared: the outer
  reference now resolves, but the inner `<nameBoss_<int_location=0>>`
  occurrence — scanned independently, per this file's existing "no
  jump-past-match" design — correctly stays flagged, exactly matching
  ticket 05's explicit warning against silently swallowing it.
- Negative case (`<reqiuredWorldLevel_<prefab>>`, a genuine prefix typo)
  still flags — the wildcard never engages until the literal prefix matches
  character-for-character, so it can't mask a real typo.
- Round 4/5 regression pass: typo detection (`<strink_foo>` → suggests
  `<string...>`), real function recognition, RichText tags, and the
  underscore-name fix (ticket 03) all confirmed unaffected.

Full suite: 278/278 passing (three new permanent tests added to
`referenceValidation.test.ts`, alongside the existing Round 4/5
template-function tests).
