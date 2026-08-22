# Empty files get a soft warning, not a hard YAML-list error

Type: grilling
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

1. **Detection:** `hasNoActiveContent()` — true when there are no non-blank
   lines, or every non-blank line is a comment. Replaces `isCommentOnly()`.
   A lone `-` or other partial stub still hard-errors.
2. **Severity:** `warning` (matches comment-only precedent).
3. **Message:** one unified string for empty and comment-only (scripter's
   wording verbatim).
4. **Category:** `YAML problem` + `(root)` sub-group via ticket 04 constants.

Tests updated in `structuralPrecheck.test.ts`. `vitest run` + `tsc --noEmit`
clean.

## Question

A **totally empty** file (no content, or only blank lines) currently hits the
hard error:

```
The top level must be a YAML list. Start each entry with `- `. [(root)]
```

(`structuralPrecheck.ts:357-362`). Comment-only files already downgrade to a
soft warning with different wording (`isCommentOnly`, lines 348-355).

The scripter wants empty files treated like comment-only: **soft warning**
with new text:

```
This file has no active content — It is either empty or every line is
commented out. Uncomment what you want validated, or remove the file if it's
no longer needed. [(root)]
```

Grill toward:

1. **Detection** — extend `isCommentOnly` vs. a separate `isEmptyOrCommentOnly`
   helper? Whitespace-only lines only, or treat a lone `-` / partial stub
   differently?
2. **Severity** — `warning` (matches comment-only precedent)?
3. **Message unification** — one message for both truly empty and comment-only
   (as the proposed text suggests), or keep two messages with shared
   severity?
4. **Category tag** — stays `(root)` until ticket 04 lands the YAML-native
   group redesign; note any coupling.

Once resolved, implement in `structuralPrecheck.ts`, update
`structuralPrecheck.test.ts`, live-verify with an empty upload and a
comment-only upload side by side.
