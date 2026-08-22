# Map: Confirm modal large file-list overflow

Labels: `wayfinder:map`

## Destination

The EWP validator's custom confirm modal ([confirmModal.ts](../../ewp_validator/src/confirmModal.ts), ticket 09) stays fully usable when a call site lists hundreds or thousands of flagged filenames — the modal caps its height within the viewport, the file list scrolls inside a dedicated region, and the action buttons remain visible and clickable without scrolling the page. Verified at the scripter's repro scale (~1600 invalid files on upload).

## Notes

- **Domain**: EWP validator confirm flow; see [CONTEXT.md](../../CONTEXT.md) for scripter/validation terminology.
- **Skills every session should consult**: `grilling`, `domain-modeling`, `implement`, `prototype`
- **Standing preferences**:
  - Destructive confirms keep Enter disabled and Escape → cancel (ticket 09 resolution — do not regress).
  - Upload-gate 3-way choice semantics are settled (Skip / Proceed / Cancel) — layout fix only, not behavior change.
  - Hub visual identity: reuse existing panel/border/shadow tokens (`.confirm-box` already matches `.sortfilter-menu` chrome).
- **Repro confirmed by scripter**: upload ~1600 files with many invalid names → invalid-file confirm grows past browser frame; confirm buttons unreachable.
- **Root cause (exploration, not yet ticketed as a decision)**: `.confirm-box` has `max-width: 420px` but no height cap; `.confirm-message` renders the entire `\n`-joined filename blob as one `<p>` with `white-space: pre-line`, so the button row is pushed off-screen.

## Decisions so far

- [Which call sites need scroll treatment?](issues/01-which-call-sites-need-scroll-treatment.md) — three sites (upload-gate, duplicate overwrite, clear invalid) embed unbounded filename lists; Remove folder and Clear all stay message-only.
- [Capped modal layout](issues/02-capped-modal-layout-and-scroll-region.md) — **always boxed**: summary on top, bordered scroll area for names, buttons pinned at bottom, max height `min(80vh, 640px)`.
- [Large list presentation](issues/03-extreme-count-list-presentation.md) — **full bullet list** inside scroll box; same on all three long-list pop-ups.
- [confirmModal API](issues/04-confirm-modal-api-shape.md) — optional `fileList: string[]` + short `message`; modal renders bullets.

## Not yet specified

- Whether all five `showConfirmModal` call sites get the scroll treatment or only the three that embed variable-length file lists (upload-gate, duplicate-overwrite, clear-invalid). **→ three only** ([ticket 01](issues/01-which-call-sites-need-scroll-treatment.md)).
- Max-height rule: viewport-relative (`min(80vh, …)`) vs fixed pixel cap vs both. **→ `min(80vh, 640px)`** ([ticket 02](issues/02-capped-modal-layout-and-scroll-region.md)).
- Whether the summary line ("N uploaded files don't match…") stays pinned above the scroll region while filenames scroll beneath it. **→ yes, pinned** ([ticket 02](issues/02-capped-modal-layout-and-scroll-region.md)).
- List presentation at extreme counts: full scrollable list vs "first N names + and M more" truncation for DOM/perf. **→ full bullet list** ([ticket 03](issues/03-extreme-count-list-presentation.md)).
- Whether `ConfirmModalOptions` gains a structured `fileList: string[]` (or similar) separate from `message`, or the fix is CSS-only on the existing monolithic message string. **→ optional `fileList`** ([ticket 04](issues/04-confirm-modal-api-shape.md)).
- Automated test coverage for layout (likely manual/live-verify only given DOM-modal nature).
- Narrow/mobile viewport behavior (secondary — primary repro is desktop bulk upload).

## Out of scope

- Changing upload-gate semantics (skip/proceed/cancel choices or filename heuristic itself — see [06-upload-logic-block-invalid.md](../validator-round2/issues/06-upload-logic-block-invalid.md)).
- Virtual scrolling or pagination for 10k+ filenames (future hardening unless grilling surfaces a need at 1600).
- Replacing the custom modal with native `window.confirm()` (already rejected in ticket 09).
- Hub-wide shared confirm component extraction to `shared/` (explicitly deferred in ticket 09 until a second Tool needs it).
