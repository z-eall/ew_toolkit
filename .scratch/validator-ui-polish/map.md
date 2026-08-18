Label: wayfinder:map

## Destination

Ship the ten sidebar/problems-panel UI-polish behaviors the user listed for the EWP Validator (`ewp_validator/src`, mainly `main.ts`). Six are mechanical (funnel-fill indicator, count-badge reposition, group remove-button, notice-click-scroll, Clear-All dropdown, collapse bug fix) and go straight to implementation once their small open questions are settled here. Three had real ambiguity; two settled during charting (Clear Invalid scope, collapse-vs-cursor-follow precedence, order-freeze scope). One — focus-zone scoping (item 9) — is a genuine feasibility/conflict question against the existing cursor-sync code and is this map's one live ticket.

## Notes

- Domain: `ew_toolkit/ewp_validator` — a client-side (no backend) YAML validator app. Sidebar = file panel (`#file-list`), Problems panel = diagnosis groups (`#problems-list`), editor = Monaco.
- Key code: sort/filter menu `main.ts:592-688`, problems-panel render `main.ts:448-546`, cursor-follow sync `main.ts:1227-1246`, upload auto-sort `main.ts:967-969`, sort/filter pure logic `fileView.ts`, invalid-file category `fileNameCheck.ts:13` (`INVALID_FILE_CATEGORY = "Invalid file"`).
- This effort's Notes override the "plan, don't do" default for the six mechanical items below — they're implementation-ready, not decisions, and get built directly once this map's open ticket resolves (or in parallel, since they don't depend on it).
- Consult `/grilling` for the frontier ticket; it touches interaction design (focus/click zones) with a real conflict risk against `editor.onDidChangeCursorPosition`.

## Decisions so far

- [Clear Invalid scope](issues/01-clear-invalid-scope.md) — "Clear Invalid" removes files carrying the existing `INVALID_FILE_CATEGORY` ("Invalid file") diagnosis branch — non-EWP-structured filenames — not files with validation errors/warnings.
- [Collapse vs cursor-follow precedence](issues/02-collapse-cursor-follow-precedence.md) — a user's manual collapse of a diagnosis group always wins; cursor-follow updates `focusedProblemKey`/tab internally but never force-opens a group the user closed. Fixes the collapse bug (item 5) and satisfies item 8 in one change: drop the `&& group.file.id !== focusedFileId` override in `main.ts:516`.
- [Order-freeze scope for removing live-edit auto-sort](issues/03-order-freeze-scope.md) — file-panel row order freezes between the two real trigger points (upload-complete, explicit sort-menu pick). Filtering just hides/shows frozen rows; removing a file drops it from the frozen order; a file added outside upload appends at the end. Only upload-complete and an explicit dropdown pick recompute the sort.

## Not yet specified

- Implementation shape of the "frozen order" from the order-freeze decision (e.g. a stored array of file ids vs. a stable-sort key) — will fall out of building item 3, not a separate decision.

## Out of scope

(none yet)
