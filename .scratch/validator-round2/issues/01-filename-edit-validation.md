# Validate filename against EWP structure on rename/edit

Type: grilling
Status: resolved
Blocked by: (none)

## Question

The scripter wants renaming a file (in-app, via the filename field) to be
checked against a valid EWP structural filename pattern — and if it doesn't
match, the edit can't be completed. Currently `fileNameCheck.ts` only
*diagnoses* an already-existing filename after the fact (producing an
`Invalid file` problem, see `INVALID_FILE_CATEGORY` in
`diagnosisCategories.ts`); it doesn't gate the rename input itself.

Grill toward a concrete answer:

1. What exactly counts as a "valid EWP structural filename" for this
   purpose — is it the same rule `fileNameCheck.ts` already encodes (verify
   by reading it), or does the scripter mean something stricter/looser for
   the *edit* case specifically?
2. Hard block vs. soft warn: the scripter's phrasing ("they can't complete
   the edit") suggests a hard block, but confirm — should there be an
   override/escape hatch (e.g. "Legacy but working" filenames that are
   non-standard but still function, per the existing `LEGACY_CATEGORY`
   precedent), or is this always a hard stop?
3. Where does the check run — on every keystroke, on blur/commit, or on an
   explicit "rename" action — and what does the rejected state look like
   (inline error under the field? a toast? the field just won't accept
   Enter)?
4. Does this affect the *initial upload* filename too, or only in-app
   renames? (Note: initial-upload filename handling may overlap with
   [Rework upload logic to prevent invalid files at intake](06-upload-logic-block-invalid.md)
   — coordinate scope with that ticket rather than deciding twice.)

## Resolution

**Q1 — same rule as `fileNameCheck.ts`.** Agreed as-is: `classifyFileName`
(the same function tickets 06/08 already use), no separate rule for the
edit case.

**Q2/Q4 — reversed from the first round's hard-block answer.** Initial
round agreed a hard stop for `"invalid"`, pass-through for `"legacy"`. On
reflection (prompted by the scripter noticing rename already lands in the
same reactive pipeline as upload), the decision flipped to **no block at
all** — same soft philosophy as [Rework upload logic](06-upload-logic-block-invalid.md)'s
warn-and-skip, for the same reason: the underlying rule is a heuristic
(ticket 08), and a hard reject on a heuristic that can be wrong removes the
scripter's only path to a name that's actually correct. `renameFile` always
commits; a mode-independent field-level note (see below) supplies immediate
feedback that used to be missing on this path entirely. The scripter also
asked (Q2 follow-up) that a rename landing on a **legacy** name explicitly
surface the legacy notice too, not silently pass — the field-level note
covers both severities, not just `invalid`.

**Q3 — resolved via a `/prototype` round, then refined live.** Three
structurally different presentations were built and driven live in-browser
(dev server, real DOM, real `checkFileName`): (A) tooltip + filename text
color, zero layout impact; (B) a persistent colored line under the header,
pushes layout; (C) a floating popover anchored under the filename,
auto-dismissing after a timer. Scripter's verdict: **C's popover + A's text
color, merged**, with the popover's auto-dismiss timer replaced by
dismiss-on-real-interaction (mousemove, click, or keystroke) instead — "no
timer, stays until the scripter does something else."

**Real bug found and fixed while wiring this up:** `fileManager.renameFile`
never called `revalidateOrDefer()` — unlike every other mutator
(upload, remove, move), a rename left `file.problems` stale until some
unrelated action forced a rescan. The scripter's framing ("we already have
another layer of check... it should trigger") assumed this already worked;
it didn't. Fixed in `fileManager.ts:353` so the Problems panel updates in
the same tick as the rename.

**Second bug found during live-verification:** the popover's dismiss
listeners were bubble-phase (`document.addEventListener(..., {once:true})`),
so a click into the Monaco editor never reached them — Monaco stops
propagation of its own mouse/keyboard handling before it bubbles to
`document`. Fixed by switching all three dismiss listeners to
`{capture: true}`; re-verified a synthetic editor click now dismisses the
popover correctly.

**Implemented** (`main.ts`, `filenameTextEl`'s blur handler + new
`showRenameNote`/`clearRenameNote` helpers; `fileManager.ts:353`;
`style.css` — `.rename-flag`, `.rename-note-popover` reusing the hub's
`--error`/`--info`/`--panel`/`--border` tokens, matching `confirmModal.ts`'s
box styling for visual consistency): renaming always commits; if the new
name isn't `"valid"`, the filename text recolors and a popover appears
with the exact `checkFileName` message (byte-identical to what the
Problems panel shows), staying up until the scripter moves the mouse,
clicks, or types anywhere. The prototype file (`prototype-rename-note.ts`)
and its dev-only import hook were deleted once the winning variant was
folded in.

`npx vitest run` (190/190), `npx tsc --noEmit` clean, `npm run build`
succeeded. Live-verified in browser preview: invalid rename → red text +
red popover + `Errors 1` in the same tick; legacy rename → blue text + blue
popover + `Info 1`; popover survives idle time (no timer) and correctly
dismisses on a real click into the editor after the capture-phase fix.
