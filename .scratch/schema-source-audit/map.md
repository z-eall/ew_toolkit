# Schema Source Audit — Map

## Destination

Every **strict/rejecting** validation mechanism in `ewp_validator`'s schema — the
8 `additionalProperties: false` object shapes (their field-name guest-lists)
plus the structural-shape assumptions those same fields carry (array vs.
scalar, required nesting, singular/plural forms) — is verified against
**current EWP/WEC C# source**, not just docs. Any gap found gets fixed and
regression-tested, the same pattern as [ticket 13 rounds 8-9](../ew_toolkit/issues/13-v1-user-testing-feedback.md)
(the `type`/`types` casing fix that started this effort).

Reaching the destination means: for each of the 8 shapes, someone has read the
actual current C# class it's modeled on and confirmed (or corrected) that the
schema's field list and structural assumptions match — not re-derived once
from docs and never re-checked.

## Notes

- Domain: Valheim modding / EWP-WEC YAML scripting. See [CONTEXT.md](../../CONTEXT.md).
- Skills: `/research` for every ticket here — all 8 are AFK research tickets, no grilling needed (this is fact-finding, not a preference decision).
- Parent effort: [EWP Toolkit map](../ew_toolkit/map.md) — this is a focused sub-effort off that map, same repo/product, not a new product direction.
- Origin: [ticket 13 round 8](../ew_toolkit/issues/13-v1-user-testing-feedback.md) found `type`/`types` was wrongly case-strict (docs only showed lowercase; EWP's `Enum.TryParse(value, true, ...)` actually accepts any case). Round 9 checked the one other suspect mechanism (YAML key-name casing) and found it already correct. The user then asked whether *other* validation rules (not just casing) have ever been checked against source — this map answers that.
- **Standing rule** (broadened from ticket 13 round 8's narrower version, per this effort's own charting decision): before hand-encoding *any* strict/rejecting validation rule — an enum, a fixed field-name list, a requiredness condition, a structural shape assumption — from docs prose, check it against EWP's actual C# source (or get a live in-game test) rather than trusting the docs' description as the full accepted grammar. This applies to future schema changes generally, not just enum casing. (Mirror this same wording into the [EWP Toolkit map](../ew_toolkit/map.md)'s Notes once this map closes, so it lives in the place future schema sessions will actually read it.)
- Reference repos: EWP (https://github.com/JereKuusela/valheim-expand_world_prefabs), WEC (https://github.com/JereKuusela/valheim-world_edit_commands). EWP's `service/` subfolder (`Parse.cs`, `Yaml.cs`, `DataStorage.cs`, etc.) is public source, not closed-source as ticket 02 originally assumed — see [research/13-round8-type-case-sensitivity.md](../ew_toolkit/research/13-round8-type-case-sensitivity.md) §2.
- Cost/effort preference inherited from the parent map: no paid tooling, no ongoing automation build-out — this is a one-time manual verification pass, not infrastructure (see Out of scope).

## Decisions so far

- [Verify ewpRuleEntry's field-name list and structural shapes against EWP's `Data` class](issues/01-ewp-rule-entry-fields.md) — Two real gaps found and fixed: top-level `delay` was missing entirely (added); `spawn`/`swap` wrongly required an array when EWP's own `PreParse` also accepts the documented single-line legacy string form (changed to a string-or-array `oneOf`). Everything else (81 fields) confirmed clean against current source.
- [Verify spawnData's field-name list and structural shape against EWP's `SpawnData` class](issues/02-spawn-data-fields.md) — No gap. All 19 fields match current source exactly, types independently re-verified via the `Spawn()` constructor's `DataValue.*` consumption.
- [Verify objectData/pokeData's field-name lists against EWP's `ObjectData`/`PokeData` classes](issues/03-object-and-poke-data-fields.md) — No gap. Both shapes match current source field-for-field; the `PokeData : ObjectData` inheritance and the `objects`/`bannedObjects` per-item string union both re-confirmed still correct.
- [Verify terrainData's field-name list and `paint` enum against EWP's `TerrainData` class](issues/04-terrain-data-fields.md) — No gap. All 15 fields match; `TERRAIN_PAINT_ENUM`'s 5 values confirmed still current.
- [Verify valueEntry/valueGroup against WEC's Value/ValueGroup shapes](issues/05-value-entry-and-group-fields.md) — No gap. Confirmed WEC's `DataData` class has no extra value/value-group fields, `values:`'s scalar typing (ticket 13 round 5) is exactly right, and the schema's `required` markers are the correct validator-level call even though WEC's own parser silently no-ops rather than erroring on omission.
- [Verify itemEntry's field-name list against WEC's Item shape](issues/06-item-entry-fields.md) — One real gap found and fixed: `customData` was typed as a plain string but is actually a `Dictionary<string,string>` (a YAML mapping) in source — changed to an object shape. All 13 other fields confirmed correct.

## Not yet specified

(none — all 8 shapes are already sharp enough to ticket; see child issues)

## Out of scope

- **Re-deriving the ~148 permissively-typed fields** (`boolOrString`/`numberOrString`/plain `str`/`strArray`) against source. These fields already accept almost any value, so they structurally can't reproduce the `type`-casing bug (a validator wrongly rejecting valid EWP YAML) — that failure mode requires a *strict* check, which these fields deliberately don't have. [Ticket 09](../ew_toolkit/issues/09-type-validation-strategy.md) already made this looseness a deliberate design choice (many of these fields support comma-lists, `min;max` ranges, and `<function>` calls that aren't fully catalogued; a too-narrow pattern risks false positives). Tightening them to also catch the *opposite* failure mode (validator wrongly accepting broken YAML) would mean writing a precise grammar for ~148 fields — open-ended, fights an already-considered decision, and risks reintroducing false rejections at far larger scale than the bug this effort is fixing. Confirmed out of scope by the user when charting this map.
- **Building automated/ongoing schema-vs-source drift tooling.** Considered and declined in [ticket 13 round 9](../ew_toolkit/issues/13-v1-user-testing-feedback.md) — the project's existing live-testing feedback loop (ticket 13's ongoing rounds) already catches doc-vs-reality drift more reliably than static source-diffing could, and building/maintaining a second mechanism cuts against the project's $0-cost, low-maintenance standing preference.
