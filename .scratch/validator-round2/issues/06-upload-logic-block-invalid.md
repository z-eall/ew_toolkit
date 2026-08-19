# Rework upload logic: block invalid file types at intake vs. reactive clear

Type: grilling
Status: resolved
Blocked by: (none)

## Question

Today's flow is reactive: the scripter can upload a whole bundle including
files with invalid types/extensions, and only discovers the "Clear invalid
files" button (the trash-bin action) after the fact — if they never learn
that button exists, invalid files sit around and get needlessly validated
every time. The scripter wants this rethought: is it technically feasible
to block invalid file types at upload time instead, and if so, is that
actually the better UX, or does the bundle-then-hint flow serve a purpose
worth keeping?

Grill toward a concrete answer:

1. **Feasibility check (ground this first, AFK-able):** what does "invalid
   file type" mean at upload time — file extension only (cheap, can check
   before the file is even read), or does it require parsing/validating
   content (expensive, can't know until after intake)? Read
   `fileNameCheck.ts` and the upload handler in `main.ts`/`fileManager.ts`
   to state concretely which invalid-file cases are detectable from the
   filename/extension alone (blockable pre-intake) versus which require
   reading YAML content (only detectable post-intake, same as today).
2. Given that split: for the filename-detectable cases, does the scripter
   want a hard block (drag-drop rejects the file, never enters the file
   list) or an inline warning at upload time with a one-click "skip these"
   confirm — i.e. still reactive, but surfaced immediately at the upload
   moment instead of buried behind a button the scripter has to discover?
3. For content-detectable-only cases (can't know without reading the file),
   confirm the reactive Clear-invalid flow simply stays as-is — the
   scripter's complaint was about *discoverability* of that button, not
   necessarily the reactive model itself; check whether question 1's
   answer plus a more prominent/auto-surfaced hint (see
   [Standing rule: diagnosis messages hint at the UI action that fixes them](05-diagnosis-message-ui-hints.md))
   already solves this without an upload-blocking change at all.
4. This ticket may fully resolve into "no upload-time blocking needed, just
   make the existing Clear-invalid button impossible to miss" — that's a
   legitimate answer, not a cop-out; don't force a bigger rework than the
   feasibility findings justify.

## Resolution (partial — this ticket stays open)

**Feasibility (AFK groundwork over `fileNameCheck.ts` + `main.ts`'s upload
handler):** the "Invalid file" diagnosis is checked purely by filename
string (extension + prefix) — zero content parsing, 100% detectable at
upload time. Also found: non-`.yaml`/`.yml` files are already silently
blocked at intake today (`main.ts`'s `ingest()` filters via `isYaml` before
anything reaches the file list) — the only thing "Invalid file" currently
catches reactively is a `.yaml`-extension file with the wrong name.

**Scripter decision (Q1):** even though [Standing rule: diagnosis messages
hint at the UI action that fixes them](05-diagnosis-message-ui-hints.md)'s
in-message hint already addresses the original discoverability complaint,
the scripter wants to still pursue upload-time blocking if technically
feasible — worth the hassle savings on top of the reactive fix.

**Source-verification surfaced a blocker:** dispatched research against
EWP's actual `FileLoading.cs` (full findings:
[research/06-upload-block-feasibility.md](../research/06-upload-block-feasibility.md)).
Two results:
- **Extension gate:** confirmed EWP only ever loads `.yaml`, never `.yml`.
  Fixed now, this pass — `main.ts`'s `isYaml` regex and the file-input's
  `accept` attribute tightened from `.yaml`/`.yml` to `.yaml`-only, matching
  `fileNameCheck.ts`'s existing `.yaml`-only rule (previously `.yml` was
  silently dead — it could pass `main.ts`'s intake filter but would always
  fail `classifyFileName` right after).
- **Filename prefix gate:** found a real correctness bug — our `"data"`
  prefix rule doesn't match EWP's actual folder-based data-file rule (EWP
  loads any `.yaml` in a `data` folder, not files prefixed `data`). Spun off
  as its own ticket: [Fix the "data" filename rule](08-data-filename-folder-rule.md).

**Q2 (blocking approach, if pursued) — agreed, deferred:** building an
upload-time block on top of a filename rule already known to reject/accept
the wrong files would be worse than the current reactive flow. The "hard
block vs. warn-and-skip" decision is parked until
[08](08-data-filename-folder-rule.md) resolves and the filename rule is
trustworthy.

**Unblocked:** [Fix the "data" filename rule](08-data-filename-folder-rule.md)
resolved — the scripter kept the `"data"` prefix as a deliberate, documented
heuristic rather than chasing EWP's real folder-based rule (which this
validator's architecture can't check at all — its `folder` field is
UI-only, export-organization scoped). `classifyFileName` stays a pure,
cheap, filename-only check, so upload-time blocking is still fully feasible.

**Q2 (hard block vs. warn-and-skip) — resolved: warn-and-skip.** Reasoning:
the underlying `"data"` prefix rule is a known-imperfect heuristic (per
ticket 08), so a silent hard reject could drop a legitimate file with no
recourse inside the tool. Warn-and-skip closes the original discoverability
gap (the scripter sees the problem immediately at upload time, not buried
behind the Clear-invalid button later) while keeping an "Add anyway" escape
hatch for the false-positive case. The existing `.yaml`-only extension gate
stays a silent hard filter, unchanged — that gate has no known false-positive
risk, so a confirm prompt for it would just be noise.

**Implemented this pass** (`main.ts`'s `ingest()`): before reading any file
content, filename-detectable "Invalid file" entries are split out via
`classifyFileName` (imported from `fileNameCheck.ts`) and — if any exist —
a single `confirm()` lists them and asks "Add anyway?", matching the
existing duplicate-file-overwrite prompt's UX pattern. Cancel drops just
those entries and proceeds with the rest of the batch; OK loads everything
including the flagged files, deferring to the reactive Clear-invalid flow
as before. `npx vitest run` (190/190), `npx tsc --noEmit` clean, `npm run
build` succeeded. Live-verified in browser preview: uploaded a batch mixing
one filename-invalid file with one valid file — Cancel skipped only the
invalid one and loaded the valid one ("Checked 1 file"); a second upload
with OK loaded the flagged file through unchanged. Test files cleared from
the shared preview session afterward via "Clear all files".

**Implemented this pass:** `main.ts`'s `isYaml` and the file-input `accept`
attribute tightened to `.yaml`-only. `npx vitest run` (185/185, no fixture
changes needed — `fileNameCheck.test.ts` already asserted `.yml` → invalid),
`npx tsc --noEmit` clean, `npm run build` succeeded.
