Type: grilling
Status: resolved

## Question

Fix three known confusing/problematic wording spots in `ew_wiki` tutorial content. Decide the exact replacement wording for each (STE-friendly, matching the wiki's existing voice — see `ew_wiki/AGENTS.md`), then write it directly.

1. **"nothing after the comma"** — [basic-triggers.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/basic-triggers.mdx). Current: "Both fire with no parameter — just `type: create` or `type: destroy`, nothing after the comma. `create` fires the moment a matching object spawns; `destroy` fires the moment one is removed." Problem: there's no literal comma in the reader's own script — this reads like it was lifted from source-code internals. Needs a clearer way to say "these two take no extra value."
2. **"other rules around it"** — [basic-rng.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/basic-rng.mdx). Current: "`weight:` works completely differently from `chance:`. It doesn't compare against a fixed number — it only compares against the other rules around it that also set `weight:`." Problem: too vague. Needs to state precisely that `weight:` only competes against other rules matching the **same trigger** (same `prefab` + `type`, etc.) — not just any nearby rule.
3. **Jere-discrimination remark** — [advanced-triggers-change.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/advanced-triggers-change.mdx). Current: "This `data:`-gating behavior isn't written down anywhere in EWP's own docs — expect it to catch you off guard if you've only read the docs and never hit it in practice." Problem: reads as a knock on Jere's (EWP's author) documentation effort, even lightly. Revise or remove — keep the wiki's usual humor voice, just not at Jere's expense.

## Answer

All three written directly.

1. **"nothing after the comma"** ([basic-triggers.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/basic-triggers.mdx)) — reworded to "just `type: create` or `type: destroy` on their own, nothing extra needed," dropping the confusing comma framing.
2. **"other rules around it"** ([basic-rng.mdx](../../../ew_wiki/src/content/docs/ewp/examples/basic-rng.mdx)) — reworded to name the real scope precisely: "other rules that match the same trigger (same `prefab` and `type:`) and also set `weight:`." Trimmed the now-redundant "Two separate rules, both matching the same trigger:" lead-in to "For example:".
3. **Jere-discrimination remark** ([advanced-triggers-change.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/advanced-triggers-change.mdx)) — went further than the original ask: merged the caution `<Aside>` with the "Under the hood" paragraph into one concise caution, dropping both the docs-blame framing and the internal-mechanism jargon ("EWP tells the change-watcher to ignore that one object..."). New Aside states the effect plainly: `data:` writes don't self-fire `type: change` unless `triggerRules: true` opts in, and that this applies per write, not as a standing setting.
