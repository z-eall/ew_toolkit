Type: grilling
Status: open

## Question

Item 9 of the /wayfinder request: is it technically feasible to scope "auto cursor sync" to whichever zone the user last clicked into — e.g. clicking into the Problems panel should stop the editor/file-panel from auto-following, until the user clicks back into the editor or file panel?

This must be checked against the existing cursor-highlight-sync behavior for conflicts:
- `editor.onDidChangeCursorPosition` (`main.ts:1227-1246`) sets `focusedProblemKey`, switches the active problem tab, and re-renders the Problems panel to highlight/scroll to the matching diagnosis.
- Clicking a file row (`main.ts:397-398`) calls `fileManager.revealTopProblem(vf.id)`, which presumably moves the editor cursor (needs tracing in `fileManager.ts`).
- Clicking a diagnosis row (`main.ts:535`) calls `fileManager.revealProblem(file.id, problem.range[0])`, which moves the editor cursor to that diagnosis (and is the same code path item 10 wants to also scroll the file panel to the owning file).

Open sub-questions to resolve in this ticket:
1. What are the "zones" — editor, file panel, problems panel — and what exactly does each one drive/receive today?
2. When "focus" is in the problems panel, should the editor cursor moving (e.g. from a stale timer, or Monaco's own click-to-navigate) still be suppressed from re-triggering panel highlight/scroll? Or does zone-scoping only gate the *panel-driven* pushes (file-panel scroll, tab switch), not the editor-driven pull?
3. Interaction with item 5/8's fix ([Collapse vs cursor-follow precedence](02-collapse-cursor-follow-precedence.md)) and item 10 (notice-click should scroll the file panel) — do those still fire once focus-zone gating exists, or do they become zone-conditional too?
4. Does clicking a *diagnosis row* (which intentionally drives the editor) count as "clicking into the problems panel" for zone purposes, or does it momentarily hand focus to the editor since it just moved the caret there?

Likely needs a throwaway prototype (per the /prototype skill) to feel out whether a simple "last-active-zone" flag is enough, or whether the sync graph is tangled enough to need a different model (e.g. an explicit "user-initiated" vs "programmatic" flag on cursor/scroll events instead of a spatial zone).
