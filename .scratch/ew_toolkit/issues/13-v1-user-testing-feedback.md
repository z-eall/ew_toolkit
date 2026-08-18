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
