Type: grilling
Status: resolved

## Question

Add 2 bad-cop (WRONG/CORRECT) examples, from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

1. **`start-scripting.mdx`** — `prefab:`/`type:` keys are case-sensitive, lowercase only. Wrong pattern: writing `Prefab: Boar` / `Type: create` (capitalized) — valid YAML, but EWP silently never matches anything. Currently only stated in prose/Aside, no fenced pair.
2. **`basic-filter.mdx`** — semicolon, not comma, separates a filter list/range. Wrong pattern: `filter: int, level, 2,3` (comma) meaning "1-star or 2-star" — comma doesn't do that job; the reader wants `2;3`. Already flagged inline as a comment but never contrasted against the broken comma version.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention (see `ew_wiki/AGENTS.md`'s Component conventions).

## Answer

Both pairs added and verified against `basic-filter.mdx`'s corrected comma/semicolon text (see the recheck-flag note on the map): `start-scripting.mdx` gets a `Prefab: Boar` (capitalized) vs `prefab: Boar` WRONG/CORRECT pair; `basic-filter.mdx` gets `filter: int, level, 2,3` (comma, folds into the value and matches everything per the C#-verified behavior) vs `filter: int, level, 2;3` (semicolon, a real range). Both carry a "Don't do this:" caution.
