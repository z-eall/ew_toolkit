Type: task
Status: resolved
Blocked by: 17

## Question

Build the "expression checker" interactive widget for `advanced-filter-condition.mdx` ("Advanced Filter: Condition"): the reader pastes a `condition:` string, sets fake function values, and sees it evaluate true/false with sub-parts highlighted.

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. The hard part here is parsing/evaluating an arbitrary `condition:` expression client-side well enough to highlight sub-parts; confirm the real condition-string grammar against source (per `ew_wiki/AGENTS.md`'s source-verify checklist) before deciding how much of the grammar the widget supports — a widget that silently mishandles an unsupported operator is worse than one that visibly declines to evaluate it.

Process: prototype first via `ew_toolkit:prototype` (this one's design is less obvious than #17's, given the parsing question above), then land the real Astro component, wire it into `advanced-filter-condition.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Filter: by Objects widget](17-widget-objects-filtering.md) is fully built and build-verified.

## Answer

Built `ConditionExplainer.astro` — a fixed 3-value scenario (biome/star-level/global-key) with a 4th "Grouping" control that switches between EWP's default (no-parens) evaluation order and an explicit parenthesized one, chosen so the same 3 checks land on a different PASS/FAIL depending only on which grouping is picked. 4 prototype rounds on maintainer feedback: v2 (checklist layout, per-control mismatched input types) → v3 (all-dropdown controls, results reworked into a horizontal chip breakdown shaped like the expression itself, `condition:` shown as the real script field) → v4 (new parenthesization-teaching example + grouping toggle, 3 stacked horizontal zones instead of 2-column, operator keywords in the precedence note rendered as code chips) → final (removed a redundant bottom verdict bar, the last breakdown chip already carries the PASS/FAIL).

Before designing the widget, checked EWP's own C# source per the ticket's own instruction (no local clone; fetched via raw.githubusercontent.com from `JereKuusela/valheim-expand_world_prefabs`). The actual `Conditions`/`ConditionClause` parser isn't in this repo (compiled into a shared `assembly_utils.dll`), but `ExpandWorldPrefabs.Tests/ConditionsTests.cs` gave real, source-confirmed answers:

- **Precedence is real and documented in the tests**, contradicting the page's prior caution that it was unconfirmed: `not > and > xor > or`. Parentheses override it but aren't required for a correct expression — only to change the order or aid readability. Fixed the page's operator-order section and turned this into the widget's whole teaching point.
- **`in`/`not in` does case-insensitive substring "contains" matching**, not strict comma-list membership (`wolf in wolfpack,boar` is true). Added a caution to the page's operator table — a real footgun for anyone assuming list semantics.
- Also confirmed and documented on the page: operator keywords are case-insensitive; `=`/`!=` compare text case-insensitively but numbers numerically; `>`/`<`/`>=`/`<=` silently evaluate `false` on non-numeric operands rather than erroring; a side counts as valid unless empty, `0`, or the literal text `false` (any casing); `==`/`<>` are rejected, not accepted as aliases for `=`/`!=`.

`docs/sources.md` updated with the new `ConditionsTests.cs` source entry. Wired the component into `advanced-filter-condition.mdx` directly under the precedence explanation. Build verified clean via `build-check.sh` (33 pages).

Prototype rounds captured on the throwaway branch `prototype/condition-explainer-widget`.

**Follow-up round**: the maintainer caught 3 internal-bookkeeping sentences I'd written into the page's own Asides (naming `ConditionsTests.cs`, a test method, and "scripting.md's prose doesn't state this" — exactly the pattern `ew_wiki/AGENTS.md`'s pre-existing house-style rules already ban). Root cause: my source-verify habit ("cite what proved this") bled into reader-facing prose without a check against that separate rule. Rewrote all 3 plus one more of the same shape found wiki-wide (`advanced-triggers-time.mdx`). Added a mechanical hook, `guard-reader-internal-bookkeeping.cjs`, so the next slip gets caught before landing, not after. Also fixed two stray-margin gaps in the live widget (above the condition box, above the dropdowns) — same recurring Starlight CSS bug as ticket 17. Synced the fix and the new hook to the `ew_toolkit-cursor` worktree per the dual-agent standing-rule-sync rule (that worktree was found to be several sessions further behind than just this — caught up in the same pass).
