# Hide file status badges in Manual mode until Validate

Type: task
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

Added `shouldShowFileStatusBadges()` in `fileView.ts` — returns false in Manual
mode when batch status is `"none"` or `"stale"`, true when `"clean"` or in Auto
mode. `renderFileList` passes the flag into `statusBadge()` (empty string when
hidden); badge click handler uses optional chaining so rows without a badge
don't throw.

Tests: 3 cases in `fileView.test.ts`. `vitest run src/fileView.test.ts` and
`tsc --noEmit` clean.

## Question

In Manual mode, the per-file validation marker (green ✓ / warning count / error
count in the file panel) must **not** appear until the scripter presses
Validate. Today every uploaded file shows green immediately because validation
is deferred (`revalidateOrDefer`, `fileManager.ts:121-127`) while
`toViewFile` still rolls up `statusOf(0, 0) → "valid"` from empty
`problems[]` (`main.ts:365-366`, `fileView.ts:21-24`).

Implement the scripter's rule:

1. **Hide badges** whenever Manual mode is active and the batch has not
   completed a Validate pass since the last mutation — i.e. when
   `validationStatus` is `"none"` or `"stale"` (the same condition that
   drives the Validate button's yellow dot, `main.ts:360`).
2. **Show badges** only after Validate completes (`validationStatus ===
   "clean"`, set in `revalidateAll`, `fileManager.ts:454`).
3. **Re-hide on any file change** that marks the batch stale: add/remove/move,
   content edit, re-upload, rename — every path that already flips
   `validationStatus` to `"stale"` or leaves it at `"none"`.
4. Auto mode is unchanged — badges always reflect the latest pass.

Keep the change localized to the view layer where possible (`statusBadge` /
`renderFileList` in `main.ts`, or a small helper in `fileView.ts` that takes
`validationMode` + `validationStatus`). Add unit tests for the helper if
extracted; otherwise a `fileManager.test.ts` regression covering Manual upload
→ no badge semantics is enough.

Live-verify: Manual upload → no ✓ on any row; press Validate → badges appear;
edit one file → badges hide / yellow dot returns; Validate again → badges
return.
