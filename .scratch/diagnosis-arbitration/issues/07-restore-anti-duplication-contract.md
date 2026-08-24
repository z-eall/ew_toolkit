# Restore anti-duplication contract: strip messages out of dataFieldValidation.ts and rpcValidation.ts

Type: task
Status: open

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

(unresolved)
