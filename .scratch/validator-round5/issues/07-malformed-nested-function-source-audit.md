Type: research
Status: resolved

## Question

Source-verify exactly which malformed nested `<...>` shapes — an extra
bracket, an extra underscore, or similar syntax slips inside a multi-layer
template reference — actually change how EWP's own parser resolves the
reference (silently no-op'ing or resolving to the wrong thing, with no
error), and which of those are even statically distinguishable from a
valid nested reference by `ewp_validator`'s current text-scan approach —
well enough to design a new `warning`-severity diagnosis for this class,
distinct from "unknown function name" (`kind: "template-function"`, already
covered by tickets 03/06 above).

### What's already confirmed (don't re-derive)

- Round 4's research (`../validator-round4/research/05-string-template-function-source-audit.md`)
  and round 5 ticket 01's research already source-verified `Functions.cs`'s
  `GetFunction`/`TryReplaceFunction`/`ResolveValue` dispatch order for a
  *well-formed* `<...>` group (no-arg table, then first-`_`-split
  argument-taking table, then value-group fallback on the full text).
  This ticket needs the *malformed*-input side of the same parser: what
  actually happens when the bracket/underscore structure itself is wrong.
- This repo's own `findGroupEnd`/`walkKeySegments` (in `referenceValidation.ts`)
  already implement one specific well-formedness assumption — that `<...>`
  brackets nest and balance correctly — and already have a documented
  fallback for when they don't (`findGroupEnd` returns -1 on an unbalanced
  bracket, and every scan in this file explicitly skips that occurrence,
  "leave for the structural pre-check"). Check whether
  `structuralPrecheck.ts` already catches some class of unbalanced-bracket
  malformation today (an unbalanced `<` with no matching `>` at the YAML/text
  level might already surface as something else, e.g. a YAML parse error)
  before assuming this ticket needs to build detection from nothing.
- No chart-time repro exists yet for this gap — the parent request gave no
  concrete broken example, only "extra bracket or extra underscore." Part of
  this ticket's job is constructing 2-3 concrete worked examples (modeled on
  the multi-layer nesting from ticket 05, e.g. a doubled-`_` or
  mismatched-bracket-depth variant of `<realDayLock_<nameBoss_<int_location=0>>>`)
  and confirming, by reading `Functions.cs`'s actual bracket/argument-split
  logic, what EWP does with each one — not guessing.

### What to find out

1. **Extra underscore**: EWP's argument-taking dispatch
   (`GetValueFunction`/`Parse.Kvp(key, '_')`, round4-confirmed to split on
   the *first* top-level `_` only) — does an extra, unintended `_` inside a
   nested reference (e.g. a scripter meaning `<realDayLock_<nameBoss_X>>`
   but accidentally typing `<realDayLock__<nameBoss_X>>`, or a stray `_`
   inside what should be a single dynamic token) change which function head
   gets tried, or get absorbed harmlessly into the argument portion? Is
   there a *statically detectable* signal for "this `_` placement is almost
   certainly wrong" (e.g. it lands directly adjacent to a `<`/`>` boundary,
   or produces two adjacent `_` characters) versus one where the validator
   genuinely cannot tell intent from a valid parameter that happens to look
   similar?
2. **Extra bracket**: a mismatched or doubled `<`/`>` inside a multi-layer
   nested reference — e.g. `<<realDayLock_<nameBoss_X>>>` (one extra outer
   `<`/`>` pair) or `<realDayLock_<<nameBoss_X>>` (an extra `<` with no
   matching close). Confirm from source: does EWP's own bracket-matching
   (however `Functions.cs`/its caller actually finds a `<...>` group's
   extent — first-match, greedy, or something else) produce a *different*,
   silently-wrong resolution for these shapes, or does malformed bracket
   nesting always fail structurally before reaching function resolution at
   all (in which case this repo's existing "unbalanced bracket ->
   structural pre-check" carve-out already covers it, and there's no new gap
   to close here beyond what `findGroupEnd`/structural pre-check already
   handle)?
