Type: grilling
Status: resolved

## Question

Item 5: when a diagnosis is selected, that file's diagnosis group in the Problems panel can't be collapsed — root cause is `main.ts:516`, `collapsed = collapsedProblemFiles.has(group.file.id) && group.file.id !== focusedFileId`, which forces `collapsed = false` whenever the group owns the caret-focused problem.

Item 8: collapsing a group shouldn't re-trigger auto-cursor-follow behavior.

Once fixed, if the editor cursor later lands on a NEW diagnosis inside a file whose group the user has manually collapsed — does the group stay collapsed, or auto-expand so the new highlight is visible?

## Answer

Stays collapsed. The user's manual collapse always wins; cursor-follow (`main.ts:1227-1246`) keeps updating `focusedProblemKey` and switching tabs as today, but never force-opens a group the user closed.

Implementation: drop the `&& group.file.id !== focusedFileId` clause from `main.ts:516` entirely — `collapsed` becomes just `collapsedProblemFiles.has(group.file.id)`. This is the whole fix for both item 5 (group can be collapsed) and item 8 (collapsing doesn't get silently reverted by cursor-follow, since there's no override left to revert it). The `focusedFileId` computation at `main.ts:512` and the `scrollIntoView` at `main.ts:543-545` are unaffected — `querySelector(".cursor-focus")` just returns null when the owning group is collapsed, which is already handled (optional chaining).
