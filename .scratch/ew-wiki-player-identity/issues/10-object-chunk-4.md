# Object appendix, chunk 4: Fireplace / Fish / Gibber / TerrainModifier

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-16)
Blocked by: [Nail down the real creation-time ownership rule](05-creation-time-ownership-rule.md), [Rewrite explanatory sections](06-explanatory-sections-rewrite.md)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

Review and get signoff on 4 of the 24 object entries in the page's closing appendix: **Fireplace**, **Fish**, **Gibber (rock/creature debris chunks)**, **TerrainModifier (terrain edits)**. TerrainModifier already carries a correction from the previous round (the old page's `TCData`-as-proven-trigger claim wasn't actually backed by the ledger) — re-confirm that correction still holds under ticket 05's answer, since terrain edits are exactly the kind of "who created this" case that rule needs to cover cleanly. Each entry's prose claim and its paste-ready EWP script must be checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md) and re-validated with `ewp_validator`'s CLI before showing the maintainer. Apply whatever reader-friendly tone standard ticket 06 settles.

Show only these 4 entries rendered in the dev server (not the whole page) for a focused review.

## Answer

**Signed off — all 4 objects (Fireplace, Fish, Gibber, TerrainModifier) in the page, 24/24 fences clean, shown live in the dev server.**

**Real findings this ticket:**
- **Gibber**: my first draft guessed ownership happens "at break-apart" — wrong. Checked EWP's own `HandleDestroyed.cs` (a Harmony `prefix` patch on `ZNetMan.HandleDestroyedZDO`, fetched fresh via `gh api` this ticket) plus `Gibber.cs:74-91` (`DestroyAll`, run via `InvokeRepeating` ~5s after `Explode()`): the game claims ownership if unowned, then destroys the object in the same method — `type: destroy` fires just before removal, while the ZDO (and its owner) is still readable. Corrected the prose to "a few seconds later, right as it's deleted," script uses `type: destroy`.
- **TerrainModifier**: confirmed via `TerrainModifier.cs:149-151` (`OnPlaced`, gated by the transient `m_triggerOnPlaced` flag) that a TerrainModifier-carrying object is spawned fresh per edit — not a shared/static object like `_TerrainCompiler`. Replaced the old on-demand `_TerrainCompiler` poke-check script with a direct `type: create` trigger on `prefab: TerrainModifier`. Also verified a second, non-player spawn path exists: `Attack.SpawnOnHitTerrain` (`Attack.cs:1672-1703`) spawns a TerrainModifier object when certain attacks hit the ground, using the same `SetTriggerOnPlaced` mechanism as digging — same ownership rule, different trigger. Not added to the page (out of scope for a "try it yourself" entry — attacks that terraform on hit aren't something a reader can trivially reproduce), but logged in the ledger for future reference.
- **Fish**: shortened to one plain sentence + script per maintainer request, dropped the caution box and the "reeling in" clause (fish is destroyed in the same instant it changes owner, so there's no separate field to target — not worth a caveat).
- Removed the `allTerraformingFX` dust/FX sub-example — maintainer judged it out of scope for this entry (a separate object needing manual tagging, not part of TerrainModifier's own ownership story).

**House-style corrections this ticket** (reinforcing, not new, house-style rules from chunks 1-3):
- Cut "Not a player action, but a real, watchable moment" from Gibber — maintainer re-flagged "watch"-family language as banned (see chunk-2's "targeting" not "watching" rule; applies to any phrasing implying passive observation, not just literal "watching X").
- Cut "That object is created fresh every time, so it just follows the ordinary Zone Host rule" from TerrainModifier — an explanatory/mechanism-justifying clause, not a plain fact statement; trimmed to state only the fact ("the same way building a piece places a piece") and let the script speak for the rule.

**Lesson for future tickets**: every mechanical claim this ticket was checked against EWP's own source (`HandleDestroyed.cs`, freshly fetched) or the base game decompile before being asserted — continuing the standing rule from chunks 1-3. No claim was taken on faith from prose alone.
