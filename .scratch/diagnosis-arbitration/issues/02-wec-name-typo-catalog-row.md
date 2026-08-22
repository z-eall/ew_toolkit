# Move WEC data/name typo into shape catalog

Type: task
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Diagnosis Arbitration map](../map.md)

## Answer

**Catalog row `wec-data-key-name-typo`** in `shapeMismatchDiagnosis.ts`:

- `diagnoseWecNameTypo()` — same warning message/range/category as before.
- `diagnoseEntryShapeIssues()` — new per-entry entry point; `likelyDataNameTypo` still detected only in `guessBranch()`.
- `skipEntryAjv: true` — ajv never runs on typo entries (suppresses duplicate `` `name:` is required ``).
- `suppressAjvPath: "/name"` — documents the ajv path that would have fired.

**structuralPrecheck.ts** — removed inline push/`continue`; calls `diagnoseEntryShapeIssues()` once per item before legacy peel; EWP suppress paths reuse the same result.

**Tests:** `shapeMismatchDiagnosis.test.ts` (catalog unit + rule id); existing `structuralPrecheck.test.ts` ticket 07 case still passes.

**Next on map:** [RPC orphan list-item shape diagnosis](03-rpc-orphan-list-item-diagnosis.md) or [Ambiguous scalar-list fallback message](04-ambiguous-scalar-list-fallback.md) (grilling).

## Question

Today `likelyDataNameTypo` in `guessBranch()` triggers an inline warning in
`structuralPrecheck.ts` and skips ajv — it never flows through the arbitration
catalog:

```yaml
- data: leveler    # should be name:
  ints:
  - level, 1
```

Message today: `` Use `name:`, not `data:`, to name a data entry. This entry
will not register (a known WEC README typo). ``

Move this into `shapeMismatchDiagnosis.ts` (or a sibling catalog module
re-exported through `diagnoseShapeMismatches`) with:

- A stable rule id (e.g. `wec-data-key-name-typo`).
- Explicit suppress behavior so ajv `required: name` does not double-fire.
- Same severity/category/range behavior as today.
- Remove the ad-hoc branch from `structuralPrecheck.ts` except the detector
  signal from `guessBranch()`.

Regression test: WEC-shaped entry with `data:` instead of `name:` produces exactly
one Structure-problem warning with the same intent as today.
