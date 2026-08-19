# How should the modal present 1600+ filenames without breaking UX or perf?

Type: grilling
Status: resolved
Blocked by: 01
Parent: [Confirm modal large file-list overflow](../map.md)

## Question

At the scripter's repro scale (~1600 invalid files on one upload), how should the confirm modal show filenames?

## Answer

**Scripter chose: always boxed + bullet list (`ul/li`).**

- Every flagged file name is one bullet line inside the scroll box.
- Full list — no “first 20 only” cut-off at v1 (scripter must review all flagged names before Skip / Proceed / Cancel).
- Same list style on all three long-list pop-ups (upload gate, duplicate overwrite, clear invalid files).
- Scroll region gets a plain label for screen readers: e.g. `Flagged files (N)`.

Fits hub message-quality / UX standing rules: plain words in the summary, structured list for scanning many names, control buttons always visible.
