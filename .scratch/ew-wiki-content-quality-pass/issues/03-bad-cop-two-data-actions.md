Type: grilling
Status: resolved

## Question

Add a bad-cop (anti-pattern) example: two `data:` actions in one rule block is invalid — a single rule can only carry one action. Counterpart to the existing "a script can hold more than one rule" teaching at [start-scripting.mdx:70](../../../ew_wiki/src/content/docs/ewp/concepts/start-scripting.mdx).

Use the wiki's existing "wrong vs. right" convention (paired plain YAML code fences, `# WRONG — <reason>` / `# CORRECT`, as seen in [basic-poke.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/basic-poke.mdx), "When a poke doesn't fire").

Draft wrong example from the maintainer:

```yaml
- prefab: Boar
  type: create
  data: strongBoar
  data: fastCreature
```

Decide exact placement (right after the "more than one rule" section, most likely) and exact wording, then write it directly.

## Answer

Written directly in [start-scripting.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/start-scripting.mdx), right after "A script can hold more than one rule" (the section it counters) and before the new "Add comments" section from the New teaching content ticket. Uses the wiki's existing `# WRONG` / `# CORRECT` paired-fence convention, matching the maintainer's draft example almost exactly — reworded the reason to state precisely what happens (duplicate `data:` key, second silently overwrites the first) rather than just "invalid."
