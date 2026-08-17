# Decide policy for schema gaps where source/docs disagree or are closed-source

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Ticket 02 confirmed the schema can't be 100% derived from public material alone. Specific open cases needing a decision:

- The `filter`/`bannedFilter` singular-vs-plural discrepancy (docs say singular exists, current C# source says only plural does, and the actual coercion logic is in a closed-source DLL) — should the schema follow docs, follow source, allow both, or flag as unverified?
- The `component.m_field` data-key namespace is confirmed open-ended/unenumerable (WEC's own README admits this) — should the validator allow any `Component.m_field`-shaped string unchecked, or attempt a partial allowlist?
- Two unrelated `paint` enums share the field name `paint` in different contexts (top-level filter vs. `terrain[].paint`) — confirm the schema must scope these per-location, not share one global enum.
- The third-party schema takes an opinionated stance of force-erroring on some still-functional-but-discouraged fields (e.g. `poke[].data`, top-level `delay`) to nudge users toward newer patterns. Adopt a similar "soft deprecation" stance for our own schema, or validate strictly against what actually works in current EWP regardless of Jere's intended direction?

See [research/02-schema-source.md](../research/02-schema-source.md) for full context.

## Answer

- **`filter`/`bannedFilter` singular fields**: **Confirmed valid and fully equivalent, no warning needed** — live-tested by the user in-game. `filter:`/`bannedFilter:` (singular) accepts one value (either an inline `type,key,value` triple string or a bareword reference to a `data.yaml` entry, per ticket 06's reference-checking rules); `filters:`/`bannedFilters:` (plural) accepts a list of such values. Both forms produce identical behavior. This resolves the ambiguity ticket 02 flagged as unresolvable from public source alone — the closed-source deserialization layer evidently does support scalar-to-list coercion for this field, confirmed empirically rather than from source. Schema should accept singular as `string` and plural as `string[]` binding to the same underlying filter list, with no hint/penalty on either form.
- **`component.m_field` namespace**: **Unchecked freeform string, not a pattern match.** Correction to the original recommendation — WEC's `data` command (e.g. `data set=int,isCustomData,1`) lets scripters attach arbitrary custom-named data keys to objects, not just real Unity `Component.m_field` names. So this namespace has two legitimate shapes (real component field paths, and arbitrary user-chosen custom key names), not one consistent pattern — a `Word.m_word`-shaped regex would wrongly reject valid custom keys. Validate as an unconstrained string.
- **Two `paint` enums**: **Confirmed — scope per-location**, two separate enums (top-level filter vs. `terrain[].paint`), no shared type.
- **Deprecation stance**: **Confirmed — validate strictly against what currently works**, reuse Jere's own `docs/legacy.md` signal for genuinely-deprecated formats rather than inventing independent opinions about discouraged-but-functional fields.
