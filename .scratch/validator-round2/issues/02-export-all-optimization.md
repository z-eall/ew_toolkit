# Optimize "Export all" — folder-by-folder vs. single batch zip

Type: grilling
Status: resolved
Blocked by: (none)

## Question

The scripter asked, considering UX: does it make sense for Export all to
zip folder-by-folder (one zip per loaded folder) instead of one zip
containing everything? Does zipping all files/folders at once risk heavy
resource use or freezing, and what's the best optimization approach?

Ground this before grilling opinions — dispatch research/investigation
first (this can run AFK, as a `research`-flavored sub-pass within this
ticket, since it's reading our own code, not third-party docs):

1. Read the rewritten `zip.ts` (fixed this session for the freeze bug —
   see [Fix the "Save all" freeze bug](../ui-functionality-fixes/issues/03-save-all-freeze-bug.md)
   in the UI/UX Functionality Fixes map) and the new stress test to state
   concretely what the *current* complexity/memory profile is (the old
   `push(...bytes)` spread bug is already fixed; is there still a
   real ceiling, e.g. holding every file's full byte content in memory at
   once before writing the archive?).
2. Estimate realistic scale: what's the largest batch a "huge project" user
   actually loads (rough file count / total size) — pull from what's
   already been observed this session (25-file/~700KB-per-file stress test)
   as a reference point, and ask the scripter to confirm/correct if it's
   off from real usage.

Then grill the actual UX decision:

3. Folder-by-folder export — multiple zip downloads (one per folder) vs. one
   zip with folder structure preserved inside it (which is arguably what
   "Export all" already conceptually means, just organized). Confirm which
   the scripter actually wants, since "folder by folder" is ambiguous
   between those two.
4. Whether a progress indicator (already added this session as a "Building
   export…" banner) plus the DataView rewrite already resolves the
   freeze concern well enough, or whether the scripter still wants
   additional chunking/streaming/worker-thread optimization on top.

## Answer

**Code-survey findings (AFK leg, done first per the ticket):** `zip.ts`'s
`push(...bytes)` freeze bug is already fixed via the two-pass DataView
rewrite — no unbounded argument spreads remain. There is still a real
(if modest) memory ceiling: pass 1 holds every entry's UTF-8-encoded byte
copy in the `prepared` array simultaneously before pass 2 writes the final
archive buffer, so peak memory is roughly 2x total batch content size. The
25-file/~700KB stress test (~17.5MB total) passes cleanly. `main.ts` already
had a "Building export…" spinner banner + `nextTick()` yield before the
(still fully synchronous, main-thread-blocking) `buildZip` call, and
`planSave` just references already-loaded file content, no extra copy at
planning time.

**Scripter's real scale is much larger than the 25-file reference point**:
possibly 2000+ files across multiple folders at once. At that scale the
near-certain risk is UI freeze/jank (main thread blocked for however long
the synchronous build takes — the browser may show a "page unresponsive"
warning), not a memory crash (YAML script content stays well within
reasonable browser memory limits even at 2000 files).

**Decision:** move `buildZip` into a Web Worker so the page never blocks no
matter the batch size, with the worker posting throttled progress messages
(~1% steps) that the existing "Building export…" banner displays live
(e.g. "142 / 2000 files packed") instead of a static spinner. Folder-by-folder
was **not** wanted as a shape change — the scripter's actual concern was
speed/resource-efficiency/UX, not restructuring the export into multiple
downloads; "Export all" keeps producing one zip with folder structure
preserved inside it.

**Implemented:**
- [zip.ts](../../../ewp_validator/src/zip.ts): `buildZip` takes an optional
  `onProgress(done, total)` callback, invoked once per entry in pass 1.
- [zipWorker.ts](../../../ewp_validator/src/zipWorker.ts) (new): runs
  `buildZip` off the main thread, throttling progress messages to ~1% steps
  (always including the final 100%) so a 2000-entry batch doesn't flood
  `postMessage`.
- [main.ts](../../../ewp_validator/src/main.ts): `doSave`'s zip branch now
  awaits `buildZipInWorker`, updating the banner text on each progress
  message instead of a static "Building export of N files…" string.
- Added a `zip.test.ts` case asserting `buildZip` reports progress once per
  entry, ending at `(total, total)`.

`npx vitest run` (186/186 passed), `npx tsc --noEmit` (clean), and
`npm run build` (succeeded, `zipWorker` bundled as its own chunk) all pass.
Live-verified in the browser preview: loaded 65 files via a simulated
multi-file upload, ran Export all, confirmed the network panel shows
`zipWorker.ts?worker_file&type=module` was actually fetched and used (not
the old synchronous path), and the banner reached "Exported 65 files" with
no new console errors (pre-existing Monaco-worker noise in the dev
environment is unrelated).
