# ewp_validator — Standing Rules

Rules specific to the validator's own code (`fileNameCheck.ts`, `structuralPrecheck.ts`, `rpcValidation.ts`, `referenceValidation.ts`, `shapeMismatchDiagnosis.ts`, `schema/generate.mjs`). Hub-wide rules (cost, tooling, UI/UX) live one level up — see [../CLAUDE.md](../CLAUDE.md).

## Validation rule lifecycle

Every new or changed validation rule goes through this order:

1. **Source-verify.** Confirm the rule's real behavior against EWP/WEC's current C# source (or a live in-game test) — docs prose shows the idiomatic form, not necessarily the whole accepted grammar. For `data.yaml`-relevant behavior, verify against whichever mod's source actually implements it (EWP's `FileLoading.cs` for what EWP loads, WEC's `DataLoading.cs` for a WEC entry's own shape) — not both by default; they're independent implementations of the same folder convention, not a coupled pair.

   If source-verification hits a real wall — no honest signal the tool can check (e.g. the `"data"` filename prefix: this validator has no access to the scripter's real EWP install path) — don't force a source-backed rule. Ship it as a documented heuristic instead, with the divergence noted in a comment at the point of use.

2. **Dedupe-check.** Before adding the rule, check whether an existing check already flags the same root cause from a different angle (grep `structuralPrecheck.ts`, `formatLint.ts`, `referenceValidation.ts`, `rpcValidation.ts`) — extend or suppress an existing check rather than double-diagnosing.

3. **Architect the split.** Detectors are pure predicates in domain modules (`dataFieldValidation.ts`, `rpcValidation.ts`, …) — never carrying user-facing strings. Messages and `suppressAjvPath` arbitration live only in the catalog module (`shapeMismatchDiagnosis.ts` or a sibling re-exported through one `diagnoseShapeMismatches` entry point). `structuralPrecheck.ts` calls arbitration once per entry, before ajv runs.

4. **Respect the priority stack** when more than one check could fire on the same entry: parse → format lint → branch/intent guess → shape arbitration → domain validators (RPC, references) → ajv fallback. Highest wins and suppresses lower layers on the same path.

5. **Calibrate severity to verification strength.** A rule generated from docs, not runtime-verified line-by-line (e.g. the RPC param table, rebuilt from `docs/RPCs.md` on every schema-generate run), stays warning-only — never promote a doc-generated mismatch to a hard error.
