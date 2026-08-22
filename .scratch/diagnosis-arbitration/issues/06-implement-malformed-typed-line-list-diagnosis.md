# Implement malformed typed-line list diagnosis

Type: task
Status: resolved
Blocked by: [Ambiguous scalar-list fallback message](04-ambiguous-scalar-list-fallback.md)
Parent: [Diagnosis Arbitration map](../map.md)

## Question

Implement `ewp-malformed-typed-line-list` branch in `diagnoseScalarFieldAsList()` per ticket 04 decisions.

## Resolution

- `isMalformedTypedLineList()` + `messageMalformedTypedLineList()` in `shapeMismatchDiagnosis.ts`; rule id `ewp-malformed-typed-line-list`.
- Generic fallback hint tightened (“full `type, key, value` triple”).
- Tests in `shapeMismatchDiagnosis.test.ts` and `structuralPrecheck.test.ts`. 55 tests pass in touched files.
