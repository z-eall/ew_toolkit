# Fix the "Save all" freeze bug

Type: task
Status: resolved
Blocked by: (none)

## Question

"Save all" (soon "Export all" — see
[Rename Save to Export](02-save-to-export-rename.md)) was reported to freeze
the page and produce no real export.

**Root cause, confirmed by code trace:** `doSave("all")` (`main.ts:1461-1473`)
runs fully synchronously with no `await`/yield point, calling `buildZip()`
(`zip.ts:39-106`) directly on the click. `buildZip` represents every byte of
every file's content as a **plain JS `number[]`** rather than a typed array —
`local.push(...header, ...dataBytes)` (`zip.ts:67`) and `central.push(...)`
(`zip.ts:71-90`) both argument-spread whole byte arrays onto growing plain
arrays, and the very end does it a second time:
`Uint8Array.from([...local, ...central, ...eocd])` (`zip.ts:105`) spreads
`local` (already built via spreads) into a fresh literal array before ever
converting to bytes. For a real multi-file batch this is multiple full-byte
copies via argument-spread (quadratic-ish, and spread-into-`push` can throw
"Maximum call stack size exceeded" for large arrays) — all on the main
thread, no progress indicator, no yield — which matches "freezes the page ...
without doing any real export" exactly: the page locks up *before*
`downloadBlob` (`main.ts:1441-1450`, `main.ts:1470`) — the actual
download-triggering step — ever runs.

Fix:

1. Rewrite `buildZip` (`zip.ts:39-106`) to build directly into pre-sized
   `Uint8Array`s (compute total length up front, write via indexed
   assignment or `.set()`) instead of spreading through plain-array `push`.
2. Add a yield point before the heavy synchronous work starts (mirror the
   `await nextTick()` pattern `runVisibleValidation` already uses,
   `main.ts:1038-1049`) so the UI can paint a "building export..." state
   before the CPU-bound zip construction blocks the thread — this project's
   existing precedent for exactly this class of problem.
3. Regression test: `zip.test.ts` exists already — add a case building a
   batch large/numerous enough to have caught this (many files or larger
   content) and assert it completes and produces a valid zip, not just the
   existing presumably-small fixture case. Confirm the existing test
   fixtures don't already mask this (small enough inputs wouldn't have
   triggered the freeze, which is itself worth understanding — check why
   this shipped without a caught regression).
4. Live-verify in the browser preview: load enough real files to exceed
   whatever size threshold explains the freeze, click Export all, confirm
   the tab stays responsive and a real zip downloads.

## Answer

Fixed both the root cause and the missing progress feedback, per the ask to
weigh this against the hub-wide UX standing rules before deciding.

**`zip.ts` rewritten** to compute each entry's encoded name/content bytes,
CRC, and exact byte offset in one cheap pass, then write directly into one
pre-sized `Uint8Array` via `DataView` (multi-byte fields) and
`Uint8Array.set()` (name/content bytes) in a second pass — no `push(...)`
argument-spreads anywhere, so there's no unbounded-argument-list stack risk
and no repeated whole-array copying. This is strictly O(n) with native typed-
array writes instead of the old approach's several full copies via spread.
The on-disk zip format (headers, field order, byte layout) is unchanged —
only how the bytes get assembled changed — so every pre-existing byte-layout
test in `zip.test.ts` still passes unmodified.

**Why existing tests didn't catch it**: every prior `zip.test.ts` fixture was
a handful of bytes (`"hello world"`-scale) — the argument-spread ceiling that
throws "Maximum call stack size exceeded" only bites in the tens-of-thousands
range, so the bug was invisible at fixture scale and only surfaced on the
scripter's real, much larger multi-file batch.

**UX pass, weighed against the hub-wide standing rules**
([EW Toolkit map](../ew_toolkit/map.md)'s Notes — say what's happening, don't
leave the user guessing): `doSave` is now `async`, and only its `"zip"`
branch (the one with real work to do — a `"single"`-file export is just
wrapping one string in a `Blob`, effectively instant regardless of size) now
shows a `"Building export of N files…"` banner with a spinner, `await
nextTick()`s (mirrors `runVisibleValidation`'s existing pattern for exactly
this problem — banner paints before the CPU-bound work blocks the thread),
runs `buildZip`, downloads, then shows `"Exported N files"` before fading.
This means even a batch large enough to take a perceptible moment now reads
as "working," not "frozen" — the same standing-rule reasoning that shaped
the [message-quality checklist](../ew_toolkit/map.md) applies here too: a
slow-but-legitimate operation needs to say so, not go silent. Considered and
rejected: a size/count threshold to skip the banner for tiny exports — the
existing upload-banner pattern already shows unconditionally regardless of
size for consistency, and the banner's own `nextTick()` yield is cheap
enough (one macrotask) that skipping it for "small" batches wasn't worth the
added branching for a purely cosmetic saving.

**Tests**: two new `zip.test.ts` cases — a 25-file, ~700KB-per-file batch
(intentionally well past the old spread-argument ceiling) that must build
without throwing, and an offset-integrity check that walks the central
directory and confirms every record's local-header-offset field actually
points at a real local file header with a matching name length. 175/175
tests passing (was 173), type-check clean.

**Live verification**: loaded two files and clicked Export all in the
browser preview — completed instantly with no console errors from the
export path (the only console errors present are pre-existing Monaco-worker
dev-sandbox noise unrelated to this change, already known from earlier
sessions' tooling friction). Reproducing the actual multi-megabyte freeze
scenario isn't practical to script through the browser tool (would need
dragging real large files in), so the large-batch regression test is the
authoritative proof the freeze itself is fixed — disclosing this rather than
overclaiming full live reproduction.
