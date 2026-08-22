# Design and implement typo/invalid-function-name detection for EWP string templates

Type: grilling
Status: open
Blocked by: (none — ticket 05 resolved)
Parent: [Validator Round 4 map](../map.md)

## Question

Scripter's ask: `<string_X>` typo'd as `<strink_X>` (or any other
unrecognized function name, or a recognized function given a value it
doesn't accept) currently passes silently — should error.

This ticket only starts once
[ticket 05](05-string-template-function-source-audit.md)'s findings are in —
its answer determines both whether this is buildable at all (if unrecognized
function names are genuinely indistinguishable from legitimate literal
`<...>` text at parse time, this may not be) and what severity fits (silent
no-op at runtime → warning-with-suggestion; hard runtime failure →
error).

Grill toward a concrete answer once research lands:

1. **Detection mechanism**: adapt `referenceValidation.ts`'s existing
   `<...>` group-scanning primitives (`findGroupEnd`, `walkKeySegments`,
   `KEY_HEAD_RE`-style head matching) to recognize the *full* function-name
   set from ticket 05, not just `save`/`save++`/`save--`/`load`/`clear`.
   Reuse rather than re-implement the balanced-bracket scanning — this is
   exactly the kind of duplication the hub-wide standing rule warns against.
2. **Typo-distance design**: when a `<head_...>` doesn't match any known
   function name, decide the matching rule (edit-distance threshold?
   common-typo patterns like adjacent-key swaps? exact near-miss list from
   ticket 05?) — mirror `keysCompatible`'s "likely match" precedent in
   spirit, but note this is a different comparison (function name vs.
   function name, not saved-key vs. saved-key) so the algorithm doesn't
   need to be the same code, just the same rigor.
3. **False-positive risk**: literal `<...>` text that isn't a function call
   at all (the codebase already treats unbalanced brackets as "leave for
   structural pre-check," see `scanKeyOccurrences`'s comment at
   `referenceValidation.ts` ~236) — confirm the new check only fires on
   balanced `<head_...>` groups whose head isn't in the known-function set,
   never on freeform bracketed text that was never meant to be a function
   call.
4. **Severity + message**, per the hub-wide message-quality checklist
   ([EW Toolkit map](../../ew_toolkit/map.md) Notes): name the offending
   function head, suggest the likely intended one when confidence is high,
   and say what happens at runtime today (silent no-op vs. error) per
   ticket 05's findings — don't imply a fix will definitely change behavior
   if research shows it's ambiguous.
5. **"Invalid value" half of the ask** (a recognized function given a value
   it rejects): only pursue if ticket 05 found this is statically checkable
   without game-data access; otherwise record why it's deferred (same
   reasoning class as prefab-name/global-key checks being out of scope for
   [Cross-file reference](../../ew_toolkit/CONTEXT.md) validation).
6. **Duplication/clash check**: confirm no overlap with the existing
   `<save/load/clear>` custom-key logic (different function heads
   entirely) or with `formatLint.ts`'s stray-colon checks.

Implement once settled — this map's grilling tickets carry execution.

## Answer

(pending — blocked on ticket 05)
