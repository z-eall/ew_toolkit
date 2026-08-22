# Correct name / data / poke entry field validation rules

Type: grilling
Status: resolved (2026-08-20)
Blocked by: (none — research tickets 09, 10, 11 closed)
Parent: [Validator Round 3 map](../map.md)

## Answer

**Consolidated data/filter validation into `dataFieldValidation.ts`** — single source for field constants (aligned with PrefabData.cs), bareword/inline-triple detection, and top-level + nested + spawn reference collection; `referenceValidation.ts` delegates to it (removed duplicated loops).

**WEC `name:`** — `wecDataEntry.name` → `numberOrString` in schema; numeric names normalized in reference validation (`333` ↔ `"333"`).

**EWP `data:` list shape** — confirmed true positive (research 10); ajv `/data must be string` replaced with actionable hint toward `filters:` / scalar shorthand via `scalarDataFieldTypeMessage()`. Same helper covers `filter:`/`bannedFilter:` list mistakes.

**Poke `:`/`;`** — no change (research 11: valid literals; optional warning skipped this pass).

Tests: `dataFieldValidation.test.ts`, extended `structuralPrecheck.test.ts` + `referenceValidation.test.ts`.

## Question

Synthesize the three entry-field research tickets into one implementation pass:

1. **WEC `name:`** — **decided** by
   [Cross-check WEC data entry `name` field validation](09-wec-name-field-validation-accuracy.md):
   `numberOrString` on `wecDataEntry.name` + normalize numeric names in
   `referenceValidation.ts`. No further grilling needed.
2. **EWP `data:` list shape** — **decided** by
   [Cross-check EWP rule entry `data` field validation](10-ewp-data-field-validation-accuracy.md):
   keep `data: str`; not a false positive; optional clearer message when `data`
   is an array. No schema change.
3. **Poke parameters** — **decided** by
   [Cross-check poke parameter naming acceptance rules](11-poke-parameter-naming-rules.md):
   do not error; optional info/warning on `:`/`;` in poke-related strings, or
   skip if scope is tight. Grill only on severity/message wording if implementing
   the warning.

Grill only where research leaves genuine product choice (severity, message
wording, category). Then implement schema / precheck / message changes,
update tests, live-verify all three repro shapes from the map's Notes.

If all three research tickets conclude "current behavior is correct," record
that and close without changes.
