Type: grilling
Status: resolved

## Question

Item 9 of the /wayfinder request: is it technically feasible to scope "auto cursor sync" to whichever zone the user last clicked into — e.g. clicking into the Problems panel should stop the editor/file-panel from auto-following, until the user clicks back into the editor or file panel?

This must be checked against the existing cursor-highlight-sync behavior for conflicts:
- `editor.onDidChangeCursorPosition` (`main.ts:1227-1246`) sets `focusedProblemKey`, switches the active problem tab, and re-renders the Problems panel to highlight/scroll to the matching diagnosis.
- Clicking a file row (`main.ts:397-398`) calls `fileManager.revealTopProblem(vf.id)`, which presumably moves the editor cursor (needs tracing in `fileManager.ts`).
- Clicking a diagnosis row (`main.ts:535`) calls `fileManager.revealProblem(file.id, problem.range[0])`, which moves the editor cursor to that diagnosis (and is the same code path item 10 wants to also scroll the file panel to the owning file).

## Answer

Tracing the actual mechanics collapsed this from a stateful "zone" design into one surgical fix — no zone-tracking machinery needed:

**What's really there today**: there is no continuous "auto cursor" driven by clicking in the Problems panel — the only two things a diagnosis-row click does that could feel like unwanted "auto" behavior are (a) `editor.focus()` inside `fileManager.revealProblem`, which steals keyboard focus to the editor on every click, and (b) `scrollFileRowIntoView` (item 10), which scrolls the file panel on every click. Everything else (the editor→Problems-panel highlight sync) is one-directional and needed for the click's own visual feedback — suppressing it would make clicking a diagnosis look like nothing happened.

**Decisions**:
1. Suppress only (a) — `editor.focus()` — when the reveal was triggered by a diagnosis-row click. Since a diagnosis-row click is *by definition* an interaction inside the Problems panel, this doesn't need a stateful "zone" flag: `fileManager.revealProblem` takes an optional `{ focus?: boolean }` (default `true`, preserving today's behavior for file-row clicks / `revealTopProblem`), and the diagnosis-row click handler passes `{ focus: false }`. The cursor still moves and is visible in the editor — the user just isn't kicked into typing mode there, so they can keep clicking/arrowing through diagnoses without focus bouncing away.
2. Do **not** suppress (b), the file-panel scroll from item 10 — instead fix its underlying bug: it uses `scrollIntoView({ block: "nearest" })`, which only scrolls the minimum distance needed, so a target below the fold lands stuck at the bottom edge instead of being clearly shown. Same bug affects the Problems panel's own cursor-follow highlight scroll (`main.ts:543-545`, also `block: "nearest"`). Both should scroll their target to the top of the visible area (`block: "start"`) instead.
3. The editor's own `revealLineInCenter` stays as-is (centered) — that's normal jump-to-line behavior showing context both above and below, and doesn't have the "stuck at the edge" bug the two panels have with `block: "nearest"`.
4. No zone-reset question applies — there's no zone state to reset.

**Net implementation**: 
- `fileManager.ts`: `revealProblem(fileId, offset, opts: { focus?: boolean } = {})` — `if (opts.focus ?? true) this.editor.focus();`
- `main.ts` diagnosis-row click handler: `fileManager.revealProblem(file.id, problem.range[0], { focus: false })`.
- `main.ts:543-545` (Problems-panel highlight scroll) and `scrollFileRowIntoView` (item 10): change `block: "nearest"` → `block: "start"`.
