# Decide policy for schema gaps where source/docs disagree or are closed-source

Type: grilling
Status: open
Blocked by: (none)

## Question

Ticket 02 confirmed the schema can't be 100% derived from public material alone. Specific open cases needing a decision:

- The `filter`/`bannedFilter` singular-vs-plural discrepancy (docs say singular exists, current C# source says only plural does, and the actual coercion logic is in a closed-source DLL) — should the schema follow docs, follow source, allow both, or flag as unverified?
- The `component.m_field` data-key namespace is confirmed open-ended/unenumerable (WEC's own README admits this) — should the validator allow any `Component.m_field`-shaped string unchecked, or attempt a partial allowlist?
- Two unrelated `paint` enums share the field name `paint` in different contexts (top-level filter vs. `terrain[].paint`) — confirm the schema must scope these per-location, not share one global enum.
- The third-party schema takes an opinionated stance of force-erroring on some still-functional-but-discouraged fields (e.g. `poke[].data`, top-level `delay`) to nudge users toward newer patterns. Adopt a similar "soft deprecation" stance for our own schema, or validate strictly against what actually works in current EWP regardless of Jere's intended direction?

See [research/02-schema-source.md](../research/02-schema-source.md) for full context.
