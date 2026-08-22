Type: research
Status: resolved

## Question

Source-verify EWP's `<name=default>` fallback-value syntax — which function
shapes it applies to (no-arg names like `par2`? argument-taking heads only?
both?), and exactly how the default value is parsed out — well enough to fix
`ewp_validator`'s false-negative on `<par2=...>` (and any other no-arg name
carrying a `=default` suffix) without guessing at a mechanism broader or
narrower than what EWP's source actually implements.

### What's already confirmed (don't re-derive)

- Chart-time repro (2026-08-22) confirmed the false negative directly from
  the current code, no research needed to reproduce it:
  `<par2=H4sIAAAAAAAACu3YsQ2AMBADwA8TsBGrweaIMgrNSxRGuuviyu8yo6q2Wl37SwgAAADwtdYnxJif5yGYg2pK6R0bVFdK8b/sZbC2lOopexhkldL+o3MeYXUAAACg6wb32BzyoicAAA==>`
  (the scripter's real example — a `data: bytes, TCData, <par2=...>` field)
  is flagged as unknown; `<par2>` bare and `<par_2>` (the underscore,
  argument-taking form) are both already correctly recognized today.
- Root cause is visible directly from `referenceValidation.ts` without
  research: `isRecognizedFunctionGroup`'s no-arg branch is
  `KNOWN_NO_ARG_NAMES.has(inner)` — an exact whole-bracket-text match. Any
  `=...` suffix fails this for *any* of the ~30 no-arg names in
  `NO_ARG_FUNCTION_NAMES`/`NO_ARG_OBJECT_FUNCTION_NAMES`, not just `par2`.
  The argument-taking branch (`KNOWN_ARG_HEADS.has(head)`, `head` from a
  `_`-split) already tolerates a suffix, since it only ever checks the part
  before the split — this asymmetry between the two branches is the bug,
  not a missing name in either table.
- `scanKeyOccurrences`/`parseTypeKeyParameter` already treat `=` as a
  documented default-value separator for `load` specifically
  (`<load_key=default>`, `type: key, dataName value` parsing) — this is
  *one* confirmed instance of `=`-as-default in this codebase's own
  understanding of EWP, not yet confirmed as a general mechanism.
- Round4's research (`../validator-round4/research/05-string-template-function-source-audit.md`)
  already source-verified the ~110-name function catalog and dispatch order
  for well-formed calls, but that research's own framing was about *names*,
  not about the `=default` argument-value mechanism specifically — it likely
  touched `TryReplaceFunction`'s default-value parameter in passing (the
  round5 ticket 05 research quoted `GetFunction(key, defaultValue)` in its
  own trace) but this ticket needs to pin down precisely *where* in the
  bracket text that `defaultValue` is parsed from, and for which shapes.

### What to find out

1. **Where does `=default` get parsed out, structurally?** Is it split off
   the *entire* bracket content before any no-arg/arg-taking dispatch even
   runs (in which case it should apply uniformly to every recognized name,
   no-arg or argument-taking), or is it parsed as part of the argument
   portion specifically (in which case it may only ever apply to
   argument-taking calls, and `par2=...` might actually dispatch differently
   than the scripter's own `par_2`-style usage implies)? Trace
   `TryReplaceFunction`/`GetFunction`/`Functions.cs`'s relevant lines,
   confirming with the actual split logic (`Parse.Kvp`, already
   source-verified elsewhere in this round's research as a naive
   first-occurrence split) which character it splits on first when both `_`
   and `=` could be present.
2. **Is `par2` (digit-suffixed, no underscore) a distinct dispatch path from
   `par_2` (underscore-separated)?** Both are already recognized as valid
   *without* a default value in this repo's current tables (`par2` in
   `NO_ARG_FUNCTION_NAMES`, `par_2` via the `par` head in
   `ARG_FUNCTION_HEADS`) — confirm from source whether EWP treats these as
   two genuinely different named parameters/dispatch routes, or the same
   underlying value reached two syntactically different ways. This affects
   whether `<par2=...>` and `<par_2=...>` should be validated by the exact
   same logic or need to stay on their respective no-arg/arg-taking paths.
3. **Does `=default` apply to more than just `par`-family names?** Check
   whether any other no-arg name in the existing tables (`pid`, `x`, `y`,
   `z`, `time`, etc.) can legitimately carry a `=default` suffix per EWP's
   source, or whether this is narrower than "any no-arg name" — e.g. scoped
   to only the numbered-parameter family (`par0`-`par9`) for a specific
   reason (numbered parameters can be legitimately absent/null when a
   trigger passes fewer arguments than expected, which is exactly the
   scenario a default value protects against — a real function might have
   no comparable "might be null" story).

### Deliverable

A findings doc at `research/09-default-value-syntax-source-audit.md`
covering: where/how `=default` is parsed with source citations, the
`par2`/`par_2` dispatch relationship, which name(s) genuinely support this
suffix per source (not guessed), and a precise recommendation for
`isRecognizedFunctionGroup`/`scanUnrecognizedFunctionHeads` — scoped
precisely enough that ticket 10 can build directly on it without further
research.

## Answer

Source-verified fresh from `Functions.cs`/`ObjectFunctions.cs`/`Parse.cs`
(`JereKuusela/valheim-expand_world_prefabs@main`):

- **Q1:** `=` is stripped uniformly and unconditionally in `TryReplaceFunction`
  (`Functions.cs:89-104`), on the *entire* bracket text, before `GetFunction`
  (the no-arg/arg-taking dispatcher) is even called. `_`-splitting happens
  strictly later, inside `GetFunction`, only on the already-`=`-stripped key,
  and only if the no-arg exact match already failed.
- **Q2:** `par2` (hardcoded no-arg case label) and `par_2` (arg-taking `par`
  value-form, runtime-parsed index) are genuinely distinct dispatch routes
  that happen to converge on the same `GetArg` helper for index 2 — they stay
  on their existing separate tables in the validator, no unification needed.
- **Q3:** Syntactically, *every* no-arg name tolerates a `=default` suffix
  with zero exception (the strip happens before any per-name switch runs).
  Functionally, only `par0`-`par9` actually *use* the value (via `GetArg`);
  every other no-arg name parses it cleanly and silently discards it. So the
  fix must cover the whole `KNOWN_NO_ARG_NAMES` set, not just `par`.

**Recommendation for ticket 10:** one change, in `isRecognizedFunctionGroup`'s
no-arg branch only — strip a top-level `=` suffix via `splitTopLevel(inner, "=")[0]`
(reusing the existing nesting-aware primitive, not a naive indexOf, since a
nested group can contain its own literal `=`) before checking
`KNOWN_NO_ARG_NAMES`. No changes needed to the arg-taking branch (already
suffix-tolerant), the name tables, or `scanUnrecognizedFunctionHeads`. Full
worked traces, edge-case notes (a rare base64-all-`=` guard, deliberately not
replicated), and concrete test cases are in the findings doc.
