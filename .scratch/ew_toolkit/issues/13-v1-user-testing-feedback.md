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

### Round 6 — punctuation/format lint (double colon) (added 2026-08-18)

A `filter:: value` typo (double colon) is legal YAML: the `: ` after the first
colon is the key/value separator, so YAML reads the key as literally `filter:`.
ajv then rejected `filter:` as an unknown property — **"'filter:' is not a
valid key in a EWP rule entry"** — and, because the key was nested in a `poke:`
list, `ajvErrorRange` (which only searches the *top-level* map for the bad key)
found nothing and fell back to the whole entry's range: **wrong message, wrong
line**. The scripter had to eyeball the file to find the `::`.

New module `formatLint.ts` (+ `formatLint.test.ts`): a punctuation/format lint
that **walks the parsed YAML tree** (`yaml`'s `visit`) and inspects every
mapping *key* — so it points at the key node's own range (right line, right
span) and ignores values and comments. First check: a key containing *any*
stray colon (the `: ` separator stops at the first colon-then-space, so a `::`
folds the extra colon into the key — trailing `filter::` → key `filter:`, or
mid-key `fil::ter:` → key `fil::ter`), reported as an **error** under a new
filterable `FORMAT_CATEGORY` ("Formatting", registered in `main.ts`). The
check registry
is deliberately open so more key-punctuation checks can be added — the scripter
asked for coverage "inclusive but not limited to `::`".

