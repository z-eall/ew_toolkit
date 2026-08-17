# Decide type-validation strategy given ~70 nullable-string C# fields with documented semantic types

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Ticket 02 found that most EWP rule fields are typed `string?` at the C# level (to support function/range/list syntax resolved at runtime) even where prose docs describe them as bool/number/enum. The third-party schema's approach — type as `["boolean"|"number", "string"]` with a shared function-pattern regex (`^<[A-Za-z0-9\$=_\-\+<>/\.]+>$`) — matches this reality better than naive C#-reflection typing would.

Decide for the schema-generation approach:

- Adopt the documented-semantic-type + function-pattern-escape-hatch model (reusing/adapting the third-party schema's pattern) as the standard for every field, or something else?
- How should conditional requiredness be modeled — confirm `if`/`then` JSON Schema logic keyed on the `type` field's value (per `scripting.md`'s documented type-dependent field relevance) is the right mechanism, and scope how deep that conditional logic needs to go (just prefab-required-or-not, or per-type field relevance more broadly)?

See [research/02-schema-source.md](../research/02-schema-source.md) for full context.

## Answer

- **Type-validation model**: split by field kind, not one shared pattern.
  - **Enum fields** (`type`, `paint`, etc.): validate **strictly** against the known value list — this is where a typo is exactly what the tool should catch, and the valid set is fully known.
  - **Bool/number-with-alt-syntax fields** (`chance`, `admin`, `day`, etc.): accept the native type **or** an unconstrained string — not a narrow function-only regex. These fields support comma-lists, `min;max` ranges, `min;max;step;expression`, and `<function>` calls; precisely validating every variant is high effort for low return, and a too-narrow pattern risks false positives on valid syntax not anticipated.
- **Conditional requiredness**: scope to the one case EWP's own author flags — `prefab` required-or-not per `type`'s value — modeled as a **warning**, not a hard error, mirroring EWP's own runtime severity (`PrefabLoading.cs` only warns, never errors, on this). No full per-type field-relevance matrix for v1 — irrelevant fields don't error in EWP, they silently no-op, so validating them wouldn't catch real bugs.
