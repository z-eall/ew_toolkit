# Fix confirm-modal dashed file-list box sitting flush against its button row

Type: task
Status: resolved
Blocked by: (none)
Parent: [Validator Round 4 map](../map.md)

## Question

The scripter reported the upload-limit dashed-line file-list box's margin
"sticking to" the bottom buttons in the confirm modal (the upload-gate /
large-file-list confirm from `confirmModal.ts`, styled by
`.confirm-list-scroll` + `.confirm-buttons` in `style.css`).

Live-verified: injected a real `.confirm-box.has-file-list` (matching
`confirmModal.ts`'s exact DOM shape) into the running preview and
screenshotted it — the dashed `.confirm-list-scroll` box sits with zero gap
against the `.confirm-buttons` row directly below it.

Root cause (`style.css`):
- `.confirm-box` (~1264-1274) is `display: flex; flex-direction: column;`
  with no `gap`.
- `.confirm-list-scroll` (~1296-1304) sets no `margin-bottom`.
- `.confirm-buttons` (~1319-1324) sets no `margin-top`.

`.confirm-message` does get a margin-bottom (16px, or 12px when
`.has-file-list`, ~1282-1294), so the message-to-box gap already looks
intentional — the box-to-buttons gap is the one spacing rule that was never
added.

Fix: add breathing room between the file-list box and the button row —
either a `gap` on `.confirm-box` (simplest, but check it doesn't also want
to affect the message-to-box spacing, which already has its own explicit
margin) or a `margin-top` on `.confirm-buttons` when `.has-file-list` is
present. Match the existing visual rhythm used elsewhere in this modal
(8-16px range) rather than inventing a new spacing scale.

Live-verify: re-run the same live-injection repro (or trigger a real
upload-gate confirm with 3+ flagged files) and screenshot the result showing
clear separation between the dashed box and the buttons.

## Answer

Added `margin-bottom: 12px` directly to `.confirm-list-scroll` (`style.css`
~1296-1305), matching the 12px rhythm `.confirm-box.has-file-list
.confirm-message` already uses for its own bottom margin (~1293-1295) rather
than inventing a new spacing value or reaching for `gap` on `.confirm-box`
(which would also touch the message-to-box spacing, already handled
explicitly). `.confirm-list-scroll` only ever renders inside
`.has-file-list` boxes (confirmed via `confirmModal.ts`:57,68 — the element
is only created when `names.length > 0`, the same condition that adds the
`has-file-list` class), so no `.has-file-list` qualifier is needed on the
new rule.

Live-verified by injecting the exact DOM shape `confirmModal.ts` builds
(`.confirm-overlay > .confirm-box.has-file-list > .confirm-message +
.confirm-list-scroll > ul > li × 3` + `.confirm-buttons`) into the running
preview and measuring `getBoundingClientRect()`: the gap between
`.confirm-list-scroll`'s bottom edge and `.confirm-buttons`'s top edge is
now 12px (was 0 before the fix). `npx vitest run` (243 tests) and `npx tsc
--noEmit` both pass clean.

(Same tooling caveat as [ticket 01](01-standardize-control-font-family.md)
applied here — screenshot capture is unavailable in this session's Browser
pane, so verification used `getBoundingClientRect()`/`getComputedStyle` via
`javascript_tool` instead of a visual screenshot.)
