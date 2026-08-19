# Map: Confirm modal large file-list overflow

Labels: `wayfinder:map`

## Destination

The EWP validator's custom confirm modal (`confirmModal.ts`, [Custom confirmation modal](../validator-round2/issues/09-custom-confirm-modal.md)) stays fully usable when a call site lists hundreds or thousands of flagged filenames — the modal caps its height within the viewport, the file list scrolls inside a dedicated region, and the action buttons remain visible and clickable without scrolling the page. Verified at the scripter's repro scale (~1600 invalid files on upload).

## Notes

- **Domain**: EWP validator confirm flow; see [CONTEXT.md](../../CONTEXT.md) for scripter/validation terminology.
- **Skills every session should consult**: `grilling`, `domain-modeling`. Destination shipped in ticket 05 (local); live Pages waits on a push.
- **Standing preferences**:
  - Destructive confirms keep Enter disabled and Escape → cancel (ticket 09 — do not regress).
  - Upload-gate 3-way choice semantics are settled (Skip / Proceed / Cancel) — layout fix only, not behavior change.
  - Hub visual identity: reuse existing panel/border/shadow tokens.
- **Recovered into this git repo 2026-08-20.** Decisions were made in a sibling Cursor worktree (`ew_toolkit-cursor`) in [Cursor setup and checks](9afe6c86-b6d3-4f2a-8e23-bd129b3945fd) (19 Aug 2026, ~22:23–23:50 UTC+8). That worktree is not this repo's `main`. Round 3 in this chat never saw the map, so a CSS-only `max-height` on `.confirm-message` shipped instead of the prototype winner (always-boxed bullet list). Prototype files (`prototype-confirm-modal.html`, 3/12/160 file-count switcher) still live only in that worktree unless ticket 05 copies the look into production CSS.
- **Repro**: upload ~1600 files with many invalid names → invalid-file confirm grows past the browser frame; confirm buttons unreachable.

## Decisions so far

- [Which confirm call sites embed variable-length file lists?](issues/01-which-call-sites-need-scroll-treatment.md) — three sites (upload-gate, duplicate overwrite, clear invalid) embed unbounded filename lists; Remove folder and Clear all stay message-only.
- [What layout keeps confirm buttons on-screen when the file list is long?](issues/02-capped-modal-layout-and-scroll-region.md) — **always boxed**: summary pinned on top, bordered (dotted-token) scroll area for names even at 3 files, buttons pinned at bottom, max height `min(80vh, 640px)`.
- [How should the modal present 1600+ filenames without breaking UX or perf?](issues/03-extreme-count-list-presentation.md) — **full bullet list** (`ul/li`) inside the scroll box; same on all three long-list pop-ups; no “first N + and M more” cut-off.
- [Should confirmModal take a structured file list or stay message-only?](issues/04-confirm-modal-api-shape.md) — optional `fileList: string[]` + short `message`; modal renders bullets.
- [Implement scroll-capped confirm modal and verify at bulk-upload scale](issues/05-implement-and-verify-scroll-capped-modal.md) — `fileList` + always-boxed dashed bullet region; cap `min(80vh, 640px)`; wired on upload-gate, duplicate overwrite, clear-invalid. Tests/build clean; Pages not updated until commit+push.

## Not yet specified

- Automated test coverage for layout (likely live-verify only given DOM-modal nature).
- Narrow/mobile viewport behavior (secondary — primary repro is desktop bulk upload).

## Out of scope

- Changing upload-gate semantics (skip/proceed/cancel or the filename heuristic — see [Rework upload logic](../validator-round2/issues/06-upload-logic-block-invalid.md)).
- Virtual scrolling or pagination for 10k+ filenames (future hardening unless 1600 proves too slow).
- Replacing the custom modal with native `window.confirm()` (already rejected in ticket 09).
- Hub-wide shared confirm component extraction to `shared/` (deferred in ticket 09 until a second Tool needs it).
- [Prototype blank page — broken asset paths](issues/00-prototype-blank-page.md) — throwaway-dev-server path bug, not a product decision.
