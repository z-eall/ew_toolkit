Type: research
Status: resolved

## Question

Source-verify how EWP resolves a `<...>` value-group reference whose name is
built from a literal prefix plus a *runtime-dynamic* suffix (a nested
`<...>` group, e.g. `<requiredWorldLevel_<prefab>>` or the multi-layer
`<realDayLock_<nameBoss_<int_location=0>>>`), well enough to design a
static prefix/fuzzy match against declared value-group families in
`ewp_validator` — without inventing a new matching primitive if this file
already has one that fits.

### What's already confirmed (don't re-derive)

- Round 5 ticket 01's research (`research/01-wec-value-entry-callback-source-audit.md`)
  already source-verified EWP's `ResolveValue`/`TryGetValueFromGroup`
  (`Functions.cs`) and confirmed it hashes the **entire, fully-resolved**
  bracket text against `DataLoading.ValueGroups` — but that research only
  covered the case where the bracket text has no unresolved nested group
  left by the time it reaches `ResolveValue`. This ticket needs the *nested*
  case: how/when does a `<...>` group containing another `<...>` group get
  resolved before that final lookup?
- This repo's `referenceValidation.ts` already has a working pattern for
  "part of a name is only known at runtime, match a declared skeleton
  instead of an exact string": `walkKeySegments`/`keyToPattern`/
  `keyToSubject`/`hasLiteral`/`keysCompatible` (built for custom saved keys,
  treats each `<...>` group as a wildcard token, compiles a `.*`-based regex
  from one side and a sentinel-substituted subject from the other), and a
  second, simpler use of the same idea at `runReferenceValidation`'s
  `dataUsages` loop (~line 810, `/[<>]/.test(name)` branch: a dynamic data
  reference is matched against every definition name via `keyToPattern`,
  and any match counts as "used" rather than being flagged undefined).
  **Check first whether either of these can be reused directly** for the
  value-group case rather than writing a third matching primitive.
- Chart-time repro (2026-08-22) confirmed both worked examples in this
  ticket's parent request are real false negatives today: `<requiredWorldLevel_<prefab>>`
  (family declared as `requiredWorldLevel_blackforge`,
  `requiredWorldLevel_blackforge_ext1`, etc.) and
  `<realDayLock_<nameBoss_<int_location=0>>>` (family declared as
  `realDayLock_Eikthyr`, `realDayLock_Elder`, etc.) both get flagged as
  unknown function names, even though every declared family member shares
  the literal prefix before the first nested group.

### What to find out

1. **Resolution order for nested groups feeding a value-group lookup.**
   `Functions.cs`'s `TryReplaceFunction`/`GetFunction`/`ResolveValue` — does
   EWP resolve an inner `<...>` group (e.g. `<prefab>`, or `<nameBoss_<int_location=0>>`)
   to its runtime string value *first*, splice that into the outer bracket
   text, and *then* run `ResolveValue` on the fully-flattened result (this is
   what the user's own framing implies, and what round4's research on
   "resolved inside-out" already suggested for the general nested-group
   case) — confirm against source, don't assume. If so, the *only* thing a
   static validator can ever know about the outer group's final looked-up
   string is its literal prefix (everything up to the first unresolved
   nested group) — the suffix is genuinely unknowable until runtime.
2. **Is prefix/fuzzy matching against the declared family the right static
   approximation**, or is there a *tighter* check possible — e.g. if EWP's
   own nested-group splice always lands the dynamic part at a token
   boundary matching `keyToPattern`'s existing wildcard-skeleton approach
   (each `<...>` group -> `.*`), confirm that's exactly the right pattern
   shape and not an over- or under-approximation for this specific case
   (value-group names, not saved keys — do value-group names ever contain a
   literal `_` that a wildcard could wrongly span across, changing whether
   a real typo would still be caught?).
3. **The `<nameBoss_<int_location=0>>` sub-question the chart-time repro
   surfaced**: is `nameBoss` a real EWP function (check the round4
   catalog — `Functions.cs`'s ~110 recognized names — was it possibly
   missed?), a second value-group family that just isn't declared in the
   user's pasted snippet, or something else? This affects whether ticket 05's
   fix needs to handle "an unrecognized head immediately followed by another
   nested unrecognized head" as one case or two.
