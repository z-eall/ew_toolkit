# Cross-check RPC validation against EWP source

Type: research
Status: resolved (2026-08-20, [RPC validation source audit](d4f7139a-db56-43f8-b763-a03ddd23b591))
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

**Directionally correct; tables complete vs `docs/RPCs.md`.** EWP treats each RPC entry as an open `Dictionary<string,string>`, parses numbered keys via `Parse.Kvp("type, value")`, and never validates counts/types at load time. Hand-maintained tables match all 134 RPC names; the ticket's `RPC_SetVisualItem` repro is valid and should produce no warnings.

**Real gaps:** `name` vs `string` and `int` vs `enum_*` false positives (FP-1/FP-2); missing-param silence (FN-1); orphan list items from doc typos (FN-3); manual table drift risk.

**Recommendation for ticket 12:** generate param tables from `docs/RPCs.md`; add type-alias map aligned with `RpcInfo.GetParameters`; optionally warn on missing params; keep warning-only severity. Do not close ticket 12 with no changes.

Full citations:
[research/08-rpc-validation-source-audit.md](../research/08-rpc-validation-source-audit.md).

## Question

The scripter asks to rework RPC logic and cross-check code for a better /
optimized approach. Example repro shape:

```yaml
# Sets item to a specific slot.
  objectRpc:
  - name: RPC_SetVisualItem
    target: all
    1: int, "index of the item slot"
    2: string, "name of the item"
    3: int, "variant number of the item"
    4: int, "orientation of the item (0 = none, 1 = vertical, 2 = horizontal, 3 = all)"
```

Current implementation: `rpcValidation.ts` cross-checks numbered params against
`OBJECT_RPC_PARAMS` / `CLIENT_RPC_PARAMS` tables sourced from Jere's RPC docs;
`structuralPrecheck.ts` suppresses ajv's generic "must be string" for RPC paths
(`rpcSuppressPaths`).

Research against **primary sources** (EWP C# RPC call sites, `docs/RPCs.md`,
any WEC overlap):

1. How does EWP actually parse and dispatch `objectRpc` / `clientRpc` entries —
   especially numbered keys, `target`, and inline type strings like
   `int, "index of the item slot"`?
2. Is the current table complete for `RPC_SetVisualItem` and peers? Any params
   documented vs. enforced mismatches?
3. False positives / false negatives in `checkRpcParams` today — cite concrete
   repros from the codebase tests or new ones.
4. Optimization opportunities: table maintenance, generated tables from
   source, shared parsing with reference validation, etc. — rank by
   payoff vs. effort.

Write findings to `.scratch/validator-round3/research/08-rpc-validation-source-audit.md`
with file:line citations. Do **not** implement — feeds
[Rework RPC validation logic](12-rpc-validation-rework.md).
