# Move panel toolbar buttons before their panel's first content item

Type: task
Status: resolved
Blocked by: (none)

## Question

Reposition four controls to sit *before* the first content item in their
panel header, with a visible gap, instead of after it:

1. **"+ New file"** (`#new-file-btn`) and **Save** (`#save-btn`, see also
   [Rename Save to Export](02-save-to-export-rename.md)) — currently both
   render inside `.filename-actions` (`main.ts:179-186`), which sits *after*
   the filename text via `margin-left:auto` (`style.css:747-753`). Move both
   to *before* the filename (i.e. the leftmost content of the editor panel
   header, `.active-file-name`, `style.css:712-720`).
2. **Diagnosis category filter** (`#catfilter-btn`) — currently renders
   inside `.problems-actions` (`main.ts:195-198`), which sits *after*
   `.problems-tabs` (the Errors/Warnings/Info/This file tabs,
   `main.ts:192-193`, `style.css:818-825`). Move it to *before* those tabs.
3. **"File a report"** (`#report-btn`) — same header, currently last in
   `.problems-actions` (`main.ts:199-202`). Per the scripter's request this
   also moves to the left, before "Errors" — grouped with the filter button
   (both left of the tabs), not split apart.

## Notes

- The governing flex containers (`.active-file-name`, `.problems-header`)
  already use `gap` (8px) — moving markup order is enough for the "close
  together but with some gap" ask; `.filename-actions`'s `margin-left:auto`
  needs removing/reversing so it no longer pins to the right once it's
  first.
- "Some gap" between the moved button cluster and the panel's own first item
  (filename text / "Errors" tab) should read as a deliberate group
  separation, not just the default inter-icon gap (2px in `.sidebar-actions`/
  `.filename-actions`/`.problems-actions` today) — use a slightly larger gap
  or a thin divider between the button cluster and the text/tabs that follow.
- Verify live in the browser preview after the change (per this project's
  `<verification_workflow>`): screenshot both panel headers, confirm visual
  order and spacing read correctly, and that button click targets (New,
  Save/Export, filter, report) still work.

## Answer

Done. In `main.ts`, `.filename-actions` (New + Export) now renders *before*
`.filename-text` inside `.active-file-name`, and `.problems-actions`
(category filter + report) now renders *before* `.problems-tabs` inside
`.problems-header` — pure markup reordering, no new elements. In
`style.css`: `.filename-actions` lost its `margin-left: auto` (which used to
pin it right) and gained `margin-right: 4px; padding-right: 8px;
border-right: 1px solid var(--border)` to read as a deliberate group
separated from the filename by a visible divider + gap, not just the default
2px inter-icon spacing; `.filename-text` gained `flex: 1` so it still
absorbs remaining width and ellipsizes correctly now that it's the second
flex child instead of the first. `.problems-actions` got the same
margin-right/border-right treatment for the same reason (its comment updated
from "pinned to the right" to reflect the new position).

The [Rename Save to Export](02-save-to-export-rename.md) ticket was resolved
in the same edit since it touched the exact same button — see that ticket's
own Answer for the icon/label details.

Live-verified: screenshot of the editor panel header shows +/Export icons
before "unnamed.yaml" with a divider; screenshot of the Problems panel
header shows the filter/report icons before the Errors/Warnings/Info/This
file tabs; `read_page`'s accessibility tree confirms button order and labels
(`Add new`, `Export`, then `Filter diagnoses by category`, `File a report`,
then `Show errors`/`Show warnings`/`Show info`/`Show only the active file's
problems`). 173/173 tests passing, type-check clean.
