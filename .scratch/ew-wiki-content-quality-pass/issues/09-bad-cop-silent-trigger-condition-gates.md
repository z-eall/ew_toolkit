Type: grilling
Status: resolved

## Question

Add 3 bad-cop (WRONG/CORRECT) examples, all "a gate silently never opens" — from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

1. **`advanced-filter-condition.mdx`** — only `=`/`!=` are valid equality operators in `condition:`. Wrong pattern: `condition: <int_level> == 3` (double-equals, muscle memory from most programming languages) — `==` isn't recognized, so the condition silently fails rather than erroring.
2. **`advanced-triggers-change.mdx`** — a `data:` write doesn't fire another rule's `type: change` unless the writing rule sets `triggerRules: true`. Wrong pattern: a rule that writes `data: int, level, 3` expecting a sibling `type: change, level` rule to react, with `triggerRules:` left off — the change rule never fires, no error. Page already shows this as a single commented snippet, not a paired wrong/right example. Note: this page already got a caution-Aside rewrite in ticket 01 (three wording fixes) — check that current text before adding a fenced pair, to avoid duplicating the same lesson twice on one page.
3. **`advanced-triggers-no-prefab.mdx`** — on a no-prefab trigger (`event`/`key`/`globalkey`), a `poke:`'s `maxDistance:` is measured from world center `(0,0,0)`, not from wherever the flag/key actually changed. Wrong pattern: `type: globalkey, raidCooldown` poking nearby workbenches with no `maxDistance:` set (defaults to 100m) — only reaches objects near the map's exact center, essentially never what the reader wants. Already called out as "this one's easy to get wrong" in an Aside.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention.

## Answer

All 3 pairs added. `advanced-triggers-change.mdx`'s WRONG example was reworded per maintainer feedback to explicitly show `triggerRules: false` (matching the default) rather than just omitting the field, so the caution text and code agree. `advanced-triggers-no-prefab.mdx` needed a maintainer-flagged fix: the first pass only reused the page's pre-existing caution Aside and forgot the new "Don't do this:"-prefixed one required by house style — added.
