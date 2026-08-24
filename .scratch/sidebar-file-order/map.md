# Sidebar File-Order State — Map

Label: wayfinder:map

## Destination

`main.ts`'s sidebar file/folder ordering state — `fileOrder`, `folderOrder`,
`visibleFileIds`, `collapsedFolders` — and the freeze/resort policy governing
when each changes, are owned by one module instead of four module-level
globals whose invariants live only in scattered comments. A scripter action
(upload, delete, rename, collapse a folder) calls a named method on that
module; `main.ts` stops re-deriving "should this resort" by hand at each call
site.

Reaching the destination means: a module (name TBD by the grilling ticket)
exports the order state plus named methods for each trigger; the ~5 call
sites in `main.ts` that currently inline the freeze/resort decision call
those methods instead; existing order-freeze regression tests (from the
round-2/round-3 file-order-freeze bugfixes) still pass unchanged in behavior.

## Notes

- Domain: `ewp_validator`'s UI layer (`main.ts`, `fileView.ts`,
  `fileManager.ts`) — sibling to
  [Validator Main Orchestration](../validator-main-orchestration/map.md)
  (same code-health motivation, different cluster of `main.ts` state) and
  [UI/UX Functionality Fixes](../ui-functionality-fixes/map.md) (closed,
  different destination — button placement/export rename/save-freeze/header
  height/manual-mode gating, not ordering state).
- Origin: Finding 4 (Worth exploring, lower confidence) of the 2026-08-24
  `/improve-codebase-architecture` re-review (HTML report written to the OS
  temp dir, not repo-tracked). The review flagged this as speculative
  strength — no ordering bug has resurfaced since the prior round of
  order-freeze fixes; worth it if one does, not urgent otherwise.
- Skills: `/grilling` + `/domain-modeling` for the design ticket — module
  shape and naming are a real decision, not mechanical.

## Decisions so far

(none)

## Not yet specified

(none — one open ticket: [Design the file-order module](issues/01-design-file-order-module.md), already fully specified, awaiting a grilling session)

## Out of scope

(none yet)