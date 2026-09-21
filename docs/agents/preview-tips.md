# Preview tips

Two things that gave a wrong or missing result when checking a change in the browser.

## Start the preview from the folder you are editing

In a linked worktree, `preview_start` with a `name` reads `.claude/launch.json` from the harness's main folder, not from the worktree. That file can point at the other checkout, so the server may run the wrong copy of the code. Before you trust a screenshot, check which folder the server serves (its startup log shows the path). If in doubt, start the dev server by hand from the worktree and open its URL.

## If a screenshot is not available, read the computed style

Some elements only render after a file is loaded, and a screenshot may not show them. Use the browser's JavaScript tool and read `getComputedStyle(element)` for the property you changed. For elements that need a loaded file, upload a small fixture first, or check the source with a search.
