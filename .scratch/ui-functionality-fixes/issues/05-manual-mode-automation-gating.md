# Review and fix Manual mode's automation gates

Type: grilling
Status: resolved (2026-08-19, validator-round2 grilling pass)
Blocked by: (none)

## Answer

Grilled and resolved with the scripter, 2026-08-19:

1. **Manual mode means zero automatic revalidation, full stop.** No size-based
   exception — only the Validate button (or switching Manual → Auto) ever
   triggers a pass while Manual is selected. The class-doc comment's old
   "keystroke edits are exempt" framing is removed.
2. **Re-upload of an already-loaded file is fixed** to mark the batch stale
   instead of auto-validating — it reaches `onContentChanged` via the same
   `model.setValue()` → `onDidChangeContent` path as a keystroke edit, so
   fixing the keystroke gate fixed this too.
3. **Scope stays narrow**: just gate the two triggers on the mode flag.
   Scoping revalidation to only the touched file (instead of the whole
   project) is explicitly left as a separate future perf ticket — not
   attempted here, matching what the map already had out of scope for Auto
   mode's per-keystroke lag.

### Implementation

- [fileManager.ts](../../../ewp_validator/src/fileManager.ts) — `onContentChanged`
  now checks `validationMode` before scheduling a pass: in Manual, it marks
  `validationStatus = "stale"` and re-renders, without calling
  `scheduleRevalidateAll()`. Updated the class-level and `ValidationMode`
  doc comments, which previously described the keystroke debounce as
  intentionally unaffected by the mode switch.
- Added [fileManager.test.ts](../../../ewp_validator/src/fileManager.test.ts)
  (new file — none existed before): covers a keystroke edit marking stale
  without validating, a re-upload of an existing file marking stale instead
  of auto-validating, and `validateNow()` clearing staleness in both cases.
  Mocks `monaco-editor` with a minimal fake (Uri.parse, editor.createModel,
  editor.setModelMarkers, MarkerSeverity) since the real package has no
  Node-resolvable entry outside a bundler and a real `editor.create()` needs
  a DOM/canvas this test environment doesn't have.
- Verified live in the browser: switched to Manual, edited an already-invalid
  file's content — the existing "Invalid file" diagnosis stayed in place
  (stale, not cleared or re-run) until clicking Validate, which then re-ran
  the pass and cleared the stale indicator.
- `npx vitest run` (185/185 passing, including the 3 new tests), `npx tsc --noEmit`
  (clean), `npm run build` (clean) all pass.

## Question

The scripter reported Manual mode "still laggy" on huge projects because
"the validator keep trying to refresh," and separately noticed Manual mode
runs automatic checks on upload when it shouldn't. Explicitly asked to
**review, together**, what should stay gated out under Manual mode versus
what's acceptable to keep running.

**Grounded findings from this session's code survey** (full trigger table in
this map's charting notes — cite directly, don't re-derive):

| Trigger | Respects Manual mode today? |
|---|---|
| Keystroke edit (typing) | **No** — `fileManager.ts`'s `onContentChanged` → `scheduleRevalidateAll()` (`fileManager.ts:151,267-278,391-397`) always schedules a 200ms-debounced `revalidateAll()`, in both modes. This is called out as *intentional* in the class doc comment (`fileManager.ts:43-46`: "plus the existing typing debounce, unaffected by this switch") — but directly conflicts with the scripter's expectation that Manual mode defers everything until "Validate" is clicked, and is very plausibly the actual source of the reported lag (every keystroke on a huge project still runs a full validation pass 200ms later, mode toggle or not). |
| New file added (`addFile`, upload of a genuinely new file, `adoptModel`) | Yes — correctly deferred (marked "stale", no pass run) in Manual, per `fileManager.ts:114-133,155-181`. |
| **Re-upload of an already-loaded file** (same name+folder) | **No** — `upsertUploadedBatch`'s `existing.model.setValue(content)` (`fileManager.ts:172`) fires the same keystroke-path change event, silently running an unconditional debounced pass moments after the correct explicit defer — this is the concrete "automatic checks upon upload" bug the scripter noticed. |
| File removal (delete file/folder) | Yes — deferred in Manual (`fileManager.ts:210-301` region → `revalidateOrDefer`). |
| Explicit "Validate" button | Runs regardless of mode — by design, that's its purpose. |
| Switching Manual → Auto while stale | Runs a catch-up pass by design. |

Grill toward:

1. **Confirm the two concrete bugs are real bugs, not intended behavior**:
   keystroke edits always validating regardless of mode, and re-uploads
   (vs. genuinely new uploads) bypassing the Manual defer. The class-doc
   comment currently defends the keystroke behavior as intentional — does
   the scripter want that changed (Manual mode = *nothing* auto-runs, full
   stop, matching the literal ask), or does "fully stop automated check for
   Manual mode" mean something narrower (e.g. only the *page-freezing*
   large-batch case, not small single-file edits)?
2. **What should Manual mode guarantee, precisely**, once fixed — walk each
   trigger in the table above and get an explicit stay/gate-out decision, not
   just the two already-obvious bugs. In particular: should a keystroke edit
   in Manual mode ever auto-run (e.g. only for a very small file, below some
   size/line-count threshold), or is the ask truly "zero automatic
   revalidation of any kind while Manual is selected, only the Validate
   button ever triggers one"?
3. **Where does the size/perf line actually cause the lag** — is it the
   200ms-debounced full-project `revalidateAll()` re-running on a large batch
   (many files) even for a one-line edit in one file, or something else? This
   determines whether the fix is purely "respect the mode flag" or also needs
   a scoping change (e.g. only revalidate the edited file, not the whole
   batch) to actually solve the lag even once the mode-gate itself is fixed.
4. Confirm the Auto-mode keystroke-lag concern stays **out of scope** here
   (per the map's Out of scope) — the scripter already separated it as a
   future exploration, not part of this fix.

Once resolved, implement directly (this map's tickets carry execution) and
add regression tests for both concrete bugs (a keystroke edit in Manual mode
should not trigger `revalidateAll`; a re-upload of an existing file in
Manual mode should mark stale, not validate) in `fileManager.test.ts` (create
if it doesn't already exist — verify first).
