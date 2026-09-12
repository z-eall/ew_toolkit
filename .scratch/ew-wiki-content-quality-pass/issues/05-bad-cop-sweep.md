Type: research
Status: resolved

## Question

Sweep the entire `ew_wiki` tutorial content (all pages under `ew_wiki/src/content/docs/ewp/`) and produce a list of candidate spots where a "bad cop" (negative/anti-pattern) example — using the wiki's existing "wrong vs. right" convention, paired `# WRONG` / `# CORRECT` YAML fences (see [basic-poke.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/basic-poke.mdx)) — could be added, beyond the two already seeded in tickets 03 and 04.

For each candidate, name: the page, the concept it would counter-illustrate, and a one-line sketch of the wrong pattern. This is a list only — do not write any new content into the wiki as part of this ticket. Acting on any recommendation is separate, future ticket work (see the map's "Not yet specified").

## Answer

Full findings: [`research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md`](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md). Read all 31 `.mdx` files under `ew_wiki/src/content/docs/ewp/`. Found 18 candidate spots for a new WRONG/CORRECT pair (each with file path, the concept it counter-illustrates, and a one-line sketch of the mistaken pattern). Highlights:

- basic-filter.mdx — comma vs. semicolon in filter ranges
- basic-pars.mdx — `<par_0>` being the matched trigger word, not the reply
- objects-filtering.mdx — `bannedObjectsLimit:` off-by-one (distinct from ticket 04's `maxDistance` spot)
- advanced-filter-condition.mdx — `==` (invalid) vs `=`
- advanced-poke-mechanics.mdx — missing `delay:` on a self-poke loop (server-hammering risk); `evaluate:` math-symbol collision
- advanced-triggers-no-prefab.mdx — `maxDistance:` on no-prefab triggers measuring from world center, not from the event location
- ewp-key.mdx — the three same-vocabulary stores (`globalkey`, EWP key, per-object `data:`) not reading each other
- spawn-vs-swap.mdx — a failed `swap:` still removes the original (no rollback)
- bee-ecosystem.mdx — the `<par2>` (missing underscore) typo already called out in prose, ripe for the fenced format
- custom-ship-data.mdx — setting ship damping to exactly `0`
- world-progression.mdx — pasting a raw underscored prefab id into a lookup-function name instead of `<safeprefab>`

Also lists pages that yielded no distinct new candidate, and two pages (advanced-rpcs.mdx, basic-poke.mdx) that already use the fenced convention. Acting on any of these is new, future ticket work — not part of this ticket.
