Type: task
Status: resolved
Blocked by: 18

## Question

Build the "would this fire?" interactive widget for `advanced-triggers-change.mdx`: the reader sets a before/after value pair against a `type: change` line, plus a `triggerRules:` toggle demonstrating the "look away" gotcha documented in [Doc-example schema hook, injectData/triggerRules corrections](15-doc-example-schema-hook.md).

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. The `triggerRules:` behavior must match what ticket 15 source-verified against `PrefabManager.cs`/`PrefabData.cs` — re-read that ticket's Answer before encoding the fire/no-fire logic, don't re-derive it from `scripting.md`'s prose.

Process: prototype first via `ew_toolkit:prototype` if the before/after + toggle interaction isn't already obvious, then land the real Astro component, wire it into `advanced-triggers-change.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Advanced Filter: Condition widget](18-widget-advanced-filter-condition.md) is fully built and build-verified.

## Answer

Built `TriggerChangeExplainer.astro`, wired into `advanced-triggers-change.mdx` right after the `triggerRules:` "look away" explanation. One prototype round before go-ahead (`trigger-change-checker-v1-prototype.html`), reusing `ConditionExplainer.astro`'s exact construction pattern (3 stacked zones, `--local-ok`/`--local-fail`/`--local-gold` vars, chip breakdown, no bottom verdict bar).

Scenario reuses the page's own existing example verbatim (`piece_beehive`, `type: change, level 0 3,4`) so the widget reads as a continuation of the page, not a new one. Two rules shown: a writer (`data: int, level, <new>` + `triggerRules:` toggle) and the watcher (`type: change, level 0 3,4`). Reader sets new value (`<par_1>`), old value (`<par_2>`), and `triggerRules:`; the widget evaluates two independent gates — the value condition and the `triggerRules:` gate — and both must pass to fire.

Maintainer feedback round: dropdown order swapped to match real par order (new/`<par_1>` first, old/`<par_2>` second — the prototype had them backwards); the single vague "value condition" chip split into two explicit chips (`new = 0`, `old in 3,4`) for clarity; fixed the script-line indentation to the real 2-space YAML shape (the prototype's tag-label markup had pushed it out of alignment); spacing tightened relative to the prototype (which had reused `ConditionExplainer`'s padding verbatim, oversized for this widget's smaller content) — reduced margin/padding across all zones, measured against this widget's own real content. Verified via `getBoundingClientRect()`: 0px gap above the rules box, consistent 4px label-to-select gaps — no recurrence of the stray-margin bug.

Also caught and fixed a 5th internal-bookkeeping leak on this same page while re-reading it before starting (see [Expression checker widget](18-widget-advanced-filter-condition.md)'s Answer for the first 4 and the root cause) — an Aside naming `PrefabManager.cs` and contrasting it against "the doc page," same badge shape as the others, different wording, so it slipped past that session's grep pass.

Build verified clean, 33 pages. Prototype round captured on the throwaway branch `prototype/trigger-change-explainer-widget`.
