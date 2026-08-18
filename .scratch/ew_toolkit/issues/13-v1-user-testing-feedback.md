# User-test the shipped v1 and feed back validation corrections

Type: task
Status: in-progress
Blocked by: (none)

## Question

The scripter (user) will exercise the deployed v1 toolkit against real EWP/WEC
YAML files and report back where **Structural validation** or **Reference
validation** gets it wrong — false positives (flagging valid YAML), false
negatives (missing a real error), wrong/confusing messages, or bad file/line
locations.

This is the real-world correctness pass the automated tests can't cover: the
hand-encoded Schema (`schema/generate.mjs`) is only as accurate as the docs +
C# source it was derived from, and live in-game behaviour has already corrected
it once (the `filter`/`bannedFilter` singular forms, ticket 08). Expect more of
the same.

## How this works

- User loads real files, notes anything the tool gets wrong, and hands the
  cases (YAML snippet + what they expected vs. what the tool said) back in chat.
- Each reported case becomes a targeted Schema or structural-pre-check fix,
  with a regression test added alongside (same pattern as ticket 08's live-test
  corrections).

## Answer

### Round 1 — custom-key + `data:` false positives (reference validation)

Five cases reported against `referenceValidation.ts`, all addressed with
regression tests in `referenceValidation.test.ts`:

1. **Dynamic `<...>` params in a saved key** — `<save_captureblockercity<int_isRadarCity=0>_<time>>`
   read as `captureblockercity1` was flagged. Key matching is now a "likely
   match": `<...>` params are treated as wildcards (`keysCompatible`), and key
   extraction was rewritten as a balanced-bracket scanner that also strips the
   trailing save value / `<load_..=default>`.
2. **Top-level `data:` `type,key,value` injection** — `float, cooldownFrostseerBlobSpawner, <time>`
   is a data injection into the trigger object, not a data.yaml reference; no
   longer flagged.
3. **`data: <string_..>` object-data read** — resolves to a data.yaml name from
   the object's ZDO data at runtime, unverifiable here; no longer flagged.
   (2 + 3 removed the `data-function` "blue flag" rule entirely.)
4. **`type: key, adminmoderecovery 30;99999`** — now compares only parameter1
   (`adminmoderecovery`); parameter2 is a hand-written value. Message names only
   the key.
5. **Keys with `<pid>/` and `/`** — `keys: <pid>/teamlead 1` vs
   `<save_<pid>/teamlead_<par_1>>` now match on the name portion only, ignoring
   the value.

### Round 2 — purely-dynamic saved keys, commented-out templates, filter/UI polish

Two more `referenceValidation.ts` cases, plus two Hub UI items and one
Problems-panel bug, reported together:

1. **A saved key built entirely from passed params** — `<save_<par_1>_<par_2>>`,
   `<clear_<rest_1>>`, `<save_<pid>_<long_playerID>>` — extract a key name that
   is *purely* a dynamic `<...>` group with no literal characters at all. The
   real name only exists at runtime (a passed parameter or function result), so
   there's nothing concrete to check a read/write against. `scanKeyOccurrences`
   and the `keys:`/`bannedKeys:`/`type: key` extraction points now all skip
   recording an occurrence when `hasLiteral(key)` is false, instead of recording
   it and then flagging it as an orphan.
2. **A `<save_..>`/`type: key` pair written inside a YAML comment** — the
   key-template scanner reads raw file text with no comment awareness, so a
   `# exec: <save_realtimesecond_..>` was still counted as a live write even
   though the matching `# - type: key, realtimesecond ...` read (correctly
   skipped, since the parsed-YAML AST skips comments) wasn't — producing a false
   "written but never read". Added `stripLineComments`, which blanks out `#...`
   to end-of-line (comment start = start-of-line or preceded by whitespace, per
   the YAML spec) before the raw-text scan runs, preserving offsets so ranges
   stay valid.
3. **Problems-panel tab counts didn't respect the category filter** —
   `renderProblemsPanel` computed the Errors/Warnings/Info tab badges from every
   loaded problem, then applied the category filter only when deciding which
   rows to *list*. Narrowing the category filter left the badges showing the
   unfiltered total. Counts are now derived from the same category-filtered
   pool the list itself uses.
4. **Support page**: "Expand World mods" now links to
   https://thunderstore.io/c/valheim/p/JereKuusela/; "Jere Kuusela" shortened to
   "Jere" to match his casual Discord IGN.

