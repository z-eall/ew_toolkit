Type: grilling
Status: resolved
Blocked by: 09

## Question

Given ticket 09's source-verified findings on where/how EWP parses a
`<name=default>` fallback value and which name(s) genuinely support it,
design and implement the fix in `referenceValidation.ts`'s
`isRecognizedFunctionGroup`/`scanUnrecognizedFunctionHeads` — without
regressing anything tickets 01/03 (underscore full-text value-group
matching), 02/04 (RichText tags), 05/06 (prefix/fuzzy value-group matching),
or 07/08 (malformed-reference detection) already fixed, and without
weakening typo detection (an unrecognized name carrying a `=default` suffix
with NO real match must still be flagged).

Zoom ticket 09 (and its `research/09-...md` findings doc) before starting;
this ticket's shape depends entirely on what that research finds — in
particular whether the fix is a narrow one (only `par0`-`par9`-style names)
or needs to apply more broadly across the no-arg name table.

## Answer

Implemented ticket 09's recommendation exactly: one change, in
`isRecognizedFunctionGroup`'s no-arg branch only. A top-level `=` suffix is
now stripped via `splitTopLevel(inner, "=")[0]` (the existing nesting-aware
primitive — not a naive indexOf, since a nested `<...>` group can carry its
own literal `=`) before checking `KNOWN_NO_ARG_NAMES`, matching EWP's own
`TryReplaceFunction`, which strips `=default` off the entire bracket text
unconditionally, before any no-arg/arg-taking dispatch runs at all. Scope is
the whole no-arg table, not just `par` — per ticket 09's Q3, that's what
EWP's source actually does; narrowing to `par` only would have left
`<prefab=fallback>`, `<pid=fallback>`, etc. still falsely flagged. The
arg-taking branch needed no change (already suffix-tolerant via its own
`_`-based head extraction).

**Verified with all 6 of ticket 09's recommended test cases**, now permanent
tests: the real base64 `par2=...` repro is recognized; bare `par2`/`par_2`
remain recognized (no regression on the no-`=` case); `<prefab=fallback>`,
`<pid=fallback>`, `<day=fallback>` confirm the fix isn't `par`-scoped;
`<par_47=fallback>` confirms the untouched arg-taking branch still works;
`<pid_<load_x=default>>` confirms `splitTopLevel` (not naive indexOf) is
actually in effect — the nested group's own `=` doesn't leak into the outer
bracket's default-split, and `pid_X` correctly stays flagged as a genuine
dead end; `<prefeb=fallback>` confirms the fix doesn't over-suppress typos —
stripping the suffix still yields an unrecognized name, still flagged, still
gets a typo suggestion.

**Full regression pass** covering every earlier Round 4/5 fix (typo
detection, RichText tags, WEC/value-group underscore matching, prefix/fuzzy
nested value-group matching, malformed-reference detection) confirmed
unaffected. Typecheck clean. Full suite: 289/289 passing (283 → 289, 6 new
tests). This closes the fifth and last false-negative gap charted on this
map so far — the underscore/function-head-collision residual case (ticket
01's Out of scope note) remains the only known open item.
