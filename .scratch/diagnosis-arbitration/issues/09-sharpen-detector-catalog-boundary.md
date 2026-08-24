# Sharpen the detector/catalog boundary inside shapeMismatchDiagnosis.ts

Type: grilling
Status: resolved

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

Grilled 2026-08-24, 1 round:

1. Build it now — small, cheap fix, and keeping the contract legible outweighs the low urgency.
2. `isMalformedTypedLineList()`/`stringListItems()` (plus the `MALFORMED_TYPED_LINE_FIELDS` set they depend on) moved into `dataFieldValidation.ts`, next to `looksLikeTypedValueLine` — same family of pure "does this line look like X" predicates.
3. `diagnoseRpcOrphanListItems()` split the same way ticket 07 split `checkRpcParams`: `rpcValidation.ts` gained `findOrphanRpcListItems()`, a pure predicate over already-parsed entry objects that returns typed facts (`{ index, previousIsNameOnly }`); `shapeMismatchDiagnosis.ts` kept only the YAML-range lookup, message-picking, and suppress-path wiring. `numberedRpcParamKeys()` (needed by both the new predicate and the existing suppress-path helper) also moved to `rpcValidation.ts`.

`shapeMismatchDiagnosis.ts` now holds no structural detection — every function in it either arbitrates (picks a message + suppress path) or wires suppress paths from facts a domain module already computed. 307/307 tests pass (no new tests needed — behavior unchanged, only which module owns which function), `tsc --noEmit` clean, `vite build` succeeds.