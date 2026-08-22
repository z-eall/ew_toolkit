# Drop JSON-Schema "/" path prefix from value error messages

Type: task
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

**Central helpers in `structuralPrecheck.ts`:**

- `fieldLabelFromInstancePath()` — top-level `` `name:` ``, nested `` `data:` under `objects:` ``, list-item `` `objects:` entry ``; no leading `/`.
- `formatAjvFallthroughMessage()` — maps ajv `type`/`required`/`oneOf`/`anyOf` fallthroughs to field-native wording (e.g. `` `prefab:` must be text (a string). ``, `` `values:` is required. ``, `` `floats:` must be a YAML list. ``).

**Wiring:** ajv fallthrough branch and the `type:`/`types:` pattern special-case now call these helpers instead of `` `${error.instancePath} ${error.message}` `` or `` `'${error.instancePath}' ... ``.

**Tests:** unit tests for both helpers; integration cases for prefab type error, nested `objects:` prefab, and no messages starting with `/`.

**Round 3 map frontier is clear** — all child tickets resolved.

## Question

ajv fallthrough messages expose JSON Pointer paths the scripter never writes in
EWP YAML, e.g. `/name must be string`. EWP fields are bare keys (`name:`,
`data:`, …) — the leading `/` reads like a path syntax and misleads.

Replace ajv-derived Value/Structure messages with field-native wording
(e.g. `` `name:` must be a string `` or `` `name:` must be text, not a number ``),
consistent with:

- `shapeMismatchDiagnosis.ts` (already field-native)
- the `type:` pattern message (names valid words, not `/type`)
- RPC warnings (parameter numbers, not instance paths)

Scope: central helper in `structuralPrecheck.ts` (or shared message util) for
all remaining `${error.instancePath} ${error.message}` fallthroughs; audit
nested paths (`/objects/0/data` → `` `data:` under `objects:` `` or last-segment
`` `data:` `` with line range doing the locating). Do not change Problem range
logic.

Feeds [Message Catalog map](../../message-catalog/map.md) when catalog migration
lands — keys should never include JSON Pointer syntax.
