# Object appendix, chunk 6: Smelter / Beehive / Piece-WearNTear / Feast

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-16)
Blocked by: [Nail down the real creation-time ownership rule](05-creation-time-ownership-rule.md), [Rewrite explanatory sections](06-explanatory-sections-rewrite.md)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

Review and get signoff on the last 4 of the 24 object entries in the page's closing appendix: **Smelter**, **Beehive**, **Piece / WearNTear (building pieces, generally)**, **Feast (communal food pieces)**. Beehive is the one entry that follows the creation-time rule directly (builder owns it, then drifts to Zone Host) — re-confirm its wording matches whatever ticket 05 settles precisely, since it's the appendix's clearest test case for that rule. Each entry's prose claim and its paste-ready EWP script must be checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md) and re-validated with `ewp_validator`'s CLI before showing the maintainer.

Show only these 4 entries rendered in the dev server (not the whole page) for a focused review. This is the last object chunk — once signed off, the whole appendix is done and the page is ready for final full-page review before `draft: true` comes off.

## Answer

Signed off 2026-09-16. First did a standard review pass (added missing "See every prefab..." sub-title links to all 4, fixed a real casing bug on Beehive's script — the page used `beehive` lowercase, the real prefab is `Beehive`). All 4 entries checked against the code-proof ledger and confirmed accurate: Smelter (never claims itself, no `ClaimOwnership`/`SetOwner` anywhere in `Smelter.cs`), Beehive (builder gets it at creation via the Zone Host rule's own building exception, then drifts like anything else), Piece/WearNTear (zero-hit, confirmed both files), Feast (broadcast — each connected client independently spawns and owns its own copy, `Feast.cs:RPC_OnEat`).

**Then the maintainer removed all 4 from the live page.** None demonstrated anything beyond what the page already teaches elsewhere: Smelter and Beehive were just restating the baseline Zone Host rule (already explained at the top of the page) with a poke-check wrapper, no special claim mechanic of their own; Piece/WearNTear is explicitly *only* the baseline rule with no exception at all; Feast's own real content (the broadcast/one-copy-per-client mechanic) had already been fully explained and demonstrated at the top of this same session's earlier "Sacrificing at a boss altar" and prior Feast work. Kept as removed rather than reworded — closing this chunk with 0 standalone entries, same shape as chunk 5.

This was the **last object-appendix chunk**. All 25→23 script boxes on the page (after this removal) validated clean and confirmed live on the restarted dev server. Every object-appendix chunk (1-6) plus the FX ticket (13) is now closed — the appendix itself is done. Next real step per the map's own Destination: a final full-page review before `draft: true` comes off, not another chunk.
