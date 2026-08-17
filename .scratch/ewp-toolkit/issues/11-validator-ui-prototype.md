# Prototype the validator page's UI/UX

Type: prototype
Status: open
Blocked by: (none)

## Question

With Vite + Monaco + monaco-yaml decided (ticket 05) and the structural pre-check validation approach decided (ticket 10), decide how the actual validator page should look and behave:

- Layout: single editor pane with errors inline (squiggles) only, or also a separate error list/panel?
- How does a scripter get their YAML in — file picker, drag-and-drop, paste, or some combination? Given ticket 01/06's decision to support both single-file and batch/folder validation, how does batch mode present multiple files (tabs? a file list sidebar?) and multiple files' worth of errors at once?
- How does the structural pre-check's guessed branch (per ticket 10) surface to the user, if at all — e.g. does an error message mention "interpreted as an EWP rule entry"?

Use the `/prototype` skill (UI branch) to build a few concrete layout variations to react to.
