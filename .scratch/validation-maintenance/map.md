# Validation Maintenance — Map

Label: wayfinder:map

## Destination

RPC param tables used by `checkRpcParams()` are **generated from EWP's
`docs/RPCs.md` at build time** (same cadence as `schema/generate.mjs`), not
hand-edited in `rpcValidation.ts`. A small explicit override manifest keeps
variadic RPCs, deliberately omitted ambiguous names, and doc-parser exceptions.
`checkRpcParams()` logic (type aliases, case rules, missing-param warnings,
warning-only severity) stays in code — only the table **data** is generated.

Reaching the destination means: deleting hand-maintained param rows from source;
CI/local build regenerates tables; regression tests still pass including
`RPC_SetVisualItem` and alias cases from Round 3.

## Notes

- Domain: `ewp_validator` upkeep — sibling to
  [Validator Round 3](../validator-round3/map.md) (accuracy batch, complete),
  [Diagnosis Arbitration](../diagnosis-arbitration/map.md) (message catalog —
  owns RPC *diagnosis* rows, not table generation), and
  [Schema Source Audit](../schema-source-audit/map.md) (strict schema shapes,
  complete).
- **Origin:** Round 3 [Cross-check RPC validation against EWP source](
  ../validator-round3/issues/08-rpc-validation-source-audit.md) rank-1
  recommendation; deferred in [Rework RPC validation logic](
  ../validator-round3/issues/12-rpc-validation-rework.md).
- **Build pattern:** mirror `schema/generate.mjs` — fetch
  `docs/RPCs.md` from EWP GitHub on generate run; emit
  `src/rpcParams.generated.ts` (or `.json`); import from `rpcValidation.ts`.
- **Standing rule:** generated tables are doc-faithful; runtime truth stays
  warning-only per research 08 — do not promote param mismatches to errors.
- This map's **task** tickets carry execution once research closes the parser
  shape question.
- Skills: `/research` for ticket 01; `/grilling` only if override policy is
  ambiguous during ticket 02.

## Decisions so far

- [Audit RPCs.md format for table generation](issues/01-rpcs-md-parser-edge-cases.md) — 152 fenced `yaml` blocks under `## Object RPCs` / `## Client rpcs`; CRLF-safe `N:` extraction; emit types doc-faithful (`string list`→`string` only); hard-fail on structure/orphan/unknown-type; override manifest for 3 omitted + 2 variadic RPCs; [research](../research/01-rpcs-md-parser-edge-cases.md).
- [Generate RPC param tables at build time](issues/02-generate-rpc-tables-at-build-time.md) — `schema/parse-rpcs.mjs` + `rpcOverrides.mjs`; `generate.mjs` emits `src/rpcParams.generated.ts`; hand tables removed from `rpcValidation.ts`; `pretest`/`build`/`dev` regenerate on each run.

## Not yet specified

(none — destination reached)

## Out of scope

- **Component-aware RPC signatures** (prefab-disambiguated `SetVisualItem` vs
  `RPC_SetVisualItem`) — research 08 deferred; belongs on Diagnosis Arbitration
  or a future strict-mode effort, not table generation.
- **Changing `checkRpcParams` warning policy** — Round 3 locked warning-only;
  this map only replaces table upkeep.
- **Schema field-list auto-sync from C#** — separate concern (Schema Source
  Audit declined drift tooling); not part of this map.