Wired into `runStructuralPrecheck` (runs first, independent of schema
validation). To stop the *same* typo double-reporting, the ajv loop now drops
any `additionalProperties` error whose bad key contains a `:` — a real EWP/WEC
key never does, so that error is always the `::` artifact the format lint
already covers. (`formatLint` imports only the `Problem` *type* from
`structuralPrecheck`, type-only so there's no runtime import cycle.)

Regression tests: `formatLint.test.ts` (8 cases — nested key, mid-key colon,
multiple hits, comment/value exclusion, clean + unparseable input) and a
`structuralPrecheck` integration test asserting the misleading "not a valid
key" is gone and one `Formatting` error lands on the right line. 120 tests
passing, type-check + build clean; verified live against the scripter's
dispenser snippet (two `::` flagged at their exact lines 25 & 38).

### Round 7 — data-entry references, merged prefab rule, commented-out lists (added 2026-08-18)

Three follow-on fixes from the same testing session.

**1. `filter:`/`filters:` as data-entry references + category rename + dynamic
filter menu.** `referenceValidation.ts` now treats a top-level `filter:` (single
bareword) and `filters:` (a list, walked item by item so each undefined name
points at its own line) as data-entry references, flagging undefined ones with
the same "Undefined data entry reference" error as `data:`. Comma shorthand and
`<...>` values still fall through (`isBarewordReference`). The category label was
renamed **"data.yaml reference" → "Data entry reference"** — after the round-4
filename gate, `expand_data*.yaml` files are also a source, so "data.yaml" was
too narrow. The whole category vocabulary moved into a new unit-tested module
`diagnosisCategories.ts` (branch titles single-sourced from
`structuralPrecheck`'s `BRANCH_TITLES`), and the Problems-panel category filter
is now **dynamic**: `presentSortedCategories` lists only the categories present
in the current diagnoses, ascending alphabetical, and the labels are sentence
("Proper") case except EWP/WEC abbreviations (fixing the old lowercase "custom
saved key"/"object data").

**2. Merged `type:`/`types:` prefab-requiredness, now a hard error.** The old
check only looked at singular `type:`, so a `- types: [key, ...]` entry with no
prefab was wrongly told it "needs a prefab". `collectTypeWords` now gathers the
leading word of `type:` and of every `types:` item; a prefab satisfies all of
them, and every prefab-less type (globalkey/key/custom/event/time/realtime —
confirmed against docs/scripting.md, "There is no prefab or position for this
type…") passes. A prefab-requiring type with no prefab is now an **error**
(ticket 09 had it as a warning; the scripter asked to promote it), naming only
the offending type(s) and anchored on the `type:`/`types:` field.

**3. Commented-out typed-list fields.** A field emptied by commenting out its
only item (`floats:` then `#  - fireMineStamp, <par_1>`) parses to null, so ajv
emitted "/floats must be array" at the key. `commentedOutListItemRange` detects
the commented-out list-item shape and, in the ajv loop, replaces that error with
a warning pointing at the *disabled line* ("`floats:` has no entries — its only
item is commented out…"). Narrowly guarded (array-type error, depth-1 field), so
a genuinely empty field still gets the plain error.

135 tests passing (was 120), type-check + build clean. Verified live: the two
`[Data entry reference]` errors, the `type 'say'` error on the `types:` line,
the commented-out `floats:` warning on the comment line, and the dynamic
category menu (only present categories, sorted, "Data entry reference" renamed).
Two-axis code review clean on Spec; Standards judgement-call refactors applied
(single-sourced branch titles, DRY'd the reference-collection loops).

### Round 8 — `type`/`types` case-sensitivity false positive (added 2026-08-19)

The scripter live-tested EWP 1.58 in-game and confirmed `type: globalKey` and
`type: globalkey` behave identically, but the validator rejected the camelCase
form with two errors: a pattern-mismatch on `type` (`schema/generate.mjs`'s
`TYPE_ENUM` regex was lowercase-only) and a spurious "needs a 'prefab'"
(`structuralPrecheck.ts`'s `TYPES_WITHOUT_PREFAB` Set lookup was an exact-case
match, so `globalKey` didn't match its own lowercase `globalkey` entry).

Root cause confirmed against EWP's actual C# source (not docs) via a research
pass: [research/13-round8-type-case-sensitivity.md](../research/13-round8-type-case-sensitivity.md).
`type`/`types` resolves through `Enum.TryParse(types.Key, true, out Type)`
(`PrefabData.cs:722`) — the `true` is `ignoreCase`. This is the house style,
not special-cased: every other EWP enum-bound field parsed via
`service/Parse.cs` uses the identical `Enum.TryParse(arg, true, ...)` pattern
(`terrain[].paint`, RPC hit types, etc.), and the non-enum `paint`/`minPaint`/
`maxPaint` word-list achieves the same case-insensitivity via
`arg.ToLowerInvariant()` against a lowercase-keyed dictionary. Docs
(`docs/scripting.md`) only ever show lowercase, which is why the schema was
hand-encoded lowercase-only — the docs aren't wrong, just incomplete on what
the parser actually accepts. Same shape as ticket 08's `filter`/`bannedFilter`
correction.

Fix: `generate.mjs`'s `typeValue` pattern now builds a per-letter bracket
class (`ci()` helper — JSON Schema's `pattern` keyword carries no regex flags,
so case-insensitivity has to be baked into the pattern string itself) instead
of the plain-lowercase `TYPE_ENUM` alternation. `structuralPrecheck.ts`'s
`TYPES_WITHOUT_PREFAB.has(t)` now lowercases `t` before the Set lookup.
Lowercase stays the suggested/documented style (unchanged), but any casing now
validates. `terrain[].paint` and the top-level `paint`/`minPaint`/`maxPaint`
fields were checked too — both already accept any string via an `anyOf`
fallback branch, so they were never actually case-sensitive; no fix needed
there.

Regression tests added: `schema/generate.test.mjs` (pattern accepts
`globalKey`/`GLOBALKEY`/`GlobalKey`/`Say`/`COMMAND`) and
`structuralPrecheck.test.ts` (prefab-less check accepts mixed-case type
words). 164 tests passing (was 162), type-check clean. Verified live: the
scripter's exact `type: globalKey, removeskydrops` / `remove: true` snippet
now validates with 0 errors/warnings/info, while a genuine typo
(`nonsenseType`) still correctly raises both errors.

### Round 9 — audited the other casing mechanism: property/key names (added 2026-08-19)

Follow-up to round 8: the scripter asked whether other hand-encoded validation
might have the same doc-vs-source gap. Value-level enum casing was already
exhausted by round 8 (`type` was the only truly strict enum; the two `paint`
enums already accept any string via an `anyOf` fallback, so were never
strict). The one other unverified mechanism was YAML **key** matching —
`additionalProperties: false` appears 8 times across the schema's object
shapes and rejects any key that isn't an exact-case match.

Research: [research/13-round9-key-case-sensitivity.md](../research/13-round9-key-case-sensitivity.md).
Confirmed from EWP's `Yaml.cs` + YamlDotNet source: EWP's deserializer only
sets `.WithNamingConvention(CamelCaseNamingConvention.Instance)`, never
YamlDotNet's separate `caseInsensitivePropertyMatching` flag (defaults
`false`). So unlike `type`'s value, a wrong-case **key** (`Prefab:` vs
`prefab:`) is not accepted by EWP itself — it's silently dropped by EWP's own
deserializer. **No fix needed**: `additionalProperties: false`'s exact-case
matching already models EWP's real behavior correctly here.

Net result of rounds 8+9: both casing mechanisms EWP actually has (value
parsing via `Enum.TryParse(x, true, ...)`, key matching via YamlDotNet's
property binder) are now source-verified — one had a real gap (fixed), one
didn't (confirmed clean). No further casing-audit surface remains; broader
doc-vs-source drift outside casing continues to be caught by this ticket's
ordinary live-testing rounds rather than a separate audit effort.

### Round 10 — diagnosis-message UX pass: duplicate/clash + a hub-wide message-quality standard (added 2026-08-19)

Follow-up to the [Schema Source Audit map](../../schema-source-audit/map.md):
the scripter asked (1) whether the validator's several diagnosis-producing
mechanisms ever double-diagnose the same root cause, and (2) whether a
standing quality bar should exist for diagnosis-message readability, including
translating the raw `yaml` npm package parser errors (e.g. "Nested mappings
are not allowed in compact mappings at line 2, column 9") into plain language.
A grilling session settled the shape of both asks (kept as two separate,
independently-resolved items per the scripter's explicit instruction — the
duplicate/clash question was not folded into the bigger message-quality
effort) and both were then implemented directly, no formal map/tickets, since
the grilling surfaced no fog.

**1. Duplicate/clash audit.** Found one confirmed real case:
`checkPrefabRequiredness` (`structuralPrecheck.ts`) counted *any* `type:`/
`types:` word toward "needs a prefab", including a word that fails ajv's
enum-pattern check entirely (a typo) — so a single bad `type:` value produced
*two* unrelated errors (an ajv pattern mismatch, plus a spurious "needs a
prefab"). Fixed by adding a `KNOWN_TYPES` set (mirrors `generate.mjs`'s
`TYPE_ENUM`) and excluding any word not in it from the "requiring a prefab"
count — an unknown word is already ajv's job to flag. The other diagnosis
sources (`formatLint.ts`, `referenceValidation.ts`, `rpcValidation.ts`, the
ajv loop's existing suppressions for RPC/`::`/commented-out-list errors) were
re-checked and found already non-overlapping by design.

**2. Raw ajv `pattern`-error UX regression (introduced by round 8's fix).**
The `ci()` case-insensitivity fix made a bad `type:`/`types:` value's ajv
error *worse*, not better — it now dumps the generated bracket-class regex
(`^([cC][rR][eE][aA][tT][eE]|...)`) verbatim via the generic fallback
message. Added a targeted override in the ajv error loop
(`structuralPrecheck.ts`): a `pattern`-keyword error on a `type`/`types`
instancePath now reads `'/type' must be one of: create, destroy, ... (any
case), optionally followed by ", param1 param2"` instead.

**3. YAML-parser-error translator.** New module `yamlErrorMessages.ts`:
`translateYamlError` maps all 23 values of the `yaml` package's closed
`ErrorCode` union (`node_modules/yaml/dist/errors.d.ts`) to a plain-language
sentence, with a friendly-but-generic wrapper (never the raw message shown
bare) for any future/unmatched code. Wired into both `doc.errors` and
`doc.warnings` handling in `runStructuralPrecheck`. Chosen over the
originally-floated "translate only the common few" approach — the scripter
explicitly rejected that as not future-proof, and a closed enum union is
cheap to cover exhaustively rather than partially.

**4. Standing message-quality checklist.** Added to the
[EW Toolkit map](../map.md)'s Notes, deliberately **hub-wide** (applies to
every tool this hub ever hosts, not scoped to `ewp_validator`) per the
scripter's explicit choice: name the offending value, say what to do next, no
raw schema/regex/parser jargon in user-facing text, one diagnosis per root
cause, exhaustive tables for closed upstream error sets, and a regression test
for every message-quality fix.

Regression tests added: `structuralPrecheck.test.ts` (duplicate/clash
suppression, plain-language `type:` pattern message, translated-YAML-error
integration case) and a new `yamlErrorMessages.test.ts` (all 23 codes produce
a distinct non-raw message, plus fallback-wrapper and missing-code cases). 173
tests passing (was 167), type-check clean.
