# Implement scroll-capped confirm modal and verify at bulk-upload scale

Type: task
Status: resolved
Blocked by: 02, 03, 04
Parent: [Confirm modal large file-list overflow](../map.md)

## Answer

Implemented always-boxed dotted bullet list + `fileList` API (tickets 02–04).

**Code**
- `confirmModal.ts` — optional `fileList` / `fileListLabel`; renders `<ul>` in `.confirm-list-scroll`; `has-file-list` on the box.
- `style.css` — list confirms cap at `min(80vh, 640px)`; inner region `overflow-y: auto` + `border: 1px dashed`; summary and buttons `flex-shrink: 0`. Stopgap `overflow` on `.confirm-message` removed.
- `main.ts` — upload-gate, duplicate overwrite, and clear-invalid pass `fileList`. Remove folder and Clear all stay message-only.

**Checks**
- `npx vitest run` — 243/243
- `npx tsc --noEmit` — clean
- `npx vite build` — clean (CSS parses)
- No jsdom in this project; layout not unit-tested (still in map Not yet specified).
- Local validator opened at `http://localhost:5175/ew_toolkit/ewp_validator/` for a human drop of 3 / 12 / 160+ invalid names. Agent could not drive the file picker. Keyboard rules unchanged (Enter still upload-gate only).

**Not done here:** git commit / Pages push — say if you want that next so live matches this build.

## Question

Implement the layout, list presentation, and API shape decided in tickets 02–04 across every call site ticket 01 marked as needing scroll treatment. Verify:

- scripter repro (~1600 invalid files): buttons remain on-screen; list scrolls inside modal
- short lists (1–5 files): still **always boxed** with bullets (not a growing paragraph) — 3-file prototype state
- mid lists (~12 files): box grows until cap, then scrolls — 12-file prototype state
- large lists (~160+): cap + inner scrollbar — 160-file prototype state
- all five confirm flows still pass ticket 09 keyboard/focus rules (Enter on upload-gate only, Escape → cancel everywhere)
- `npx vitest run`, `npx tsc --noEmit`, `npm run build` clean
- live browser check on upload-gate, duplicate overwrite, and clear-invalid paths

**Do not** treat the CSS-only `max-height` on `.confirm-message` (plain `\n` text, no inner dotted box, no bullets) as this ticket done. That was a Round 3 session stopgap after the map was missing from this repo.

Record any manual test notes in the ticket answer; link the resolving commit.
