Type: research
Status: resolved

## Question

Source-verify the complete (or as-complete-as-practically-enumerable) set of
RichText markup tags Valheim's own UI/chat text actually supports, so
`ewp_validator`'s `<...>` string-template function check can recognize them
and stop flagging them as "Unknown EWP function name" false negatives.

Primary sources: Valheim's own decompiled/published source at
<https://github.com/Valheim-Modding> (check `Valheim-Wiki`/whatever repo
under that org actually holds the game's C# source or public API — this
repo has not previously needed Valheim's own source, only EWP's/WEC's, so
don't assume a specific repo name without checking what's actually there),
plus Unity's TextMeshPro rich-text tag reference (Valheim's in-game text —
chat, MessageHud, tooltips — is built on TMP, and Valheim layers a small
number of its own custom tags on top per community modding docs like the
Jotunn wiki / Valheim modding Discord references if those turn out to be
more authoritative than raw source for the *complete* list).

### What's already confirmed (don't re-derive)

A repro run at chart time (2026-08-22) confirmed this gap is real and
reproduces exactly as the scripter described: given
```
- value: msgPlayerCheckTime,
            <#ddd>Current Season Time:</b>
            <br>Day<#00ff00> <load_bfvrealday=1></color> - <#fff000><realtime_HH:mm_<load_serverutc=0>></color>
            <br><size=15>*Day count increases at 21:00 UTC.
```
`referenceValidation.ts`'s current `scanUnrecognizedFunctionHeads()` /
`runReferenceValidation()` flags every one of `<#ddd>`, `</b>`, `<br>`,
`<#00ff00>`, `</color>`, `<#fff000>`, `<size=15>` as an unrecognized
`template-function` warning. The user's examples are illustrative, not
exhaustive — treat them as a lower bound on the tag set, not the target.

### What to find out

1. The complete set of RichText tag *heads* Valheim's chat/UI text engine
   recognizes — both TMP's standard set (`b`, `i`, `color`, `size`, `br`,
   `u`, `s`, `sup`, `sub`, `align`, `mark`, etc. — confirm which of TMP's
   full tag list Valheim actually enables/uses, since not every game ships
   every TMP tag) and any Valheim-specific additions on top (this repo's own
   comments already suspect at least a color-hex shorthand and `<size=N>`
   are in active scripter use).
2. How each tag's *shape* differs from an EWP function head, so
   `scanUnrecognizedFunctionHeads()`'s existing `<head_...>` parsing (split
   on the first top-level `_`) can be extended correctly: a closing tag
   (`</b>`, `</color>`) starts with `/`, not a bare identifier; `<#RRGGBB>`
   and `<#RGB>` start with `#` followed by hex digits, not a name;
   `<size=15>` and `<color=...>` use `=`, not `_`, to separate the tag name
   from its argument. Confirm whether any of these shapes could ever
   *collide* with a real (or typo'd) EWP function head — if not, the
   recognizer can be a cheap shape-based check (starts with `/`, `#`, or a
   known-tag-name-then-`=`) rather than a hardcoded exhaustive tag-name list,
   which would be far more maintainable and closer to this repo's
   low-maintenance standing preference.
3. Whether any RichText tag argument value is itself worth validating (e.g.
   is `<size=15>` unclosed a real problem Valheim silently ignores, same
   "silent no-op" pattern Round 4's EWP-function research found?) or whether
   — per that same standing preference and Round 4's precedent of not
   statically checking function *argument* validity — recognizing the tag
   *head* and stopping there is the right scope for this ticket.

### Deliverable

A findings doc at `research/02-valheim-richtext-tag-source-audit.md`
(sibling to this ticket) covering: the confirmed tag set and/or shape rule
with source citations, a recommendation for exactly what
`scanUnrecognizedFunctionHeads()` (or its caller) should change to recognize
these tags, and confirmation of whether a shape-based rule or a hardcoded
allow-list is the right implementation — scoped precisely enough that
ticket 04 (implementation) can build directly on it without further
research.

## Answer

Full findings: [research/02-valheim-richtext-tag-source-audit.md](../research/02-valheim-richtext-tag-source-audit.md).

Valheim's chat/UI text runs through stock Unity TextMeshPro (confirmed via
decompiled BetterChat/Chatter mod source showing `MessageHud`/chat UI typed
as `TMP_Text`) — no Valheim-specific tag vocabulary exists; the
`Valheim-Modding` GitHub org holds no game source/decompile repo (checked
directly), so TMP's own manual (33-tag table + the `<#RGB>`/`<#RRGGBBAA>`
hex-shorthand form, corroborated by a community Valheim sign-text guide) is
the authoritative source.

A shape-based rule handles most of the class safely, but not all of it:
- Closing tags (`/...`) and hex color shorthand (`#` + 3/4/6/8 hex digits) —
  pure shape, zero collision risk, no name list needed.
- `name=value` attribute tags (`size=`, `color=`, etc.) — needs a bounded
  21-name allow-list (TMP's own fixed `=`-taking tag names), NOT open shape,
  because an unrestricted rule would silently swallow a real scripter typo
  like `<load=foo>` (argument-separator typo of `<load_foo>`) instead of
  flagging it.
- Bare pair/self-closing tags (`<b>`, `<br>`, `<sub>`, etc.) — needs a
  bounded 15-name allow-list; structurally indistinguishable from a bare EWP
  no-arg head, so no shape rule can tell them apart.

One real collision found and resolved: TMP's `<i>` (italics) collides with
EWP's own `i` no-arg object function, already in `NO_ARG_OBJECT_FUNCTION_NAMES`
— already silently recognized today (for the wrong reason, but harmlessly);
the recommendation deliberately excludes `i` from the new bare-tag list
rather than duplicating it.

Recommended implementation: an `isRichTextTag(inner)` guard checked first in
`scanUnrecognizedFunctionHeads()`'s loop (before `isRecognizedFunctionGroup`),
kept as a separate skip rather than merged into the existing EWP name tables
— richtext tags are categorically not EWP functions, and merging them would
incorrectly surface richtext tag names in `suggestFunctionName`'s "did you
mean" candidates for real EWP typos. Full code sketch (regex + two `Set`s +
guard function) in the research doc §4. Tag argument values are out of scope,
matching Round 4's precedent of recognizing function heads only, never
argument validity.
