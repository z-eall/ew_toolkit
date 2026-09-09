# Design the seam split for main.ts

Type: grilling
Status: resolved

## Question

`main.ts` mixes UI wiring with several clusters that read as separable:
file ingestion (drag/drop, folder walk), save/export (zip build, download),
focus/problem sync (the `pickHighestPriority` reach-in), and
validation-mode triggering (auto/manual revalidation timers).

Decide:

1. Which clusters become their own modules, and in what order (the
   focus/problem-sync cluster is the one with the direct untested
   domain-logic call — likely the highest-value first cut).
2. What each new module's interface looks like — narrow enough that
   `main.ts` doesn't need to know how the cluster works internally, just
   how to call it.
3. Whether validation-mode triggering (`runVisibleValidation`,
   `applyValidationMode`) comes along in this pass or is deferred as its
   own follow-up — it's more tangled with rendering than the other three.
4. Whether the resizer/theme/rename-note utilities are worth a seam at
   all, or stay as-is (they look trivial, but confirm rather than assume).

Run `/grilling` + `/domain-modeling` — this is a real design decision, not
mechanical extraction.

## Answer

Grilled 2026-08-24, 3 rounds. Decisions:

1. **Order**: focus/problem-sync first, then file-ingestion parsing.
   Save/export drops most of its scope (see 5) and validation-mode/misc
   utilities are ruled out of scope (see 3, 4) — not a priority order
   among four equal candidates, a pick of the two that are worth doing.

2. **`focusedProblem.ts`** (new file): a pure function — call it
   `computeFocusedProblem` — taking the whole `LoadedFile` object (not a
   narrow view-type; matches how `fileView.ts`/`dataFieldValidation.ts`
   already take `LoadedFile` directly), plus cursor line, current tab, and
   the previous key. Returns `{ key, activeTab, changed }`. `main.ts` keeps
   a thin `syncFocusedProblem()` wrapper that calls it and assigns the
   module-level `focusedProblemKey`/`activeTab` state. Paired
   `focusedProblem.test.ts`.

3. **Validation-mode triggering** (`applyValidationMode`,
   `storedValidationMode`) — ruled out of scope this pass. Too thin
   (mostly delegates to `fileManager`/the upload banner) to justify its
   own seam; revisit as a separate effort if it grows.

4. **Resizer/theme/rename-note utilities** (`makeResizer`, `applyTheme`,
   `showRenameNote`/`clearRenameNote`) — ruled out of scope. Generic DOM
   helpers, no validator domain logic in them.

5. **Save/export, revised after checking `zip.ts`**: `zip.ts` already owns
   and tests the real zip-building logic (`buildZip`, `crc32`).
   `buildZipInWorker` and `downloadBlob` are Worker/DOM plumbing with no
   branching logic to hide a bug in, and can't be unit-tested anyway under
   this project's `environment: "node"` vitest config (no jsdom, and
   adding one wasn't judged worth it for two thin wrappers). Both stay in
   `main.ts`, untested, by design — extracting them wouldn't buy the
   destination's actual goal. Only `savedByScope` moves, and not into a
   new module: it's a pure function of `fileManager`'s own data, so it
   becomes a method on `fileManager.ts` itself (e.g.
   `fileManager.filesForScope(scope)`).

6. **`fileIngestion.ts`** (new file): `fromFileList`, `readAllDirEntries`,
   `walkEntry`, `fromDataTransfer`, plus the `Ingestable` interface (moved
   from `main.ts:1042`, currently unused elsewhere). Wraps browser-only
   APIs (`FileList`, `DataTransfer`, `FileSystemEntry`) unavailable under
   `environment: "node"` — tested with hand-written fake objects shaped to
   just what each function reads, no jsdom added (keeps
   [AGENTS.md](../../../AGENTS.md)'s $0/minimal-tooling stance). `ingest()`
   itself and `wireFolderDropTarget` stay in `main.ts` — they're UI
   orchestration (confirm modals, upload banner, `fileManager` calls), not
   parsing.

7. **Ticket split**: this ticket carries the design only. Execution is a
   separate task ticket, matching the pattern already used on
   [Diagnosis Arbitration](../../diagnosis-arbitration/map.md) (e.g.
   [RPC orphan list-item shape diagnosis](../../diagnosis-arbitration/issues/03-rpc-orphan-list-item-diagnosis.md)
   → [Implement RPC orphan list-item diagnosis](../../diagnosis-arbitration/issues/05-implement-rpc-orphan-list-item-diagnosis.md)).
