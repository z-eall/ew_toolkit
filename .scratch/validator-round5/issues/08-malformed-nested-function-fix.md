Type: grilling
Status: resolved
Blocked by: 07

## Question

Given ticket 07's source-verified findings on which malformed nested
`<...>` shapes (extra bracket, extra underscore) are statically detectable
and actually change EWP's runtime resolution, design and implement a new
`warning`-severity diagnosis for them in `referenceValidation.ts` —
confirmed against the [Diagnosis Arbitration map](../diagnosis-arbitration/map.md)'s
anti-duplication contract first, per this map's Notes (this is likely
another whole-document/batch-wide text-scan check, same family as the
existing template-function check, not a per-entry shape confusion — but
confirm rather than assume, same as tickets 04/06 already did for their own
additions).

Zoom ticket 07 (and its `research/07-...md` findings doc) before starting.
If ticket 07 concludes no real, confidently-detectable gap exists beyond
what `structuralPrecheck.ts`'s existing unbalanced-bracket handling already
catches, record that conclusion here and close as out of scope rather than
inventing a detector for malformations that turn out to be indistinguishable
from valid syntax at static-analysis time.

## Answer

Implemented ticket 07's two high-confidence recommendations (a) and (b) as
a new `kind: "malformed-reference"`, `severity: "warning"` diagnosis —
deliberately skipped (c) (redundant double-wrapper `<<...>>`), left
optional/lower-priority per that research's own recommendation given its
decorative-text false-positive risk.

Both checks reuse existing primitives, no new parsing infrastructure:
1. **Doubled underscore before a nested group** (`scanKeyOccurrences`,
   extended with `findDoubledUnderscoreBeforeGroup`): scoped narrowly to a
   literal `__` immediately preceding a `<...>` group inside a
   save/load/clear key template — not any doubled underscore anywhere in a
   key name, since a key can legitimately contain a literal `__` with no
   nearby dynamic parameter.
2. **Unbalanced bracket surfacing** (`scanUnrecognizedFunctionHeads`, which
   already iterates every `<` in the document): the previously-discarded
   `findGroupEnd() === -1` signal is now surfaced, scoped to a `<` followed
   by a plausible reference-start character (letter, `#`, `/`) to avoid
   flagging an unrelated lone `<` in freeform chat text (e.g. "Day < 5").

**Confirmed against the Diagnosis Arbitration map's anti-duplication
contract** (per this map's Notes, same reasoning tickets 04/06 already
applied): both are whole-document/batch-wide text-scan extensions of
existing `referenceValidation.ts` checks, not per-entry shape confusion, so
they belong here rather than a new `shapeMismatchDiagnosis.ts` row.

**Verified with 6 repro cases plus a full regression pass**, before adding
5 permanent tests: the doubled-underscore example flags correctly; a
well-formed single underscore does not; a legitimate literal `__` with no
adjacent nesting does not (confirming the narrow scoping holds); an
unmatched `<` flags with the "never closes" message; a lone `<` in freeform
comparison text ("Day < 5") does not flag (the plausible-start-character
gate holds); and Round 4/5's typo detection, real function recognition,
RichText tags, underscore-name matching, and prefix-fuzzy value-group
matching (tickets 03/04/06) are all confirmed unaffected in the same pass.

Also shortened `templateFunctionMessage`'s wording (separately requested
mid-session) — same information, notably fewer words, verified no test
depended on the old exact phrasing.

Full suite: 283/283 passing. This closes the last ticket added to
Validator Round 5 so far.
