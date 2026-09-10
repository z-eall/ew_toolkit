# Scrap media placeholders

Type: task
Status: resolved
Blocked by: none

## Question

Scrap the media-placeholder rule (and hook, if one exists) and every media placeholder currently on the live wiki.

## Answer

No dedicated hook existed for this — only a rule in `ew_wiki/AGENTS.md` ("Media placeholders, never guessed media"), removed entirely. Removed the 3 placeholder `<Aside type="tip" title="Media placeholder #1">` blocks it had produced: `basic-poke.mdx`, `advanced-rpcs.mdx`, `custom-ship-data.mdx`. Each page's `Aside` import is still used elsewhere on that page, so no dangling import. Updated the map's Notes and Not yet specified sections to drop the stale "media placeholders" pointer.
