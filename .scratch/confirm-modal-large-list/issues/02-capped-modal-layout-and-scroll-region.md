# What layout keeps confirm buttons on-screen when the file list is long?

Type: grilling
Status: resolved
Blocked by: 01

## Question

Design the capped modal layout for confirms that list many filenames. The scripter's requirement: once a file-count threshold is hit (or whenever the list would overflow), the box stops growing and the flagged-file list scrolls; action buttons stay visible without leaving the viewport.

## Answer

**Scripter chose Q1-B: Always boxed.**

- Summary line stays on top (does not scroll).
- File names always sit in a bordered scroll box — even for 3 files.
- Buttons always stay pinned at the bottom of the pop-up.
- Pop-up max height: `min(80vh, 640px)` so it never leaves the screen on a normal desktop.

Matches hub UX standing rules: same panel look as other validator menus, clear separation between message and list, actions always reachable.

Prototype winner: **Always boxed + ul/li** (see ticket 03).
