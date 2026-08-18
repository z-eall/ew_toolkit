Type: grilling
Status: resolved

## Question

Surfaced organically while working the map (not part of the original ten items): after removing a file, a folder, or a bulk set (Clear Invalid) that included the active file, which file becomes active next? The existing logic (`removeFile`/`removeFilesInFolder`/`removeFiles` in `fileManager.ts`) picked from `this.files` — the FileManager's internal storage array (raw upload/creation order) — which bears no relationship to what's actually displayed in either panel, and looked "very random" as a result.

## Answer

1. **Order basis**: whichever panel the remove happened in. The file panel computes "next" from its own frozen visual order (`fileOrder`/`folderOrder`, respecting current sort/filter); the Problems panel computes it from its own current group order (respecting the active tab/category filter). The two can disagree, and that's fine — each panel's cross acts locally.
2. **Direction**: prefer the item that slides up into the removed spot (the next one after it in visual order); fall back to the previous item only if the removed one was last.
3. **Filtered files**: only currently-visible files are eligible — a file hidden by the sidebar status filter is never picked as "next".
4. **Folder/bulk removal**: same rule. Folder removal pivots on wherever the folder's first file sat in the file panel's visible order; bulk removal (Clear Invalid) pivots on the active file's own position, skipping past every other file also being removed in the same batch.

**Implementation**: a pure, unit-tested helper `pickNextAfterRemoval(order, removedIds, pivotIndex)` in `fileView.ts` — scans forward from `pivotIndex` for the first surviving id, then backward. `fileManager.ts`'s three remove methods now take an optional `{ nextId?: string | null }` and use it verbatim instead of computing their own fallback (kept only as a last-resort default for the one internal caller that has no panel to anchor to — the ephemeral-draft auto-remove in `onContentChanged`). `main.ts` maintains two flat "visible order" arrays — `visibleFileIds` (refreshed every `renderFileList()`, post-filter, folder-order-aware) and `visibleProblemFileIds` (refreshed every `renderProblemsPanel()`, post-tab/category-filter) — and each of the four remove call sites (file-row ×, folder-row ×, diagnosis-group ×, Clear Invalid) computes its own `nextId` from the appropriate array before calling into `fileManager`.
