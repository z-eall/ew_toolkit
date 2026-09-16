# Page shape, naming, and sidebar placement

Type: grilling
Status: resolved
Claimed by: Claude (this session, 2026-09-14)

## Question

Given the full research report — [research_reports/valheim-ewp-player-identity-ownership-2026-09-14.md](../../../research_reports/valheim-ewp-player-identity-ownership-2026-09-14.md) — decide, with the maintainer, live:

1. **How many pages?** One page covering all 6 sections, or split (e.g. a short beginner-facing identity-functions primer separate from a deeper ownership-mechanisms reference)?
2. **What does each page cover, and in what order?** Map the report's 6 sections (identity overview; the `ClaimOwnership()`/passive-zone method; the verified behavior table; the two native persistent fields; the `<pid>`/`<cid>`-key-namespace technique; other advanced techniques) onto whatever page(s) get decided.
3. **Naming.** Titles matching the site's existing bare-noun-phrase style (`Advanced Functions`, `Advanced RPC`).
4. **Placement.** Which sidebar section/tier — Advanced (and where in that ordered list), a new tier past Advanced, or Extended Reading. Do not assume the earlier "solo Object Ownership page, last in Advanced" answer still holds — that predates the corrected, much larger research.

Do not write real page content in this ticket. This ticket's output is the shape decision; building the page(s) is separate work, gated by the map's standing prototype/signoff rule (see map Notes).

## Answer

**Two pages, not one, not three:**

1. **`Advanced Functions - Player Identity`** — Advanced tier, last in the sidebar list (after `Advanced Functions`). Covers section 1 of the report only: a short, general primer on `pid`/`cid`/`platform`/`pname`/`pchar`/`pvisible` — what each returns, before diving into `pid`/`cid` as the core. Named with the same `Category - Subtopic` dash pattern already used by `Advanced Poke - Mechanics`/`Advanced Triggers - type: change` etc. (confirmed the more common pattern on this site, not the colon style — see spun-off [ticket 34](../../ew-wiki-real-build/issues/34-colon-to-dash-title-consistency.md)). "Functions" in the title is deliberate: `<pid>`/`<cid>`/`<pname>` are literally EWP functions.
2. **`Object Ownership`** — its own tier past Advanced, in Extended Reading, last in that list. Covers the other 5 report sections as one continuous story: the `ClaimOwnership()`/passive-zone method, the verified ~15-row behavior table (kept directly under the method, not split onto a third page — the table only makes sense read right after the rule it demonstrates), the two native persistent fields, the `<pid>`/`<cid>`-key-namespace technique, and other advanced patterns. Bare noun-phrase title (already approved in an earlier round, before the research was corrected — still holds).

**Why 2, not 1 or 3+:** matches this site's own "start compact, split when it outgrows itself" precedent (Core Vocabulary, Advanced Functions → EWP Key). One page would bury a beginner-relevant primer inside a deep 5-section reference; 3+ pages would scatter the mechanism from its own proof table, which the maintainer specifically didn't want (wants a reader able to hold the whole ownership system in mind at once, not split across page-jumps).

**Why the tier split (Advanced vs. a level past Advanced in Extended Reading):** the maintainer's own reasoning from before this ticket reopened, still holds and is reinforced by the bigger research: knowing what `pid`/`cid` *are* is normal Advanced-tier knowledge, but understanding *how ownership actually changes* requires understanding the game's own engine behavior, not just EWP — a step beyond what "Advanced" should imply is required to write advanced scripts.

**Not decided here — deferred to build tickets:** exact page content/wording (goes through the standard `draft: true` prototype + signoff flow per this map's Notes), and whether `Object Ownership`'s Extended-Reading placement needs a "this is deeper than Advanced" callout line at the top of the page (raised and left open during grilling, no final call made).
