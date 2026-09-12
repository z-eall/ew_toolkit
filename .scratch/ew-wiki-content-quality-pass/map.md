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

## Decisions so far

- [Bad-cop: Filter-by-Objects performance](issues/04-bad-cop-filter-objects-performance.md) — added a WRONG/CORRECT pair to objects-filtering.mdx; CORRECT points to Custom Data: EWP Key's counter pattern instead of a wide `maxDistance:` scan (the original "Understanding Keys" cross-link was right after all — see Notes).
- [Bad-cop: two `data:` actions](issues/03-bad-cop-two-data-actions.md) — added a WRONG/CORRECT pair to start-scripting.mdx right after "A script can hold more than one rule," showing duplicate `data:` keys silently overwrite rather than stack.
- [New teaching content](issues/02-new-teaching-content.md) — added `#comment` syntax + debugging-via-comment-out teaching, a "Picking a YAML editor" section (real EWP Schema link confirmed), retrofitted purpose-header comments onto 6 existing chained examples, and promoted the convention to a standing `ew_wiki/AGENTS.md` rule + new hook (`guard-script-block-header-comment.cjs`), synced to both worktrees.
- [Three wording fixes](issues/01-three-wording-fixes.md) — fixed the comma phrasing, the weight/rules phrasing (now names "same trigger" precisely), and the Jere remark (rewritten, and the caution `<Aside>` merged with its adjacent internal-jargon paragraph into one concise caution).
- [Bad-cop sweep](issues/05-bad-cop-sweep.md) — read all 31 tutorial pages, found 18 further candidate spots for a WRONG/CORRECT example; full list in [research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md](../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md). Not acted on yet — see Not yet specified.

## Not yet specified

- **Acting on the bad-cop sweep's findings.** Ticket 05 found 18 candidate spots (see Decisions so far) but wrote no content. Each recommendation worth acting on graduates into its own ticket (or a bundled one, sized like tickets 01/02) once someone decides which are worth it — not sized or ticketed yet.
- **A standing "every concept page gets a bad-cop counterexample where one exists" rule.** Floated as a possible destination shape (see charting conversation) but deliberately deferred — revisit once the sweep shows how many spots actually exist and how the two seed examples land.

## Out of scope

- **Any structural, build, or deploy change to `ew_wiki`.** That destination already shipped — see [Ew Wiki Real Build](../ew-wiki-real-build/map.md), closed.