3. **Scope boundary**: given #1 and #2's answers, is there a real,
   confidently-detectable subset of malformed shapes worth a new `warning`
   (the severity the parent request asked for), or does the honest answer
   turn out to be "EWP's own bracket/underscore parsing is permissive enough
   that most malformations either (a) still resolve to *something*
   plausible-looking, indistinguishable from intentional at static-analysis
   time, or (b) already surface via existing structural/YAML-level checks"?
   If the latter, say so plainly rather than forcing a fix — same "record
   the conclusion" bar as any other research ticket in this repo when no
   real gap survives the audit (ticket 01's own comma-split hypothesis is
   the precedent: it was source-verified to be a non-issue, and that
   conclusion was recorded rather than papered over with an unnecessary
   fix).

### Deliverable

A findings doc at `research/07-malformed-nested-function-source-audit.md`
covering: the confirmed worked examples with source citations for what EWP
actually does with each, which malformations (if any) are statically
detectable with acceptable confidence, and a precise recommendation — either
a concrete detection design for ticket 08 to build, or a recorded conclusion
that no new warning is warranted (with reasoning) — scoped precisely enough
that ticket 08 doesn't need further research either way.

## Answer

Full findings: [research/07-malformed-nested-function-source-audit.md](../research/07-malformed-nested-function-source-audit.md).

**Correction to this ticket's own "already confirmed" assumption:** the
"leave for structural pre-check" comments scattered across
`referenceValidation.ts` (and `dataFieldValidation.ts`'s own copy of
`findGroupEnd`) describe a check that does not exist — `structuralPrecheck.ts`
and `formatLint.ts` do zero bracket-balance checking on `<`/`>` inside string
values (angle brackets have no special meaning in YAML, and ajv only checks
field shape, never string content). Every unbalanced-bracket reference is
currently invisible to every diagnostic in this repo, not merely
under-prioritized.

**Root mechanism, source-confirmed:** `Parse.Kvp` is a naive
`str.IndexOf(separator)` — first literal occurrence, zero bracket-awareness —
used at every dispatch level. The nesting-aware behavior scripters actually
observe is an emergent effect of `ResolveFunctions` resolving the innermost
`<...>` group first (via `LastIndexOf`) and splicing before any split runs,
not of the split itself. This is exactly where malformed brackets diverge
from well-formed ones.

**Two concrete worked examples, hand-traced through the real dispatch code:**
- Extra underscore (`<save_bossKillCount__<int_bossKills=0>>`): the key name
  saves correctly, but the extra `_` survives as a leading character baked
  into the *stored value* (`"_3"` instead of `"3"`) — silent, persistent data
  corruption, invisible to any existing check (ticket 06's key-name tracking
  never inspects value content).
- Extra matched outer bracket (`<<save_...>>>`): the save side-effect
  executes correctly with the right value, but the substituted text left in
  the document is `"<3>"` instead of `"3"` — silently wrong output that can
  break a later field expecting a clean number.
- Extra unmatched bracket: safely no-ops locally, but — a materially worse
  finding — can corrupt *other, unrelated, well-formed* references later in
  the same field, because `Replace`'s nesting counter is stateful across the
  whole field, not scoped per-reference.

**Verdict — not "no gap" (round5 ticket 01's precedent doesn't repeat here),
and not "one broad warning" either.** A real, narrower, high-confidence
subset splits into three: (a) unbalanced bracket count — not new detection
at all, just `findGroupEnd`'s already-computed `-1` currently being
discarded rather than surfaced; (b) doubled `_` immediately before a nested
group in a save/load/clear key template — a new, narrowly-scoped heuristic
with a source-verified corruption mechanism; (c) redundant matched
double-wrapper `<<...>>` — real, but must be gated on the inner content
looking like a genuine EWP function head to avoid false-positiving on
decorative chat text like `<<WARNING>>`, which shares the identical
structural shape. Recommends (a) and (b) as the concrete build for ticket
08 (both zero-new-parsing-infrastructure, reusing `findGroupEnd`/
`walkKeySegments`/`splitTopLevel`); (c) flagged optional/lower-priority.

Full message wording, source citations, and code-level pointers for each of
(a)/(b)/(c) are in the research doc's "Concrete recommendation for ticket
08" section.
