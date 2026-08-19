# Verify itemEntry's field-name list against WEC's Item shape

Type: research
Status: resolved
Blocked by: (none)

## Question

`itemEntry` in `ewp_validator/schema/generate.mjs` (`additionalProperties: false`)
models WEC's item-entry shape (used inside `wecDataEntry.items`), documented
in WEC's `README_data.md`.

Verify against current `main` branch source
(https://github.com/JereKuusela/valheim-world_edit_commands):

1. **Completeness**: every documented/real item-entry field (`pos`, `chance`,
   `prefab`, `stack`, `quality`, `variant`, `durability`, `crafterID`,
   `crafterName`, `worldLevel`, `equipped`, `pickedUp`, `customData`) still
   accurate? List any field present in source/docs but missing from the
   schema, or vice versa (stale).
2. **Structural shape**: field types (numberOrString/str/boolOrString per the
   project's typing policy) still match.
3. **Legacy/alias field names**: check WEC's docs for any deprecated or
   alternate item-entry field names still accepted.

Current schema: `ewp_validator/schema/generate.mjs`, `const itemEntry =`.

## Answer

Gap found. Completeness (§1) is fine — `itemEntry` (`generate.mjs` lines 352–370) has all 13
fields matching WEC's `ItemData` class (`WorldEditCommands/service/data/DataData.cs` lines 55–82,
re-verified against `main` on 2026-08-19) field-for-field, no missing/stale properties. No
legacy/alias item-entry names exist (§3).

But structural shape (§2) has one confirmed bug: `customData` is typed `str` in the schema
(`generate.mjs:367`), while in source it's `Dictionary<string, string>?` (`DataData.cs:80-81`),
deserialized by YamlDotNet as a YAML **mapping**, not a scalar string — confirmed independently via
its consumption in `DataValues.cs:239` and the reverse binary-to-YAML path in
`PlainDataEntry.cs:141-164`. `README_data.md` itself says "This is a list of key-value pairs"
(lines 279-281), which the current `str` typing doesn't even match. Real `data dump=`-generated
YAML with modded item custom data (e.g. `customData: {SomeModKey: someValue}`) is wrongly rejected
by the current schema's `additionalProperties: false` + string-only `customData`.

Suggested fix: change `customData: str` to `customData: { type: "object", additionalProperties: str }`
(or an equivalent named helper) in `itemEntry`. All other fields, including `chance` (a real C#
`float`, not a string, but still correctly typed `numberOrString` since YamlDotNet's default scalar
coercion accepts both quoted and bare numeric forms), need no change.

Full citations and field-by-field table: [research/06-item-entry-fields.md](../research/06-item-entry-fields.md).

**Fix applied** (`ewp_validator/schema/generate.mjs`): `customData` changed from `str` to
`{ type: "object", additionalProperties: str }`. Regression test added in `schema/generate.test.mjs`.
167/167 tests passing, type-check clean.
