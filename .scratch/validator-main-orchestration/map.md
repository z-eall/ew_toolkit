# Validator Main Orchestration — Map

Label: wayfinder:map

## Destination

`ewp_validator/src/main.ts` (1725 lines, 46 top-level functions, no
`main.test.ts`) is split so the domain logic it currently calls inline is
tested, and everything left in `main.ts` is DOM rendering and event wiring.
Concretely: focus/problem-sync's priority-stack call
(`pickHighestPriority` from `structuralPrecheck.ts`, currently inline in
`syncFocusedProblem()` around line 682) and file-ingestion's parsing logic
move into their own tested modules; `fileManager.ts` gains a
`filesForScope` method. Untestable DOM/Worker plumbing (`buildZipInWorker`,
`downloadBlob`) and thin wiring with no real branching logic
(validation-mode triggering, resizer/theme/rename-note utilities) are
deliberately left in `main.ts` — see Out of scope.

Reaching the destination means: `focusedProblem.ts` and `fileIngestion.ts`
exist with paired `.test.ts` files; `syncFocusedProblem()` and `ingest()`
in `main.ts` call into them instead of holding the logic inline;
`fileManager.filesForScope` replaces `savedByScope`.

## Notes

- Domain: `ewp_validator` code health — sibling to
  [Diagnosis Arbitration](../diagnosis-arbitration/map.md) (owns message/
  arbitration logic, not orchestration) and origin: rank-3 finding from the
  2026-08-24 `/improve-codebase-architecture` review.
- Skills: `/grilling` + `/domain-modeling` for the seam-split ticket —
  module boundaries are a real design decision, not mechanical.
- Known clusters in `main.ts` today (from a function-name pass, not yet a
  design):
  - File ingestion: `ingest`, `fromFileList`, `readAllDirEntries`,
    `walkEntry`, `fromDataTransfer`, `wireFolderDropTarget` (~1113-1263)
  - Save/export: `savedByScope`, `buildZipInWorker`, `doSave`,
    `downloadBlob`, `renderSaveMenu` (~1624-1725)
  - Focus/problem sync: `syncFocusedProblem`, `copyDiagnosis` (~650-709) —
    the direct `pickHighestPriority` reach-in lives here
  - Validation-mode triggering: `runVisibleValidation`,
    `applyValidationMode`, `storedValidationMode` (~1085-1316)
  - Everything else (`render*`, menu builders, resizer, theme, rename
    note) reads as genuine UI wiring — default-assume it stays in
    `main.ts` unless the seam-split ticket says otherwise.

## Decisions so far

- [Design the seam split for main.ts](issues/01-design-main-seam-split.md) — `focusedProblem.ts` (pure `computeFocusedProblem`, takes whole `LoadedFile`) and `fileIngestion.ts` (`fromFileList`/`readAllDirEntries`/`walkEntry`/`fromDataTransfer` + `Ingestable` type, hand-written fakes for tests, no jsdom) are the two extractions; `savedByScope` becomes `fileManager.filesForScope`; `buildZipInWorker`/`downloadBlob`/validation-mode triggering/misc DOM utilities stay in `main.ts` out of scope. Execution moved to [Implement the main.ts seam split](issues/02-implement-main-seam-split.md).
- [Implement the main.ts seam split](issues/02-implement-main-seam-split.md) — built as designed: `focusedProblem.ts` + `fileIngestion.ts` created with paired tests, `fileManager.filesForScope` added, `main.ts` down to ~1655 lines. 300/300 tests pass, typecheck clean, build succeeds. Destination reached.

## Not yet specified

(none — one open ticket: [Design the ingest() policy extraction](issues/03-design-ingest-policy-extraction.md), already fully specified, awaiting a grilling session)

## Out of scope

- **Validation-mode triggering** (`applyValidationMode`, `storedValidationMode`) — too thin (mostly delegates to `fileManager`/the upload banner) to justify its own seam. Revisit as a separate effort if it grows.
- **Resizer/theme/rename-note utilities** (`makeResizer`, `applyTheme`, `showRenameNote`/`clearRenameNote`) — generic DOM helpers, no validator domain logic.
- **`buildZipInWorker` / `downloadBlob`** — Worker/DOM plumbing with no branching logic, and untestable under this project's `environment: "node"` vitest config without adding jsdom, which wasn't judged worth it for two thin wrappers. `zip.ts` already owns and tests the real zip-building logic these call into.
