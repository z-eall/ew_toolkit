# Verify ewpRuleEntry's field-name list and structural shapes against EWP's `Data` class

Type: research
Status: resolved
Blocked by: (none)

## Question

`ewpRuleEntry` in `ewp_validator/schema/generate.mjs` (`additionalProperties: false`,
~70 properties) is modeled on EWP's `Data` class in `ExpandWorldPrefabs/PrefabData.cs`,
originally derived from `docs/scripting.md` prose + a C# reflection pass
(ticket 02). It has never been exhaustively re-checked field-by-field against
*current* source.

Verify, against the current `main` branch of
https://github.com/JereKuusela/valheim-expand_world_prefabs:

1. **Completeness**: does every public field on the `Data` class have a
   corresponding property in `ewpRuleEntry`? List any field present in source
   but missing from the schema (these would currently be silently rejected as
   "unknown property" by `additionalProperties: false`, even though EWP
   accepts them).
2. **No stale fields**: does every property in `ewpRuleEntry` still correspond
   to a real field on `Data`? A schema field that no longer exists in source
   isn't a rejection bug, just noise — note it, low priority.
3. **Structural shape**: for each field, does the schema's array-vs-scalar
   shape match the C# field's actual type? E.g. is `filter`/`bannedFilter`
   (already confirmed as valid singular forms, ticket 08 — don't re-litigate)
   representative of other singular/plural pairs that might have the same
   gap? Check fields like `spawn`/`spawns`, `swap`/`swaps`, `poke`/`pokes`,
   `objects`/`bannedObjects` for whether the schema's assumed shape (list vs.
   single value vs. legacy-string) actually matches what `PrefabLoading.cs`
   (or wherever these get consumed) accepts.
4. **Known aliases/legacy names**: `docs/legacy.md` (referenced in
   [ticket 08](../../ew_toolkit/issues/08-gap-handling-policy.md)) may document
   old field names that still work. Check whether any legacy aliases exist for
   `ewpRuleEntry` fields that the current schema doesn't accept.
5. **`TOP_LEVEL_PAINT_ENUM` completeness**: `paint`/`minPaint`/`maxPaint`
   validate against a 9-value word-list mirroring `service/Parse.cs`'s
   `Paints` dictionary keys (`cultivated`, `dirt`, `grass`, `grass_dark`,
   `patches`, `paved`, `paved_dark`, `paved_dirt`, `paved_moss` — see
   [research/13-round8-type-case-sensitivity.md](../../ew_toolkit/research/13-round8-type-case-sensitivity.md)
   §2). This field already has a permissive `anyOf` string fallback so it
   can't currently reject a valid value — but confirm the *dictionary key
   set* itself is still exactly these 9 entries in current source, for
   accuracy of any future autocomplete/hint built on this list.

Reference material (read but verify against current source, don't trust
blindly): [research/02-schema-source.md](../../ew_toolkit/research/02-schema-source.md),
[research/08-gap-handling-policy... ](../../ew_toolkit/issues/08-gap-handling-policy.md),
[research/13-round8-type-case-sensitivity.md](../../ew_toolkit/research/13-round8-type-case-sensitivity.md)
(confirms `ExpandWorldPrefabs/service/` is public source, not closed — check
there too if `Data`'s field list isn't fully in `PrefabData.cs` alone).

Current schema for reference: `ewp_validator/schema/generate.mjs`, the
`ewpRuleEntry` definition (search for `const ewpRuleEntry =`).

## Answer

Fetched `PrefabData.cs`, `PrefabLoading.cs`, `service/Parse.cs`, `service/Yaml.cs`, and
`docs/legacy.md` fresh from `main` (2026-08-19, EWP 1.58.0) and checked all 5 questions. Two real
gaps found, both would currently cause `ewp_validator` to wrongly reject valid EWP YAML:

1. **Completeness**: top-level `delay` (`PrefabData.cs:137`, `float? delay`) has no `ewpRuleEntry`
   property — it's the shared default delay for `spawn`/`swap`/`spawns`/`swaps` entries
   (`PrefabLoading.cs:36`), real and in active use, just missing from the schema.
2. **No stale fields**: clean — every `ewpRuleEntry`/nested-shape property maps to a live C# field.
3. **Structural shape**: top-level `spawn`/`swap` must also accept a plain string (the documented
   single-line legacy form, `docs/legacy.md:40,43`, implemented via text-level rewriting in
   `Yaml.cs`'s `PreParse`, lines 194–205) — schema currently requires array-only, rejecting the
   scalar form. The other named pairs (`swap`/`swaps`, `poke`/`pokes`, `objects`/`bannedObjects`)
   were all confirmed correctly modeled, including `objects`/`bannedObjects`'s per-item string union
   which turns out to be justified by the same `PreParse` mechanism (`Yaml.cs:234-267`), not the C#
   constructor the code comment currently cites.
4. **Known aliases**: same gap as #3 (`spawn`/`swap` scalar form missing); everything else in
   `docs/legacy.md` is already covered. `filter`/`bannedFilter` singular aliases (ticket 08) were
   re-confirmed via source this pass — `Yaml.cs`'s `PreParse` has explicit text-rewrite rules for
   both the top-level and nested indentation levels.
5. **`TOP_LEVEL_PAINT_ENUM`**: confirmed still exactly the same 9 keys in `service/Parse.cs`'s
   `Paints` dictionary (re-fetched fresh, not reused from research 13).

Full citations, code excerpts, and concrete schema-fix suggestions (add `delay`; change `spawn`/
`swap` to a string-or-array `oneOf`; fix one misattributed code comment):
[research/01-ewp-rule-entry-fields.md](../research/01-ewp-rule-entry-fields.md).

**Fixes applied** (`ewp_validator/schema/generate.mjs`): added `delay: numberOrString`; changed
`spawn`/`swap` to the new `spawnOrLegacyString` oneOf (array-of-`spawnData` or plain string); fixed
the `objectOrLegacyString` comment to attribute the per-item string form to `Yaml.cs`'s `PreParse`/
`HandleObjects`. Regression tests added in `schema/generate.test.mjs`. 167/167 tests passing,
type-check clean.
