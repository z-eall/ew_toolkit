Type: grilling
Status: resolved

## Question

Item 3/4: remove live-edit auto-sort entirely (too jumpy while editing), keep initial-upload auto sort and default sort order. Root cause: `renderFileList()` (`main.ts:330-410`) calls `sortFiles(currentSort)` (`fileView.ts:55`) on every render, including the live-typing revalidation renders that fire after each keystroke in Auto mode — so a file's row jumps as soon as its status changes mid-edit.

The fix is to freeze the file panel's row order between real trigger points instead of resorting on every render. Does that frozen order also survive filter changes and add/remove-file events, or should those still trigger a fresh sort?

## Answer

Freeze everywhere except the two real trigger points: upload-complete (`main.ts:967-969`, unchanged) and an explicit pick from the sort-menu (`main.ts:645`). Concretely:

- Filtering (`sidebarFilters`) just hides/shows rows from the frozen order — it does not reorder.
- Removing a file drops it from the frozen order; the rest keep their relative position.
- A file added outside the upload flow (e.g. single drag-drop onto a folder) appends at the end of the frozen order.
- Status changes from live validation (error count going up/down) never move a row.

Implementation shape is left to the build (see map's "Not yet specified") — likely a stored array of file ids that `renderFileList` reads instead of calling `sortFiles` every time, recomputed only at the two trigger points and patched (not resorted) on add/remove.
