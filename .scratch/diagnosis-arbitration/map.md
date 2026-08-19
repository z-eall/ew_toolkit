# Diagnosis Arbitration — Map

Label: wayfinder:map

## Destination

When several validation layers would all flag the same mistake as a true
positive, the validator surfaces **one intent-specific diagnosis** — the
message that best matches what the scripter probably meant — and suppresses
generic schema/YAML noise on that range. The arbitration catalog is a single
owned module (`shapeMismatchDiagnosis.ts` today; grows with RPC and other
domains) with explicit suppress paths, so new rules do not duplicate checks
already handled by format lint, legacy peel, RPC validation, or reference
validation.

Reaching the destination means: every known shape-confusion class has a
catalog row; ajv is fallback-only for unclassified paths; and contributors
have a documented place to add rows without overlapping existing layers.

## Notes

- Domain: `ewp_validator` diagnosis UX — sibling to
  [Message Catalog](../message-catalog/map.md) (wording/categories) and
  [Validator Round 3](../validator-round3/map.md) (data/filter accuracy).
- **Anti-duplication contract** (mandatory for every new rule):
  1. **Detectors** live in domain modules (`dataFieldValidation.ts`,
     `rpcValidation.ts`, …) — pure predicates, no user-facing strings.
  2. **Arbitration** lives only in `shapeMismatchDiagnosis.ts` (or future
     sibling catalog modules re-exported through one `diagnoseShapeMismatches`
     entry) — messages + `suppressAjvPath`.
  3. **structuralPrecheck.ts** calls arbitration **once per entry** before
     ajv; merges suppress sets with `rpcSuppressPaths`; never adds ad-hoc
     shape-if chains beside the catalog.
  4. Before adding a row, grep for existing handling (format lint, legacy peel,
     RPC suppress, reference validation) — extend or suppress, don't double-diagnose.
- **Priority stack** (highest wins, suppresses lower on same path):
  parse → format lint → branch/intent guess → shape arbitration → domain
  validators (RPC, references) → ajv fallback (`scalarDataFieldTypeMessage`,
  etc.).
- Skills: `/grilling` + `/domain-modeling` when a new confusion class needs
  product choice; `/research` when runtime shape is unclear.

## Decisions so far

- [Shape-mismatch catalog foundation](issues/01-shape-mismatch-catalog-foundation.md) — `shapeMismatchDiagnosis.ts` with rule table + dedupe by `suppressAjvPath`; data/filter/filters/bannedFilter singular↔list + typed-line detection; wired pre-ajv in structuralPrecheck; `looksLikeTypedValueLine()` in dataFieldValidation.
- [Move WEC data/name typo into shape catalog](issues/02-wec-name-typo-catalog-row.md) — `wec-data-key-name-typo` row; `diagnoseEntryShapeIssues()` entry point; `skipEntryAjv` suppresses ajv `required: name`; detector stays in `guessBranch()`.
- [RPC orphan list-item shape diagnosis](issues/03-rpc-orphan-list-item-diagnosis.md) — yes: two warnings (sibling orphan param + missing `name:`); warning / Value problem; both RPC fields; ajv/RPC-check suppress on orphan index.
- [Implement RPC orphan list-item diagnosis](issues/05-implement-rpc-orphan-list-item-diagnosis.md) — `diagnoseRpcOrphanListItems()` + structuralPrecheck wiring + tests.
- [Ambiguous scalar-list fallback message](issues/04-ambiguous-scalar-list-fallback.md) — add `ewp-malformed-typed-line-list` for comma-but-incomplete lines; generic fallback kept for other ambiguous lists.
- [Implement malformed typed-line list diagnosis](issues/06-implement-malformed-typed-line-list-diagnosis.md) — `isMalformedTypedLineList()` branch + tests.

## Not yet specified

(none)

## Out of scope

- **Making ajv errors the primary message** when a catalog row exists — schema
  stays strict; arbitration is UX-only.
- **Component-aware RPC signature checks** — research 08 deferred unless
  explicitly ticketed.
- **Message Catalog YAML** — [Editable Message & Category Catalog](../message-catalog/map.md) abandoned the YAML destination (2026-08-20); arbitration strings stay in `shapeMismatchDiagnosis.ts`.
