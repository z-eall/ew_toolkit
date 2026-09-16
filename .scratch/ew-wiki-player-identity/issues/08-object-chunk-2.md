# Object appendix, chunk 2: ItemDrop / Sign / Sadle / Vagon

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-15)
Blocked by: [Nail down the real creation-time ownership rule](05-creation-time-ownership-rule.md), [Rewrite explanatory sections](06-explanatory-sections-rewrite.md)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

Review and get signoff on 4 of the 24 object entries in the page's closing appendix: **ItemDrop (dropped/thrown items)**, **Sign**, **Sadle (tameable creature, ridden)**, **Vagon (carts, battering rams, catapults)**. Each entry's prose claim and its paste-ready EWP script must be checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md) and re-validated with `ewp_validator`'s CLI before showing the maintainer. Apply whatever reader-friendly tone standard ticket 06 settles — no ledger/research-report vocabulary in these entries either.

Show only these 4 entries rendered in the dev server (not the whole page) for a focused review.

## Answer

**Signed off.** All 4 entries (ItemDrop, Sign, Sadle, Vagon) checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md), re-validated with `ewp_validator`'s CLI (25/25 fences clean), shown live in the dev server across many rounds of maintainer edits.

**Real findings, both corrections and confirmations:**
- **ItemDrop**: the maintainer proposed `filter: int, pickedUp, 1/0` at `type: create` to tell a tossed inventory item apart from raw never-touched loot. I wrongly rejected this twice, having only checked the base game's own decompile (there, `pickedUp` is packed inside a binary blob field and only briefly exists standalone during an old-save migration). The maintainer pushed back; checking EWP's own `docs/scripting.md` (not just the base game) showed EWP auto-unpacks that blob and re-exposes `pickedUp` as an ordinary scriptable field — the maintainer's original example was correct. Logged in the ledger's `pickedUp`/EWP item-data-unpack addendum.
- **Vagon**: replaced the page's on-demand poke-check with a direct `type: change, attachJoint` trigger, after confirming in the decompile that `attachJoint` is a real, owner-gated ZDO field (same shape as Container's `InUse`) — Table 1's original "no field survives" claim was too narrow; it only meant no field is set in the same branch as the `SetOwner` call itself. Logged in the ledger's Vagon `attachJoint` addendum.
- **Sign, Sadle**: both matched the ledger as originally drafted — no bugs found, just house-style wording passes.

**Wording corrections caught by the maintainer this ticket** (now locked house style, carries forward):
- Bad-cop `<Aside type="caution">` boxes must open with the exact words "Don't do this:" — matches the established pattern already used elsewhere on the wiki (see `basic-rpcs.mdx`'s WRONG/CORRECT blocks).
- Never state an unproven claim as fact inside a caution box — use "we suspect"/"we assumed" instead of asserting it as settled, and don't add unrequested internal explanation/hedging around a caution the maintainer already wrote precisely (added "but there's no way to prove that from the outside" unprompted, which was cut — the maintainer's own wording is authoritative once given verbatim, polish only what's actually asked).
- Don't restate a fact in prose that a later paragraph or script already covers on its own (cut a redundant opening sentence on ItemDrop once the section's own scripts made the same point directly).

All changes re-validated live in the dev server (WSL `astro dev` restarted, not reloaded) after every round; one mid-session case where the maintainer couldn't open the preview at all, resolved by a fresh restart.
