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
- **Recheck flag (resolved into a ticket 2026-09-14)**: ticket 06's `basic-filter.mdx` claim about comma/semicolon in `filter:` values was found wrong against the mod's own docs and C# source (semicolon marks a *range*, not "or"; an extra comma folds into the value and gets silently skipped, matching everything — not "never matches"). Every remaining bad-cop ticket (07–13) had each claim cross-checked against real source before writing, not just carried over from the sweep report's wording. This flag's own "then recheck the sweep report itself" follow-up sat un-ticketed across multiple sessions — now [ticket 14](issues/14-recheck-sweep-report-claims.md), resolved (see its Answer — found a real live-page bug, [ticket 16](issues/16-basic-filter-comma-semicolon-live-bug.md), open).
- **True-but-inert facts, a distinct failure class from wrong facts**: caught live while drafting ticket 16's fix (an early version led with "the comma sets a weight of 3" — true, cited, and functionally inert given a default `filterLimit`). Same root problem partially covered by the existing `guard-reader-internal-bookkeeping.cjs` hook, but that hook only catches *naming a source*; this is a *true, source-verified fact with no consequence in context* — not mechanically detectable, stays a rule (candidate for root `AGENTS.md`, proposed to the maintainer 2026-09-14, not yet written). Sweep ticketed as [ticket 17](issues/17-true-but-inert-facts-sweep.md), open.

## Decisions so far

- [True-but-inert facts sweep](issues/17-true-but-inert-facts-sweep.md) — swept all 31 shipped `ewp/concepts/`+`ewp/examples/` pages; no new true-but-inert instances found, every candidate checked was load-bearing. One unrelated matching-semantics doubt (`advanced-poke-creative-systems.mdx`'s `autoClose 0` exclusion) surfaced but filed to Not yet specified instead, since it's a different failure class. Full report: [research_reports/ew-wiki-true-but-inert-facts-sweep-2026-09-16.md](../../research_reports/ew-wiki-true-but-inert-facts-sweep-2026-09-16.md).
- [Recheck the 18-item sweep report](issues/14-recheck-sweep-report-claims.md) — 16 of 18 items hold up against real EWP source; `basic-filter.mdx`'s shipped comma/semicolon example (ticket 06) is itself still wrong even after that "fix" (comma parses as `type,key,value,weight`, not "folds into value, matches everything") — follow-up [ticket 16](issues/16-basic-filter-comma-semicolon-live-bug.md), closed. The report file itself (`research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md`) was found missing/never committed, but was fully reconstructed from tickets 03/04 and 06-13's own Question/Answer text.
- [basic-filter.mdx comma/semicolon live bug](issues/16-basic-filter-comma-semicolon-live-bug.md) — Fixed the caution `<Aside>` and WRONG comment to lead with the actionable lesson (comma isn't "or", semicolon is the real range separator) and the real consequence (the check narrows to level 2 only, not "matches everything"). Mentioned the inert weight mechanism in one plain sentence without naming it as load-bearing, per ticket 17's own "true-but-inert" concern. Clean build verified, 35 pages.
- [Standing bad-cop rule decision](issues/15-standing-bad-cop-rule-decision.md) — Decided live with the maintainer: **no standing rule.** The 18-item sweep was a one-time, now-closed pass. Future bad-cop examples get proposed opportunistically as gaps are noticed, not as a mandatory per-page checklist item. No `AGENTS.md` change needed — the existing WRONG/CORRECT convention stays as-is.
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
- (graduated 2026-09-14 into [ticket 14](issues/14-recheck-sweep-report-claims.md) and [ticket 15](issues/15-standing-bad-cop-rule-decision.md) — both now closed, see Decisions so far. This section had carried both as un-ticketed reminders across multiple sessions; closed via `/wayfinder` review rather than left to keep recurring.)
- **`advanced-poke-creative-systems.mdx`'s `autoClose 0` matching-semantics doubt** (surfaced by [True-but-inert facts sweep](issues/17-true-but-inert-facts-sweep.md)'s Answer, 2026-09-16): unclear whether a bare `type: poke, autoClose` trigger excludes an `autoClose 0` value on its own, or whether the adjacent rule's `weight: 1e30` is what's really doing the exclusion. Needs `ExpandWorldPrefabs/` source checked to resolve — not yet sharp enough to ticket past "go check the source."

## Out of scope

- **Any structural, build, or deploy change to `ew_wiki`.** That destination already shipped — see [Ew Wiki Real Build](../ew-wiki-real-build/map.md), closed.
- **basic-rng.mdx weight-sum-under-1 as a bad-cop example** (from [Bad-cop: silent probability/replace gaps](issues/12-bad-cop-silent-probability-replace-gaps.md)) — a weight pool under 1 isn't inherently a mistake; some authors deliberately leave that gap so "nothing happens" has a chance. Not a wrong pattern, so it doesn't belong in the WRONG/CORRECT convention. Page reverted to its original prose-only wording.

## Resolved

**This map has reached its Destination (2026-09-16).** All four criteria met:

1. The three known confusing/problematic wording spots — fixed ([Three wording fixes](issues/01-three-wording-fixes.md)).
2. Two new teaching content pieces (`#comment` syntax, YAML editor picks) — shipped ([New teaching content](issues/02-new-teaching-content.md)).
3. The wrong-vs-right convention gained far more than the required two bad-cop examples — 18 candidate spots swept, all resolved across tickets 03–13.
4. A full sweep for further candidate bad-cop spots ran ([Bad-cop sweep](issues/05-bad-cop-sweep.md)), plus a second distinct sweep for true-but-inert facts ([True-but-inert facts sweep](issues/17-true-but-inert-facts-sweep.md)) — both complete.

One loose end (the `autoClose 0` matching-semantics doubt) is carried in Not yet specified for a future map/ticket, not blocking this destination. No further tickets remain open; this map is closed.
