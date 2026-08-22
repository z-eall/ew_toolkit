Type: grilling
Status: resolved
Blocked by: 02

## Question

Given ticket 02's source-verified findings on Valheim's RichText tag set
and shape, design and implement recognition for these tags in
`referenceValidation.ts`'s `scanUnrecognizedFunctionHeads()` /
`runReferenceValidation()` template-function check, so `<br>`, `<#RRGGBB>`,
`<size=N>`, `</color>`, etc. are excluded from the "Unknown EWP function
name" warning — confirmed against the
[Diagnosis Arbitration map](../diagnosis-arbitration/map.md)'s
anti-duplication contract before landing, per this map's Notes.

Zoom ticket 02 (and its `research/02-...md` findings doc) for the confirmed
tag set/shape rule and its implementation recommendation before starting.

## Answer

Implemented ticket 02's code sketch directly in `referenceValidation.ts`: a
new `isRichTextTag(inner)` guard, checked first in
`scanUnrecognizedFunctionHeads()`'s loop (before `isRecognizedFunctionGroup`),
kept as a separate skip rather than merged into the existing EWP name tables
— richtext tags are categorically not EWP functions, and merging them would
have incorrectly surfaced richtext tag names in `suggestFunctionName`'s "did
you mean" candidate pool for real EWP typos.

Four branches, matching the research's shape analysis exactly:
- `/...` closing tags — pure shape (`inner.startsWith("/")`).
- `#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA` hex color shorthand — pure shape (regex).
- `name=value` attribute tags — bounded 21-name allow-list (`RICHTEXT_ATTRIBUTE_TAG_NAMES`),
  checked only when `=` appears before any `_`, so a typo'd EWP call like
  `<load=foo>` still falls through and gets flagged.
- Bare pair/self-closing tags — bounded 15-name allow-list
  (`RICHTEXT_BARE_TAG_NAMES`), deliberately omitting `i` since TMP's `<i>`
  already resolves via EWP's own `i` object function.

**Confirmed against the Diagnosis Arbitration map's anti-duplication
contract** before landing (per this map's Notes): this is a whole-document
text-scan gate on an existing batch-wide `referenceValidation.ts` check
(same mechanism class as Round 4's poke-parameter matching, which that map's
Decisions-so-far already ruled out of its own catalog for the same reason)
— not a per-entry shape confusion, so it belongs alongside the existing
template-function check in `referenceValidation.ts`, not as a new
`shapeMismatchDiagnosis.ts` row.

Verified: typecheck clean; full suite 275/275 (two new permanent tests
added). Repro confirmed the user's exact original example
(`<#ddd>`/`</b>`/`<br>`/`<#00ff00>`/`</color>`/`<#fff000>`/`<size=15>`) now
produces zero `template-function` problems, plus wider coverage (`<b>`,
`<u>`, `<align=center>`, etc.). Also confirmed the allow-list boundary holds:
`<load=foo>` (a real argument-separator typo of `<load_foo>`) is still
correctly flagged, since `load` isn't one of the fixed TMP attribute-tag
names — the contract this round's research called out explicitly. Round 4's
typo detection (`<strink_foo>` -> suggests `<string...>`) and real function
recognition (`<save_...>`, `<load_...=...>`, `<string_par_1>`) confirmed
unaffected in the same repro pass.

Added two permanent tests to `referenceValidation.test.ts`, alongside the
existing Round 4 template-function tests: "does not flag Valheim RichText
tags (round 5 ticket 04)" and "still flags an EWP typo shaped like a
RichText attribute tag (`<load=foo>`)".

This closes the last open ticket on Validator Round 5 — both scripter-
reported false negatives (WEC value-entry underscore callback, RichText
tags) are now implemented, tested, and recorded.
