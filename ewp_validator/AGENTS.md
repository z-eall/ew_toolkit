# ewp_validator — Agent Notes

Rules specific to the validator's own code (`fileNameCheck.ts`, `structuralPrecheck.ts`, `rpcValidation.ts`, `referenceValidation.ts`, `shapeMismatchDiagnosis.ts`, `schema/generate.mjs`). Hub-wide rules (cost, tooling, UI/UX, dual-agent workflow) live one level up — see [../AGENTS.md](../AGENTS.md).

## Validation rule lifecycle

Every new or changed validation rule goes through this order:

1. **Source-verify.** Confirm the rule's real behavior against EWP/WEC's current C# source (or a live in-game test) — docs prose shows the idiomatic form, not necessarily the whole accepted grammar. For `data.yaml`-relevant behavior, verify against whichever mod's source actually implements it (EWP's `FileLoading.cs` for what EWP loads, WEC's `DataLoading.cs` for a WEC entry's own shape) — not both by default; they're independent implementations of the same folder convention, not a coupled pair.

   If source-verification hits a real wall — no honest signal the tool can check (e.g. the `"data"` filename prefix: this validator has no access to the scripter's real EWP install path) — don't force a source-backed rule. Ship it as a documented heuristic instead, with the divergence noted in a comment at the point of use.

2. **Dedupe-check.** Before adding the rule, check whether an existing check already flags the same root cause from a different angle (grep `structuralPrecheck.ts`, `formatLint.ts`, `referenceValidation.ts`, `rpcValidation.ts`) — extend or suppress an existing check rather than double-diagnosing.

3. **Architect the split.** Detectors are pure predicates in domain modules (`dataFieldValidation.ts`, `rpcValidation.ts`, …) — never carrying user-facing strings. Messages live in one of two catalog modules: `shapeMismatchDiagnosis.ts` for pre-ajv shape arbitration (plus `suppressAjvPath`), `ajvMessages.ts` for post-ajv fallback text (see [[Ajv fallback]] in CONTEXT.md). `structuralPrecheck.ts` calls both and holds no diagnosis text of its own.

4. **Respect the priority stack** when more than one check could fire on the same entry: parse → format lint → branch/intent guess → shape arbitration → domain validators (RPC, references) → ajv fallback. Highest wins and suppresses lower layers on the same path. When several notices still hit one field for one root cause (a legacy-rename info plus an ignored-field warning), emit a single warning that states the simplest fix, and suppress the rest.

5. **Calibrate severity to verification strength.** A rule generated from docs, not runtime-verified line-by-line (e.g. the RPC param table, rebuilt from `docs/RPCs.md` on every schema-generate run), stays warning-only — never promote a doc-generated mismatch to a hard error.

6. **Practice recommendations live in one catalog** (`practiceRecommendations.ts`, messages only; detectors stay in their domain modules). Add an entry whenever EWP accepts an input but a habit is recommended, or part of it is silently unused. Never an error. Message shape: group, what was found (named from the scan), simplest fix. A test over the catalog enforces the wording. Check `ew_wiki` for a page that documents the habit.

## Tests and the daily check

`npm test` uses a saved copy of the mod docs (`schema/fixtures/RPCs.md`, no internet). Builds and the daily GitHub run use the live docs (`npm run test:upstream`). If the daily run fails, the mod docs changed: read the diff, refresh the fixture, fix the validator. Failed scheduled runs show in the repo Actions tab; GitHub also emails the person who last changed the schedule.

Source-verify against the local mirror of Jere's mods first (see `docs/sources.md`); a hook checks the copy is fresh. After the mirror updates, its `changes` report lists which of our files are affected. Refresh the saved docs copy with `npm run refresh-fixture`, then run `npm test`.

## UI rules that broke before

Decisions live in `src/uiRules.ts` with tests in `uiRules.test.ts`. Change the rule there, not in the page code.

- Leave warning: needs `preventDefault()` and a non-empty `returnValue`. An empty string means "no prompt" in Firefox and Safari. Do not add a second `confirm()` on nav links; it stacks on the native prompt.
- Confirm dialog: Escape picks the safe value. Enter confirms only with `allowEnter` (one call site). Focus starts on the primary button. Never mark a danger button primary.
