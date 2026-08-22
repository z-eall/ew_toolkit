# Flag duplicate `name:` (WEC data entry) definitions in the loaded batch

Type: grilling
Status: resolved
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

**Source-verified** (fetched `ExpandWorldPrefabs/service/data/DataLoading.cs` fresh from
`raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/...`, 2026-08-22, read in
full — EWP's own repo, not WEC's; EWP loads WEC-shaped `name:` data entries itself via this file,
so this is the actual runtime implementation, no need to cross into WEC's separate repo):

```csharp
private static void LoadEntry(DataData data, Dictionary<int, DataEntry> oldData)
{
  if (data.name != null)
  {
    var hash = data.name.GetStableHashCode();
    if (Data.ContainsKey(hash))
      Log.Warning($"Duplicate data entry: {data.name}");
    Data[hash] = oldData.TryGetValue(hash, out var prev) ? prev.Reset(data) : new DataEntry(data);
  }
}
```

called from `RebuildFromCache` as `foreach (var file in files) { ... foreach (var d in entries)
LoadEntry(d, prev); }` — i.e. entries are loaded in file-list order, top-to-bottom within a file.

1. **Runtime behavior**: confirmed **last-loaded wins, unconditional overwrite** — `Data[hash] =
   ...` runs regardless of whether the hash was already present; the `if (Data.ContainsKey(hash))`
   branch exists solely to log, not to skip. And critically: **EWP itself logs
   `Log.Warning($"Duplicate data entry: {data.name}")` at runtime** — this isn't a guessed
   analogy, it's the literal same log level the scripter is asking this tool to mirror.
2. **Severity**: **warning**, confirmed directly by #1 rather than inferred — EWP's own runtime
   uses `Log.Warning` for this exact condition, so the scripter's ask is validated by source, not
   just "still seems right."
3. **Cross-file scope**: confirmed batch-wide, no narrowing needed — `LoadEntry` runs once per
   entry across the whole `files` list with one shared `Data` dictionary; nothing in this source
   scopes duplicate detection to a single file.
4. **Message wording**: names the duplicated `name:` value and how many times it's defined, states
   EWP's real runtime consequence (last-loaded silently wins, backed by a real `Log.Warning`,
   not a guessed one), and says what to do next (rename one, or delete the duplicate). Load order
   across files isn't something a static file-list scan can determine with certainty (unlike
   within-file order, which is textually explicit), so the message deliberately doesn't claim to
   know *which* occurrence is the one that survives.
5. **Duplication/clash check**: confirmed no overlap. [WEC data/name typo catalog row](../../diagnosis-arbitration/issues/02-wec-name-typo-catalog-row.md)
   is a `data:`-vs-`name:` key-typo on a single entry (an entry that never registers as a `name:`
   at all); this ticket is two *valid*, correctly-keyed `name:` entries colliding. [WEC name field
   validation accuracy](../../validator-round3/issues/09-wec-name-field-validation-accuracy.md) is
   about accepting a numeric `name:` type, unrelated to collision detection. Both fully distinct.

**Implementation**: added a new loop in `runReferenceValidation()` right after the existing
unused-entry loop, over the same already-built `definitions` map — no new scan needed, exactly as
anticipated. `occs.length > 1` pushes one `severity: "warning"`, `kind: "data-reference"` problem
per occurrence (matching the unused-entry loop's own per-occurrence convention), naming the entry
and the total occurrence count. Reused the existing `"data-reference"` `kind` rather than adding a
new one — it's the same identifier namespace as the undefined/unused checks, and the UI's
`REFERENCE_BRANCH_LABEL` map already routes it into the Reference problem category with no changes
needed. Tests added for same-file and cross-file duplicates, plus a negative case confirming a
uniquely-defined name isn't flagged. `npx vitest run` (246/246 passed) and `npx tsc --noEmit`
(clean) both verified after the change.

Files: [referenceValidation.ts](../../../ewp_validator/src/referenceValidation.ts),
[referenceValidation.test.ts](../../../ewp_validator/src/referenceValidation.test.ts).
