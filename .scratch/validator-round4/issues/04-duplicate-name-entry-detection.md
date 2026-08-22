# Flag duplicate `name:` (WEC data entry) definitions in the loaded batch

Type: grilling
Status: open
Blocked by: (none)
Parent: [Validator Round 4 map](../map.md)

## Question

The scripter reports a duplicated `name:` (WEC data-entry identifier, e.g.
two `- name: someTemplate` entries anywhere in the loaded batch) is not
currently flagged, and expects EWP/WEC's own duplication behavior to be
mirrored here.

Root cause, source-grounded (`referenceValidation.ts`): `runReferenceValidation()`
already builds exactly the data structure needed —

```ts
const definitions = new Map<string, Occurrence[]>();
...
recordOccurrence(definitions, defName, { fileId: file.id, range });
```

(~379, ~432-435) — every occurrence of a given `name:` across every loaded
file is already recorded, list-valued per name. The only place this map is
later read is the "unused" hint loop (~506-517), which only checks
`usedNames.has(name)`; nothing anywhere checks `occs.length > 1`. So this is
additive: no new scan is needed, only a new branch over data the checker
already collects.

Grill toward a concrete answer:

1. **Source-verify** what EWP/WEC's own runtime actually does when the same
   `data.yaml` entry name is defined twice in the loaded config (last-wins
   overwrite? first-wins? undefined/depends-on-load-order?) — per the
   [EW Toolkit map](../../ew_toolkit/map.md)'s "consult whichever mod's
   source actually implements the behavior" standing rule, this is WEC's
   `DataLoading.cs` (or EWP's own `FileLoading.cs`, per that map's Notes on
   the shared-folder-convention finding) — cite file/line. This determines
   whether the message should say "second definition wins" / "load order
   determines which wins" / etc., not just "this is duplicated."
2. **Severity**: the scripter said "warning." Confirm that's right given
   what #1 finds — if duplication genuinely breaks/overwrites the first
   definition, warning (not error) still seems right since EWP itself
   doesn't crash, but state the reasoning either way.
3. **Cross-file scope**: `definitions` is already batch-wide (same-file and
   cross-file), matching the existing undefined-reference check's scope — no
   new decision needed here unless #1 reveals WEC only merges within a
   single file (unlikely, since the batch is already documented as one
   merged namespace, see `CONTEXT.md`'s "Cross-file reference" entry).
4. **Message wording**: follow the hub-wide message-quality checklist
   ([EW Toolkit map](../../ew_toolkit/map.md) Notes, item 1-2) — name the
   duplicated `name:` value and the other location(s) it's also defined at
   (file + line), and say what to do next (rename one, or confirm the
   duplication is intentional/harmless once #1's runtime behavior is known).
5. **Duplication/clash check** (standing rule): confirm this doesn't overlap
   [Move WEC data/name typo into shape catalog](../../diagnosis-arbitration/issues/02-wec-name-typo-catalog-row.md)
   (that row is about a `data:`-vs-`name:` key typo on one entry, not about
   two valid `name:` entries colliding) or
   [WEC name field validation accuracy](../../validator-round3/issues/09-wec-name-field-validation-accuracy.md)
   (numeric-`name` type acceptance) — expected to be fully distinct, but
   confirm.

Implement once settled: add the `occs.length > 1` branch alongside the
existing unused-entry loop in `runReferenceValidation()`, one problem per
duplicate occurrence (matching how every other multi-occurrence check here
reports — see the unused-entry loop's own per-occurrence push), with tests
covering same-file and cross-file duplicates.

## Answer

(pending)
