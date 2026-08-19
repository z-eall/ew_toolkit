# Verify valueEntry/valueGroup against WEC's Value/ValueGroup shapes

Type: research
Status: resolved
Blocked by: (none)

## Question

`valueEntry` (`{ value: str }`) and `valueGroup` (`{ valueGroup: str, values:
scalarArray }`) in `ewp_validator/schema/generate.mjs` (both
`additionalProperties: false`) model WEC's value-entry and value-group YAML
shapes, documented in WEC's `README_data.md`.

Verify against current `main` branch source
(https://github.com/JereKuusela/valheim-world_edit_commands):

1. **Completeness**: does `README_data.md` (or the actual parsing source, if
   these aren't purely doc-defined) show any additional optional fields on a
   value entry or value group beyond `value` / `valueGroup`+`values` — e.g. a
   weight, chance, or condition field? List anything missing.
2. **`values:` scalar typing**: [ticket 13 round 5](../../ew_toolkit/issues/13-v1-user-testing-feedback.md)
   already confirmed values can be numeric, not just string (`scalarArray` —
   string/number/boolean). Confirm no other value kind (e.g. explicit null,
   nested list) is valid that the schema doesn't account for.
3. **Required fields**: schema requires `value` on valueEntry and both
   `valueGroup`+`values` on valueGroup. Confirm both are genuinely required
   (not optional-with-default) in the real parsing logic.

Current schema: `ewp_validator/schema/generate.mjs`, `const valueEntry =` and
`const valueGroup =`.

## Answer

No gap found: `valueEntry`/`valueGroup` in `generate.mjs` already match WEC's source exactly. Full
findings: [research/05-value-entry-and-group-fields.md](../research/05-value-entry-and-group-fields.md).

- **No extra fields.** WEC deserializes every data-list item into one shared `DataData` class
  (`WorldEditCommands/service/data/DataData.cs`) with `value`/`valueGroup`/`values` alongside
  data-entry fields, but `DataLoading.LoadEntry`'s value/value-group branches only ever read those
  three; the class's other leftover fields (`persistent`/`distant`/`priority`) are read exclusively
  by the `name:`-gated data-entry branch (`DataEntry.cs`'s ZDO replication fields). No
  weight/chance/condition field exists anywhere, matching `README_data.md`'s "Value Entries" and
  "Multiple parameter values" sections.
- **`values:` typing already correct.** `values` is `string[]?` in `DataData.cs`; round 5 already
  fixed the schema to `scalarArray` (string/number/boolean) for the numeric-literal case
  (`values: [1, 2, 3]`, per README). No nested-list or explicit-null shape is valid — `string[]`
  can't bind a nested YAML sequence, and neither is documented.
- **Required fields are the right call, for a different reason than literal C# requiredness.**
  Nothing in `DataData.cs` is `[Required]`, and `LoadEntry`'s null-guards silently skip rather than
  throwing — so omitting `value`, or omitting either half of `valueGroup`+`values`, doesn't error in
  WEC, it just makes the entry a silent no-op. The schema's `required` correctly flags that as
  invalid input for a validator's purposes even though WEC itself wouldn't reject it.
- One structural note (not a fix): WEC's three data-list mechanisms (data entry / value entry /
  value group) share one non-exclusive C# class, so nothing stops a YAML object from mixing fields
  from more than one at once — stricter than the schema's disjoint `oneOf` split. No documented or
  previously-tested example does this, so no schema change recommended.
