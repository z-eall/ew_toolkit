# Manual Validate triggers a one-time errors-first sort

Type: grilling
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

Grilling settled all four points:

1. **Timing:** resort immediately after `revalidateAll()` inside the Validate
   `runVisibleValidation` pass — when the green dot appears, not when the
   banner dismisses.
2. **Order-freeze:** Manual Validate is a **third** resort trigger; sets
   `currentSort = DEFAULT_UPLOAD_SORT` (`"errors"`) and calls
   `recomputeFileOrder()` — same as upload-complete, overwriting any
   sort-menu choice since upload.
3. **Scope:** file panel only; Problems-panel group order unchanged.
4. **Repeat Validate:** no resort when batch was already `"clean"`.

Implementation: `shouldResortFilePanelOnManualValidate()` in `fileView.ts`;
Validate click handler captures `batchStatusBefore`, runs the pass, then
resorts + `renderFileList()` when the helper returns true.

Tests: 3 cases in `fileView.test.ts`. `vitest run src/fileView.test.ts` and
`tsc --noEmit` clean.

## Question

The scripter wants pressing Validate in Manual mode to run a **one-time**
errors-first sort of the file panel after every file has been checked — at
the moment Validate turns green (`validationStatus === "clean"`), not on
every intermediate state.

Grill toward a concrete answer:

1. **Timing:** sort once at the end of `validateNow()` / `runVisibleValidation`
   callback (`main.ts:1273-1276`), after `revalidateAll()` finishes — confirm
   this matches "when Validate turns green," not when the banner appears.
2. **Interaction with order-freeze** ([Order-freeze scope](../validator-ui-polish/issues/03-order-freeze-scope.md)):
   upload-complete and explicit sort-menu picks already recompute
   `fileOrder` (`recomputeFileOrder`, `main.ts:283-288`). Does Manual
   Validate become a **third** trigger that recomputes order with
   `currentSort = "errors"` (or always errors-first regardless of the
   current sort mode)? Or does it temporarily sort by errors then restore
   the scripter's chosen sort mode?
3. **Scope:** whole file panel only, or also Problems-panel file-group order?
   (The ask mentions file sorting; default to file panel unless the scripter
   says otherwise.)
4. **Auto mode:** explicitly out — this is Manual-only per the report.

Once resolved, implement directly (this map carries execution) and add a
regression test if a pure helper is extracted; live-verify on a multi-file
batch with mixed error/warning/valid statuses.
