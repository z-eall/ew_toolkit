# Filename rename must produce live Problems-panel diagnosis

Type: task
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

Root cause: the filename gate exempted **all** ephemeral unsaved files
(`ephemeral && !savedOnce`), so typed drafts renamed away from `unnamed.yaml`
never got `checkFileName` in `revalidateAll()` / `validateNow()` — popover
(`checkFileName` in blur) could show while Problems panel stayed stale.

Fix: `isFilenameGateExempt()` only skips the gate while the draft is still on
`DRAFT_PLACEHOLDER_NAME` (`unnamed.yaml`). Any committed rename runs the gate.
Blur handler reads `checkFileName(committed.name)` after `renameFile()` so
popover matches Problems panel.

Tests: 4 cases in `fileManager.test.ts`. `vitest run` + `tsc --noEmit` clean.

## Question

The scripter reports invalid-filename diagnosis does **not** go live when
clicking away or pressing Enter on the filename field:

- **Auto mode** did not fire for them.
- **Manual mode** did not fire when pressing Validate either.

Expected: after rename commit (blur / Enter → `filenameTextEl.blur`,
`main.ts:1582-1590), the Problems panel shows the Invalid file (or Legacy)
diagnosis from `checkFileName` / `revalidateAll`, same as any other validation
trigger.

Grounded starting points to investigate:

1. `renameFile` → `revalidateOrDefer()` (`fileManager.ts:359-369`) — Auto
   should call `revalidateAll()` synchronously; Manual defers until Validate.
2. Early return when `trimmed === file.name` — does whitespace-only edit or
   no-op skip revalidation when the name *looks* changed in the UI?
3. Rename-time popover (`showRenameNote`, `main.ts:1548-1590`) uses
   `checkFileName` directly — does Problems panel stay stale even when the
   popover shows?
4. Manual Validate: `validateNow()` always calls `revalidateAll()` — if that
   path works for content but not filename, trace whether invalid-name files
   get the filename gate in `revalidateAll` (`fileManager.ts:421-438`) with
   the renamed name.
5. Draft/ephemeral exemption (`isDraft = file.ephemeral && !file.savedOnce`) —
   false positive if rename tests use unsaved drafts.

Fix whatever is broken; add regression tests in `fileManager.test.ts` and/or
`fileNameCheck.test.ts` covering rename-to-invalid in Auto (immediate
Problems panel) and Manual (after Validate). Live-verify both modes.
