# Rename Save to Export with an appropriate icon

Type: task
Status: resolved
Blocked by: (none)

## Question

`#save-btn` (`main.ts:184`, icon at `ICONS.save`, `main.ts:102`) currently
shows only a floppy-disk icon with `title="Save" aria-label="Save"` — no
"Save" text is even visible today (icon-only button), so this is really a
tooltip/label + icon change, not a visible-text relabel:

1. Change `title`/`aria-label` from "Save" to "Export" (and any other
   Save-labeled string nearby — `SAVE_OPTIONS`'s three entries at
   `main.ts:1435-1439` currently read "Save this file"/"Save this
   folder"/"Save all"; reword to "Export this file"/"Export this folder"/
   "Export all" for consistency, since the destination for this map also
   covers fixing "Save all"'s freeze — see
   [Fix the "Save all" freeze bug](03-save-all-freeze-bug.md)).
2. Replace the floppy-disk icon (a save-to-disk metaphor that doesn't match
   "download a file out of the browser") with a standard "export" glyph — a
   box/document with an arrow leaving it (the common export icon shape used
   by Feather/Material/Lucide icon sets: an outward-pointing arrow from a
   tray or box), distinct from a plain "download into tray" arrow so it
   doesn't read as identical to a browser's own download icon. Add as a new
   `ICONS.export` entry alongside the existing `ICONS` map (`main.ts:~95-110`
   — check exact range) rather than repurposing `ICONS.save` in place, since
   `ICONS.save` may still be referenced elsewhere.
3. Any element `id`s (`#save-btn`, `.savemenu`, `SAVE_OPTIONS`) can stay as
   internal identifiers — only user-facing text/icon needs to change, per
   this project's usual practice of not renaming internals purely for a
   copy change.

Verify live: screenshot the button showing the new icon + hovering to
confirm the "Export" tooltip, and the dropdown showing the three reworded
options.

## Answer

Done, resolved together with
[Move panel toolbar buttons before their panel's first content item](01-toolbar-button-placement.md)
since both touched `#save-btn`. `title`/`aria-label` changed from
"Save"/"Save" to "Export"/"Export" (`main.ts`). Added a new `ICONS.export`
entry (arrow leaving an open tray upward — Lucide/Feather's standard
"upload/export" glyph) rather than repurposing `ICONS.save` in place, since
`save` is a plain, generically-named export and could still be reused
elsewhere later; `#save-btn` now renders `ICONS.export`. `SAVE_OPTIONS`
(`main.ts`) reworded: "Save this file/folder/all" → "Export this
file/folder/all"; the section comment above it renamed from "Save (this
file / this folder / all)" to "Export (...)". Internal identifiers
(`#save-btn`, `.savemenu`, `SAVE_OPTIONS`, `SaveScope`, `doSave`) intentionally
left unchanged — user-facing text/icon only, per this project's usual
practice.

Live-verified: hovering the button and reading the accessibility tree
confirms the "Export" label; clicking it shows the dropdown reading "Export
this file / Export this folder / Export all". 173/173 tests passing,
type-check clean.
