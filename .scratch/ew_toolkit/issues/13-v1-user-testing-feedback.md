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

(open for further rounds — awaiting more of the user's test cases)
