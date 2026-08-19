# Cross-check poke parameter naming acceptance rules

Type: research
Status: resolved (2026-08-19, [Poke parameter naming research](0cd8796b-cffc-4338-94e8-76b8455aa0fe))
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

**Do not error** — EWP treats `some:thing;likethis` as one literal poke token
(space-split for `parameter:` / `type: poke, …`, comma-split for `pars:`).
Colons and semicolons are not poke delimiters; today's pass behavior is correct.

**Recommendation for ticket 13:** optional **info/warning** (not error) when
poke-related strings contain `:` or `;` outside `<…>` groups — likely delimiter
confusion; `;` in `type: poke, …` filters can trigger unintended range matching
for numeric args. **No change** is also defensible if scope stays tight.

Full citations:
[research/11-poke-parameter-naming-rules.md](../research/11-poke-parameter-naming-rules.md).

## Question

The scripter is unsure whether these should error — today they **pass**:

```yaml
- prefab: Player
  type: create
  poke:
  - self: true
    parameter: some:thing;likethis
```

```yaml
- prefab: Player
  type: poke, some:thing;likethis
  commands:
  - s hello
```

How does EWP/WEC actually parse poke `parameter` values and inline `type:
poke, <params>` strings? Are colons/semicolons valid delimiters or a sign of
a typo?

Research against primary sources:

1. C# poke dispatch — `parameter` field parsing, inline poke type strings.
2. Documented examples in EWP docs / sample YAML for parameter syntax.
3. Whether `some:thing;likethis` is one token or multiple; any charset
   restrictions.
4. Current validator coverage (schema, formatLint, referenceValidation) and
   what's missing.

Write findings to
`.scratch/validator-round3/research/11-poke-parameter-naming-rules.md`.
Recommend: new warning / error / no change, with repro cases.
Feeds [Correct entry field validation rules](13-entry-field-validation-corrections.md).
