# What layout keeps confirm buttons on-screen when the file list is long?

Type: grilling
Status: resolved
Blocked by: 01
Parent: [Confirm modal large file-list overflow](../map.md)

## Question

Design the capped modal layout for confirms that list many filenames. The scripter's requirement: once a file-count threshold is hit (or whenever the list would overflow), the box stops growing and the flagged-file list scrolls; action buttons stay visible without leaving the viewport.

Throwaway prototype (3 / 12 / 160 file live states) lived in the Cursor worktree: `ewp_validator/prototype-confirm-modal.html` + `src/prototype/confirm-modal-large-list.ts`. Not on this repo's `main`.

## Answer

**Scripter chose Q1-B: Always boxed** (19 Aug 2026, [Cursor setup and checks](9afe6c86-b6d3-4f2a-8e23-bd129b3945fd)).

- Summary line stays on top (does not scroll).
- File names always sit in a bordered scroll box — even for 3 files. The scripter described this as **always box and dotted** (prototype used a dashed/bordered inner list region vs a growing paragraph).
- Buttons always stay pinned at the bottom of the pop-up.
- Pop-up max height: `min(80vh, 640px)` so it never leaves the screen on a normal desktop.

Matches hub UX standing rules: same panel look as other validator menus, clear separation between message and list, actions always reachable.

Prototype winner: **Always boxed + ul/li** (see [How should the modal present 1600+ filenames](03-extreme-count-list-presentation.md)).
