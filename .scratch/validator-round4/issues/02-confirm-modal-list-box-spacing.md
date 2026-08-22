# Fix confirm-modal dashed file-list box sitting flush against its button row

Type: task
Status: open
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

(pending)
