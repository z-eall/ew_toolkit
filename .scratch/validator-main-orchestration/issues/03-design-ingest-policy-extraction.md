# Design the ingest() policy extraction

Type: grilling
Status: open

## Question

The 2026-08-24 re-review (after ticket 02 closed) found the seam split
extracted the *mechanical* file-ingestion code (`fileIngestion.ts`'s tree
walking, path splitting) but left the *policy* decision inline in `main.ts`'s
`ingest()` (~lines 1088-1181), untested:

- filename-prefix gating with a 3-way confirm modal
- duplicate detection with an overwrite/cancel modal
- mode-dependent batching (Manual mode leaves files "not checked yet";
  Auto mode calls `runVisibleValidation`)

This is the highest-value candidate from the re-review (rated Strong) because
it's the one place in `main.ts` where a wrong decision can silently drop or
overwrite scripter data, and it currently has zero test coverage — no
`main.test.ts` exists.

Design questions for the grilling session:

- What's the pure function's signature? Working hypothesis from the review:
  `decideIngestAction(existingFiles, incomingFiles, mode) → action`, where
  `action` is a typed result the DOM layer renders (which confirm modal, if
  any; what to do on confirm/cancel) rather than the function calling
  `showConfirmModal`/`fileManager` itself.
- Does this become its own module (`ingestPolicy.ts`, matching the
  `focusedProblem.ts`/`fileIngestion.ts` naming pattern from ticket 01), or
  fold into `fileIngestion.ts` alongside the parsing helpers it was scoped
  out of?
- Same shallow-extraction pattern recurs, smaller scale, in
  `applyValidationMode` (catch-up-banner decision) and the validate-button
  click handler (resort-on-manual-validate decision) — in scope for this
  ticket's design, or split into their own follow-up tickets once the
  ingest-policy shape is settled?

Source: 2026-08-24 `/improve-codebase-architecture` re-review (HTML report
written to the OS temp dir, not repo-tracked) — Finding 1, rated Strong.

## Answer

(unresolved)