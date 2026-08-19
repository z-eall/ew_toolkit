# Extract message wording into messages.yaml + build-time validator

Type: task
Status: open
Blocked by: [Design the legend-generation mechanism and placeholder syntax](02-legend-generation-mechanism.md)

## Question

Move every diagnosis message's wording (the ~40 templates surveyed across
`structuralPrecheck.ts`, `formatLint.ts`, `referenceValidation.ts`,
`rpcValidation.ts`, `yamlErrorMessages.ts`, `fileNameCheck.ts`) into the
catalog file, using the placeholder syntax and legend mechanism ticket 02
settled on. Code at each call site keeps deciding which catalog key applies
and what values fill its placeholders (per the map's "wording only" decision)
— only the literal text moves.

Covers:

1. All 20 static `yaml`-package `ErrorCode` translations + the generic
   fallback template in `yamlErrorMessages.ts`.
2. The plain static messages (root-level "must be a YAML list", "each entry
   must be key: value pairs", the ticket-07 `data:`/`name:` hint, etc.).
3. Every templated message with simple placeholder interpolation (the
   `additionalProperties` message, `Undefined data entry reference`, both
   `fileNameCheck.ts` messages, etc.).
4. The messages built by helper functions with multi-branch fragment
   composition (`orphanKeyMessage`'s 3 branches, `checkRpcParams`'s 3 issue
   kinds + `describeJsType`'s 5-way fragment, the prefab-requiredness
   singular/plural label, the ajv-error 3-way ternary) — each *candidate*
   message becomes its own catalog key; the branch-selection logic that picks
   among them stays in code.
5. A build-time validator (vitest test and/or a Node script wired into the
   existing deploy Action — ticket 02 informs which) that parses the catalog
   and confirms every placeholder the code substitutes at each call site is
   actually declared for that key, and vice versa — fails loudly (per the
   map's already-decided bad-edit-handling policy) on a mismatch or on
   invalid YAML.
6. Every existing regression test that currently asserts on literal message
   text (e.g. `.toContain("must be one of")`) needs to keep passing — either
   unchanged (if it asserts on a stable substring the catalog also uses) or
   updated to read expected text from the same catalog the code now loads
   from, so tests and production can't silently diverge.

Not in scope here: diagnosis category labels (see
[Move category labels into the catalog + apply the redesigned grouping](04-category-catalog-migration.md))
or the cleanup/simplification pass (see
[Cleanup pass: remove redundant/overlapping message code and rarely-firing rules](05-message-generation-cleanup.md))
— land the mechanical extraction first, on a clean baseline, before either.
