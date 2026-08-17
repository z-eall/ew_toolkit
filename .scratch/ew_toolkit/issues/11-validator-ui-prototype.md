# Prototype the validator page's UI/UX

Type: prototype
Status: resolved
Blocked by: (none)

## Question

With Vite + Monaco + monaco-yaml decided (ticket 05) and the structural pre-check validation approach decided (ticket 10), decide how the actual validator page should look and behave:

- Layout: single editor pane with errors inline (squiggles) only, or also a separate error list/panel?
- How does a scripter get their YAML in — file picker, drag-and-drop, paste, or some combination? Given ticket 01/06's decision to support both single-file and batch/folder validation, how does batch mode present multiple files (tabs? a file list sidebar?) and multiple files' worth of errors at once?
- How does the structural pre-check's guessed branch (per ticket 10) surface to the user, if at all — e.g. does an error message mention "interpreted as an EWP rule entry"?

Use the `/prototype` skill (UI branch) to build a few concrete layout variations to react to.

## Answer

**Chosen: Variant B — sidebar file list (with per-file error-count badges) + main editor + a bottom "Problems" panel listing every error across all loaded files at once, each row clickable to jump to that file.**

Three variants were built and compared (branch [`prototype/validator-ui-layout`](https://github.com/z-eall/ewp_toolkit/tree/prototype/validator-ui-layout), file `prototypes/PROTOTYPE-validator-ui-layout.html`):
- A — tabbed single-file, inline-squiggle-only errors.
- **B — chosen.** Sidebar + Problems panel, IDE-style.
- C — continuous merged scroll of all files with margin error-hotspots and a jump-to-next-error control.

B most directly serves the original "debugging correlated multi-file systems" pain point (from the round-1 grilling that shaped this whole map): every file's error count is visible in the sidebar without opening it, and the Problems panel surfaces every error across the whole loaded batch in one flat list — no need to hunt file-by-file. This becomes the layout target when the real validator page is built (post ticket 12's repo scaffold).

Errors surface the structural pre-check's guessed branch (ticket 10) inline in the message text, e.g. "interpreted as EWP rule entry."
