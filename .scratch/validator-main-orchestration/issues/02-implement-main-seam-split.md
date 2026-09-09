# Implement the main.ts seam split

Type: task
Status: resolved

## Question

Build the split decided in [Design the seam split for main.ts](01-design-main-seam-split.md). No open design decisions remain — this is execution:

1. Create `ewp_validator/src/focusedProblem.ts`: pure `computeFocusedProblem(file, cursorLine, activeTab, previousKey)` → `{ key, activeTab, changed }`, moved out of `syncFocusedProblem()` (~main.ts:682). `main.ts` keeps a thin wrapper assigning the module-level state. Paired `focusedProblem.test.ts`.
2. Create `ewp_validator/src/fileIngestion.ts`: move `fromFileList`, `readAllDirEntries`, `walkEntry`, `fromDataTransfer` (~main.ts:1208-1263) and the `Ingestable` interface (~main.ts:1042). `main.ts` imports them. Paired `fileIngestion.test.ts` using hand-written fakes for `FileList`/`DataTransfer`/`FileSystemEntry` — no jsdom.
3. Add `filesForScope(scope)` to `fileManager.ts`, moving `savedByScope`'s logic (~main.ts:1637-1642) there. Update `doSave()`'s call site.
4. Leave `ingest()`, `wireFolderDropTarget`, `buildZipInWorker`, `downloadBlob`, validation-mode triggering, and the resizer/theme/rename-note utilities in `main.ts`, unchanged.
5. Confirm `main.test.ts` is still not needed after this pass — the domain logic that justified concern (the `pickHighestPriority` reach-in) now lives in a tested module; what's left in `main.ts` is UI wiring calling tested functions.

## Answer

Built 2026-08-24, all 5 steps:

1. `focusedProblem.ts` — `computeFocusedProblem(file, cursorLine, previousTab, previousKey)` → `{ key, activeTab, changed }`, plus the `ProblemTab` type (moved here from `main.ts`, which now imports it). `syncFocusedProblem()` in `main.ts` is now a 5-line wrapper. 7 tests in `focusedProblem.test.ts`.
2. `fileIngestion.ts` — `Ingestable`, `fromFileList`, `readAllDirEntries`, `walkEntry`, `fromDataTransfer`, moved verbatim. `main.ts` imports `fromFileList`/`fromDataTransfer`/`Ingestable` (the other two are only called internally by `fromDataTransfer`). 4 tests in `fileIngestion.test.ts` using hand-written `File`/`FileList`/`DataTransfer`/`FileSystemEntry` fakes, no jsdom.
3. `fileManager.ts` gained `filesForScope(scope)`, moved from `main.ts`'s `savedByScope`. `doSave()`'s call site updated to `fileManager.filesForScope(scope)`.
4. `ingest()`, `wireFolderDropTarget`, `buildZipInWorker`, `downloadBlob`, validation-mode triggering, and the resizer/theme/rename-note utilities are unchanged in `main.ts`, as decided.
5. `main.ts` dropped from 1725 to ~1655 lines. No `main.test.ts` was added — remaining domain-logic risk (the `pickHighestPriority` reach-in) is now behind `computeFocusedProblem`, which is tested; what's left in `main.ts` is UI wiring calling tested functions, matching the map's destination.

Verified: `npx vitest run` — 300/300 tests pass (11 new). `npx tsc --noEmit` — clean. `npx vite build` — succeeds.