4. Does this same prefix/fuzzy matching concern apply to **EWP's own
   built-in argument-taking functions** too (e.g. `<save_<pid>_score>` — a
   nested group as a function argument, not a value-group name) — or is
   that already correctly excluded today because `isRecognizedFunctionGroup`
   only needs the *head* (before the first top-level `_`) and a nested group
   never sits in head position in any of the round4/round5 examples so far?
   Confirm this isn't a second, adjacent gap hiding in the same code path.

### Deliverable

A findings doc at `research/05-prefix-fuzzy-value-group-matching-source-audit.md`
covering: the confirmed resolution order with source citations, which
existing matching primitive (if any) to reuse and exactly how, answers to
the `nameBoss` sub-question, and a precise recommendation for
`scanUnrecognizedFunctionHeads`'s exclusion gate — scoped precisely enough
that ticket 06 can build directly on it without further research.

## Answer

Full findings: [research/05-prefix-fuzzy-value-group-matching-source-audit.md](../research/05-prefix-fuzzy-value-group-matching-source-audit.md).

**Q1 (resolution order, confirmed from `Functions.cs`'s `ResolveFunctions`):**
EWP resolves exactly one innermost bracket pair at a time (a
`LastIndexOf("<")`/`IndexOf(">")` scan), splices the result in place, and
rewinds — so any nested group is always fully collapsed to its runtime value
before the outer group's own value-group lookup runs. The only thing a
static scan can ever know about the final looked-up string is its literal
skeleton around each nested group — exactly the shape `keyToPattern` already
builds. Notable secondary finding: if an inner group fails to resolve, the
outer brackets never re-form into a clean pair either, so the outer
value-group lookup never even runs — a nested-resolution failure breaks the
expression at runtime too, not just in the validator.

**Q2 (right approximation + reuse):** Yes and yes — `keyToPattern`
(already used once for this exact "dynamic reference" shape in the
`dataUsages` loop) needs zero modification. Its balanced-bracket walk
already collapses a nested group of *any* depth to one `.*` token, so single-
and double-nesting produce identically-shaped patterns through the same code
path — no depth-aware logic needed. Confirmed not an over-approximation: a
value-group suffix can legitimately contain further underscores (the
ticket's own `requiredWorldLevel_blackforge_ext2_vise` example proves it), so
`.*` spanning underscores is correct, not sloppy — and the literal prefix
before the first nested group still must match exactly, so a genuine prefix
typo is still caught. One-directional match (pattern from the reference,
tested against literal declared names) is correct — value-group declarations
are never themselves dynamic, so `keysCompatible`'s bidirectional shape
isn't needed.

**Q3 (`nameBoss`):** Not a real EWP function — absent from the round4
~110-name catalog entirely. It's a second, undeclared-in-the-snippet
`value:`/`valueGroup:` family (location index → boss name). No special
casing needed: it's scanned as its own independent occurrence and the same
fuzzy-match fix handles it — if genuinely undeclared in the batch, it
correctly stays flagged (and per Q1, that flag points at a script that's
also broken at runtime, a true positive).

**Q4 (nested group in function-argument position):** Already safely out of
scope, confirmed structurally — `splitTopLevel` treats any `<...>` group as
opaque, so a nested group never corrupts head extraction for a real function
call (`<save_<pid>_score>` still extracts head `"save"`). No second gap.

**Recommendation for ticket 06:** one localized change to the value-group
exclusion gate — a fuzzy fallback (only engaged when `inner` contains an
unresolved nested group) using `keyToPattern(inner)` tested against every
declared `valueGroupNames`/`DEFAULT_VALUE_GROUP_NAMES` entry. Full code
sketch, plus three recommended test cases (single-nesting positive,
double-nesting with the inner occurrence still correctly flagged when
undeclared, and a prefix-typo negative case), in the research doc's final
section.
