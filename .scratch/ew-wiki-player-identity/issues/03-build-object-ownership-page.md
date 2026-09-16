# Build "Object Ownership" page

Type: prototype
Status: closed — split into smaller tickets
Claimed by: Claude (this session, 2026-09-14)

## Question

Build the deep-dive page decided in [ticket 1](01-page-shape-and-placement.md): `Object Ownership`, its own tier past Advanced, in Extended Reading, last in that list. Covers sections 2-6 of the [research report](../../../research_reports/valheim-ewp-player-identity-ownership-2026-09-14.md) as one continuous story: the `ClaimOwnership()`/passive-zone method, the verified ~15-row behavior table (kept directly under the method), the two native persistent fields (`Piece.creator`, `Bed.s_owner`), the `<pid>`/`<cid>`-key-namespace technique, and other advanced patterns.

Still open from ticket 1's grilling, not yet resolved: whether this page needs a "this goes beyond Advanced-tier scripting knowledge" callout near the top, given its Extended-Reading placement — decide that as part of building this, not separately.

Must go through this map's standing prototype/signoff flow (see map Notes): build as `draft: true`, render in the dev server, get the maintainer's live signoff, only then wire into `astro.config.mjs`'s sidebar and drop `draft: true` — together, in one pass.

## Answer

**Split, not resolved.** This ticket tried to do too much in one pass: rewrite the whole page (structure, tone, 24 script examples, and a subtle game-mechanism claim) and get it all signed off at once. That let mistakes stack — a wrong or unclear creation-ownership claim, and research-report language ("decompiled game code", "code-proof ledger", "ZNetView.Everybody", "deterministic") leaking into reader-facing prose — go unreviewed for multiple rounds before being caught.

Maintainer review of the 2026-09-15 rebuild (via [object-ownership-draft-light-v2.pdf](../../../ew_wiki/src/content/docs/ewp/extended-reading/object-ownership.mdx)) found:
1. Internal/research-facing phrasing throughout the explanatory sections — needs a reader-friendly rewrite.
2. The creation-time ownership claim ("whichever client's action actually created it becomes the owner immediately") doesn't clearly hold up against a real play scenario the maintainer gave (a non-host player builds next to the Zone Host and keeps ownership until they leave) — needs a real conversation to pin down precisely, not another solo code-read.
3. Page order is wrong — the explanatory sections should lead, the per-object script appendix should be last.
4. The appendix's 24 objects need to be reviewed and signed off in small groups, not as one 24-item block.

Replaced by:
- [Nail down the real creation-time ownership rule](05-creation-time-ownership-rule.md) (grilling)
- [Rewrite explanatory sections: reader-friendly tone + reorder to the top](06-explanatory-sections-rewrite.md) (prototype, blocked by ticket 05)
- Six object-appendix review chunks, each blocked by tickets 05 and 06: [Container/Trap/ItemStand/ArmorStand](07-object-chunk-1.md), [ItemDrop/Sign/Sadle/Vagon](08-object-chunk-2.md), [Ship/Portal/Turret/CookingStation](09-object-chunk-3.md), [Fireplace/Fish/Gibber/TerrainModifier](10-object-chunk-4.md), [FX/Tameable/Character-Ragdoll/OfferingBowl](11-object-chunk-5.md), [Smelter/Beehive/Piece-WearNTear/Feast](12-object-chunk-6.md)

Root cause (asked directly by the maintainer): building the whole page in one pass and showing it only when finished, instead of checking small pieces before building on them; letting ledger-voice (built to prove a fact to myself) leak into reader-voice (built to teach a fact to someone else) instead of translating between them; and treating a gameplay-experience question (who owns a freshly-built object, from a player's seat) as a code-reading question I could resolve alone, when it needed an actual conversation.
