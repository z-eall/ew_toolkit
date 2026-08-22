# EWP Validator

Vocabulary specific to `ewp_validator`'s UI and diagnosis/validation logic. Hub-wide concepts (EW Toolkit, Tool, Hub, Subpath) and Valheim-modding domain terms (EWP, WEC, Scripter, Schema) live one level up — see [../CONTEXT.md](../CONTEXT.md).

## Language

**Manual mode / Auto mode**:
The validator's two validation-trigger modes. Auto mode runs a hybrid revalidation automatically as the scripter types: a 400ms per-file structural pass on the edited file, plus a 1200ms idle full pass across all files (including reference validation). Manual mode defers all validation until the scripter clicks "Validate" explicitly.

**Diagnosis category**:
One of the 5 filterable buckets a diagnosis is grouped into: Structure problem, Value problem, Reference problem, Invalid file, Legacy but working. The naming is deliberate, not arbitrary: `"___ problem"` marks a category that mixes a hard error with a merely-informational finding; `"Invalid ___"` is reserved for the one category that's always a hard error (Invalid file); `"Legacy but working"` is the one category that's never an error.
_Avoid_: naming a future category "Invalid ___" unless it's a pure hard-error bucket every time it fires — see the naming principle above.

**Diagnosis arbitration**:
The mechanism that picks one intent-specific diagnosis when several validation layers would otherwise all flag the same mistake — the message that best matches what the scripter probably meant — and suppresses the generic schema/YAML noise on that same range. Owned by a single catalog module (`shapeMismatchDiagnosis.ts` today, grows with future domains). See [CLAUDE.md](CLAUDE.md)'s Validation rule lifecycle for the procedure that builds and extends it.

**Detector**:
A pure predicate function living in a domain module (`dataFieldValidation.ts`, `rpcValidation.ts`, etc.) that recognizes a specific mistake shape but carries no user-facing text itself — the "does this look wrong" half of [[Diagnosis arbitration]], kept separate from the message/severity decision.

**Priority stack**:
The ordered resolution chain applied when more than one check could fire on the same YAML entry: parse → format lint → branch/intent guess → shape arbitration → domain validators (RPC, references) → ajv fallback. Highest wins and suppresses lower layers on the same path.

**Problems panel**:
The bottom UI panel listing every diagnosis across every loaded file at once, alongside the sidebar file list and the Monaco editor — the tool's primary answer to the multi-file correlated-system debugging pain point that drove the validator's UI design.

**Confirm modal**:
The scroll-capped confirmation dialog pattern shared by the tool's three variable-length-list confirms — upload-gate, duplicate-overwrite, clear-invalid — each choosing its own primary/default button per [../CLAUDE.md](../CLAUDE.md)'s confirm-modal rule.
