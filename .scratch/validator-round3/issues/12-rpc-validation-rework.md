# Rework RPC validation logic

Type: grilling
Status: resolved (2026-08-20)
Blocked by: (none — [08-rpc-validation-source-audit.md](08-rpc-validation-source-audit.md) closed)
Parent: [Validator Round 3 map](../map.md)

## Answer

**Logic rework in `rpcValidation.ts` (tables unchanged — still match docs):**

- **Type aliases** — `name`≡`string`; `int`↔`enum_*` (FP-1/FP-2 fixed).
- **Case-sensitive prefix check** — `Int` vs `int` warns (FP-3); EWP matches types exactly.
- **Missing-param warnings** — omitted documented indices warn (FN-1); warning-only.

Ticket `RPC_SetVisualItem` repro + alias/case/missing tests in `rpcValidation.test.ts`.

**Deferred:** generate `OBJECT_RPC_PARAMS` / `CLIENT_RPC_PARAMS` from `docs/RPCs.md` (research rank-1 maintenance win) — hand tables still complete; track under [Diagnosis Arbitration map](../../diagnosis-arbitration/map.md) fog or a follow-on ticket.

**Next on map:** [Drop JSON-Schema "/" path prefix from value error messages](14-drop-ajv-json-pointer-prefix.md).

## Question

Using the research findings from
[Cross-check RPC validation against EWP source](08-rpc-validation-source-audit.md),
grill with the scripter (if ambiguous) then implement the agreed RPC validation
changes in `rpcValidation.ts` / `structuralPrecheck.ts`:

- Fix false positives/negatives the audit found.
- Apply any table / parsing optimizations worth doing in this pass.
- Keep severities aligned with EWP behavior (warnings for doc mismatches per
  current design unless source says otherwise).
- Extend tests in `rpcValidation.test.ts` and `structuralPrecheck.test.ts`.
- Live-verify with the scripter's `RPC_SetVisualItem` example and at least one
  previously-wrong case.

If research concludes the current logic is already correct, record that as the
answer and close without code changes.
