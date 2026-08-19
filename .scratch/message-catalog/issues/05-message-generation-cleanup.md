# Cleanup pass: remove redundant/overlapping message code and rarely-firing rules

Type: task
Status: open
Blocked by: [Extract message wording into messages.yaml + build-time validator](03-extract-messages-to-catalog.md), [Move category labels into the catalog + apply the redesigned grouping](04-category-catalog-migration.md)

## Question

With every message and category now funneling through one catalog, audit for
two kinds of excess (both confirmed in scope by the scripter):

1. **Redundant/overlapping message-generation code paths** — helper
   functions or branches that produce near-duplicate output, or logic more
   complex than the case actually requires (e.g. a 3-way branch where two
   cases could reasonably merge into one catalog key with a shared
   condition). The survey done while charting this map is a starting point:
   `orphanKeyMessage`'s 4 branches, `checkRpcParams`'s 3 issue kinds +
   `describeJsType`'s 5-way fragment, and the ajv-error 3-way ternary in
   `structuralPrecheck.ts` are the most-branched candidates worth a close
   look once their wording lives in the catalog side by side.
2. **Diagnosis rules that rarely/never fire against real EWP/WEC YAML** —
   check each rule's actual trigger conditions against the corpus of real
   files the scripter has already tested against (ticket 13's rounds), and
   against what's structurally reachable at all (e.g. is there a rule
   guarded by a condition that a different, earlier check already makes
   impossible to reach?).

Removing a working rule is a real behavior change, not just a wording
cleanup — flag each candidate removal to the scripter for confirmation
before deleting it, even though the wording-simplification half of this
ticket doesn't need the same sign-off (it's pure refactor, covered by the
existing regression tests).

Every simplification and every removal gets its regression-test consequences
worked out explicitly: a removed rule's test either gets deleted with a note
explaining why, or converted into a "confirmed this never fires" assertion if
that's cheap — not just silently dropped.
