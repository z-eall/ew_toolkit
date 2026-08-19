# Cross-check EWP rule entry `data` field validation

Type: research
Status: resolved (2026-08-20, [EWP data field research](ef96beae-7afd-4e20-ab99-d97c1e11bcc1))
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

**Not a false positive — keep `data: str`.** EWP's `Data.data` is a C# `string` (one entry name or one `type, key, value` shorthand), not a list. Typed-value lists belong on `filters:`/`bannedFilters:` or WEC `ints:`/`floats:` entries. The ticket repro would fail at YamlDotNet load time; correct form is `data: int, isCustom, 1`.

**Recommendation for ticket 13:** no schema widening; optional clearer ajv message when `data` is an array (suggest scalar shorthand or `filters:` / named `data.yaml` entry).

Full citations:
[research/10-ewp-data-field-validation-accuracy.md](../research/10-ewp-data-field-validation-accuracy.md).

## Question

The scripter suspects a false positive:

```yaml
- prefab: Player
  type: create
  data:
  - int, isCustom, 1
```

Currently prompts: `unnamed.yaml:3 — /data must be string [Value problem · EWP rule entry]`

EWP rule entries often use `data:` as a **list of typed value lines**, not a
plain string. Does ajv's schema wrongly type `data` as string-only?

Research against primary sources:

1. EWP C# parsing for `type: create` (and siblings) — expected shape of
   `data:` (string vs. list vs. structured entries).
2. `schema/generate.mjs` — `ewpRuleEntry.properties.data` definition vs.
   reality; compare with `wecDataEntry`, `objectData`, etc.
3. Whether the fix belongs in schema generation, a structural precheck peel,
   or suppressing ajv for known multi-line shapes.

Write findings to
`.scratch/validator-round3/research/10-ewp-data-field-validation-accuracy.md`.
Feeds [Correct entry field validation rules](13-entry-field-validation-corrections.md).
