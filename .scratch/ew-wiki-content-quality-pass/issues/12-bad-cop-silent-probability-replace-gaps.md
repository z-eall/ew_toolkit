Type: grilling
Status: resolved

## Question

Add 2 bad-cop (WRONG/CORRECT) examples, from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

1. **`spawn-vs-swap.mdx`** — a failed `swap:` (blocked `condition:`/missed `chance:`) still removes the original object — no rollback. Wrong pattern: adding `chance: 0.5` to a `swap:` entry, assuming that on the 50% miss the original object is left alone — it's removed either way, and nothing replaces it.
2. **`basic-rng.mdx`** — a `weight:` pool that doesn't sum to `1` leaves a silent "nothing happens" gap. Wrong pattern: two sibling `weight: 0.3` / `weight: 0.2` rules with no `fallback: true` rule underneath — the author assumes one of the two always fires, but ~50% of the time neither does. Page already explains this at length but doesn't cast it as a wrong/right fenced pair. Note: this page already got a wording fix in ticket 01 (the "same trigger" clarification) — check current text before adding a fenced pair here.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention.

## Answer

Item 1 (`spawn-vs-swap.mdx`) added as scoped, confirmed against `PrefabLoading.cs`: the original object is removed unconditionally whenever any `swap:` entries exist, regardless of that entry's own `chance:`/`condition:` result. Item 2 (`basic-rng.mdx` weight-sum-under-1) was **retired, not added** — maintainer correctly pointed out a weight pool under 1 isn't inherently a mistake; some authors deliberately leave that gap so "nothing happens" has a chance. Framing it as a bad-cop pattern would have been wrong, so the page was reverted to its original prose-only explanation. See map's Out of scope.
