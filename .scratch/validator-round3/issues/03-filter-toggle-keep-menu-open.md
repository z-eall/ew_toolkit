# FILTER select/deselect toggles keep the menu open

Type: task
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

Root cause: toggle-all is a `<button>` whose click handler re-renders the
menu (`innerHTML` replace) before the event bubbles to the document-level
"click outside to close" listener. The detached button is no longer
`contains()`'d by the menu, so the listener closes it. Checkbox handlers use
`change`, which fires after the click bubble completes while the input is
still mounted — so checkboxes never hit this path.

Fix: `e.stopPropagation()` on both toggle-all click handlers (matching
`.menu-reset`), in `renderSortFilterMenu` and `renderCatFilterMenu`.

`tsc --noEmit` clean.

## Question

The "Select all" / "Deselect all" toggle buttons under both FILTER menus
(file-panel sort/filter menu and Problems-panel category FILTER) currently
**close the menu on click** — unlike the individual checkboxes, which stay
open. The scripter wants toggle-all to behave like the checkboxes: update
filter state and re-render the menu, but leave it open.

Grounded context from
[Add select-all/unselect-all toggle](../validator-round2/issues/04-filter-select-all-toggle.md):
toggle-all is a `<button class="menu-item menu-toggle-all">` whose click may
propagate or interact with the document-level "click outside to close"
handlers (`main.ts:852-856`, `930-934`) differently from `<input
type="checkbox">` change handlers.

Fix both menus (`renderSortFilterMenu` toggle-all listener,
`main.ts:816-825`; `renderCatFilterMenu` toggle-all listener,
`main.ts:902-910`). Likely needs `e.stopPropagation()` on the button click
(and verify sort-item buttons are out of scope unless they share the bug).

Live-verify: open either FILTER menu → click Select all / Deselect all → menu
stays open, checkboxes update, panel re-filters.
