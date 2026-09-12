# Ew Wiki Content Quality Pass — Map

Labels: wayfinder:map

## Destination

Raise the teaching quality of `ew_wiki`'s EWP tutorial content, on top of an already-shipped, already-working site (see [Ew Wiki Real Build](../ew-wiki-real-build/map.md), closed). Reaching the destination means:

1. The three known confusing/problematic wording spots are fixed.
2. Two pieces of new teaching content exist (`#comment` syntax, recommended YAML editors).
3. The wiki's existing "wrong vs. right" convention gains at least the two named bad-cop (anti-pattern) examples.
4. A full sweep of `ew_wiki`'s tutorial content has produced a list of further candidate bad-cop spots (acting on that list is new tickets born after the sweep, not part of this destination unless/until charted).

This is a content-quality pass, not a rebuild — no structural, build, or deploy changes are in scope (that destination already shipped and closed on the other map).

## Notes

- **Execution rides along small tickets.** Unlike a typical wayfinder map, tickets 01–04 below include writing the actual file change when resolved — not just deciding it. Only genuinely open judgment calls (where a fact is unclear, where content should live) get a real back-and-forth before the write. Ticket 05 (the sweep) stays list-only per the destination note above.
- **House style already exists — extend it, don't invent a new one.** `ew_wiki` already has a "wrong vs. right" convention: paired plain YAML code fences, first commented `# WRONG — <reason>`, second `# CORRECT` (see [basic-poke.mdx](../../ew_wiki/src/content/docs/ewp/concepts/basic-poke.mdx), "When a poke doesn't fire"). No special Aside/callout component exists for this — don't invent one. Every bad-cop example in this map should follow this exact pattern.
- **Read `ew_wiki/AGENTS.md` before writing any reader-facing text** — in particular "No internal bookkeeping in reader text" and "State a true fact plainly." The hook `guard-reader-internal-bookkeeping.cjs` enforces the banned-phrase list on Edit/Write to `ew_wiki/src/content/docs/`.
- **Dhakhar is a credited source author** ("DhakhaR" in `ew_wiki/docs/sources.md`), not an unknown — this is background only, feeding *this map's* prioritization. Per standing content-voice rules, their name does not belong in reader-facing wiki prose.
- **"Understanding Keys" cross-link, resolved**: charting flagged `ewp-key.mdx` ("Custom Data: EWP Key") as a mismatch for the Filter-by-Objects bad-cop example. Ticket 04 found that was too hasty — the page's own counter-key pattern (`<save++_X>`/`<save--_X>`) *is* the right "better way" alternative to a wide `maxDistance:` scan. See that ticket's Answer.
- Skills: `ew_toolkit:grilling` for tickets 01, 02, 04 (deciding exact wording/placement); `ew_toolkit:domain-modeling` if any EWP terminology question surfaces; `ew_toolkit:research` for ticket 05 (already pre-approved as this map's one research ticket — no separate signoff needed to run it).
- Standing user rule: **nothing here gets committed without asking the maintainer first**, same as every other `ew_wiki` session.
- **Recheck flag**: ticket 06's `basic-filter.mdx` claim about comma/semicolon in `filter:` values was found wrong against the mod's own docs and C# source (semicolon marks a *range*, not "or"; an extra comma folds into the value and gets silently skipped, matching everything — not "never matches"). Every remaining bad-cop ticket (07–13) must have each claim cross-checked against real source (`docs/scripting.md`, the linked C# repo — already cloned to `/tmp/ewp_src` this session) before writing, not just carried over from the sweep report's wording. Once 07–13 are done, the sweep itself (and its 18-item report) should get a pass to check for the same class of unverified "definition" claim.

## Decisions so far

- [Bad-cop: ship damping zero](issues/13-bad-cop-ship-damping-zero.md) — added a WRONG/CORRECT pair to custom-ship-data.mdx; caution rewritten to remove internal-facing "reported/unconfirmed" hedge language.
- [Bad-cop: silent probability/replace gaps](issues/12-bad-cop-silent-probability-replace-gaps.md) — added the swap-vs-chance pair to spawn-vs-swap.mdx (confirmed against `PrefabLoading.cs`); the weight-sum-under-1 pair on basic-rng.mdx was retired, not added — see Out of scope.
- [Bad-cop: data store confusion & fallback](issues/11-bad-cop-data-store-confusion-fallback.md) — added pairs to custom-data.mdx (also names the fallback "default") and ewp-key.mdx (EWP key vs globalkey isolation).
- [Bad-cop: poke mechanics performance & evaluate](issues/10-bad-cop-poke-mechanics-performance-evaluate.md) — added both pairs to advanced-poke-mechanics.mdx; self-poke risk reworded to a confirmed instant-recursion crash (via `DelayedPoke.cs`), caution text stripped of source-file references.
- [Bad-cop: silent trigger/condition gates](issues/09-bad-cop-silent-trigger-condition-gates.md) — added all 3 pairs (`==` vs `=`, `triggerRules:`, no-prefab `maxDistance:`); triggerRules wording matches the default `false` explicitly, no-prefab page got its missing "Don't do this:" caution.
- [Bad-cop: pars & RPC targeting](issues/08-bad-cop-pars-rpc-targeting.md) — added pairs to basic-pars.mdx (`<par_0>` vs `<par_1>`) and basic-rpcs.mdx (`target:` default `owner`).
- [Bad-cop: underscore/safeprefab family](issues/07-bad-cop-underscore-safeprefab-family.md) — added pairs to basic-functions.mdx and world-progression.mdx; bee-ecosystem.mdx's planned `<par2>` pair was dropped after source-checking `Functions.cs` showed `<par2>` is a real, working shortcut, not a broken one.
- [Bad-cop: case sensitivity & filter separators](issues/06-bad-cop-case-sensitivity-filter-separators.md) — added pairs to start-scripting.mdx (case-sensitive keys) and basic-filter.mdx (comma vs semicolon, matching the corrected filter behavior).
- [Bad-cop: Filter-by-Objects performance](issues/04-bad-cop-filter-objects-performance.md) — added a WRONG/CORRECT pair to objects-filtering.mdx; CORRECT points to Custom Data: EWP Key's counter pattern instead of a wide `maxDistance:` scan (the original "Understanding Keys" cross-link was right after all — see Notes).
- [Bad-cop: two `data:` actions](issues/03-bad-cop-two-data-actions.md) — added a WRONG/CORRECT pair to start-scripting.mdx right after "A script can hold more than one rule," showing duplicate `data:` keys silently overwrite rather than stack.
- [New teaching content](issues/02-new-teaching-content.md) — added `#comment` syntax + debugging-via-comment-out teaching, a "Picking a YAML editor" section (real EWP Schema link confirmed), retrofitted purpose-header comments onto 6 existing chained examples, and promoted the convention to a standing `ew_wiki/AGENTS.md` rule + new hook (`guard-script-block-header-comment.cjs`), synced to both worktrees.
- [Three wording fixes](issues/01-three-wording-fixes.md) — fixed the comma phrasing, the weight/rules phrasing (now names "same trigger" precisely), and the Jere remark (rewritten, and the caution `<Aside>` merged with its adjacent internal-jargon paragraph into one concise caution).
- [Bad-cop sweep](issues/05-bad-cop-sweep.md) — read all 31 tutorial pages, found 18 further candidate spots for a WRONG/CORRECT example; full list in [research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md](../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md). Not acted on yet — see Not yet specified.

## Not yet specified

- (graduated 2026-09-12 into tickets 06-13, bundled by shared page/concept — see the sweep report linked from ticket 05's Answer for the full 18-item list. All 8 now resolved.)
- **A standing "every concept page gets a bad-cop counterexample where one exists" rule.** Floated as a possible destination shape (see charting conversation) but deliberately deferred — revisit once the sweep shows how many spots actually exist and how the two seed examples land.
- **Recheck the 18-item sweep report itself for other unverified "definition"-style claims**, the same class of error caught on ticket 06's original `basic-filter.mdx` wording and ticket 07's `<par2>` claim. Not yet ticketed — the fix pattern (grep the sweep report's own phrasing against real source before trusting it) is clear, but which of the 18 original items still need a second look isn't sorted yet.

## Out of scope

- **Any structural, build, or deploy change to `ew_wiki`.** That destination already shipped — see [Ew Wiki Real Build](../ew-wiki-real-build/map.md), closed.
- **basic-rng.mdx weight-sum-under-1 as a bad-cop example** (from [Bad-cop: silent probability/replace gaps](issues/12-bad-cop-silent-probability-replace-gaps.md)) — a weight pool under 1 isn't inherently a mistake; some authors deliberately leave that gap so "nothing happens" has a chance. Not a wrong pattern, so it doesn't belong in the WRONG/CORRECT convention. Page reverted to its original prose-only wording.
