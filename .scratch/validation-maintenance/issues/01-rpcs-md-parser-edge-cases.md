# Audit RPCs.md format for table generation

Type: research
Status: resolved
Blocked by: (none)
Parent: [Validation Maintenance map](../map.md)

## Question

Design a reliable parser for EWP's `docs/RPCs.md` that can emit
`OBJECT_RPC_PARAMS` / `CLIENT_RPC_PARAMS` at build time. The hand tables
today match all **134** doc RPC names (research 08, 2026-08-20) — this ticket
finds every **format edge case** the parser must handle so ticket 02 does not
guess.

Investigate and document:

1. **Section structure** — how object vs client RPC blocks are delimited in
   the markdown; stable anchors for extraction.
2. **Param line variants** — `- 1: type, desc`, enum comment lines, variadic
   notes, doc typos (e.g. FN-3 orphan list items in the doc itself).
3. **Type normalization** — `name` vs `string`, `string list`, `enum_*`,
   `zdo`, `bytes` — what the generator should emit vs what `checkRpcParams`
   already aliases at runtime.
4. **Override manifest** — confirm the three deliberately omitted ambiguous
   RPCs (`RPC_DestroyAttachment`, `RPC_DropItem`, `RPC_Extract`) plus
   `VARIADIC_RPCS` still need hand-listed overrides after generation.
5. **Failure mode** — when `RPCs.md` changes format, how should generate fail
   (hard error vs skip with warning)?

Deliverable: research markdown under
`.scratch/validation-maintenance/research/` with a recommended parser spec ticket
02 can implement without re-reading the whole doc.

## Answer

See [01-rpcs-md-parser-edge-cases.md](../research/01-rpcs-md-parser-edge-cases.md).

**Summary:** Parse 152 per-RPC ` ```yaml ` fences anchored on `## Object RPCs` / `## Client rpcs`; extract `- name:` + indented `N:` lines (CRLF-safe); normalize `string list`→`string`, preserve `name`/`enum_*`/`bytes`; hard-fail on structure/orphan/unknown-type failures; keep override manifest for 3 omitted ambiguous RPCs + 2 variadic prefixes (+ optional typo-merge for fuel-amount RPCs). Ticket 02 implements `schema/parse-rpcs.mjs` per the algorithm in §Parser spec recommendation.
