Type: task
Status: open
Blocked by: 17

## Question

Build the "expression checker" interactive widget for `advanced-filter-condition.mdx` ("Advanced Filter: Condition"): the reader pastes a `condition:` string, sets fake function values, and sees it evaluate true/false with sub-parts highlighted.

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. The hard part here is parsing/evaluating an arbitrary `condition:` expression client-side well enough to highlight sub-parts; confirm the real condition-string grammar against source (per `ew_wiki/AGENTS.md`'s source-verify checklist) before deciding how much of the grammar the widget supports — a widget that silently mishandles an unsupported operator is worse than one that visibly declines to evaluate it.

Process: prototype first via `ew_toolkit:prototype` (this one's design is less obvious than #17's, given the parsing question above), then land the real Astro component, wire it into `advanced-filter-condition.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Filter: by Objects widget](17-widget-objects-filtering.md) is fully built and build-verified.