Regression tests added to `referenceValidation.test.ts` for cases 1 and 2 (95
tests passing). Case 3 verified by code inspection + type-check (interactive
Monaco-editor verification wasn't reliable to automate this round). Case 4
verified via a rendered support page.

(open for further rounds — awaiting more of the user's test cases)

Closed for now on 2026-08-18: the scripter (user) has run enough self-testing
rounds; further progress is blocked on external users trying the deployed
tool and reporting back. Reopen (set back to `in-progress`) once new
external-user feedback comes in.

### Round 3 — leave-prompt, legacy-format category, comment-suppressed reads (reopened 2026-08-18)

Reopened the same day with a mix of functionality and validation corrections
from the scripter's continued self-testing:

1. **Leave prompt never fired on the live site** (`main.ts`). The `beforeunload`
   guard set `e.returnValue = ""`; an empty string is the legacy "no prompt"
   signal, so Firefox/Safari/older Chrome silently skipped the native dialog —
   the live site warned on neither tab-close nor a switch to another hub
   sub-site. Set `returnValue` to a non-empty string so the dialog actually
   raises. The separate `.nav-link` `confirm()` handler was removed: each
   sub-site is its own document, so those links are full navigations already
   covered by `beforeunload` — keeping both now double-prompted.
2. **New "Legacy format entry" diagnosis category** (`structuralPrecheck.ts` +
   `main.ts`). The legacy `delay:`/`spawn:`/`swap:` info notices previously rode
   under the "EWP rule entry" category; they now carry their own
   `LEGACY_FORMAT_CATEGORY` branch so the Problems panel can filter them apart.
   Wording changed from "Old format:" to "Legacy format:" to match Jere's docs.
3. **Live reads whose only `<save_..>` is commented out** (`referenceValidation.ts`).
   The `truceday` case: `<load_truceday=0>` and `bannedKeys: truceday` are live
   reads, but both `<save_truceday_..>` writes are toggled off in comments. Round
   2 (rightly) stopped commented templates counting as *live* writes, which left
   these live reads flagged as a generic "no `<save_..>` found". Rather than
   silently suppress, the check now distinguishes "the counterpart is only
   commented out" from "there is no counterpart anywhere" and emits a *different*
   message for the former: **"'X' is read here, but its only `<save_..>` is
   commented out — uncomment the write, or remove this read"**, and the mirror
   **"'X' is written (`<save_..>`), but its only read is commented out …"**.
   Detection: re-scan the raw text; since `stripLineComments` preserves offsets,
   any raw `<save/load/clear>` occurrence whose start offset the live (stripped)
   scan didn't yield is a commented one (`commentedWriteNames`/
   `commentedReadNames`). Reads also have an AST field form
   (`keys:`/`bannedKeys:`/`type: key`) the YAML parser never sees in a comment,
   so `scanCommentedReadKeys` additionally recovers those key names from raw
   comment lines — a commented `# bannedKeys: X` now yields the "read is
   commented out" message too, not just `<load_..>` forms. (Writes have no AST
   form, so no matching pass is needed.) This is the only rule that inspects
   comments; the data.yaml-reference checks are AST-only, so nothing there
   needed the same treatment.

Regression tests added: `referenceValidation.test.ts` (truceday read side +
write-side mirror + AST-field commented read), and
`structuralPrecheck.test.ts` (legacy notices assert `Legacy format:` wording +
`LEGACY_FORMAT_CATEGORY` branch). 99 tests passing, type-check + build clean.
The "Legacy format entry" category was confirmed rendering live in the
Problems-panel category filter.

### Round 4 — filename gate (added 2026-08-18)

Before this round the tool ran both diagnosis passes (structural pre-check +
reference validation) on **every** loaded `.yaml`, classifying entries only by
shape (`guessBranch`) — filenames were never inspected. EWP, however, only
loads YAML whose name marks it a structural file, so the name is worth a check
of its own. New pure module `fileNameCheck.ts` (+ `fileNameCheck.test.ts`),
gated in `FileManager.revalidateAll`:

1. **Current formats** — `expand_prefabs*.yaml` and `data*.yaml` classify as
   `valid`; scanned exactly as before, no filename notice.
2. **Legacy data-processor name** — `expand_data*.yaml` classifies as `legacy`.
   It still works, so it's still fully scanned, but carries a blue info notice
   under the shared `LEGACY_FORMAT_CATEGORY`: **"Legacy filename: '…' is the old
   data-processor name … recommend renaming it to 'data<suffix>.yaml' in the
   /config/data directory"** (suffix = whatever followed `expand_data`, casing
   preserved). Worded as a filename recommendation, not an entry-format one.
3. **Everything else** — a hard **"Invalid file"** error (new
   `INVALID_FILE_CATEGORY`, registered in `main.ts`'s `DIAGNOSIS_CATEGORIES`):
   **"'…' doesn't match an EWP structural filename … Allegedly not an EWP
   structural file — recommended to remove it."** Both diagnosis passes are
   **skipped** for an invalid file — it's excluded from the reference-validation
   input entirely, so its (mis-filed) data/key namespace doesn't count either.

Classification is `.yaml`-extension-required and case-insensitive on the
prefix/extension; the singular `expand_prefab` is intentionally *not* accepted
(only the real plural `expand_prefabs`). An unsaved draft (ephemeral, never
saved — the `unnamed.yaml` editor buffer) is exempt from the gate so typing a
new file isn't instantly flagged "Invalid file".

Regression tests in `fileNameCheck.test.ts` (11 cases: valid/legacy/invalid
classification, extension + casing handling, rename-target derivation, and the
info/error `Problem` shapes). 110 tests passing, type-check + build clean.

### Round 5 — value groups with numeric values (added 2026-08-18)

A `valueGroup`'s `values:` list was schema-typed as `strArray` (every item a
string), so a group of numeric parameter values —

```
- valueGroup: Hello
  values: [hello, 123, 444, 555]
```

— raised six spurious `/values/N must be string` errors. Per Jere's
`README_data.md` ("multiple parameter values"), a value group's values are
parameter *values* and can be numeric (they're substituted as text in-game);
YAML parses bare `123`/`4.5`/`true` as number/boolean, not string. Added a
`scalar`/`scalarArray` helper in `schema/generate.mjs` (string | number |
boolean — the same shape the raw-data entry's `additionalProperties` already
uses) and switched `valueGroup.values` to `scalarArray`. Regression test in
`structuralPrecheck.test.ts`. 111 tests passing, type-check clean.
