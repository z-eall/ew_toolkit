# Design the file-order module

Type: grilling
Status: resolved

## Question

The 2026-08-24 re-review found four module-level globals in `main.ts` —
`fileOrder`, `folderOrder`, `visibleFileIds`, `collapsedFolders` — whose
"frozen except at these specific trigger points" invariant is documented only
in comments at ~5 separate call sites (upload, delete, rename, and others).
`fileView.ts` already supplies pure sort/filter functions, but the *policy*
of when to resort vs. hold the frozen order is reconstructed by hand at each
site rather than owned in one place.

Design questions for the grilling session:

- What are the actual trigger points today, precisely? (Needs a grounded
  code survey first, same as the UI/UX Functionality Fixes map did before
  charting its tickets — cite file:line, don't re-derive from memory.)
- Does the new module own the raw arrays as private state with named
  methods (`onUpload()`, `onDelete()`, `onRename()`, …), or does it stay a
  pure-function library like `fileView.ts` with `main.ts` still holding the
  state but calling named "should I resort" predicates instead of inlining
  them?
- Is this worth doing now, given the review rated it speculative strength
  (no ordering bug has resurfaced since the last round of order-freeze
  fixes)? Confirm with the scripter before investing grilling time here.

Source: 2026-08-24 `/improve-codebase-architecture` re-review (HTML report
written to the OS temp dir, not repo-tracked) — Finding 4, rated Worth
exploring / speculative strength.

## Answer

Grounded code survey of `main.ts` (2026-08-24), before grilling module shape:

- `fileOrder`/`folderOrder` already have two owning functions: `recomputeFileOrder()` (the real resort — called at 4 sites: sort-menu pick ×2, upload-complete, Manual Validate completing) and `syncFileOrder()` (drop/append without resorting — called once, inside `renderFileList()`). Already centralized, not scattered hand-reasoning at each call site.
- `visibleFileIds` isn't frozen state — fully recomputed every `renderFileList()` (line ~423), a derived value with no invariant to protect.
- `collapsedFolders` is a raw `Set` toggled inline at 2 trivial sites (folder-select auto-expand, folder-header click) — plain add/delete, no real policy.

The ticket's premise — four globals with an invariant scattered across ~5 call sites — only half held once checked against the actual code. Confirmed with the scripter: **close without building.** The real state (`fileOrder`/`folderOrder`) is already reasonably owned by two named functions; the remaining gap (`collapsedFolders` has no owning function) is two one-line toggles, not worth a module. No code changed.