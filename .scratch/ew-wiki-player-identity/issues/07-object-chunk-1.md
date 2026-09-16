# Object appendix, chunk 1: Container / Trap / ItemStand / ArmorStand

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-15)
Blocked by: (none — tickets 05 and 06 both closed)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

Review and get signoff on 4 of the 24 object entries in the page's closing appendix: **Container (chests)**, **Trap**, **ItemStand**, **ArmorStand**. Each entry's prose claim and its paste-ready EWP script must be checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md) and re-validated with `ewp_validator`'s CLI before showing the maintainer. Apply whatever reader-friendly tone standard ticket 06 settles — no ledger/research-report vocabulary in these entries either.

Show only these 4 entries rendered in the dev server (not the whole page) for a focused review.

## Answer

**Signed off.** All 4 entries (Container, Trap, ItemStand, ArmorStand) checked against the [code-proof ledger](../../../ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md) and real decompile, fixed where wrong, re-validated with `ewp_validator`'s CLI (24/24 fences clean), shown live in the dev server across many rounds.

**Real bugs found and fixed during review:**
- ItemStand/ArmorStand's ZDO field names were wrong on the original page (`_item`, `_itemHash0`) — corrected to the real fields: `item` (ItemStand) and `<slot>_item` e.g. `0_item` (ArmorStand). Logged in the ledger's field-name addendum.
- Trap's `state 2` was mis-assumed to be "Armed" — decompile shows the real enum is `Unarmed(0)/Armed(1)/Active(2)`, and ownership actually transfers at state 2 (Active/sprung), not state 1. Page corrected to match.
- I wrongly concluded `prefab: Container`/`prefab: Trap` (component-name targeting, matching every object with that component at once) wasn't valid EWP syntax, because I'd only checked this wiki's own docs. The maintainer pushed back and had me check EWP's own GitHub source instead — `docs/scripting.md` confirms it directly ("each object component has its own value group"). Logged in the ledger's value-group addendum. Used component-name targeting for Container and Trap.
- A leftover `prefab: itemstand` (lowercase) slipped through a later cleanup pass — caught after signoff review and fixed to `prefab: ItemStand`.

**House style locked this ticket, applies going forward to chunks 2-6 and the FX ticket:**
- Never "claims it" or a vague "it" for an ownership change — name "ownership" explicitly, use assign/transfer/hand ownership over.
- Never "watching X" — use "targeting X".
- Sub-title component links are the full sentence, not trimmed: *See every prefab with this component on [Components/X](https://valheimtools.stream/wiki/components/X).* — "Haloa's site" = valheimtools.stream.
- Standardized check-command text: `command: s <pname> (<pid>) owns this <prefab> now.`
- Section titles use the bare component name (no parenthetical), e.g. "Container" not "Container (chests)" — watch for anchor-link breakage in the appendix jump table whenever a heading's text changes.
- Where the ledger confirms it, prefer `prefab: <Component>` (component-name/value-group targeting) over listing individual prefab variants by hand — verify component-name validity against EWP's own source (not just this wiki's docs) before using it on an unverified component.

All changes re-validated live in the dev server (WSL `astro dev` restarted, not reloaded, per the known staleness bug) after every round.
