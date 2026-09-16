# Player-identity / object-ownership — solo page, shape and content

Type: grilling
Status: closed — out of scope (moved to a new map)
Blocked by: [ticket 27](27-player-identity-functions-research.md)

## Question

Given [ticket 27](27-player-identity-functions-research.md)'s source-verified facts on `pid`/`cid` and EWP's real ownership model, decide and write the solo page (maintainer's call: this gets its own page, not a subsection — object-ownership is a distinct, commonly-needed advanced topic). Cover: what `pid`/`cid` actually are, at least one real worked object-ownership example, and a judgment call on whether `platform`/`pname`/`pchar`/`pvisible` earn a place on the same page or are better left as a brief mention with a pointer to `docs/functions.md` (per [ticket 24](24-reference-section-decision.md)'s link-out decision).

If ticket 27's Answer flags real chartable complexity beyond one page's worth, this ticket should re-scope into "chart a new map" instead of writing content directly — don't force a session's worth of design decisions into one page write if the research says otherwise.

## Re-blocked (2026-09-14)

Ticket 27 was reopened — its original Answer was factually wrong and its "fits in one page" sizing verdict doesn't hold. A first attempt at this page (never signed off, never merged into the sidebar, `draft: true` throughout) surfaced the gap and got scrapped. This ticket is blocked again until ticket 27's re-resolution (via `/research` subagent) lands — likely to re-scope into a new map given the now much larger surface (identity overview + `Piece.creator` + a verified ownership-change catalog + the `<pid>/key` namespacing technique).

## Closed — out of scope (2026-09-14)

Ticket 27's re-resolution confirmed 6 substantial, cross-linked sections (identity overview, the `ClaimOwnership()`/passive-zone method, a verified ~15-row behavior table, the two native persistent fields, the `<pid>/<cid>`-key-namespace technique, other advanced patterns) — too much for one ticket's page-shape decision on this map. The maintainer chose to split this whole topic into its own dedicated wayfinder map rather than keep stretching this ticket. This ticket closes here, out of scope for the Ew Wiki Real Build map; the actual page-shape decision continues on the new map: [Player Identity & Object Ownership](../../ew-wiki-player-identity/map.md).
