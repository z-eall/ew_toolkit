Type: task
Status: claimed
Blocked by: 18

## Question

Build the "would this fire?" interactive widget for `advanced-triggers-change.mdx`: the reader sets a before/after value pair against a `type: change` line, plus a `triggerRules:` toggle demonstrating the "look away" gotcha documented in [Doc-example schema hook, injectData/triggerRules corrections](15-doc-example-schema-hook.md).

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. The `triggerRules:` behavior must match what ticket 15 source-verified against `PrefabManager.cs`/`PrefabData.cs` — re-read that ticket's Answer before encoding the fire/no-fire logic, don't re-derive it from `scripting.md`'s prose.

Process: prototype first via `ew_toolkit:prototype` if the before/after + toggle interaction isn't already obvious, then land the real Astro component, wire it into `advanced-triggers-change.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Advanced Filter: Condition widget](18-widget-advanced-filter-condition.md) is fully built and build-verified.
