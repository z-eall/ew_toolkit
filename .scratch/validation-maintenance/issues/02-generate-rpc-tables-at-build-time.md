# Generate RPC param tables at build time

Type: task
Status: resolved (2026-08-20)
Blocked by: [Audit RPCs.md format for table generation](01-rpcs-md-parser-edge-cases.md)
Parent: [Validation Maintenance map](../map.md)

## Answer

**Build pipeline:**

- `schema/parse-rpcs.mjs` — fetches/parses `docs/RPCs.md`; CRLF-safe fence extraction; orphan `- N:` merge with warn; hard-fail on ambiguity/unknown types; applies `OMIT_RPCS`.
- `schema/rpcOverrides.mjs` — `OMIT_RPCS` (3), `VARIADIC_RPCS` (2), fetch URL, min count.
- `schema/generate.mjs` — now also writes `src/rpcParams.generated.ts` (112 object + 19 client RPCs on 2026-08-20 fetch).
- `src/rpcValidation.ts` — imports generated tables; ~280 lines of hand tables removed; `checkRpcParams()` unchanged.

**Tests:** `schema/parse-rpcs.test.mjs` (parser unit); `rpcValidation.test.ts` (generated table shape + existing checkRpcParams cases). 236 tests pass.

**Validation Maintenance map destination reached.**

## Question

Implement build-time RPC table generation per research 01 and Round 3 research
08 sketch:

1. Add `schema/parse-rpcs.mjs` (or extend `generate.mjs`) — fetch
   `docs/RPCs.md` from EWP GitHub; parse into param tables.
2. Emit generated artifact (e.g. `src/rpcParams.generated.ts`) on
   `node schema/generate.mjs`.
3. Refactor `rpcValidation.ts` — import generated tables; keep
   `checkRpcParams()`, type aliases, and missing-param logic in source; move
   only table **data** out.
4. Add `rpcOverrides.mjs` or inline manifest for: variadic RPCs, three omitted
   ambiguous names, any parser exceptions from research 01.
5. Delete hand-maintained `OBJECT_RPC_PARAMS` / `CLIENT_RPC_PARAMS` row blocks.
6. Extend `rpcValidation.test.ts` — generated table still matches known cases
   (`RPC_SetVisualItem` clean, `name`/`string` alias, missing param warning).

Do **not** change warning-only severity or add component-aware checks.
