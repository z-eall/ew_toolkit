# Add select-all/unselect-all toggle under both FILTER menus

Type: task
Status: resolved
Blocked by: (none)

## Question

Not a real decision — the ask is concrete: an extra button under both
FILTER features (file-panel filter and diagnosis/problems-panel filter —
confirm both are meant, they're separate menus in `main.ts`) that toggles
select/unselect-all for that filter's checkbox list, so the scripter doesn't
have to click every option individually.

Covers:

1. Locate both filter dropdown implementations in `main.ts` (sort/filter
   menu logic per the code map in the
   [Validator UI Polish map](../validator-ui-polish/map.md) Notes,
   `main.ts:592-688`) and the diagnosis-category filter menu added this
   session.
2. Add a "Select all" / "Deselect all" toggle button (single button that
   flips label+behavior based on current state, matching this app's
   existing toggle-button conventions elsewhere) at the bottom or top of
   each filter's checkbox list.
3. Wire it to the same state each filter's individual checkboxes already
   drive, so it's a pure convenience action with no new state model.
4. Add/extend tests covering the toggle's select-all and deselect-all
   behavior for both filters.

## Answer

Confirmed both FILTER menus per the question's framing: the file-panel
FILTER (`sortfilter-menu`, `main.ts:740-828`) and the Problems-panel
diagnosis-category FILTER (`catfilter-menu`, `main.ts:845-...`).

Added one shared, generic pure helper — `toggleAllSelection(current, options)`
in [fileView.ts](../../../ewp_validator/src/fileView.ts) — that returns every
option selected if any are currently unselected, or an empty selection if
every option is already selected (mirrors the "single button flips
label+behavior based on current state" ask). Both menus render a
`renderToggleAllButton()`-produced `<button class="menu-item menu-toggle-all">`
at the bottom of their checkbox list, labeled "Select all"/"Deselect all"
based on current state, and wire it to `toggleAllSelection` against
`sidebarFilters` (file-panel, all 3 `FILTER_OPTIONS`) and `categoryFilter`
(Problems-panel, only the currently-*present* categories — matching how the
individual category checkboxes already scope themselves) respectively. No
new state model — both write into the same `Set`s the existing per-option
checkboxes already drive.

New CSS class `.menu-toggle-all` (style.css) gives it a subtle top-border/
muted treatment so it reads as a list-level action, not another option.

Tests: `toggleAllSelection` is unit-tested directly in
[fileView.test.ts](../../../ewp_validator/src/fileView.test.ts) (select-from-
none, select-from-partial, deselect-from-all, empty-options edge case, and a
generic-string-category case) — `main.ts` itself has no unit-test coverage
(no `main.test.ts` exists; it isn't DOM-test-friendly, per the existing repo
convention of keeping all sort/filter logic pure and tested in `fileView.ts`
rather than probed through the rendered panel).

182/182 tests passing, `tsc --noEmit` clean, `npm run build` clean.
Live-verified in the browser preview: file-panel FILTER toggle flips
"Deselect all" → unchecks all 3 status checkboxes → relabels "Select all",
and back; Problems-panel category FILTER (loaded a file that produced an
"Invalid file" diagnosis) shows the same flip and correctly clears/restores
`categoryFilter`. Noted in passing, not introduced by this change: clicking
any button-type menu item that re-renders its own menu (already true of the
existing `.sort-item` buttons) closes the menu on that click, same as this
new toggle-all button — a pre-existing app-wide interaction pattern, out of
this ticket's scope.
