# Custom confirmation modal component: replace window.confirm() hub-wide

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Surfaced while implementing [Rework upload logic](06-upload-logic-block-invalid.md)'s
warn-and-skip flow: the scripter wants the upload-gate confirm to be a real
3-way choice (Skip these files / Proceed anyway / Cancel the whole upload),
which native `window.confirm()` cannot express — it is hard-capped at two
buttons (OK/Cancel) in every browser, no exceptions. A custom in-app modal
is required for this one call site.

The scripter's follow-up: since a custom modal is being built anyway,
**recheck the whole hub suite for every `confirm()`/`alert()`/`prompt()`
call and rework them together**, so the hub's UI/UX consistency standing
rule (minimalist dark chrome, outline-SVG icons, locked by
[ticket 18](../../ew_toolkit/issues/18-landing-page-prototype.md)) isn't
violated by leaving some confirmations native-browser-styled and others
custom.

## Ground already covered (hub-wide audit, no AFK dispatch needed — plain grep sufficed)

Searched every `.ts`/`.tsx`/`.js` file under the whole `ew_toolkit/` tree
(hub shell + every Tool) for `confirm(`, `alert(`, `prompt(`. Result: **all
5 hits are in one file**, `ewp_validator/src/main.ts` — no other Tool
exists yet with any confirm-style dialog (matches [[EW Toolkit]]'s current
tiering: only the validator is live). The hub-wide audit this ticket asked
for is therefore already exhaustive; nothing outside this file needs
touching.

The 5 call sites, current semantics:

