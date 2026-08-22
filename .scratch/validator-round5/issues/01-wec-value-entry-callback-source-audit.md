Type: research
Status: resolved

## Question

Source-verify WEC's (JereKuusela's `valheim-world_edit_commands`) complete
"value entry" data rule — declaration shape(s) and `<name>` callback
resolution — well enough to fix a real false negative in `ewp_validator`'s
`<...>` string-template function check, without re-guessing something Round
4 already covers.

Primary source: <https://github.com/JereKuusela/valheim-world_edit_commands/blob/main/README_data.md#value-entries>
and this mod's actual C# source (find the repo on GitHub — WEC or the
underlying "Expand World" data-loading code it shares with EWP;
`DataLoading.cs`/`Parse.cs`-equivalent) if the README alone doesn't fully
pin down every shape.

### What's already confirmed (don't re-derive)

`ewp_validator`'s `referenceValidation.ts` (`runReferenceValidation()`,
~lines 754-759 and ~909-911) already handles the single-line case:
```
- value: maxRangeToCity, 100
```
registers `maxRangeToCity` (lowercased) into a `valueGroupNames` set, and any
`<maxRangeToCity>` `<...>` head matching that set is excluded from the
"unknown EWP function name" warning. A repro run at chart time (2026-08-22)
confirmed this exact shape produces zero problems already.

### What to find out

1. What are ALL the declaration shapes README_data.md's "Value entries"
   section documents? In particular: can one `value:` entry declare
   *multiple* values for the same name (e.g. a YAML block scalar with one
   value per line, or repeated `- value: name, X` entries with the same
   name)? Does the existing single-comma-split parsing
   (`value.value.split(",")[0]`) correctly extract the name in every
   documented shape, or does some shape (multi-line block scalar, leading
   whitespace, a name containing a comma, etc.) break it?
2. Does WEC support a `valueGroup:`-shaped entry as an alias/variant of
   `value:` for this same feature, distinct from EWP's own "value group"
   random-pick feature (Round 4 ticket 05/06 already source-verified EWP's
   own version against `Functions.cs`/`ObjectFunctions.cs`) — or are WEC's
   "value entries" and EWP's "value groups" actually the *same* underlying
   mechanism (WEC and EWP share a data-loading layer per this repo's own
   prior research), just documented in two different mods' READMEs? This
   matters because if they're the same mechanism, Round 4's existing code
   may already be structurally correct and the real gap is purely a parsing
   edge case (see #1), not a missing feature.
3. Is there any scope in which a `<name>` callback for a WEC-style value
   entry does NOT get excluded by the current `valueGroupNames` check — e.g.
   because the declaring entry and the referencing script live in different
   files that aren't both loaded in the same validation batch (this repo's
   `runReferenceValidation` only sees files passed in one call)? If so, is
   that a real gap this validator should try to close, or an inherent
   "can't know about files outside the batch" limitation this repo's other
   checks (custom saved keys, poke parameters) already accept and document
   with an info-severity "verify in ewp_data.yaml" hint rather than a hard
   flag?

### Deliverable

A findings doc at `research/01-wec-value-entry-callback-source-audit.md`
(sibling to this ticket) covering: the confirmed declaration shape(s) with
source citations, whether/how the current parsing breaks on any of them
(with a concrete failing example), and a recommendation for what
`referenceValidation.ts` should change (if anything) to close the real gap
— scoped precisely enough that ticket 03 (implementation) can build directly
on it without further research.

## Answer

Full findings: [research/01-wec-value-entry-callback-source-audit.md](../research/01-wec-value-entry-callback-source-audit.md).

The ticket's own hypothesis (a declaration-side comma-split bug) is wrong —
source-confirmed against WEC's `DataLoading.cs` (`LoadEntry`): the two real
declaration shapes (`value: name, val`, and `valueGroup: name` + `values:
[...]`) are both parsed correctly today, and WEC's "value entries" and EWP's
"value groups" turn out to be the exact same runtime mechanism (same static
`DataLoading.ValueGroups` dictionary, read and written by both mods) — not
parallel features, as Round 4 had assumed without needing to pin this down.

**The real bug is on the reference side, in `scanUnrecognizedFunctionHeads`:**
it checks `valueGroupNames` against the underscore-truncated `head`
(`splitTopLevel(inner, "_")[0]`), but EWP's actual runtime fallback
(`Functions.cs`'s `ResolveValue`/`TryGetValueFromGroup`) hashes the entire,
unsplit bracket text. Any value-group name containing an underscore (e.g.
`- value: level_multiplier, 3` referenced as `<level_multiplier>`) resolves
correctly at runtime but gets falsely flagged, because the validator checks
`valueGroupNames.has("level")` instead of `valueGroupNames.has("level_multiplier")`.
This is exactly why the chart-time repro (`maxRangeToCity`, no underscore)
came back clean — it accidentally avoided the bug. Worked before/after trace
in the research doc's "concrete break" section.

Recommendation for ticket 03: check the full unsplit `inner` bracket text
(not just the split `head`) against `valueGroupNames`/`DEFAULT_VALUE_GROUP_NAMES`
before flagging — `isRecognizedFunctionGroup` itself must stay head-based
(that's correctly what EWP's function dispatch keys on). A narrower residual
gap (an undeclared underscored name whose first segment happens to collide
with a real function head) is flagged as out of scope for this pass, worth a
future ticket rather than bundling in. Secondary, lower-risk fix: word the
"unknown function name" message to acknowledge the cross-file scope
limitation (a value-group declared in a file outside the validated batch),
matching how the existing custom-key/poke-parameter messages already hedge.

## Out of scope carve-out

The double-failure residual case noted in the research (an undeclared,
underscored, value-group-shaped name whose first segment accidentally
collides with a real EWP function head — e.g. a typo'd `<max_something>`
with no `value: max_something` anywhere) is explicitly deferred, not bundled
into ticket 03. Flagged here for a future ticket if it ever surfaces in
practice; not tracked as a ticket now since it's speculative rather than a
scripter-reported problem.
