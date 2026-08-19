# Ambiguous scalar-list fallback message

Type: grilling
Status: resolved
Blocked by: (none)
Parent: [Diagnosis Arbitration map](../map.md)

## Question

When a scripter puts a **YAML list** on a scalar field but the items are **not**
typed filter lines and **not** bare entry names, the catalog falls back to a
generic message (Example D from the map review session):

```yaml
- prefab: P
  type: create
  data:
  - foo, bar
```

Today: `` Invalid `data:` format — `data:` must be a single string, not a YAML
list. `` (+ generic hint about triples / `filters:`)

Is this **clear enough**, or should the catalog add intent branches for other
detectable patterns (e.g. comma-present but not `type, key, value` shape,
multi-line pasted filter text, numeric-only list items)?

Grill:

1. **Clarity bar** — what would a scripter still find fuzzy after reading today's
   message?
2. **ROI** — which ambiguous subclasses appear often enough to warrant rows vs
   leaving `scalarDataFieldTypeMessage()` as ajv fallback?
3. **Anti-duplication** — any new row must not fire on cases already handled by
   typed-line or entry-name list rules (ticket 01 foundation).

If new rows are warranted: list them as concrete repro YAML strings for a
follow-on **task** ticket. If not: record "fallback is sufficient" and close.

## Resolution

**Add one catalog branch** for comma-present but incomplete typed lines; keep generic fallback for everything else.

| Decision | Answer |
|----------|--------|
| Clarity | Generic fallback too vague for `foo, bar`-style mistakes |
| New row | `ewp-malformed-typed-line-list` — commas present, no valid `type, key, value` line, not all bareword names |
| Fields | `data:`, `filter:`, `bannedFilter:`, nested `data:` alias (same as ticket 01 scalar-list rules) |
| Message | One item → put full triple on one line; multiple → use `filters:` / plural |
| Severity | Error / Value problem |
| Skip when | Any item passes `looksLikeTypedValueLine()`, or all bareword entry names |

Follow-on: [Implement malformed typed-line list diagnosis](06-implement-malformed-typed-line-list-diagnosis.md).

Repro YAML:
```yaml
# single incomplete line
- prefab: P
  type: create
  data:
  - foo, bar
# multiple incomplete lines
- prefab: P
  type: create
  data:
  - foo, bar
  - int, isCustom
```
