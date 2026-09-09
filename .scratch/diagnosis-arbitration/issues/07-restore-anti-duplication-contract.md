# Restore anti-duplication contract: strip messages out of dataFieldValidation.ts and rpcValidation.ts

Type: task
Status: resolved

## Question

The architecture review (2026-08-24) found this map's own anti-duplication
contract has drifted:

- `dataFieldValidation.ts:171-187` (`scalarDataFieldTypeMessage()`) and
  `rpcValidation.ts:55-129,147+` (`checkRpcParams()`,
  `unrecognizedRpcKeyMessage()`) construct full user-facing diagnosis text.
  Contract rule 1 says detectors in these files stay pure predicates, no
  user-facing strings.
- `shapeMismatchDiagnosis.ts:200-205`'s scalar-field-as-list fallback message
  and `dataFieldValidation.ts`'s `scalarDataFieldTypeMessage()` already say
  near-identical things for the same root cause (scalar `data:`/`filter:`
  field given a YAML list) — the drift has already produced a live duplicate,
  not just a latent risk.

No new decision is needed — `ewp_validator/AGENTS.md`'s Validation rule
lifecycle and this map's own contract already specify the target shape.
This ticket is execution: move the message text (and any `kind`/severity
tags built alongside it) out of `dataFieldValidation.ts` and
`rpcValidation.ts` into `shapeMismatchDiagnosis.ts`, leaving the detectors
returning only a typed "this looks wrong" result. Collapse the duplicate
scalar-field-as-list message into the one already in
`shapeMismatchDiagnosis.ts`.

Source: 2026-08-24 `/improve-codebase-architecture` review (HTML report was written to the OS temp dir, not repo-tracked — this ticket carries the finding forward).

## Answer

Done 2026-08-24. Detectors now return typed results only; `shapeMismatchDiagnosis.ts` is the sole owner of all diagnosis text.

- `dataFieldValidation.ts`: removed `scalarDataFieldTypeMessage()`. Kept only `isScalarDataValueField()`, a pure predicate over the same field set.
- `rpcValidation.ts`: `checkRpcParams()` and `checkRpcUnrecognizedKeys()` return `RpcParamIssue` without a `message` field — instead `docParam`, `actualType`, `declaredType`, `caseOnlyMismatch`, `docParamCount`, `belongsTo`, enough for the catalog to phrase the text. `describeJsType()` now returns a coarse tag (`"boolean"`/`"number"`/`"list"`/`"mapping"`/`"other"`), not a phrase.
- `shapeMismatchDiagnosis.ts` gained `scalarDataFieldTypeMessage(field)` (the moved ajv-fallback for non-list bad-type values — list-shaped values are already owned by `diagnoseScalarFieldAsList`) and `rpcParamIssueMessage(rpcName, issue)` (phrases every `RpcParamIssue` kind, including the unrecognized-key text).
- `structuralPrecheck.ts` now imports both message functions from `shapeMismatchDiagnosis.ts` instead of the domain modules, and calls `rpcParamIssueMessage()` at both RPC call sites.
- Collapsed the duplicate: `diagnoseScalarFieldAsList()`'s generic list-shape fallback used to say "the plural `bannedFilters:` list field" for every field, including `drops`/`addItems`/`removeItems`, which have no plural sibling — that branch now only fires for `filter`/`bannedFilter` (their real plural) and `data`, with `drops`/`addItems`/`removeItems` getting their own message (matching what `scalarDataFieldTypeMessage` said for the same case, which is now dead for list-shaped values since `diagnoseScalarFieldAsList` already suppresses ajv on that path).

Tests: moved the `.message`-content assertions for `scalarDataFieldTypeMessage`/RPC issues out of `dataFieldValidation.test.ts`/`rpcValidation.test.ts` (which now assert only `kind`/typed fields) into `shapeMismatchDiagnosis.test.ts`, plus a new regression test for the `drops:` list-shape message. 304/304 pass, `tsc --noEmit` clean, `vite build` succeeds.
