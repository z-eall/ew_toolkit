# Design the file-order module

Type: grilling
Status: open

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

(unresolved)