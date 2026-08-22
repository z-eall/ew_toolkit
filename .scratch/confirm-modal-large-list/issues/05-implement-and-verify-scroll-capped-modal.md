# Implement scroll-capped confirm modal and verify at bulk-upload scale

Type: task
Status: open
Blocked by: 02, 03, 04

## Question

Implement the layout, list presentation, and API shape decided in tickets 02–04 across every call site ticket 01 marked as needing scroll treatment. Verify:

- scripter repro (~1600 invalid files): buttons remain on-screen; list scrolls inside modal
- short lists (1–5 files): modal still looks unchanged / not awkwardly tall
- all five confirm flows still pass ticket 09 keyboard/focus rules (Enter on upload-gate only, Escape → cancel everywhere)
- `npx vitest run`, `npx tsc --noEmit`, `npm run build` clean
- live browser check on upload-gate, duplicate overwrite, and clear-invalid paths

Record any manual test notes in the ticket answer; link the resolving commit.