1. **Remove folder** (`main.ts:442`) — destructive, 2-way (Remove / Cancel).
2. **Upload-gate skip** (`main.ts:1116`, this session's new addition) —
   non-destructive, needs 3-way (Skip these files / Proceed anyway / Cancel
   whole upload) per the scripter's ask — currently only 2-way
   (Add anyway / Cancel-and-skip), missing the "abort everything" option
   entirely.
3. **Duplicate file overwrite** (`main.ts:1145`) — destructive
   (overwrites existing content), 2-way (Overwrite / Cancel whole upload).
4. **Clear all files** (`main.ts:1405`) — destructive, 2-way (Clear / Cancel).
5. **Clear invalid files** (`main.ts:1415`) — destructive, 2-way
   (Clear / Cancel).

**Scripter's standing-rule ask (Q2 follow-up):** "this type of question
[primary-button choice] should be checked and reviewed every time before
implement" — read as a request for a durable checklist item, not a one-off
answer. Drafted for [EW Toolkit map](../../ew_toolkit/map.md) Notes
(pending this ticket's resolution, not yet added): *"Any confirm-style
modal's primary/default button must be explicitly chosen and stated per
use case before implementing — never assumed from a generic OK/Cancel
convention. State which action is primary and why (safety default vs.
task-completion default) in the resolution."*

## Grill toward a concrete answer

1. **Shared component shape:** one reusable helper (e.g.
   `showConfirmModal({ title, message, buttons: [...] })`) driving all 5
   sites via config, rather than 5 bespoke modals — confirm this is wanted
   over per-site custom markup.
2. **Keyboard semantics:** native `confirm()` gives Enter→OK, Escape→Cancel
   for free. A custom modal has to decide this explicitly, and the 4
   destructive sites raise a real risk: should Enter be wired to a button
   at all when every choice but one is destructive (Clear all, Clear
   invalid, Remove folder, Overwrite), or should those require an explicit
   click with no keyboard default, while Escape still safely maps to
   Cancel/abort everywhere?
3. **Per-site button labels + primary choice**, now that generic OK/Cancel
   is gone and every button needs real words:
   - Upload-gate (3-way): confirmed — primary = **Skip these files**
     (scripter's Q2 answer). Middle = "Proceed anyway", third = "Cancel
     upload" (aborts the whole batch, not just the flagged files — new
     capability this ticket adds, since today's duplicate-check step is
     the only point that can currently abort a whole upload).
   - Remove folder / Clear all / Clear invalid / Overwrite duplicate: keep
     the current 2-way semantics (no new 3rd option asked for on these),
     but each needs its primary button chosen per the new standing rule —
     recommend the **non-destructive** option (Cancel) as primary/default
     everywhere except Overwrite duplicate, where "Cancel whole upload" is
     itself the safe default too. Confirm or override per-site.
4. **Visual accent:** should destructive confirms (Remove folder, Clear
   all, Clear invalid, Overwrite) carry a distinct accent (e.g. the same
   error-red token `INVALID_FILE_CATEGORY` diagnoses already use) versus a
   neutral accent for the non-destructive upload-gate confirm — or should
   all 5 share one neutral style, since [ticket 18](../../ew_toolkit/issues/18-landing-page-prototype.md)'s
   locked identity doesn't currently define a danger/warning color token?
5. Once resolved: rework all 5 call sites onto the shared component in one
   pass (touches only `main.ts`, all within this ticket's scope — no
   `fileManager.ts`/`referenceValidation.ts`/`zip.ts`/export-button changes
   needed), add the standing-rule checklist item to
   [EW Toolkit map](../../ew_toolkit/map.md) Notes, live-verify all 5
   dialogs in browser preview.

## Handed off — one answer already pinned, don't re-litigate

Before handoff, the scripter had already answered part of Q3 (primary
button, upload-gate site only): **primary = "Skip these files"** for the
3-way upload-gate confirm specifically — reasoning given was the same
safety-default principle now generalized into this ticket's proposed
standing rule (Q3 here). Whichever session resolves this ticket should
treat that one answer as settled and only grill the remaining per-site
choices (the other 4 confirms) plus Q1/Q2/Q4 above.

## Answer

**Audit correction found while resolving (worth recording, doesn't change
scope):** the handoff's "5 hits, all `confirm()`" audit missed a 6th native
dialog — `window.addEventListener("beforeunload", ...)` at `main.ts:1454`,
which warns on unsaved-work exit (refresh, tab close, or nav-link click,
since those are plain `<a href>` navigations that trigger the same unload
event). It's correctly excluded from this rework, not by oversight: every
browser hard-blocks replacing the `beforeunload` dialog with custom UI — a
site's JS can only trigger the browser's own fixed native prompt via
`preventDefault()`/`returnValue`, never render styled markup there. The
scripter also asked to add an unsaved-changes refresh warning; confirmed
this already exists and already covers refresh specifically, so no new work
was needed there — scripter agreed the existing native prompt is
sufficient.

**Q1 — Shared component:** yes, one reusable `showConfirmModal({ message,
buttons, cancelValue, allowEnter })` helper drives all 5 sites via config.

**Q2 — Location:** kept local to `ewp_validator` (`src/confirmModal.ts`),
not `shared/` — the audit found no other Tool has any confirm dialog yet,
so there's no second consumer to prove a shared shape against (same
discipline already applied to the theme-toggle-mechanism duplication, see
[Add a shared icon/token module](../../ew_toolkit/issues/20-shared-icon-token-module.md)'s
Answer). Styled with the shared identity tokens from that same ticket so it
still reads as the same site.

**Q2 (keyboard):** no Enter default on any of the 4 destructive confirms —
Enter is unconditionally swallowed (`e.preventDefault()`, no button fires)
so a stray keypress can never cause data loss; only an explicit click
activates any button there. Escape always resolves to the safe/cancel
value on every site, destructive or not. The one non-destructive site
(upload-gate) opts in to Enter → primary via `allowEnter: true`.

**Q3 — Per-site primary buttons:** Cancel/safe choice is primary on all 4
destructive sites (Remove folder, Overwrite duplicate → "Cancel upload",
Clear all, Clear invalid files), per the scripter's own generalized
safety-default reasoning. Upload-gate keeps its pre-pinned primary, "Skip
these files."

**Q4 — Visual accent:** destructive actions reuse the validator's existing
`--error` token as a `.danger` accent on that one button only (border +
text color, inverts to a solid error fill on hover) — reusing an existing,
already-meaningful color rather than inventing a new one or leaving every
button visually identical regardless of consequence.

**Standing rule added**, per the scripter's Q2 follow-up, to
[EW Toolkit map](../../ew_toolkit/map.md) Notes (message-quality checklist,
new item 9): any confirm-style modal's primary/default button must be
explicitly chosen and stated per use case — never assumed from a generic
OK/Cancel convention.

**Implemented:**
- [confirmModal.ts](../../../ewp_validator/src/confirmModal.ts) (new) —
  the shared helper, all 5 call sites' config documented in its own doc
  comment.
- `style.css` — `.confirm-overlay`/`.confirm-box`/`.confirm-buttons`/
  `.confirm-btn` (+ `.primary`/`.danger` variants), matching the existing
  `.sortfilter-menu` panel/border/shadow convention.
- `main.ts` — all 5 `confirm()` calls replaced: Remove folder, the
  upload-gate (now a real 3-way — "Cancel upload" is a genuinely new
  capability, since today's duplicate-check step was previously the only
  point that could abort a whole upload), duplicate-overwrite, Clear all,
  Clear invalid files. Each enclosing handler became `async` to `await` the
  modal's promise.

**Verified:** `npx vitest run` (190/190, unchanged — no test exercised
`confirm()` directly), `npx tsc --noEmit` clean, `npm run build` succeeded.
Live-verified in the browser preview: confirmed the Clear-all dialog's
button roles/focus (Cancel primary+focused, Clear all danger), that a
pressed Enter does nothing on it (file count unchanged, dialog stays open),
that Escape safely closes it; confirmed the upload-gate's real 3-way
buttons render with "Skip these files" primary+focused and Enter correctly
triggers it; spot-checked Clear-invalid-files end-to-end (correct message,
successful clear). No new console errors in any case (pre-existing
Monaco-worker dev noise unrelated, confirmed present before this ticket
too).
