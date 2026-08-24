# Design the ingest() policy extraction

Type: grilling
Status: resolved

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

Grilled 2026-08-24, 1 round:

1. **Two small pure predicates, not one combined action tree.** The review's working hypothesis (`decideIngestAction(existingFiles, incomingFiles, mode) → action` called once up front) doesn't fit: `ingest()`'s invalid-filename gate must resolve before file content is read, and the duplicate check only runs on files that survived that gate — content-reading and two sequential `await showConfirmModal(...)` calls sit *between* the two decisions. One synchronous decide-everything call can't sit before that interleaved I/O without changing behavior.
2. **Folded into `fileIngestion.ts`**, not a new `ingestPolicy.ts` — two small functions, same domain as its existing pure helpers, no shared state to justify a separate module.
3. **`applyValidationMode`/validate-button left out of scope** — smaller, differently-shaped decisions; deferred to a follow-up ticket if they turn out to need one.

Built as designed: `fileIngestion.ts` gained `classifyUploadEntries()` (wraps the `classifyFileName` filter) and `findDuplicateFiles()` (wraps the `fileManager.exists` filter) plus a `PreparedFile` type. `main.ts`'s `ingest()` calls both instead of inlining the filters; it still owns the sequencing and both confirm modals (real DOM interaction, not policy to hide). 311/311 tests pass (4 new), `tsc --noEmit` clean, `vite build` succeeds.