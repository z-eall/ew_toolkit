# Decide type-validation strategy given ~70 nullable-string C# fields with documented semantic types

Type: grilling
Status: open
Blocked by: (none)

## Question

Ticket 02 found that most EWP rule fields are typed `string?` at the C# level (to support function/range/list syntax resolved at runtime) even where prose docs describe them as bool/number/enum. The third-party schema's approach — type as `["boolean"|"number", "string"]` with a shared function-pattern regex (`^<[A-Za-z0-9\$=_\-\+<>/\.]+>$`) — matches this reality better than naive C#-reflection typing would.

Decide for the schema-generation approach:

- Adopt the documented-semantic-type + function-pattern-escape-hatch model (reusing/adapting the third-party schema's pattern) as the standard for every field, or something else?
- How should conditional requiredness be modeled — confirm `if`/`then` JSON Schema logic keyed on the `type` field's value (per `scripting.md`'s documented type-dependent field relevance) is the right mechanism, and scope how deep that conditional logic needs to go (just prefab-required-or-not, or per-type field relevance more broadly)?

See [research/02-schema-source.md](../research/02-schema-source.md) for full context.
