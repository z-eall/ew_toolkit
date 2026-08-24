# Own the ajv-error-translation messages structuralPrecheck.ts still builds itself

Type: grilling
Status: resolved

## Question

The 2026-08-24 re-review (after ticket 07 closed) found `structuralPrecheck.ts`
still constructs 4 user-facing diagnosis strings itself, in its ajv-fallback
block:

- `formatAjvFallthroughMessage()` (lines ~194-236) — the generic ajv-keyword
  fallback (`required`, `type`, `oneOf`/`anyOf`, raw-message simplification).
- The commented-out-list-item message (~line 622).
- The `type:`/`types:` enum-pattern message naming `KNOWN_TYPES_LIST` (~line
  646).
- The `additionalProperty` "not a valid key" message (~line 649).

This map's destination says "ajv is fallback-only for unclassified paths" and
the anti-duplication contract's rule 2 says arbitration messages live only in
`shapeMismatchDiagnosis.ts` or a re-exported sibling catalog module. These 4
spots are exactly that gap — ajv-fallback text living in the orchestrator
instead of a catalog module.

**Open design question** (raised, not yet answered, in the parent chat
session): should these 4 messages fold into `shapeMismatchDiagnosis.ts`
directly, or move to a new sibling module (e.g. `ajvMessages.ts`) that owns
"ajv error → readable text" as a distinct job from `shapeMismatchDiagnosis.ts`'s
"proactive pre-ajv shape-confusion catalog"? The two jobs run at different
priority-stack stages (shape arbitration runs *before* ajv; this text only
fires *after* ajv, for paths arbitration didn't claim) — folding them together
risks the same kind of boundary-blur ticket 09 is about, just one module over.

Source: 2026-08-24 `/improve-codebase-architecture` re-review (HTML report
written to the OS temp dir, not repo-tracked) — Finding 2, rated Strong.

## Answer

Grilled 2026-08-24, 3 rounds:

1. **New sibling module `ajvMessages.ts`**, not folded into `shapeMismatchDiagnosis.ts` — the two modules answer different questions at different priority-stack stages (proactive pre-ajv shape arbitration vs. reactive post-ajv error translation); folding them would recreate the boundary-blur ticket 09 is separately investigating.
2. **`KNOWN_TYPES_LIST` passed as a parameter**, not imported — `KNOWN_TYPES` is also used in `structuralPrecheck.ts` for unrelated branch-guessing (line ~298 pre-move), and a catalog module importing a constant back from the orchestrator would be a backwards, circular dependency. `typeValueEnumMessage(instancePath, knownTypesList)` stays a pure function of its inputs.
3. **`scalarDataFieldTypeMessage` also moved** from `shapeMismatchDiagnosis.ts` to `ajvMessages.ts` — its own doc comment already called it an ajv fallback fired only when no shape rule claimed the path, the same job as the other 4 messages; leaving it behind would have drawn ticket 08's boundary around 4 of 5 fallback messages instead of all 5.

Built as designed: `ajvMessages.ts` now owns `fieldLabelFromInstancePath`, `formatAjvFallthroughMessage`, `commentedOutListMessage`, `typeValueEnumMessage`, `unknownKeyMessage`, and `scalarDataFieldTypeMessage`. `structuralPrecheck.ts` calls all six and holds no diagnosis text of its own — it keeps only `KNOWN_TYPES`/`isTypeValuePath` (branch-guessing, not messaging) and range computation (`ajvErrorRange`, `commentedOutListItemRange`). `shapeMismatchDiagnosis.ts` sheds every ajv-fallback responsibility, keeping only proactive pre-ajv shape arbitration.

Tests: `fieldLabelFromInstancePath`/`formatAjvFallthroughMessage`'s assertions moved from `structuralPrecheck.test.ts`, and `scalarDataFieldTypeMessage`'s from `shapeMismatchDiagnosis.test.ts`, into a new `ajvMessages.test.ts`, plus new tests for `commentedOutListMessage`/`typeValueEnumMessage`/`unknownKeyMessage`. 307/307 pass, `tsc --noEmit` clean, `vite build` succeeds.