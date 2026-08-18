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

## Follow-up fixes (found while verifying this decision)

Two more bugs surfaced during verification, both fixed in the same pass:

1. **Landing on "next" didn't jump to its top problem.** The three remove methods called `setActive(next)` directly, which only swaps the Monaco model — it doesn't move the cursor or reveal anything, unlike clicking a file row (`revealTopProblem`, which jumps to the highest-priority problem: error > warning > info). Fixed with a new private `activateNext(id)` in `fileManager.ts` that calls `revealTopProblem` instead of `setActive` directly, used by all three remove methods.
2. **The Problems-panel highlight didn't always follow.** Even with (1) fixed, the newly-revealed problem sometimes didn't get the `.cursor-focus` highlight — traced to Monaco's `onDidChangeCursorPosition` not firing when `setPosition` lands on the same line/column the cursor already occupies (e.g. a freshly-switched model defaults to line 1, and the revealed top problem is *also* at line 1 — a very common case for a file whose only problem is right at its start). `focusedProblemKey` was only ever updated from inside that event, so it went stale. Fixed by extracting the computation into `syncFocusedProblem()` (`main.ts`) and calling it unconditionally at the top of `renderProblemsPanel()`, not just from the cursor-changed event — so every render path (typing, a reveal, a "next file" pick) ends up correct regardless of whether Monaco actually fired an event.

Also fixed, unrelated to next-item-selection but found via the same "why does this feel jumpy" thread: the Problems-panel highlight scroll and the file-panel scroll (item 10) used `scrollIntoView({block:"nearest"})`, which — combined with `.problem-file`'s `position: sticky; top: 0` group headers — could (a) scroll unnecessarily even when the target was already fully visible, and (b) land a freshly-scrolled-to row hidden underneath its own sticky header. Fixed with CSS `scroll-margin-top`/`scroll-margin-bottom` on `.problem` (accounting for the sticky header's height via a shared `--group-header-h` custom property) and `.file-row`, keeping `block: "nearest"` — so scrolling only happens when actually needed, and never lands a row under the header or flush against the panel edge.
