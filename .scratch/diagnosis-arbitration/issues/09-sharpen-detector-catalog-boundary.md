# Sharpen the detector/catalog boundary inside shapeMismatchDiagnosis.ts

Type: grilling
Status: open

## Question

The 2026-08-24 re-review found `shapeMismatchDiagnosis.ts` doing real
structural *detection*, not just message/suppress arbitration over
already-detected shapes:

- `diagnoseRpcOrphanListItems()` (~lines 397-455) walks sibling RPC list
  entries to classify orphan/mis-split items — detection, not messaging.
- `isMalformedTypedLineList()` / `stringListItems()` (~lines 107-178)
  classify comma-shaped lines — also detection.

The anti-duplication contract's rule 1 says detectors live in domain modules
(`dataFieldValidation.ts`, `rpcValidation.ts`, …) as pure predicates; rule 2
says `shapeMismatchDiagnosis.ts` only holds messages + `suppressAjvPath`. This
module currently does both jobs for these two rules, which blurs the exact
boundary the contract exists to keep sharp — the next contributor adding a
shape-confusion row won't have a clean rule for where their detector belongs.

Lower confidence than ticket 08: the module still passes the deletion test
today (deleting it concentrates all diagnosis messaging, nothing splinters),
so this is about keeping the contract legible for the *next* rule, not fixing
a live duplication.

Source: 2026-08-24 `/improve-codebase-architecture` re-review (HTML report
written to the OS temp dir, not repo-tracked) — Finding 3, rated Worth
exploring.

## Answer

(unresolved)