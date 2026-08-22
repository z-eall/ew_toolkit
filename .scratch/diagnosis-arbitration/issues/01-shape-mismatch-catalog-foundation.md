# Shape-mismatch catalog foundation

Type: task
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Diagnosis Arbitration map](../map.md)

## Answer

Implemented Option A+B together:

- **`ewp_validator/src/shapeMismatchDiagnosis.ts`** — confusion catalog as
  `RULES[]` with stable ids; dedupes by `suppressAjvPath`; documents
  anti-duplication contract in module header.
- **`looksLikeTypedValueLine()`** in `dataFieldValidation.ts` — shared detector.
- **`structuralPrecheck.ts`** — one pre-ajv call per EWP entry; merges
  `shapeSuppressPaths` with `rpcSuppressPaths`; `scalarDataFieldTypeMessage()`
  remains ajv fallback only.
- **Scripter repro** `data:\n- int, isCustom, 1` now says to use
  `data: int, isCustom, 1` or `filters:` — not `/data must be string`.
- **Map** — [Diagnosis Arbitration](../map.md) charts stack, ownership, and
  future RPC rows.

Tests: `shapeMismatchDiagnosis.test.ts`; updated `structuralPrecheck.test.ts`.

## Question

Implement the diagnosis-arbitration foundation: intent-specific messages for
`data:`/`filter:`/`filters:` shape confusions (typed line as YAML list, inline
triple on list field), single catalog module, no overlap with ajv/RPC/format
lint, and a wayfinder map for future rows.
