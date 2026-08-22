# Cross-check WEC data entry `name` field validation

Type: research
Status: resolved (2026-08-19, [WEC name field research](d0aceeb3-f48a-4106-acee-602ac659a7e0))
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

**False positive.** WEC's `DataData.name` is `string?`; YamlDotNet coerces bare
numeric YAML scalars (`333` → `"333"`) at load time — same policy already used
for `values:` and item fields. EWP's `DataStorage.cs` is custom-key storage,
not WEC entry names.

**Recommendation:** change `wecDataEntry.name` from `str` to `numberOrString` in
`schema/generate.mjs` — not a warning, not keep-error. Ticket 13 should also
normalize numeric names in `referenceValidation.ts` (currently skips non-string
`name` values).

Full citations:
[research/09-wec-name-field-validation-accuracy.md](../research/09-wec-name-field-validation-accuracy.md).

## Question

The scripter suspects a false positive:

```yaml
- name: 333
```

Currently prompts: `unnamed.yaml:1 — /name must be string [Value problem · WEC data entry]`

Is a numeric YAML scalar a valid WEC data entry name in EWP/WEC source, or
should the validator accept/coerce it, downgrade severity, or reclassify the
message?

Research against primary sources:

1. WEC `DataStorage.cs` / registration logic — what types does `name` accept?
   Case rules? Numeric names?
2. Current schema path: `wecDataEntry` in `schema/generate.mjs` and ajv
   message mapping in `structuralPrecheck.ts`.
3. Real-world EWP YAML examples if any use numeric data entry names.

Write findings to
`.scratch/validator-round3/research/09-wec-name-field-validation-accuracy.md`.
Recommend: keep error / warning / accept / different message — with evidence.
Feeds [Correct entry field validation rules](13-entry-field-validation-corrections.md).
